#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Configuration Verification ==="
echo ""

ERRORS=0

check_file() {
    local path="$1"
    local desc="$2"
    if [[ -f "$path" ]]; then
        echo "[OK] $desc: $path"
    else
        echo "[MISSING] $desc: $path"
        ((ERRORS++))
    fi
}

check_dir() {
    local path="$1"
    local desc="$2"
    if [[ -d "$path" ]]; then
        echo "[OK] $desc: $path"
    else
        echo "[MISSING] $desc: $path"
        ((ERRORS++))
    fi
}

check_service() {
    local service="$1"
    if systemctl --user is-enabled "$service" &>/dev/null; then
        echo "[OK] Systemd service enabled: $service"
    else
        echo "[MISSING] Systemd service not enabled: $service"
        ((ERRORS++))
    fi
    
    if systemctl --user is-active "$service" &>/dev/null; then
        echo "[OK] Systemd service running: $service"
    else
        echo "[MISSING] Systemd service not running: $service"
        ((ERRORS++))
    fi
}

echo "Repository files:"
check_file "$REPO_ROOT/README.md" "README"
check_file "$REPO_ROOT/LICENSE" "LICENSE"
check_file "$REPO_ROOT/SECURITY.md" "SECURITY"
check_file "$REPO_ROOT/config/.env.example" "Environment example"
check_file "$REPO_ROOT/systemd/llm-proxy.service" "Systemd service template"

echo ""
echo "User configuration:"
check_file "$HOME/.config/systemd/user/llm-proxy.service" "Installed systemd service"
check_file "$HOME/.config/opencode/opencode.json" "OpenCode config"

echo ""
echo "Systemd service:"
check_service "llm-proxy.service"

echo ""
if [[ $ERRORS -eq 0 ]]; then
    echo "=== All checks passed ==="
else
    echo "=== $ERRORS check(s) failed ==="
    exit 1
fi
