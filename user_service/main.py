import os
import logging
import time
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from common.database import get_db, User, UserAddress, init_db
from common.security import (
    hash_password, verify_password, create_access_token, 
    get_current_user_payload
)
from common.schemas import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    UserAddressCreate, UserAddressResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("UserService")

app = FastAPI(
    title="User Service",
    description="Manages authentication, roles, and profiles",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    logger = logging.getLogger("UserServiceStartup")
    logger.info("Initializing database tables...")
    for i in range(15):
        try:
            init_db()
            logger.info("Database tables initialized successfully.")
            return
        except Exception as e:
            logger.warning(f"Database connection attempt {i+1}/15 failed: {e}. Retrying in 2 seconds...")
            time.sleep(2)
    logger.error("Failed to initialize database after multiple attempts.")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "user_service"}

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Hash password and create user
    hashed = hash_password(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed,
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/auth/login", response_model=TokenResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    # Create token payload
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.name
    }
    token = create_access_token(data=token_data)
    return TokenResponse(
        access_token=token,
        role=user.role,
        name=user.name
    )

@app.get("/api/users/profile", response_model=UserResponse)
def get_profile(
    payload: dict = Depends(get_current_user_payload), 
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

@app.put("/api/users/profile", response_model=UserResponse)
def update_profile(
    name: str,
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    user.name = name
    db.commit()
    db.refresh(user)
    return user

@app.get("/api/users/addresses", response_model=List[UserAddressResponse])
def get_addresses(
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    addresses = db.query(UserAddress).filter(UserAddress.user_id == user_id).all()
    return addresses

@app.post("/api/users/addresses", response_model=UserAddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    address_in: UserAddressCreate,
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    
    # If this address is set to default, unset all other addresses as default
    if address_in.is_default:
        db.query(UserAddress).filter(UserAddress.user_id == user_id).update({"is_default": False})
    
    address = UserAddress(
        user_id=user_id,
        address_line=address_in.address_line,
        city=address_in.city,
        latitude=address_in.latitude,
        longitude=address_in.longitude,
        is_default=address_in.is_default
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
