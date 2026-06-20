# Walkthrough - Qdrant & React JS Frontend Pivot

We have successfully migrated the vector database layers from Pinecone to **Qdrant** and completely redesigned the frontend into a client-side **React JS (using Vite)** application.

---

## Architectural Pivot Details

### 1. Vector Database Layer: Qdrant
* **Client**: Uses `qdrant-client` instead of Pinecone.
* **Collection creation**: Automatically checks if collection `food_delivery_faq` exists and constructs it with a dimension size of `384` and `Cosine` distance mapping.
* **Point Uploading**: Hashes document ID strings into stable standard UUID string representations (`uuid.uuid5`) to enforce Qdrant vector database identifier criteria.
* **RAG Retrieval**: Searches collections using `qdrant_client.models.Filter` for payload key-value filtering matching semantic context requests.
* **Fallback Connection**: Gracefully initializes `QdrantClient(location=":memory:")` if local/docker server connection fails, enabling 100% offline local validation out-of-the-box.

### 2. Frontend Layer: React JS (Vite)
The Jinja2 HTML templates were removed and replaced with a React web client:
* **Entrypoints**: [package.json](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/package.json), [vite.config.js](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/vite.config.js), [index.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/index.html).
* **DOM Mounting**: [main.jsx](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/src/main.jsx) mounting [App.jsx](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/src/App.jsx).
* **Navigation routing**: Uses `react-router-dom` to coordinate views: Home, Auth logins/signups, Listings, Store details, Cart checkout, and Customer/Owner/Delivery/Admin dashboards.
* **Real-time elements**: Polling timers query order status endpoints every 5 seconds, updating customer delivery tracking progress bars.
* **Style design**: Sleek minimal color variables defined in [index.css](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/src/index.css).
* **Chatbot widget**: [ChatbotWidget.jsx](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/src/components/ChatbotWidget.jsx) maintains session states, support quick prompts, displays citations, and fetches answers.

### 3. API Gateway Proxying
* [gateway/main.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/gateway/main.py) proxies `/api/...` to the backend microservices.
* All other requests (such as static React assets, styles, javascript files, and routes) are proxied directly to the Vite frontend server at `http://frontend:5173`.
* This allows the entire application to run seamlessly on a single port (**8000**), eliminating CORS complications.

### 4. Containerization and Docker Compose
* **Qdrant DB container**: `qdrant` container runs the database image `qdrant/qdrant:latest` mapping storage volumes.
* **Frontend container**: `frontend` container runs node build steps, mounts the directory, and starts the development server via `npm run dev`.
* **Microservices env**: Updated `chatbot-service` and `gateway` configurations.
