#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/../plugins/opencode-github-autonomy"

echo "=== OpenCode GitHub Autonomy Plugin Installer ==="
echo

# Check for Bun
if ! command -v bun &>/dev/null; then
    echo "ERROR: Bun is required but not installed."
    echo "Install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo "[OK] Bun found: $(bun --version)"

# Check plugin directory exists
if [[ ! -d "$PLUGIN_DIR" ]]; then
    echo "ERROR: Plugin directory not found: $PLUGIN_DIR"
    echo "Make sure you cloned with --recursive or run: git submodule update --init --recursive"
    exit 1
fi
echo "[OK] Plugin directory: $PLUGIN_DIR"

# Install dependencies
echo
echo "Installing dependencies..."
cd "$PLUGIN_DIR"
bun install --production
echo "[OK] Dependencies installed"

# Get absolute path for config
PLUGIN_PATH="$(cd "$PLUGIN_DIR" && pwd)"
INSTRUCTIONS_PATH="$PLUGIN_PATH/INSTRUCTIONS.md"

echo
echo "=== Installation Complete ==="
echo
echo "Add the following to your ~/.config/opencode/opencode.json:"
echo
echo '  "plugin": ['
echo "    \"$PLUGIN_PATH\""
echo '  ],'
echo '  "instructions": ['
echo "    \"$INSTRUCTIONS_PATH\""
echo '  ]'
echo
echo "Then set your GitHub token:"
echo "  export OPENCODE_GITHUB_TOKEN=ghp_your_token_here"
echo
