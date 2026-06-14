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

---

## Menu Image Scanner & Chatbot Fixes (June 2026)

### 1. Restaurant Service Container Rebuild
* **Issue**: The AI Menu Scanner was failing with `Not Found (404)` because the `restaurant_service` container was running an outdated image created before the `@app.post("/api/restaurants/{id}/menu/scan-image")` route was added.
* **Fix**: Rebuilt the `restaurant-service` image (`docker-compose build restaurant-service`) and recreated the container (`docker-compose up -d --no-deps restaurant-service`). The endpoint is now active and routing requests successfully.

### 2. Chatbot Service HF API Key Binding
* **Issue**: The `chatbot-service` environment in `docker-compose.yml` was hardcoded to `HF_API_KEY=`, which overrode/ignored the `HF_API_KEY` defined by the user in the `.env` file.
* **Fix**: Updated `docker-compose.yml` to use `HF_API_KEY=${HF_API_KEY:-}` and `HF_MODEL=${HF_MODEL:-Qwen/Qwen2.5-7B-Instruct}`. Rebuilt and restarted the chatbot service container, verifying successful initialization using the user's Hugging Face token.

### 3. Active Menu Management (Edit, Delete, Availability & Image Upload)
* **Backend endpoints**: Added `PUT /api/restaurants/{id}/menu/{item_id}`, `DELETE /api/restaurants/{id}/menu/{item_id}`, `POST /api/restaurants/{id}/menu/{item_id}/image`, and static image serving at `GET /api/restaurants/images/{filename}`.
* **Frontend UI**: Upgraded the Active Menu list in the Restaurant Owner dashboard with a premium styled layout featuring:
  - Editable form inputs for dish Name, Description, Price, and Availability status.
  - Image thumbnails for dishes with hover effects and direct file dialog image upload support.
  - Quick action buttons for updating, deleting, and uploading photos for each item in the menu list.

### 4. Multi-Currency Support across Dashboards
* **Integrations**: Integrated the `useCurrency` context hook in `Dashboards.jsx` across all dashboard roles:
  - **CustomerDashboard**: Formatted paid order totals dynamically according to the chosen currency.
  - **OwnerDashboard**: Formatted active menu list prices and incoming order totals. Updated the price input label and placeholder to match the current currency symbol. Handled decimal formatting rules (e.g. JPY has 0 decimals).
  - **DeliveryDashboard**: Converted and formatted delivery completed earnings and rates.
  - **AdminDashboard**: Formatted Total Sales revenue metrics and logs.
* **Auto-Conversion**: When an owner manually publishes or edits a dish, the price they enter is automatically converted from the selected currency back to USD before saving to the backend (ensuring consistency in DB storage).

### 5. Hugging Face Vision Fallback for Menu Scanner
* **Mechanism**: Added fallback logic to the backend `/api/restaurants/{id}/menu/scan-image` endpoint.
* **Flow**:
  1. Try calling Google Gemini Vision API (`gemini-1.5-flash`).
  2. If the Gemini API call fails for any reason (404, quota limits, empty response, network timeout), the service automatically falls back to the Hugging Face Serverless Inference API using `Qwen/Qwen2-VL-7B-Instruct` (or custom configured `HF_VISION_MODEL`).
  3. Uses standard vision completion payloads passing the base64-encoded image to extract structured JSON menu lists.
* **Env bindings**: Configured `HF_API_KEY` and `HF_VISION_MODEL` in the `restaurant-service` docker environment setup to allow seamless authentication with Hugging Face.

### 6. AI Menu Scanner Review UI Upgrades
* **Image Uploads**: Added the ability for restaurant owners to upload photos for each individually scanned dish directly from the AI Menu Scanner's review table. When the items are published, the frontend automatically posts the corresponding image files to the backend for each newly created menu item.
* **Currency Formatting**: Integrated the `useCurrency` context directly into the review table. The price column header dynamically displays the selected currency symbol (e.g. `Price (₹)` or `Price (€)`), and prices are properly converted back to USD on the backend using active exchange rates before publishing.

### 7. Frontend Role-Based Access Control (RBAC) Security
* **Issue**: Unauthenticated or unauthorized users (like a standard Customer) could potentially access the `/admin`, `/owner`, or `/delivery` dashboard routes simply by typing the URL manually in the browser.
* **Fix**: Built a robust `ProtectedRoute.jsx` React component that acts as a secure middleware wrapper for application routes. It explicitly validates both the presence of a JWT token in `localStorage` and strictly enforces that the user's role exactly matches the expected role for that dashboard. If unauthorized, it elegantly catches the request and redirects them immediately to the login page.
* **Impact**: Total lockdown of dashboard URLs, guaranteeing strong client-side security that matches the existing FastAPI backend role-check dependencies.

### 8. Order Editing & Cancellation Grace Period
* **Issue**: Users lacked the ability to modify or cancel their orders immediately after checking out in case they made a mistake or forgot an item.
* **Fix**: Implemented a **30-second Grace Period** across the entire stack.
  * *Backend*: Added a secure `POST /api/orders/{id}/cancel` endpoint in the `order_service` that strictly enforces a 30-second cutoff calculation against the order's `created_at` timestamp in the database.
  * *Frontend*: Built a dynamic `OrderGracePeriod` UI component in the Customer Dashboard that displays a live countdown timer next to newly created orders.
  * *Editing Flow*: Built a seamless "Edit Order" UX that gracefully cancels the erroneous order, dynamically fetches the restaurant's menu, securely reconstructs the exact items back into the user's local `cart` cache, and instantly redirects them back to the restaurant's menu page so they can comfortably add or remove items before checking out again.

### 9. Customer Dashboard UI Overhaul
* **Tab Navigation**: Replaced the static, simple Customer Dashboard with a dynamic, tabbed navigation menu interface. Customers can now smoothly switch between multiple full-page views using the sidebar.
* **New Sections**:
  - **Your Orders**: The previous active tracking and history list.
  - **Your Addresses**: A new, expanded grid view of saved delivery addresses featuring direct add, edit, and delete placeholders. It visually emphasizes default delivery locations.
  - **Your Cards**: A dedicated space for securely saving payment methods and credit cards.
  - **Rewards**: A "FoodDash Platinum" rewards points portal where users can see their current point balance and redeem available offers like Free Delivery or 20% discounts.
