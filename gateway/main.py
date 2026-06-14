import os
import logging
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Gateway")

app = FastAPI(
    title="API Gateway",
    description="Routing hub and reverse proxy for backend APIs and React frontend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs from environments
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
RESTAURANT_SERVICE_URL = os.getenv("RESTAURANT_SERVICE_URL", "http://localhost:8002")
ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://localhost:8003")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:8004")
DELIVERY_SERVICE_URL = os.getenv("DELIVERY_SERVICE_URL", "http://localhost:8005")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8006")
CHATBOT_SERVICE_URL = os.getenv("CHATBOT_SERVICE_URL", "http://localhost:8007")

# React Frontend server URL
FRONTEND_SERVICE_URL = os.getenv("FRONTEND_SERVICE_URL", "http://localhost:5173")

# Proxy Client
async_client = httpx.AsyncClient()

@app.on_event("shutdown")
async def shutdown():
    await async_client.aclose()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "gateway"}

# --- REVERSE PROXY ROUTING MECHANISM ---

async def proxy_request(service_url: str, path: str, request: Request):
    """Asynchronously forwards request to microservice and returns the response."""
    url = f"{service_url}{path}"
    
    # Extract details
    method = request.method
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ["host", "content-length"]}
    params = dict(request.query_params)
    content = await request.body()
    
    try:
        response = await async_client.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            content=content,
            timeout=10.0
        )
        return StreamingResponse(
            response.aiter_bytes(),
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except httpx.ConnectError:
        logger.error(f"Failed to connect to service at {url}")
        raise HTTPException(status_code=503, detail="Backend service unavailable.")
    except Exception as e:
        logger.error(f"Gateway proxy error: {e}")
        raise HTTPException(status_code=500, detail="Internal gateway routing error.")

# --- API ROUTES PROXIES ---

@app.api_route("/api/auth", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_auth(request: Request, path: str = ""):
    return await proxy_request(USER_SERVICE_URL, f"/api/auth/{path}" if path else "/api/auth", request)

@app.api_route("/api/users", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_users(request: Request, path: str = ""):
    return await proxy_request(USER_SERVICE_URL, f"/api/users/{path}" if path else "/api/users", request)

@app.api_route("/api/restaurants", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/restaurants/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_restaurants(request: Request, path: str = ""):
    return await proxy_request(RESTAURANT_SERVICE_URL, f"/api/restaurants/{path}" if path else "/api/restaurants", request)

@app.api_route("/api/orders", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/orders/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_orders(request: Request, path: str = ""):
    return await proxy_request(ORDER_SERVICE_URL, f"/api/orders/{path}" if path else "/api/orders", request)

@app.api_route("/api/payments", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/payments/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_payments(request: Request, path: str = ""):
    return await proxy_request(PAYMENT_SERVICE_URL, f"/api/payments/{path}" if path else "/api/payments", request)

@app.api_route("/api/delivery", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/delivery/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_delivery(request: Request, path: str = ""):
    return await proxy_request(DELIVERY_SERVICE_URL, f"/api/delivery/{path}" if path else "/api/delivery", request)

@app.api_route("/api/notifications", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/notifications/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_notifications(request: Request, path: str = ""):
    return await proxy_request(NOTIFICATION_SERVICE_URL, f"/api/notifications/{path}" if path else "/api/notifications", request)

@app.api_route("/api/chat", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/chat/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_chatbot(request: Request, path: str = ""):
    return await proxy_request(CHATBOT_SERVICE_URL, f"/api/chat/{path}" if path else "/api/chat", request)

# --- FRONTEND ROUTE PROXY (All other paths) ---

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all_frontend_proxy(path: str, request: Request):
    # Ignore API requests that didn't match specific routers above
    if path.startswith("api/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API route not found")
    
    # Forward all other assets & navigation page hits to the React Vite dev server
    return await proxy_request(FRONTEND_SERVICE_URL, f"/{path}", request)

if __name__ == "__main__":
    import uvicorn
    # Gateway listens on port 8000 (standard entrance)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
