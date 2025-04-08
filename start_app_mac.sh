#!/bin/bash

# Explicit paths
DOCKER_COMPOSE_BIN="/usr/local/bin/docker-compose"
DOCKER_BIN="/usr/local/bin/docker"

# Hardcoded image name
IMAGE_NAME="address_verify"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REBUILD_MODE=false

# Add common binary paths (important for cron/launchctl)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# ⏳ Fixed 2-minute wait with progress output
echo "⏳ Waiting 1 minutes for Docker to be ready..."
for ((i=0; i<60; i+=5)); do
  echo "🕒 Waiting... (${i}s elapsed)"
  sleep 5
done
echo "✅ Wait complete. Proceeding..."

# Check for --rebuild
if [[ "$1" == "--rebuild" ]]; then
  REBUILD_MODE=true
fi

if [ "$REBUILD_MODE" = true ]; then
  echo "🔁 --rebuild flag passed. Removing and rebuilding image..."
  $DOCKER_BIN rmi "$IMAGE_NAME" 2>/dev/null || true
  echo "🏗️ Rebuilding image and starting containers..."
  $DOCKER_COMPOSE_BIN -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
else
  echo "🧪 Checking if Docker image '$IMAGE_NAME' exists..."
  if ! $DOCKER_BIN image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo "❌ Image not found. Please run with --rebuild to build it."
    $DOCKER_BIN images
    exit 1
  else
    echo "✅ Image found. Starting containers..."
    $DOCKER_COMPOSE_BIN -f "$SCRIPT_DIR/docker-compose.yml" up -d
  fi
fi

echo ""
echo "✅ Setup complete!"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
