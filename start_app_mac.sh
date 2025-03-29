#!/bin/bash

# Wait for Docker to be ready
until docker info >/dev/null 2>&1; do
    echo "🕒 Waiting for Docker to start..."
    sleep 2
done

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BUILD_MODE=false

# Check for --build flag
if [[ "$1" == "--build" ]]; then
  BUILD_MODE=true
fi

if [ "$BUILD_MODE" = true ]; then
  echo "🧼 Removing old Docker image: address_verify (if it exists)..."
  docker rmi address_verify 2>/dev/null || true
  echo "🏗️ Building and starting fresh containers with Docker Compose..."
  docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
else
  echo "🚀 Starting containers with existing images..."
  docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
fi

echo ""
echo "✅ Setup complete!"
echo "Visit your apps directly at:"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
