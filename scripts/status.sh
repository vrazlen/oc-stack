#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="llm-proxy.service"

echo "=== LLM Proxy Service Status ==="
echo ""

if ! systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
    echo "Service is NOT running"
    echo ""
    systemctl --user status "$SERVICE_NAME" --no-pager 2>/dev/null || true
    exit 1
fi

echo "Service is RUNNING"
echo ""
systemctl --user status "$SERVICE_NAME" --no-pager

echo ""
echo "=== Recent Logs ==="
journalctl --user -u "$SERVICE_NAME" -n 10 --no-pager
