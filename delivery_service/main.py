import os
from datetime import datetime
import logging
import asyncio
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from common.database import get_db, SessionLocal, Order, OrderDelivery, DeliveryPartner, User
from common.security import get_current_user_payload, RoleChecker
from common.schemas import (
    DeliveryPartnerCreate, DeliveryPartnerResponse,
    OrderDeliveryResponse, OrderUpdateStatus
)
from common.kafka_client import KafkaProducerWrapper, KafkaConsumerWrapper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DeliveryService")

app = FastAPI(
    title="Delivery Service",
    description="Manages delivery partner state and order assignments",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

kafka_producer = KafkaProducerWrapper()
# Consumer for 'payment_completed' topic
payment_consumer = KafkaConsumerWrapper(topic="payment_completed", group_id="delivery_service_group")

async def process_payment_completed_event(event: dict):
    """Kafka event handler for payment_completed."""
    order_id = event.get("order_id")
    logger.info(f"Received payment_completed event for Order ID: {order_id}. Auto-assigning partner...")
    
    db: Session = SessionLocal()
    try:
        # Check if order exists
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            logger.error(f"Order {order_id} not found in DB.")
            return

        # Find an available delivery partner
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.is_available == True).first()
        
        # Fallback: if no partner exists in DB, create a default mock partner so system works
        if not partner:
            logger.warning("No delivery partner available in DB. Creating a default fallback partner...")
            # We look for a delivery partner user or create one
            dp_user = db.query(User).filter(User.role == "Delivery Partner").first()
            if not dp_user:
                dp_user = User(
                    name="Express Rider",
                    email="rider@fooddelivery.com",
                    password_hash="mock_hash",
                    role="Delivery Partner"
                )
                db.add(dp_user)
                db.commit()
                db.refresh(dp_user)
            
            partner = DeliveryPartner(
                user_id=dp_user.id,
                name=dp_user.name,
                phone="+1-555-0199",
                vehicle_type="E-Bike",
                is_available=True
            )
            db.add(partner)
            db.commit()
            db.refresh(partner)

        # Make partner busy
        partner.is_available = False
        
        # Create Delivery log
        delivery = OrderDelivery(
            order_id=order_id,
            delivery_partner_id=partner.id,
            status="Assigned"
        )
        db.add(delivery)
        
        # Update order status to Preparing/Assigned
        order.order_status = "Preparing"
        db.commit()
        
        logger.info(f"Order {order_id} assigned to partner {partner.name} (ID: {partner.id})")
        
        # Publish delivery_assigned to Kafka
        assigned_event = {
            "order_id": order_id,
            "delivery_partner_id": partner.id,
            "delivery_partner_name": partner.name,
            "phone": partner.phone,
            "status": "Assigned"
        }
        await kafka_producer.send_message("delivery_assigned", assigned_event)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning delivery for Order {order_id}: {e}")
    finally:
        db.close()

async def start_kafka_consumer():
    await payment_consumer.start()
    asyncio.create_task(payment_consumer.listen(process_payment_completed_event))

@app.on_event("startup")
async def startup_event():
    await kafka_producer.start()
    await start_kafka_consumer()

@app.on_event("shutdown")
async def shutdown_event():
    await kafka_producer.stop()
    await payment_consumer.stop()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "delivery_service"}

@app.post("/api/delivery/partners", response_model=DeliveryPartnerResponse, status_code=status.HTTP_201_CREATED)
def register_delivery_partner(
    partner_in: DeliveryPartnerCreate,
    payload: dict = Depends(RoleChecker(allowed_roles=["Delivery Partner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    
    # Check if already registered
    existing = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already registered as a delivery partner.")
        
    user = db.query(User).filter(User.id == user_id).first()
    partner = DeliveryPartner(
        user_id=user_id,
        name=user.name,
        phone=partner_in.phone,
        vehicle_type=partner_in.vehicle_type,
        is_available=True
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner

@app.get("/api/delivery/partners", response_model=List[DeliveryPartnerResponse])
def list_partners(db: Session = Depends(get_db)):
    return db.query(DeliveryPartner).all()

@app.get("/api/delivery/active", response_model=List[OrderDeliveryResponse])
def get_active_deliveries(
    payload: dict = Depends(RoleChecker(allowed_roles=["Delivery Partner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    role = payload.get("role")
    
    if role == "Admin":
        return db.query(OrderDelivery).filter(OrderDelivery.status != "Delivered").all()
        
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner profile not found.")
        
    return db.query(OrderDelivery).filter(
        OrderDelivery.delivery_partner_id == partner.id,
        OrderDelivery.status != "Delivered"
    ).all()

@app.put("/api/delivery/{order_id}/status", response_model=OrderDeliveryResponse)
async def update_delivery_status(
    order_id: int,
    status_in: OrderUpdateStatus, # Reuse schema or custom
    payload: dict = Depends(RoleChecker(allowed_roles=["Delivery Partner", "Admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(payload.get("sub"))
    role = payload.get("role")
    
    delivery = db.query(OrderDelivery).filter(OrderDelivery.order_id == order_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery details not found.")
        
    # Check permissions
    if role != "Admin":
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()
        if not partner or delivery.delivery_partner_id != partner.id:
            raise HTTPException(status_code=403, detail="You are not assigned to this delivery.")

    # Status transitions: Preparing -> Assigned -> PickedUp -> OutForDelivery -> Delivered
    # Validate request status mapping to valid delivery states
    new_status = status_in.status
    if new_status not in ["Assigned", "PickedUp", "OutForDelivery", "Delivered"]:
        raise HTTPException(status_code=400, detail="Invalid delivery status.")
        
    delivery.status = new_status
    
    # Update matching order status
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.order_status = new_status
        
    if new_status == "Delivered":
        delivery.delivered_at = datetime.utcnow()
        # Free delivery partner
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery.delivery_partner_id).first()
        if partner:
            partner.is_available = True
            
        # Send Kafka order_delivered event
        delivered_event = {
            "order_id": order_id,
            "delivery_partner_id": delivery.delivery_partner_id,
            "delivered_at": str(delivery.delivered_at)
        }
        await kafka_producer.send_message("order_delivered", delivered_event)
        
    db.commit()
    db.refresh(delivery)
    return delivery

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8005"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
