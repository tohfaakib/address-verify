#!/bin/bash

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Optional: Name of your Docker image
IMAGE_NAME="address_verify"

echo "🧼 Removing old Docker image: $IMAGE_NAME (if it exists)..."
docker rmi -f $IMAGE_NAME 2> /dev/null || echo "No previous image to remove."

echo "🏗️ Building and starting fresh containers with Docker Compose..."
docker compose --file "$SCRIPT_DIR/docker-compose.yml" up --detach --build

echo ""
echo "✅ Setup complete!"
echo "Visit your apps directly at:"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
