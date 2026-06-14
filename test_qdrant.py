import os
import sys

# Set PYTHONPATH to root so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../Downloads/Food Delivery App")))

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid

def main():
    print("Initializing QdrantClient(location=':memory:')...")
    client = QdrantClient(location=":memory:")
    
    collection_name = "test_collection"
    print(f"Creating collection '{collection_name}'...")
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=4, distance=Distance.COSINE)
    )
    
    # Insert points
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=[0.1, 0.1, 0.1, 0.1],
            payload={"text": "hello world"}
        )
    ]
    print("Upserting point...")
    client.upsert(collection_name=collection_name, points=points)
    
    # Search via query_points
    print("Querying via query_points...")
    results = client.query_points(
        collection_name=collection_name,
        query=[0.1, 0.1, 0.1, 0.1],
        limit=1
    ).points
    
    print(f"Query results count: {len(results)}")
    for r in results:
        print(f"Result: id={r.id}, score={r.score}, payload={r.payload}")

if __name__ == "__main__":
    main()
