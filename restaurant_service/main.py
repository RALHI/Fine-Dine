import os
import json
import logging
import time
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import redis
import base64
import httpx
import uuid
import shutil

from common.database import get_db, Restaurant, MenuItem, Review, init_db
from common.security import get_current_user_payload, RoleChecker
from common.schemas import (
    RestaurantCreate, RestaurantResponse, 
    MenuItemCreate, MenuItemResponse,
    ReviewCreate, ReviewResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RestaurantService")

app = FastAPI(
    title="Restaurant Service",
    description="Manages restaurants, menus, ratings, and reviews",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    logger.info("Initializing database tables...")
    for i in range(15):
        try:
            init_db()
            logger.info("Database tables initialized.")
            return
        except Exception as e:
            logger.warning(f"DB init attempt {i+1}/15 failed: {e}. Retrying in 2s...")
            time.sleep(2)
    logger.error("Failed to initialize database.")

# Redis client configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
try:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, socket_timeout=2)
    redis_client.ping()
    logger.info("Connected to Redis successfully.")
except Exception as e:
    logger.warning(f"Could not connect to Redis at {REDIS_HOST}:{REDIS_PORT}. Cache disabled. Error: {e}")
    redis_client = None

def get_cached_menu(restaurant_id: int) -> Optional[list]:
    if not redis_client:
        return None
    try:
        cached_data = redis_client.get(f"menu:{restaurant_id}")
        if cached_data:
            logger.info(f"Cache HIT for restaurant {restaurant_id} menu")
            return json.loads(cached_data)
    except Exception as e:
        logger.error(f"Redis cache read error: {e}")
    return None

def cache_menu(restaurant_id: int, menu_items: list):
    if not redis_client:
        return
    try:
        # Cache for 1 hour (3600 seconds)
        redis_client.setex(
            f"menu:{restaurant_id}", 
            3600, 
            json.dumps(menu_items)
        )
        logger.info(f"Cached menu for restaurant {restaurant_id}")
    except Exception as e:
        logger.error(f"Redis cache write error: {e}")

def invalidate_menu_cache(restaurant_id: int):
    if not redis_client:
        return
    try:
        redis_client.delete(f"menu:{restaurant_id}")
        logger.info(f"Invalidated menu cache for restaurant {restaurant_id}")
    except Exception as e:
        logger.error(f"Redis cache invalidate error: {e}")


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "restaurant_service"}

@app.get("/api/restaurants", response_model=List[RestaurantResponse])
def list_restaurants(
    cuisine: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Restaurant)
    
    if location:
        query = query.filter(Restaurant.location.ilike(f"%{location}%"))
    if cuisine:
        # Basic matching in description/name for demo cuisine filtering
        query = query.filter(
            (Restaurant.restaurant_name.ilike(f"%{cuisine}%")) | 
            (Restaurant.description.ilike(f"%{cuisine}%"))
        )
    if min_rating:
        query = query.filter(Restaurant.rating >= min_rating)
        
    return query.all()

@app.post("/api/restaurants", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    restaurant_in: RestaurantCreate,
    payload: dict = Depends(RoleChecker(allowed_roles=["Restaurant Owner", "Admin"])),
    db: Session = Depends(get_db)
):
    owner_id = int(payload.get("sub"))
    restaurant = Restaurant(
        owner_id=owner_id,
        restaurant_name=restaurant_in.restaurant_name,
        description=restaurant_in.description,
        location=restaurant_in.location,
        image_url=restaurant_in.image_url,
        rating=0.0
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant

@app.get("/api/restaurants/{id}", response_model=RestaurantResponse)
def get_restaurant(id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
    return restaurant

@app.get("/api/restaurants/{id}/menu", response_model=List[MenuItemResponse])
def get_restaurant_menu(id: int, db: Session = Depends(get_db)):
    # Try Cache
    cached = get_cached_menu(id)
    if cached is not None:
        return cached
    
    # Query DB
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    items = db.query(MenuItem).filter(MenuItem.restaurant_id == id).all()
    
    # Serialize items for caching
    serialized_items = []
    for item in items:
        serialized_items.append({
            "id": item.id,
            "restaurant_id": item.restaurant_id,
            "name": item.name,
            "description": item.description,
            "price": float(item.price),
            "image_url": item.image_url,
            "is_available": item.is_available
        })
        
    cache_menu(id, serialized_items)
    return items

@app.post("/api/restaurants/{id}/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def add_menu_item(
    id: int,
    item_in: MenuItemCreate,
    payload: dict = Depends(RoleChecker(allowed_roles=["Restaurant Owner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    user_role = payload.get("role")
    
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    # Check if the owner owns this restaurant or is admin
    if user_role != "Admin" and restaurant.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this restaurant.")
        
    menu_item = MenuItem(
        restaurant_id=id,
        name=item_in.name,
        description=item_in.description,
        price=item_in.price,
        image_url=item_in.image_url,
        is_available=item_in.is_available
    )
    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)
    
    # Invalidate cache
    invalidate_menu_cache(id)
    return menu_item

@app.post("/api/restaurants/{id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def add_review(
    id: int,
    review_in: ReviewCreate,
    payload: dict = Depends(RoleChecker(allowed_roles=["Customer"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    review = Review(
        user_id=user_id,
        restaurant_id=id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Update restaurant rating average
    all_reviews = db.query(Review).filter(Review.restaurant_id == id).all()
    avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews) if all_reviews else 0.0
    restaurant.rating = round(avg_rating, 2)
    db.commit()
    
    return review

# ── AI Menu Image Scanner ────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

@app.post("/api/restaurants/{id}/menu/scan-image")
async def scan_menu_image(
    id: int,
    file: UploadFile = File(...),
    payload: dict = Depends(RoleChecker(allowed_roles=["Restaurant Owner", "Admin"])),
    db: Session = Depends(get_db)
):
    """Accept a menu image and use Gemini Vision to extract menu items."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server. Please set it in docker-compose.yml."
        )

    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/heic"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or HEIC images are accepted.")

    # Read and base64-encode the image
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="Image too large. Max size is 10 MB.")
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """You are a restaurant menu OCR assistant. Look at this menu image and extract every food/drink item you can see.

Return ONLY a JSON array (no markdown, no explanation) in exactly this format:
[
  {"name": "Dish Name", "description": "Brief description of the dish", "price": 12.99},
  ...
]

Rules:
- Convert any non-USD currency to USD (use approximate rates).
- If a price is missing or unclear, estimate a reasonable price based on the dish type.
- Keep descriptions concise (under 100 chars).
- Include ALL items visible in the image.
- DO NOT wrap in markdown code blocks. Return raw JSON only."""

    request_body = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": file.content_type, "data": b64_image}}
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048}
    }

    gemini_failed = False
    raw_text = ""

    # 1. Try Gemini
    if GEMINI_API_KEY:
        try:
            logger.info("Attempting menu image scan with Gemini...")
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                    json=request_body
                )
                if response.status_code == 200:
                    result = response.json()
                    # Safe check for candidates
                    if result.get("candidates") and result["candidates"][0].get("content", {}).get("parts"):
                        raw_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                        logger.info("Gemini menu scan completed successfully.")
                    else:
                        logger.warning(f"Gemini API returned success but empty candidates: {result}")
                        gemini_failed = True
                else:
                    logger.error(f"Gemini API returned error code {response.status_code}: {response.text}")
                    gemini_failed = True
        except Exception as e:
            logger.error(f"Gemini menu scan failed with exception: {e}")
            gemini_failed = True
    else:
        logger.warning("GEMINI_API_KEY is not configured. Falling back to Hugging Face...")
        gemini_failed = True

    # 2. Try Hugging Face fallback
    if gemini_failed:
        logger.info("Falling back to Hugging Face Vision model...")
        HF_API_KEY = os.getenv("HF_API_KEY", "")
        if not HF_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="Both Gemini and Hugging Face keys are unconfigured. Please check your .env settings."
            )
            
        hf_model = os.getenv("HF_VISION_MODEL", "Qwen/Qwen2-VL-7B-Instruct")
        hf_url = f"https://api-inference.huggingface.co/models/{hf_model}/v1/chat/completions"
        hf_headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/json"
        }
        
        hf_payload = {
            "model": hf_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{file.content_type};base64,{b64_image}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 2048,
            "temperature": 0.1
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(hf_url, headers=hf_headers, json=hf_payload)
                if response.status_code != 200:
                    logger.error(f"Hugging Face Vision API error: {response.text}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Hugging Face Vision API error {response.status_code}: {response.text}"
                    )
                
                result = response.json()
                if result.get("choices") and result["choices"][0].get("message", {}).get("content"):
                    raw_text = result["choices"][0]["message"]["content"].strip()
                    logger.info("Hugging Face vision menu scan completed successfully.")
                else:
                    logger.error(f"Hugging Face Vision API returned empty payload: {result}")
                    raise HTTPException(status_code=502, detail="Hugging Face returned empty translation response.")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Hugging Face Vision API timed out.")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Hugging Face vision scan failed: {e}")
            raise HTTPException(status_code=500, detail=f"Hugging Face vision scan failed: {str(e)}")

    try:
        # Strip any accidental markdown code fences
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        items = json.loads(raw_text)
        if not isinstance(items, list):
            raise ValueError("Expected a JSON array")

        # Normalise and validate
        cleaned = []
        for item in items:
            cleaned.append({
                "name":        str(item.get("name", "Unknown Item")).strip(),
                "description": str(item.get("description", "")).strip()[:200],
                "price":       round(float(item.get("price", 9.99)), 2),
                "is_available": True
            })

        logger.info(f"Successfully extracted {len(cleaned)} items from menu image for restaurant {id}")
        return {"items": cleaned, "count": len(cleaned)}

    except json.JSONDecodeError as e:
        logger.error(f"AI returned non-JSON text: {raw_text[:300]}")
        raise HTTPException(status_code=422, detail="AI could not parse the menu. Try a clearer image.")
    except Exception as e:
        logger.error(f"scan_menu_image post-parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Menu Item CRUD & Image Upload ─────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/api/restaurants/images/{filename}")
def serve_menu_image(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(file_path)

@app.put("/api/restaurants/{id}/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    id: int,
    item_id: int,
    item_in: MenuItemCreate,
    payload: dict = Depends(RoleChecker(allowed_roles=["Restaurant Owner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    user_role = payload.get("role")
    
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if user_role != "Admin" and restaurant.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this restaurant.")
        
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.restaurant_id == id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
        
    menu_item.name = item_in.name
    menu_item.description = item_in.description
    menu_item.price = item_in.price
    menu_item.is_available = item_in.is_available
    if item_in.image_url is not None:
        menu_item.image_url = item_in.image_url
        
    db.commit()
    db.refresh(menu_item)
    invalidate_menu_cache(id)
    return menu_item

@app.delete("/api/restaurants/{id}/menu/{item_id}")
def delete_menu_item(
    id: int,
    item_id: int,
    payload: dict = Depends(RoleChecker(allowed_roles=["Restaurant Owner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    user_role = payload.get("role")
    
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if user_role != "Admin" and restaurant.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this restaurant.")
        
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.restaurant_id == id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
        
    db.delete(menu_item)
    db.commit()
    invalidate_menu_cache(id)
    return {"detail": "Menu item deleted successfully"}

@app.post("/api/restaurants/{id}/menu/{item_id}/image", response_model=MenuItemResponse)
async def upload_menu_item_image(
    id: int,
    item_id: int,
    file: UploadFile = File(...),
    payload: dict = Depends(RoleChecker(allowed_roles=["Restaurant Owner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    user_role = payload.get("role")
    
    restaurant = db.query(Restaurant).filter(Restaurant.id == id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if user_role != "Admin" and restaurant.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this restaurant.")
        
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.restaurant_id == id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
        
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WebP images are accepted.")
        
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Max size is 5 MB.")
        
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"restaurant_{id}_item_{item_id}_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
        
    menu_item.image_url = f"/api/restaurants/images/{filename}"
    db.commit()
    db.refresh(menu_item)
    invalidate_menu_cache(id)
    return menu_item


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
