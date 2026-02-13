#!/bin/bash

# TermLink Systemd Setup Script
# This script sets up TermLink as a system service on Linux.

SERVICE_NAME="termlink"
WORKING_DIR=$(pwd)
EXEC_START="/usr/bin/node $WORKING_DIR/src/server.js"

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo "Node.js could not be found. Please install Node.js first."
    exit 1
fi

echo "Creating systemd service file..."

cat <<EOF | sudo tee /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=TermLink - Web-based Terminal
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$WORKING_DIR
Environment=NODE_ENV=production
ExecStart=$EXEC_START
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Enabling $SERVICE_NAME service to start on boot..."
sudo systemctl enable $SERVICE_NAME

echo "Starting $SERVICE_NAME service..."
sudo systemctl start $SERVICE_NAME

echo "Setup complete! TermLink is now running as a service."
echo "You can check status with: systemctl status $SERVICE_NAME"
