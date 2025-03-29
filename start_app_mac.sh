#!/bin/bash

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Start the app using Docker Compose (with build)
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build

echo ""
echo "✅ Setup complete!"
echo "Visit your apps directly at:"
echo "👉 Node.js app:     http://localhost:3000"
echo "👉 Python backend:  http://localhost:8000"
