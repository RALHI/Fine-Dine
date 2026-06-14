import os
import uuid
import logging
from typing import List, Dict, Any

from chatbot_service.vector_store import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IngestionPipeline")

class IngestionPipeline:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store

    def chunk_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
        """Simple sliding window chunking mechanism."""
        chunks = []
        words = text.split()
        
        # Approximate words for character limit
        words_per_chunk = chunk_size // 5
        overlap_words = chunk_overlap // 5
        
        i = 0
        while i < len(words):
            chunk_words = words[i:i + words_per_chunk]
            chunks.append(" ".join(chunk_words))
            if i + words_per_chunk >= len(words):
                break
            i += (words_per_chunk - overlap_words)
            
        return chunks

    def ingest_document(self, text: str, source: str, category: str) -> bool:
        chunks = self.chunk_text(text)
        logger.info(f"Splitting source document '{source}' into {len(chunks)} chunks.")
        
        documents = []
        for i, chunk in enumerate(chunks):
            documents.append({
                "id": f"{source.replace('.', '_')}_chunk_{i}_{uuid.uuid4().hex[:6]}",
                "text": chunk,
                "metadata": {
                    "source": source,
                    "category": category,
                    "index": i
                }
            })
            
        return self.vector_store.insert_embeddings(documents)

def load_default_knowledge_base(vector_store: VectorStore):
    """Populates default policies, FAQs, refund rules, and delivery partner information."""
    pipeline = IngestionPipeline(vector_store)
    
    knowledge_base = {
        "refund_policy.txt": (
            "Refund Rules & Refund Policy:\n"
            "1. Customers can request a full refund if they cancel their order within 60 seconds of placing it.\n"
            "2. If the food delivered is incorrect, cold, or damaged, customers can upload a photo and receive a full or partial refund to their wallet within 3-5 business days.\n"
            "3. If delivery is delayed by more than 45 minutes beyond the estimated time of arrival (ETA), customers receive a 50% discount voucher or refund on request.\n"
            "4. Refund requests must be made via the app support page or chatbot within 24 hours of delivery. Out-of-time requests will not be approved."
        ),
        "delivery_guidelines.txt": (
            "Delivery Guidelines and Policies:\n"
            "1. Our delivery hours are 24/7. However, delivery speed is subject to local traffic and weather conditions.\n"
            "2. Delivery partners must pick up packages from the designated restaurant checkout counter and verify order numbers to avoid incorrect deliveries.\n"
            "3. High-traffic delays: If a rider is caught in heavy traffic, they are instructed to update their status to 'OutForDelivery' and contact the customer directly using the phone number listed on the order details page.\n"
            "4. contactless delivery: Delivery riders can leave the food at the doorstep and send a photo confirmation if contactless delivery is requested by the customer."
        ),
        "faq.txt": (
            "Frequently Asked Questions (FAQ):\n"
            "Q: How do I track my order?\n"
            "A: You can track your order status in real-time from the Order History page on the Customer Dashboard. The states will update from 'Created' to 'Paid', 'Preparing', 'Assigned', 'OutForDelivery', and 'Delivered'.\n\n"
            "Q: What forms of payment are accepted?\n"
            "A: We accept credit/debit cards, net banking, and in-app wallets. Payments are processed immediately upon order checkout.\n\n"
            "Q: Can I change my delivery address after placing an order?\n"
            "A: Address changes are only permitted before the status changes to 'Preparing'. Contact support immediately if you need to modify your delivery details."
        ),
        "restaurant_recs.txt": (
            "Restaurant Information and Recommendations:\n"
            "1. Bella Italia: Famous for its authentic Neapolitan pizzas, freshly baked lasagna, and tiramisu. Average rating is 4.8. Location: 12 Broadway Ave.\n"
            "2. Green Garden Salads: Best healthy food spot. Serves organic salad bowls, keto meals, vegan wraps, and cold-pressed juices. Average rating is 4.5. Location: 45 Park Place.\n"
            "3. Wok & Roll: Premium Asian cuisine serving spicy Kung Pao chicken, sushi rolls, dim sums, and bubble tea. Average rating is 4.6. Location: 78 Silk Road.\n"
            "4. Burger House: Flame-grilled gourmet burgers, double cheese melts, crispy onion rings, and chocolate milkshakes. Average rating is 4.4. Location: 8 Main Street."
        )
    }
    
    logger.info("Ingesting default knowledge base files...")
    for source, content in knowledge_base.items():
        category = source.split("_")[0].split(".")[0]
        pipeline.ingest_document(content, source, category)
    logger.info("Knowledge base ingestion completed.")
