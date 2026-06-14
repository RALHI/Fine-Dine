import os
import logging
import asyncio
from datetime import datetime
from typing import List, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.kafka_client import KafkaConsumerWrapper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NotificationService")

app = FastAPI(
    title="Notification Service",
    description="Consumes events and generates alerts/logs for customers",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for notifications (max 100 for simplicity)
notification_logs: List[Dict] = []
logs_lock = asyncio.Lock()

async def record_notification(msg: str, user_id: int = 0):
    async with logs_lock:
        notification_logs.insert(0, {
            "timestamp": datetime.utcnow().isoformat(),
            "message": msg,
            "user_id": user_id
        })
        if len(notification_logs) > 100:
            notification_logs.pop()

# Setup Consumers
order_created_consumer = KafkaConsumerWrapper(topic="order_created", group_id="notification_order_group")
delivery_assigned_consumer = KafkaConsumerWrapper(topic="delivery_assigned", group_id="notification_delivery_group")

async def handle_order_created(event: dict):
    order_id = event.get("order_id")
    user_id = event.get("user_id", 0)
    total_amount = event.get("total_amount")
    msg = f"Order #{order_id} placed successfully. Total Amount: ${total_amount:.2f}. Payment is processing."
    logger.info(f"[Notification Alert] User {user_id}: {msg}")
    await record_notification(msg, user_id)

async def handle_delivery_assigned(event: dict):
    order_id = event.get("order_id")
    partner_name = event.get("delivery_partner_name")
    phone = event.get("phone")
    # Query database to find which user owns the order, but for notifications we notify the system
    msg = f"Delivery rider {partner_name} ({phone}) is assigned to your Order #{order_id} and preparing to pick it up."
    logger.info(f"[Notification Alert] Order {order_id}: {msg}")
    await record_notification(msg)

async def start_consumers():
    # Start order_created consumer
    await order_created_consumer.start()
    asyncio.create_task(order_created_consumer.listen(handle_order_created))

    # Start delivery_assigned consumer
    await delivery_assigned_consumer.start()
    asyncio.create_task(delivery_assigned_consumer.listen(handle_delivery_assigned))

@app.on_event("startup")
async def startup_event():
    await start_consumers()

@app.on_event("shutdown")
async def shutdown_event():
    await order_created_consumer.stop()
    await delivery_assigned_consumer.stop()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "notification_service"}

@app.get("/api/notifications")
async def get_notifications():
    async with logs_lock:
        return notification_logs

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8006"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
