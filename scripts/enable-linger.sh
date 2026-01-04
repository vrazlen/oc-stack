#!/usr/bin/env bash
# Enable lingering for the current user
# This allows systemd user services to run at boot without login

set -euo pipefail

echo "=== Enable Systemd User Lingering ==="
echo ""
echo "Lingering allows your user services to start at boot,"
echo "even when you're not logged in."
echo ""

# Check current linger status
if loginctl show-user "$USER" --property=Linger 2>/dev/null | grep -q "Linger=yes"; then
    echo "Lingering is already enabled for user: $USER"
    exit 0
fi

echo "Enabling lingering for user: $USER"
loginctl enable-linger "$USER"

# Verify
if loginctl show-user "$USER" --property=Linger 2>/dev/null | grep -q "Linger=yes"; then
    echo "SUCCESS: Lingering enabled."
    echo ""
    echo "Your systemd user services will now start at boot."
else
    echo "WARNING: Could not verify lingering status."
    echo "You may need to run this with sudo or check system configuration."
fi
