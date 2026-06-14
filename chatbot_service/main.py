import os
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from common.schemas import ChatRequest, ChatResponse
from chatbot_service.vector_store import VectorStore
from chatbot_service.ingestion_pipeline import load_default_knowledge_base
from chatbot_service.chatbot_agent import ChatbotAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChatbotService")

app = FastAPI(
    title="Chatbot Service",
    description="RAG-powered conversational customer assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
vector_store = None
chatbot_agent = None

@app.on_event("startup")
def startup_event():
    global vector_store, chatbot_agent
    logger.info("Initializing vector store & loading knowledge base...")
    vector_store = VectorStore()
    
    # Pre-populate Vector Store with default FAQs, rules, etc.
    try:
        load_default_knowledge_base(vector_store)
    except Exception as e:
        logger.error(f"Error loading initial knowledge base: {e}")
        
    chatbot_agent = ChatbotAgent(vector_store)
    logger.info("Chatbot Service components successfully initialized.")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "chatbot_service"}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    global chatbot_agent
    if not chatbot_agent:
        raise HTTPException(status_code=503, detail="Chatbot agent is not initialized yet.")
        
    try:
        session_id = request.session_id or "default"
        reply, citations = chatbot_agent.generate_response(session_id, request.message)
        
        return ChatResponse(
            response=reply,
            citations=citations,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Error processing chatbot request: {e}")
        raise HTTPException(status_code=500, detail=f"Internal chatbot error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8007"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
