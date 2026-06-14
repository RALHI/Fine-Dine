FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install basic dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install chatbot-specific ML & vector dependencies
COPY chatbot_service/requirements-chatbot.txt .
RUN pip install --no-cache-dir -r requirements-chatbot.txt

COPY common/ /app/common/
COPY chatbot_service/ /app/chatbot_service/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["python", "chatbot_service/main.py"]
