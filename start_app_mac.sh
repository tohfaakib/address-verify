#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
IMAGE_NAME="address_verify"
BUILD_MODE=false

MAX_WAIT=120  # max 2 minutes
ELAPSED=0

while ! docker info >/dev/null 2>&1; do
    echo "⏳ Waiting for Docker to start... (${ELAPSED}s elapsed)"
    sleep 5
    ELAPSED=$((ELAPSED+5))
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo "❌ Docker did not start within $MAX_WAIT seconds. Exiting."
        exit 1
    fi
done

echo "🐳 Docker is running!"


# Check for --build flag
if [[ "$1" == "--build" ]]; then
  BUILD_MODE=true
fi

# Check if image exists
if [[ "$(docker images -q $IMAGE_NAME 2> /dev/null)" == "" ]]; then
  echo "📦 Docker image '$IMAGE_NAME' not found. Forcing build..."
  BUILD_MODE=true
fi

if [ "$BUILD_MODE" = true ]; then
  echo "🧼 Removing old Docker image: $IMAGE_NAME (if it exists)..."
  docker rmi $IMAGE_NAME 2>/dev/null || true
  echo "🏗️ Building and starting fresh containers with Docker Compose..."
  docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
else
  echo "🚀 Starting containers with existing images..."
  docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
fi

echo ""
echo "✅ Setup complete!"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
