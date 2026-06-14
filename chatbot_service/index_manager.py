import os
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from qdrant_client.http.exceptions import UnexpectedResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IndexManager")

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "food_delivery_faq")
DIMENSION = 384  # Size of all-MiniLM-L6-v2 embeddings

class QdrantIndexManager:
    def __init__(self):
        self.host = QDRANT_HOST
        self.port = QDRANT_PORT
        self.collection_name = COLLECTION_NAME
        self.client = None
        self.mock_mode = False

        # Attempt connection to Qdrant server
        try:
            logger.info(f"Connecting to Qdrant server at {self.host}:{self.port}...")
            self.client = QdrantClient(host=self.host, port=self.port, timeout=5)
            # Ping to verify
            self.client.get_collections()
            logger.info("Connected to Qdrant successfully.")
        except Exception as e:
            logger.warning(
                f"Failed to connect to Qdrant server at {self.host}:{self.port}. "
                f"Falling back to local IN-MEMORY database. Error: {e}"
            )
            self.client = QdrantClient(location=":memory:")
            self.mock_mode = True

    def create_collection(self, collection_name: str = COLLECTION_NAME, dimension: int = DIMENSION):
        """Create a collection if it does not already exist."""
        try:
            collections = self.client.get_collections().collections
            existing_names = [col.name for col in collections]
            
            if collection_name not in existing_names:
                logger.info(f"Creating Qdrant collection: '{collection_name}' with size {dimension}...")
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=dimension, distance=Distance.COSINE),
                )
                logger.info(f"Qdrant collection '{collection_name}' created successfully.")
            else:
                logger.info(f"Qdrant collection '{collection_name}' already exists.")
            return True
        except Exception as e:
            logger.error(f"Error creating Qdrant collection '{collection_name}': {e}")
            return False

    def delete_collection(self, collection_name: str = COLLECTION_NAME):
        """Delete collection from Qdrant."""
        try:
            logger.info(f"Deleting Qdrant collection: '{collection_name}'...")
            self.client.delete_collection(collection_name=collection_name)
            logger.info(f"Qdrant collection '{collection_name}' deleted.")
            return True
        except Exception as e:
            logger.error(f"Error deleting Qdrant collection '{collection_name}': {e}")
            return False

    def get_client(self) -> QdrantClient:
        return self.client
