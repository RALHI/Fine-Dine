import os
import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from chatbot_service.index_manager import QdrantIndexManager, COLLECTION_NAME

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VectorStore")

class VectorStore:
    def __init__(self):
        # Load embedding model
        if SentenceTransformer:
            try:
                logger.info("Loading SentenceTransformer model 'sentence-transformers/all-MiniLM-L6-v2'...")
                self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading SentenceTransformer: {e}. Falling back to mock embeddings.")
                self.model = None
        else:
            logger.warning("SentenceTransformer package not found. Dynamic embedding generation is disabled.")
            self.model = None
            
        # Initialize Qdrant Manager
        self.manager = QdrantIndexManager()
        self.client = self.manager.get_client()
        
        # Auto-create collection on startup
        self.manager.create_collection()

    def get_embedding(self, text: str) -> List[float]:
        """Generate a vector representation of the text."""
        if not self.model:
            # Fallback mock embedding (empty list of dimension 384)
            return [0.1] * 384
            
        embedding = self.model.encode(text)
        return embedding.tolist()

    def insert_embeddings(self, documents: List[Dict[str, Any]]) -> bool:
        """
        documents format:
        [
            {
                "id": "doc_1",
                "text": "Chunk text content",
                "metadata": {"source": "faq.txt", "category": "refund"}
            }
        ]
        """
        points = []
        for doc in documents:
            text = doc["text"]
            embedding = self.get_embedding(text)
            
            # Combine text into metadata payload
            payload = doc.get("metadata", {}).copy()
            payload["text"] = text
            
            # In Qdrant, IDs must be standard UUID string formats or 64-bit ints.
            # Convert arbitrary string IDs to a valid stable UUID string.
            point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, doc["id"]))
            
            points.append(PointStruct(
                id=point_uuid,
                vector=embedding,
                payload=payload
            ))
            
        try:
            self.client.upsert(
                collection_name=COLLECTION_NAME,
                points=points
            )
            logger.info(f"Upserted {len(documents)} points into Qdrant collection '{COLLECTION_NAME}'.")
            return True
        except Exception as e:
            logger.error(f"Error upserting vectors to Qdrant collection: {e}")
            return False

    def query_vectors(
        self, 
        query_text: str, 
        top_k: int = 3, 
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Query similar vectors from Qdrant collection."""
        query_vector = self.get_embedding(query_text)
        
        # Setup Qdrant filter
        qdrant_filter = None
        if filter_dict:
            conditions = []
            for k, v in filter_dict.items():
                conditions.append(
                    FieldCondition(
                        key=k,
                        match=MatchValue(value=v)
                    )
                )
            qdrant_filter = Filter(must=conditions)
            
        try:
            response = self.client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                query_filter=qdrant_filter,
                limit=top_k
            )
            
            formatted_results = []
            for match in response.points:
                formatted_results.append({
                    "id": str(match.id),
                    "score": match.score,
                    "metadata": match.payload
                })
            return formatted_results
        except Exception as e:
            logger.error(f"Error querying Qdrant collection: {e}")
            return []
