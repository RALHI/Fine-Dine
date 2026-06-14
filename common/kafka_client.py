import os
import json
import logging
import asyncio
from typing import Callable, Any, Optional
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError

# Configure Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KafkaClient")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
DLQ_SUFFIX = "_dlq"

class KafkaProducerWrapper:
    def __init__(self, bootstrap_servers: str = KAFKA_BOOTSTRAP_SERVERS):
        self.bootstrap_servers = bootstrap_servers
        self.producer: Optional[AIOKafkaProducer] = None
        self.mock_mode = False

    async def start(self):
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                retry_backoff_ms=500,
                request_timeout_ms=5000
            )
            await self.producer.start()
            logger.info(f"Kafka Producer started on servers: {self.bootstrap_servers}")
        except KafkaConnectionError as e:
            logger.warning(f"Failed to connect to Kafka at {self.bootstrap_servers}. Falling back to MOCK mode. Error: {e}")
            self.mock_mode = True

    async def send_message(self, topic: str, message: dict, retries: int = 3) -> bool:
        if self.mock_mode or not self.producer:
            logger.info(f"[MOCK KAFKA PRODUCER] Topic: '{topic}' | Message: {message}")
            # Simulate processing of mock queue events for internal sub-tasks if needed
            return True

        for attempt in range(1, retries + 1):
            try:
                await self.producer.send_and_wait(topic, message)
                logger.info(f"Published message to {topic}: {message}")
                return True
            except Exception as e:
                logger.error(f"Error publishing to {topic} (Attempt {attempt}/{retries}): {e}")
                if attempt == retries:
                    # Send to DLQ
                    dlq_topic = f"{topic}{DLQ_SUFFIX}"
                    logger.warning(f"Sending message to Dead Letter Queue: {dlq_topic}")
                    try:
                        await self.producer.send_and_wait(dlq_topic, {
                            "original_message": message,
                            "error": str(e),
                            "topic": topic
                        })
                    except Exception as dlq_err:
                        logger.error(f"Critical: Failed to publish to DLQ: {dlq_err}")
                await asyncio.sleep(1)
        return False

    async def stop(self):
        if self.producer and not self.mock_mode:
            await self.producer.stop()
            logger.info("Kafka Producer stopped.")

class KafkaConsumerWrapper:
    def __init__(
        self, 
        topic: str, 
        group_id: str, 
        bootstrap_servers: str = KAFKA_BOOTSTRAP_SERVERS
    ):
        self.topic = topic
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.mock_mode = False
        self._running = False

    async def start(self):
        try:
            self.consumer = AIOKafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                auto_offset_reset="earliest"
            )
            await self.consumer.start()
            self._running = True
            logger.info(f"Kafka Consumer started for topic: {self.topic}, group: {self.group_id}")
        except KafkaConnectionError as e:
            logger.warning(f"Failed to connect to Kafka at {self.bootstrap_servers} for consumer. Falling back to MOCK mode. Error: {e}")
            self.mock_mode = True
            self._running = True

    async def listen(self, callback: Callable[[dict], Any]):
        if self.mock_mode:
            logger.info(f"[MOCK KAFKA CONSUMER] Listening to '{self.topic}' (mock mode)")
            while self._running:
                await asyncio.sleep(2) # Keep loop alive
            return

        try:
            async for msg in self.consumer:
                if not self._running:
                    break
                logger.info(f"Received message on {self.topic}: {msg.value}")
                try:
                    # Invoke consumer callback
                    if asyncio.iscoroutinefunction(callback):
                        await callback(msg.value)
                    else:
                        callback(msg.value)
                except Exception as handler_err:
                    logger.error(f"Error handling message in consumer for topic {self.topic}: {handler_err}")
        except Exception as e:
            logger.error(f"Consumer loop error on topic {self.topic}: {e}")
        finally:
            await self.stop()

    async def stop(self):
        self._running = False
        if self.consumer and not self.mock_mode:
            await self.consumer.stop()
            logger.info(f"Kafka Consumer for topic {self.topic} stopped.")
