#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
IMAGE_NAME="address_verify"
REBUILD_MODE=false

# Optional for launchd environments
export DOCKER_HOST=unix:///Users/user/.docker/run/docker.sock

# Check for --rebuild flag
if [[ "$1" == "--rebuild" ]]; then
  REBUILD_MODE=true
fi

if [ "$REBUILD_MODE" = true ]; then
  echo "🔁 --rebuild flag passed. Removing and rebuilding image..."
  docker rmi "$IMAGE_NAME" 2>/dev/null || true
  echo "🏗️ Rebuilding image and starting containers..."
  docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
else
  echo "🧪 Checking if Docker image '$IMAGE_NAME' exists..."
  if [[ "$(docker images -q $IMAGE_NAME 2> /dev/null)" == "" ]]; then
    echo "❌ Image not found. Please run with --rebuild to build it."
    exit 1
  else
    echo "✅ Image found. Starting containers..."
    docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
  fi
fi

echo ""
echo "✅ Setup complete!"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
