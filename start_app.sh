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

# Set up UFW (Uncomplicated Firewall)
sudo apt-get install -y ufw
#sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP for Nginx
sudo ufw allow 3000/tcp   # Your app's port
sudo ufw enable

# Build Docker image
sudo docker build -t address_verify "$SCRIPT_DIR"

# Install Docker Compose
sudo apt-get install -y docker-compose

# Start the app using Docker Compose
sudo docker-compose up -d

# Install and configure Nginx
sudo apt-get install -y nginx

# Ask user for server IP address
read -p "Enter your server's public IP address: " SERVER_IP

# Configure Nginx as a reverse proxy
sudo tee /etc/nginx/sites-available/default > /dev/null <<EOT
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOT

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Add a crontab entry to start the app and Nginx on reboot
(crontab -l ; echo "@reboot cd \"$SCRIPT_DIR\" && sudo docker-compose up -d && sudo systemctl start nginx") | crontab -

echo "Setup completed! Your app and Nginx reverse proxy should be up and running after reboot."
