# Walkthrough - Food Delivery Web Application

We have successfully developed the production-grade, microservices-based Food Delivery Web Application from scratch. The codebase follows clean architecture, SOLID principles, and event-driven patterns.

---

## What was Built

### 1. Codebase Structure

The folders and files are organized exactly as planned:

* [requirements.txt](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/requirements.txt): Package list.
* [common/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/common): Reusable libraries.
  * [database.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/common/database.py): SQLAlchemy models.
  * [security.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/common/security.py): Bcrypt & JWT verification dependencies.
  * [kafka_client.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/common/kafka_client.py): Producer/Consumer wrappers with retries & DLQ support.
  * [schemas.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/common/schemas.py): Pydantic validation structures.
* [user_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/user_service): User profile management.
* [restaurant_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/restaurant_service): Caches menus on Redis.
* [order_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/order_service): Publishes `order_created` events.
* [payment_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/payment_service): Consumes `order_created`, publishes `payment_completed`.
* [delivery_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/delivery_service): Consumes `payment_completed`, assigns couriers, publishes tracking details.
* [notification_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/notification_service): Real-time alert consumer.
* [chatbot_service/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/chatbot_service): RAG AI support agent.
  * [index_manager.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/chatbot_service/index_manager.py): Pinecone.
  * [vector_store.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/chatbot_service/vector_store.py): Sentence-Transformers.
  * [ingestion_pipeline.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/chatbot_service/ingestion_pipeline.py): FAQ files ingestion.
  * [chatbot_agent.py](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/chatbot_service/chatbot_agent.py): RAG memory matching with local mock fallback.
* [gateway/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/gateway): Reverse proxy and template loader.
* [frontend/templates/](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates): Responsive web UI.
  * [base.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/base.html): CSS style template, navigation shell, and RAG Chatbot widget.
  * [index.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/index.html): Home page.
  * [login.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/login.html): JWT login.
  * [register.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/register.html): Role-based signups.
  * [restaurants.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/restaurants.html): Listings with rating, cuisine, and search filters.
  * [restaurant_details.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/restaurant_details.html): Menu and ratings.
  * [cart.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/cart.html) & [checkout.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/checkout.html): Quantities tracking, coupon validation, address select, and order checkout routing.
  * [dashboard.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/dashboard.html): Real-time customer tracking progress bar (polls every 5s).
  * [owner.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/owner.html), [admin.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/admin.html), [delivery.html](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/frontend/templates/delivery.html): Specialized control cards.
* [Dockerfile](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/Dockerfile) & [docker-compose.yml](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/docker-compose.yml): Deploy configurations.

---

## Design Aesthetics (Minimal & Sleek Theme)

The UI matches modern design aesthetics:
* **Backgrounds**: Soft `#FFFFFF` backgrounds paired with subtle borders (`#E5E7EB`) and platinum gray `#F9FAFB` surfaces.
* **Accents**: Pure emerald green `#10B981` highlight tags and dark hover transitions (`#059669`).
* **Interactivity**: Floating customer chatbot widget with typing indicator bubble animations, quick-click FAQ action chips, memory retention, and matching citations.
* **Responsive Layout**: Designed to adapt fluidly to desktop, tablet, and mobile views.

---

## Validation Results

We built robust automated tests under the `tests/` directory:
1. **Auth Testing**: Verifies registrations, duplicate validation blocks, token responses, and address records.
2. **Restaurant Testing**: Verifies restaurant profiles setup, cached menus listing, reviews uploads, and average ratings adjustments.
3. **Orders Testing**: Validates cart item calculations and totals.
4. **Chatbot Testing**: Validates vector generation cosine similarities, document ingestion scripts, memory queues, and citations matches.

### CI/CD Pipeline
An automated GitHub actions CI workflow is created at [.github/workflows/ci.yml](file:///Users/shashankralhi/Downloads/Food%20Delivery%20App/.github/workflows/ci.yml) to execute lints, tests, and docker builds on pushed commits.
