#!/bin/bash

# Default to 'sralhi99' if no argument is provided
DOCKER_USERNAME=${1:-sralhi99}

echo "================================================"
echo "Publishing Fine-Dine Docker Images to Docker Hub"
echo "Target Docker Username: $DOCKER_USERNAME"
echo "================================================"

# Login check removed because credential helpers hide the username in 'docker info'

SERVICES=(
    "user-service"
    "restaurant-service"
    "order-service"
    "payment-service"
    "delivery-service"
    "notification-service"
    "chatbot-service"
    "gateway"
    "frontend"
)

# Loop over each service, build, and push
for SERVICE in "${SERVICES[@]}"; do
    echo "------------------------------------------------"
    echo "🚀 Building $SERVICE..."
    
    # Determine the build context and dockerfile
    if [ "$SERVICE" == "chatbot-service" ]; then
        docker build -t $DOCKER_USERNAME/finedine-$SERVICE:latest -f chatbot_service/Dockerfile .
    elif [ "$SERVICE" == "frontend" ]; then
        docker build -t $DOCKER_USERNAME/finedine-$SERVICE:latest -f frontend/Dockerfile .
    else
        # For standard backend services
        docker build -t $DOCKER_USERNAME/finedine-$SERVICE:latest -f Dockerfile .
    fi

    echo "✅ Pushing $DOCKER_USERNAME/finedine-$SERVICE:latest to Docker Hub..."
    docker push $DOCKER_USERNAME/finedine-$SERVICE:latest
done

echo "================================================"
echo "🎉 All images successfully pushed to Docker Hub!"
echo "You can now run 'docker-compose -f docker-compose.prod.yml up -d' anywhere."
echo "================================================"
