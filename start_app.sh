#!/bin/bash

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Update system packages
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo apt-get install -y docker-compose

# Start the app using Docker Compose (builds image and runs container)
sudo docker-compose up -d

# Install and configure Nginx
sudo apt-get install -y nginx

# Ask user for server IP address
read -p "Enter your server's public IP address: " SERVER_IP

# Configure Nginx as a reverse proxy for both ports
sudo tee /etc/nginx/sites-available/default > /dev/null <<EOT
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

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Add crontab entry for auto-start on reboot
(crontab -l ; echo "@reboot cd \"$SCRIPT_DIR\" && sudo docker-compose up -d && sudo systemctl start nginx") | crontab -

echo "Setup completed! Node app (3000) and Python app (8000) are up, with Nginx proxy routing configured."
