#!/usr/bin/env bash
# Install LLM Proxy as a systemd user service
# Run this script from the oc-stack repository root

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="llm-proxy.service"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"
SOURCE_SERVICE="$REPO_ROOT/systemd/$SERVICE_NAME"

echo "=== LLM Proxy Systemd User Service Installer ==="
echo ""

# Check if source service file exists
if [[ ! -f "$SOURCE_SERVICE" ]]; then
    echo "ERROR: Service file not found: $SOURCE_SERVICE"
    echo "Make sure you're running this from the oc-stack repository."
    exit 1
fi

# Create user systemd directory if it doesn't exist
if [[ ! -d "$USER_SYSTEMD_DIR" ]]; then
    echo "Creating systemd user directory: $USER_SYSTEMD_DIR"
    mkdir -p "$USER_SYSTEMD_DIR"
fi

# Check if service already exists
if [[ -f "$USER_SYSTEMD_DIR/$SERVICE_NAME" ]]; then
    echo "WARNING: Service file already exists at $USER_SYSTEMD_DIR/$SERVICE_NAME"
    read -p "Overwrite? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Copy service file
echo "Copying service file to $USER_SYSTEMD_DIR/$SERVICE_NAME"
cp "$SOURCE_SERVICE" "$USER_SYSTEMD_DIR/$SERVICE_NAME"

echo ""
echo "IMPORTANT: Edit the service file to update paths:"
echo "  $USER_SYSTEMD_DIR/$SERVICE_NAME"
echo ""
echo "Update these values:"
echo "  - WorkingDirectory: Path to LLM-API-Key-Proxy"
echo "  - EnvironmentFile: Path to your .env file"
echo "  - ExecStart: Path to Python venv and main.py"
echo ""

read -p "Open service file in editor now? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    ${EDITOR:-nano} "$USER_SYSTEMD_DIR/$SERVICE_NAME"
fi

# Reload systemd
echo "Reloading systemd user daemon..."
systemctl --user daemon-reload

# Enable and start service
read -p "Enable and start the service now? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "Enabling service..."
    systemctl --user enable "$SERVICE_NAME"
    
    echo "Starting service..."
    systemctl --user start "$SERVICE_NAME"
    
    echo ""
    echo "Service status:"
    systemctl --user status "$SERVICE_NAME" --no-pager || true
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Useful commands:"
echo "  Status:  systemctl --user status $SERVICE_NAME"
echo "  Logs:    journalctl --user -u $SERVICE_NAME -f"
echo "  Stop:    systemctl --user stop $SERVICE_NAME"
echo "  Start:   systemctl --user start $SERVICE_NAME"
echo "  Restart: systemctl --user restart $SERVICE_NAME"
echo ""
echo "For boot autostart (without login), run:"
echo "  ./scripts/enable-linger.sh"
