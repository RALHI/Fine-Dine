import os
import uuid
import logging
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from common.database import get_db, SessionLocal, Payment, Order
from common.schemas import PaymentResponse
from common.kafka_client import KafkaProducerWrapper, KafkaConsumerWrapper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PaymentService")

app = FastAPI(
    title="Payment Service",
    description="Processes payments, records transactions, and updates order states",
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
# Consumer for 'order_created' topic
order_consumer = KafkaConsumerWrapper(topic="order_created", group_id="payment_service_group")

async def process_payment_event(event: dict):
    """Kafka event handler for order_created."""
    order_id = event.get("order_id")
    total_amount = event.get("total_amount")
    
    logger.info(f"Processing payment for Order ID: {order_id}, Amount: {total_amount}")
    
    # Process payment simulation (always approve for demo purposes)
    await asyncio.sleep(2)  # Simulate gateway roundtrip
    
    db: Session = SessionLocal()
    try:
        # Check order existence
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            logger.error(f"Order {order_id} not found in DB during payment processing.")
            return

        transaction_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        payment = Payment(
            order_id=order_id,
            payment_status="Completed",
            transaction_id=transaction_id,
            amount=total_amount
        )
        db.add(payment)
        
        # Update order status to 'Paid'
        order.order_status = "Paid"
        db.commit()
        logger.info(f"Payment approved for Order {order_id}. Txn ID: {transaction_id}")
        
        # Publish payment_completed to Kafka
        payment_event = {
            "order_id": order_id,
            "amount": total_amount,
            "transaction_id": transaction_id,
            "status": "Completed"
        }
        await kafka_producer.send_message("payment_completed", payment_event)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing payment for Order {order_id}: {e}")
    finally:
        db.close()

async def start_kafka_consumer():
    """Startup wrapper for Kafka consumer."""
    await order_consumer.start()
    # Listen loop runs as a task in background
    asyncio.create_task(order_consumer.listen(process_payment_event))

@app.on_event("startup")
async def startup_event():
    await kafka_producer.start()
    await start_kafka_consumer()

@app.on_event("shutdown")
async def shutdown_event():
    await kafka_producer.stop()
    await order_consumer.stop()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "payment_service"}

@app.get("/api/payments/{order_id}", response_model=PaymentResponse)
def get_payment_status(order_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment transaction not found for this order.")
    return payment

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8004"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
