#!/bin/bash

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Start the app using Docker Compose (with build)
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build

# Ask user for local IP address
read -p "Enter your Mac's local IP address (e.g. 192.168.x.x): " SERVER_IP

# Nginx config file location for Homebrew (macOS ARM - Apple Silicon)
NGINX_CONF_DIR="/opt/homebrew/etc/nginx"
NGINX_CUSTOM_CONF="$NGINX_CONF_DIR/servers/app_proxy.conf"

# Create servers directory if not exists
mkdir -p "$NGINX_CONF_DIR/servers"

# Create custom Nginx config
cat <<EOT | sudo tee "$NGINX_CUSTOM_CONF" > /dev/null
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;  # Node app
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;  # Python app
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOT

# Ensure Nginx includes the servers folder
if ! grep -q "include servers/\*.conf;" "$NGINX_CONF_DIR/nginx.conf"; then
  echo "Adding include directive to nginx.conf"
  sudo sed -i '' '/http {/a\
    \    include servers/*.conf;
  ' "$NGINX_CONF_DIR/nginx.conf"
fi

# Restart Nginx
sudo nginx -s reload || sudo nginx

echo "✅ Setup complete!"
echo "Visit: http://$SERVER_IP for Node app and http://$SERVER_IP/api/ for Python app."
