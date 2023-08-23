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
sudo ufw allow 3000/tcp   # Your app's port
sudo ufw enable

# Build Docker image
sudo docker build -t address_verify "$SCRIPT_DIR"

# Install Docker Compose
sudo apt-get install -y docker-compose

# Start the app using Docker Compose
sudo docker-compose up -d

# Add a crontab entry to start the app on reboot
(crontab -l ; echo "@reboot cd \"$SCRIPT_DIR\" && sudo docker-compose up -d") | crontab -

echo "Setup completed! Your app should be up and running after reboot."
