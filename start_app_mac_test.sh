#!/bin/bash

DOCKER_COMPOSE_BIN="/usr/local/bin/docker-compose"
DOCKER_BIN="/usr/local/bin/docker"
IMAGE_NAME="address_verify_test"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REBUILD_MODE=false

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "⏳ Waiting 1 minute for Docker to be ready..."
for ((i=0; i<60; i+=5)); do
  echo "🕒 Waiting... (${i}s elapsed)"
  sleep 5
done
echo "✅ Wait complete. Proceeding..."

if [[ "$1" == "--rebuild" ]]; then
  REBUILD_MODE=true
fi

if [ "$REBUILD_MODE" = true ]; then
  echo "🔁 Rebuilding image..."
  $DOCKER_BIN rmi "$IMAGE_NAME" 2>/dev/null || true
  $DOCKER_COMPOSE_BIN -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
else
  echo "🧪 Checking if image '$IMAGE_NAME' exists..."
  if ! $DOCKER_BIN image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo "❌ Image not found. Use --rebuild to build it."
    exit 1
  else
    echo "✅ Image found. Starting container..."
    $DOCKER_COMPOSE_BIN -f "$SCRIPT_DIR/docker-compose.yml" up -d
  fi
fi

echo ""
echo "✅ TEST version running!"
echo "👉 Node.js app:     http://localhost:3001"
