from chatbot_service.vector_store import VectorStore
from chatbot_service.ingestion_pipeline import IngestionPipeline, load_default_knowledge_base
from chatbot_service.chatbot_agent import ChatbotAgent

def test_vector_store_fallback():
    # Setup VectorStore (will run in mock/in-memory mode because PINECONE_API_KEY is not set)
    store = VectorStore()
    
    docs = [
        {"id": "doc_1", "text": "Our refund policy allows cancellations within 60 seconds of checkout.", "metadata": {"source": "rules.txt", "category": "refund"}},
        {"id": "doc_2", "text": "Delivery riders deliver organic items and burgers 24/7.", "metadata": {"source": "delivery.txt", "category": "delivery"}}
    ]
    
    # Insert vectors
    assert store.insert_embeddings(docs) is True
    
    # Query vectors locally via Qdrant Cosine Similarity search
    results = store.query_vectors("refund policy cancellation", top_k=1)
    assert len(results) == 1
    assert "60 seconds" in results[0]["metadata"]["text"]

def test_chatbot_agent_rag():
    store = VectorStore()
    # Ingest default data
    load_default_knowledge_base(store)
    
    agent = ChatbotAgent(store)
    session_id = "test-session-123"
    
    # Query refund details
    reply, citations = agent.generate_response(session_id, "What are the rules for getting a refund?")
    
    # Verify response
    assert len(citations) > 0
    assert "refund_policy.txt" in citations
    assert "refund" in reply.lower()
    
    # Test conversational history memory
    history = agent.get_history(session_id)
    assert len(history) == 2  # User message and assistant reply
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
