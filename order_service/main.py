import os
import logging
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

from common.database import get_db, Order, OrderItem, MenuItem
from common.security import get_current_user_payload, RoleChecker
from common.schemas import (
    OrderCreateRequest, OrderResponse, OrderUpdateStatus
)
from common.kafka_client import KafkaProducerWrapper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OrderService")

app = FastAPI(
    title="Order Service",
    description="Manages order creation, states, and history",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Kafka Producer
kafka_producer = KafkaProducerWrapper()

@app.on_event("startup")
async def startup_event():
    await kafka_producer.start()

@app.on_event("shutdown")
async def shutdown_event():
    await kafka_producer.stop()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "order_service"}

@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_in: OrderCreateRequest,
    payload: dict = Depends(RoleChecker(allowed_roles=["Customer"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    
    # Calculate totals and verify items
    total_amount = 0.0
    items_to_create = []
    
    for item in order_in.items:
        menu_item = db.query(MenuItem).filter(
            MenuItem.id == item.menu_item_id,
            MenuItem.restaurant_id == order_in.restaurant_id
        ).first()
        if not menu_item:
            raise HTTPException(
                status_code=404, 
                detail=f"MenuItem with id {item.menu_item_id} not found at restaurant {order_in.restaurant_id}"
            )
        if not menu_item.is_available:
            raise HTTPException(
                status_code=400, 
                detail=f"MenuItem {menu_item.name} is currently out of stock."
            )
            
        item_total = float(menu_item.price) * item.quantity
        total_amount += item_total
        
        items_to_create.append(OrderItem(
            menu_item_id=item.menu_item_id,
            quantity=item.quantity,
            price=menu_item.price
        ))
        
    order = Order(
        user_id=user_id,
        restaurant_id=order_in.restaurant_id,
        total_amount=total_amount,
        order_status="Created",
        delivery_address=order_in.delivery_address,
        order_items=items_to_create
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Publish order_created message to Kafka
    order_event = {
        "order_id": order.id,
        "user_id": order.user_id,
        "restaurant_id": order.restaurant_id,
        "total_amount": float(order.total_amount),
        "delivery_address": order.delivery_address,
        "status": order.order_status
    }
    await kafka_producer.send_message("order_created", order_event)
    
    return order

@app.get("/api/orders", response_model=List[OrderResponse])
def get_orders(
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    role = payload.get("role")
    
    # Filter based on roles
    if role == "Admin":
        orders = db.query(Order).all()
    elif role == "Restaurant Owner":
        # Owners get orders for their own restaurants
        orders = db.query(Order).join(MenuItem).filter(MenuItem.restaurant_id == Order.restaurant_id).all()
    elif role == "Delivery Partner":
        # Handled in delivery service, but fetch all active for assignment/dashboard
        orders = db.query(Order).filter(Order.order_status.in_(["Paid", "Preparing", "Assigned", "OutForDelivery"])).all()
    else:
        # Standard customer
        orders = db.query(Order).filter(Order.user_id == user_id).all()
        
    return orders

@app.get("/api/orders/{id}", response_model=OrderResponse)
def get_order_details(
    id: int,
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    role = payload.get("role")
    
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
        
    # Check permissions
    if role not in ["Admin", "Delivery Partner"] and order.user_id != user_id:
        # Verify if owner of restaurant
        if role == "Restaurant Owner":
            pass  # Allowed for owner
        else:
            raise HTTPException(status_code=403, detail="Not authorized to view this order.")
            
    return order

@app.put("/api/orders/{id}/status", response_model=OrderResponse)
def update_order_status(
    id: int,
    status_in: OrderUpdateStatus,
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    # Allowed roles to change status: Restaurant Owner, Delivery Partner, Admin
    user_role = payload.get("role")
    if user_role not in ["Restaurant Owner", "Delivery Partner", "Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to change order status.")
        
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
        
    order.order_status = status_in.status
    db.commit()
    db.refresh(order)
    logger.info(f"Updated order {id} status to: {status_in.status}")
    return order

@app.post("/api/orders/{id}/cancel", response_model=OrderResponse)
async def cancel_order_grace_period(
    id: int,
    payload: dict = Depends(RoleChecker(allowed_roles=["Customer"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
        
    if order.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this order.")
        
    if order.order_status != "Created":
        raise HTTPException(status_code=400, detail="Only newly created orders can be cancelled.")
        
    # Check grace period (30 seconds)
    time_elapsed = (datetime.utcnow() - order.created_at).total_seconds()
    
    if time_elapsed > 30:
        raise HTTPException(status_code=400, detail="The 30-second cancellation grace period has expired.")
        
    order.order_status = "Cancelled"
    db.commit()
    db.refresh(order)
    
    # Publish cancellation
    order_event = {
        "order_id": order.id,
        "user_id": order.user_id,
        "restaurant_id": order.restaurant_id,
        "total_amount": float(order.total_amount),
        "delivery_address": order.delivery_address,
        "status": order.order_status
    }
    await kafka_producer.send_message("order_cancelled", order_event)
    
    return order

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
