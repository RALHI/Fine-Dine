FROM python:3.12-slim

# Install system dependencies for postgres client libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common library and all service directories
COPY common/ /app/common/
COPY user_service/ /app/user_service/
COPY restaurant_service/ /app/restaurant_service/
COPY order_service/ /app/order_service/
COPY payment_service/ /app/payment_service/
COPY delivery_service/ /app/delivery_service/
COPY notification_service/ /app/notification_service/
COPY chatbot_service/ /app/chatbot_service/
COPY gateway/ /app/gateway/
COPY frontend/ /app/frontend/

# Set Python search path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# By default, run health check or display help
CMD ["python", "gateway/main.py"]
