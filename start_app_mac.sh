#!/bin/bash

# Wait for Docker to be ready
until docker info >/dev/null 2>&1; do
    echo "🕒 Waiting for Docker to start..."
    sleep 10
done

# Run the app
echo "🚀 Starting containers with existing images..."
docker compose -f "$(dirname "$0")/docker-compose.yml" up -d

echo ""
echo "✅ Setup complete!"
echo "Visit your apps directly at:"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
