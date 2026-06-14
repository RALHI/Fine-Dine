import os
import logging
from typing import List, Dict, Tuple
from chatbot_service.vector_store import VectorStore

# Try importing huggingface_hub
try:
    from huggingface_hub import InferenceClient
except ImportError:
    InferenceClient = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChatbotAgent")

HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-7B-Instruct")

class ChatbotAgent:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.client = None
        self.mock_llm = True
        
        # Session memory store: {session_id: [{"role": "user/assistant", "content": "..."}]}
        self.memory: Dict[str, List[Dict[str, str]]] = {}
        
        if HF_API_KEY:
            try:
                if InferenceClient:
                    self.client = InferenceClient(model=HF_MODEL, token=HF_API_KEY)
                    self.mock_llm = False
                    logger.info(f"Hugging Face InferenceClient initialized using model: {HF_MODEL}")
                else:
                    logger.warning("huggingface_hub not installed. Running LLM in Mock mode.")
            except Exception as e:
                logger.error(f"Failed to initialize Hugging Face client: {e}. Running in Mock mode.")
        else:
            logger.warning("HF_API_KEY is not set. Chatbot will run in offline Mock/Fallback mode.")

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        if session_id not in self.memory:
            self.memory[session_id] = []
        return self.memory[session_id]

    def add_to_history(self, session_id: str, role: str, content: str):
        history = self.get_history(session_id)
        history.append({"role": role, "content": content})
        # Keep last 8 exchanges to prevent context bloat
        if len(history) > 16:
            self.memory[session_id] = history[-16:]

    def generate_response(self, session_id: str, query: str) -> Tuple[str, List[str]]:
        # 1. Retrieve relevant contexts from Pinecone/local DB
        matches = self.vector_store.query_vectors(query, top_k=3)
        
        context_str = ""
        citations = []
        for i, match in enumerate(matches):
            metadata = match.get("metadata", {})
            text = metadata.get("text", "")
            source = metadata.get("source", "Unknown")
            
            context_str += f"Context {i+1} (Source: {source}):\n{text}\n\n"
            if source not in citations:
                citations.append(source)
                
        # 2. Retrieve history
        history = self.get_history(session_id)
        history_str = ""
        for message in history:
            history_str += f"{message['role'].capitalize()}: {message['content']}\n"
            
        # 3. Construct LLM prompt
        system_prompt = (
            "You are a helpful, professional, and friendly AI customer support assistant for a Food Delivery App.\n"
            "Use the provided context chunks to answer customer queries. If you don't know the answer, politely tell them so.\n"
            "Refer to the policies and FAQs provided. Keep your answers concise, accurate, and structured.\n"
        )
        
        prompt = (
            f"{system_prompt}\n"
            f"Here is the context information retrieved from the knowledge base:\n"
            f"---------------------\n"
            f"{context_str}"
            f"---------------------\n"
            f"Conversation History:\n"
            f"{history_str}"
            f"User: {query}\n"
            f"Assistant:"
        )

        response_content = ""
        
        # 4. Invoke LLM or Fallback Mock
        if not self.mock_llm and self.client:
            try:
                # Use huggingface inference api text generation
                # We request completion from model
                # To handle Qwen/Mistral instruct prompt styling, we use completion
                logger.info(f"Querying Qwen Hugging Face model for: {query[:30]}...")
                response = self.client.text_generation(
                    prompt=prompt,
                    max_new_tokens=256,
                    temperature=0.7,
                    repetition_penalty=1.1
                )
                response_content = response.strip()
            except Exception as e:
                logger.error(f"HF text_generation failed: {e}. Falling back to Rule-Based Support Chatbot.")
                response_content = self.get_rule_based_fallback(query, context_str)
        else:
            response_content = self.get_rule_based_fallback(query, context_str)
            
        # 5. Save exchange in memory
        self.add_to_history(session_id, "user", query)
        self.add_to_history(session_id, "assistant", response_content)
        
        return response_content, citations

    def get_rule_based_fallback(self, query: str, context: str) -> str:
        """
        An intelligent keyword fallback matching algorithm that parses the retrieved context chunks
        or matches key domains (refunds, tracking, menu, delivery rules) if LLM api isn't active.
        """
        q = query.lower()
        
        # Check context first
        if "refund" in q and "refund" in context.lower():
            return (
                "Based on our policy: You can request a full refund if you cancel your order within 60 seconds of placing it. "
                "If the items are incorrect, cold, or damaged, you can upload a photo via the support page for a full or partial refund. "
                "Refund requests must be filed within 24 hours of delivery."
            )
        elif ("track" in q or "status" in q) and "faq" in context.lower():
            return (
                "You can track your order in real-time from the 'Order History' tab in your Customer Dashboard. "
                "The order progress stages are: Created -> Paid -> Preparing -> Assigned -> OutForDelivery -> Delivered."
            )
        elif ("restaurant" in q or "recommend" in q or "eat" in q) and "restaurant" in context.lower():
            return (
                "Here are some top-rated recommendations:\n"
                "• Bella Italia (Rating: 4.8) - Neapolitan pizza & Italian cuisine at 12 Broadway Ave.\n"
                "• Green Garden Salads (Rating: 4.5) - Salad bowls & organic healthy items at 45 Park Place.\n"
                "• Wok & Roll (Rating: 4.6) - Dim Sum & Asian wok items at 78 Silk Road.\n"
                "• Burger House (Rating: 4.4) - Flame-grilled burgers & shakes at 8 Main Street."
            )
        elif "delivery" in q and "delivery" in context.lower():
            return (
                "Our delivery services run 24/7. Standard delivery speed depends on traffic and weather conditions. "
                "Riders verify order numbers at pickup. Contactless delivery (leaving orders at your doorstep with photo confirmation) "
                "can be requested at checkout."
            )
            
        # Default response
        return (
            "I'm here to help with your food orders! You can ask me about restaurant recommendations, refund policies, "
            "order tracking, or general FAQs. Could you please specify your question?"
        )
