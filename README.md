# FoodDash - Production-Grade Microservices Food Delivery Application

FoodDash is a production-ready, Python-based Food Delivery Web Application built on a modern **microservices architecture** using FastAPI, PostgreSQL, Apache Kafka (KRaft mode), Redis, and an AI-powered Retrieve-and-Generate (RAG) customer assistance chatbot.

The user interface follows a professional, clean, responsive design utilizing a **minimal aesthetic** (white backgrounds, light gray card surfaces, and emerald-green accent states) built entirely in **React JS** using **Vite**.

---

## System Architecture

    Client[Web Browser / React Frontend] --> Gateway[Gateway Service :8000]
    
    Gateway --> UserSvc[User Service :8001]
    Gateway --> RestSvc[Restaurant Service :8002]
    Gateway --> OrderSvc[Order Service :8003]
    Gateway --> PaySvc[Payment Service :8004]
    Gateway --> DelivSvc[Delivery Service :8005]
    Gateway --> ChatSvc[Chatbot Service :8007]
    Gateway --> NotifSvc[Notification Service :8006]
    
    Gateway --> ReactApp[Vite React Frontend :5173]
    
    UserSvc --> DB[(PostgreSQL)]
    RestSvc --> DB
    RestSvc --> Cache[(Redis Cache)]
    OrderSvc --> DB
    PaySvc --> DB
    DelivSvc --> DB
    
    OrderSvc -.-> |order_created| Kafka[Kafka Broker :9092]
    Kafka -.-> |order_created| PaySvc
    Kafka -.-> |order_created| NotifSvc
    PaySvc -.-> |payment_completed| Kafka
    Kafka -.-> |payment_completed| DelivSvc
    DelivSvc -.-> |delivery_assigned| Kafka
    Kafka -.-> |delivery_assigned| NotifSvc
    DelivSvc -.-> |order_delivered| Kafka
    
    ChatSvc --> Qdrant[(Qdrant Vector DB :6333)]
    ChatSvc --> HF[Hugging Face LLM API / Fallback]
```

### Microservices Catalog

1. **Gateway Service (Port 8000)**: Single entry proxy point. Standardizes request header validations and handles URL forwarding to the corresponding services. Reverse proxies page hits to the React Vite container.
2. **User Service (Port 8001)**: Registration, login processing, JWT token distribution, role authorizations, and physical location coordinates management.
3. **Restaurant Service (Port 8002)**: Creation of food menus and restaurant storefront details. Employs **Redis caching** for fetch menu actions.
4. **Order Service (Port 8003)**: Validates item availabilities, calculates total prices, saves orders, and publishes the `order_created` event on Kafka.
5. **Payment Service (Port 8004)**: Simulates transaction clearances, updates order statuses to `Paid`, and produces the `payment_completed` Kafka notification.
6. **Delivery Service (Port 8005)**: Listens for paid items, selects available couriers, provisions delivery status updates (Picked Up, Out for Delivery, Delivered), and publishes corresponding events.
7. **Notification Service (Port 8006)**: Listens for order lifecycle events on Kafka and records notification history for real-time dashboard alerts.
8. **Chatbot Service (Port 8007)**: Uses Sentence Transformers (`all-MiniLM-L6-v2`) and a RAG pipeline (Qdrant + Hugging Face Qwen/Mistral) to answer queries. Feeds on text collections detailing refund rules, delivery hours, and menus.
9. **React Frontend (Port 5173)**: React JS client application running Vite, using client-side routing, Lucide icons, and real-time dashboard updates.

---

## Event-Driven Lifecycle (Kafka Topic Flow)

* **Order Placed**: `Order Service` publishes `order_created`.
* **Payment Processing**: `Payment Service` consumes `order_created`, updates DB, and publishes `payment_completed`.
* **Rider Assignment**: `Delivery Service` consumes `payment_completed`, assigns available riders, and publishes `delivery_assigned`.
* **Rider Tracking**: When the rider drops off the order, `Delivery Service` publishes `order_delivered`.
* **Alert Notifications**: `Notification Service` consumes lifecycle topics to push updates.

---

## Tech Stack Overview

* **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic, PyJWT, Bcrypt, AIOKafka, Redis-py, pytest.
* **AI Engine**: Qdrant Client, Sentence-Transformers, Hugging Face Hub APIs.
* **Databases**: PostgreSQL (Relational schema storage), Redis (Cuisine/Menu caching), Qdrant (Vector database).
* **Broker**: Apache Kafka in KRaft mode (No ZooKeeper dependency).
* **Containerization**: Docker, Docker Compose.
* **Frontend**: React 18, Vite 5, React Router DOM 6, Lucide React, and Vanilla CSS3.

---

## Rapid Deployment Setup (Docker Compose)

### Prerequisite
* Ensure Docker and Docker Compose are installed on your machine.

### Step 1: Clone and Configure Environment
Copy `.env` at the root and fill in external API keys for Hugging Face if you wish to use remote cloud inference:
```bash
cp .env.example .env
```
*(Note: If you leave `HF_API_KEY` blank, the Chatbot Service will **automatically fall back to a local, in-memory Qdrant client** running Cosine Similarity and rule-based fallback responses so that you can run the entire app offline with zero setup).*

### Step 2: Spin Up Containers
Build and run the entire microservice environment:
```bash
docker-compose up --build
```
This command spins up:
* Postgres DB (Exposed on 5432)
* Redis Cache (Exposed on 6379)
* Kafka Kraft Broker (Exposed on 9092)
* Qdrant Vector DB (Exposed on 6333)
* React Frontend (Exposed on 5173)
* All backend microservices and Gateway (Exposed on 8000)

### Step 3: Access Frontend UI
Open your browser and navigate to:
```
http://localhost:8000/
```

* Swagger API documentation is available at `http://localhost:8000/docs` (Gateway) or for individual service ports (e.g. User Service: `http://localhost:8001/docs`).

---

## Running Automated Tests

A comprehensive suite of unit and integration tests is located in the `tests/` directory. It uses an **in-memory SQLite database** and an **in-memory Qdrant client** override so that tests execute instantly without needing live servers running.

To run tests:
```bash
pytest -v
```

Tests verify:
* Authentication registrations, logins, JWT signing, and duplicate checks.
* Restaurant setups, cached menu fetches, review uploads, and average ratings calculations.
* Checkout cart calculations, total cost validation, and status updates.
* Chatbot ingestion scripts, in-memory Qdrant similarity search math, conversational history logic, and RAG citations.
