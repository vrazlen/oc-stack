# oc-stack - OpenCode Development Environment

The complete configuration wrapper for the OpenCode development environment, integrating local proxy routing, OAuth authentication, plugin management, and MCP tools.

## Architecture

```
      [ OpenCode ]
           │
           ├─ (Proxy) ──▶ [ LLM-API-Key-Proxy ] ──▶ [ Gemini / Anthropic ]
           │                  (127.0.0.1:8000)
           │
           ├─ (OAuth) ──▶ [ opencode-openai-codex-auth ] ──▶ [ OpenAI ]
           │
           ├─ (Plugins) ─▶ [ opencode-github-autonomy ] ──▶ [ GitHub ]
           │             └▶ [ opencode-morph-fast-apply ]
           │
           └─ (MCP) ────▶ [ Exa Search ] ──▶ [ Web / Code Context ]
```

## Components

1.  **LLM-API-Key-Proxy**: A hardened local service running on `127.0.0.1:8000` that securely routes API requests to Gemini and Anthropic without exposing keys.
2.  **Plugins**: A suite of extensions providing GitHub autonomy, OAuth flows, and editor enhancements.
3.  **MCP (Model Context Protocol)**: Integrations like Exa for real-time web search and code context fetching.

## Quick Start

### Prerequisites
- Linux with systemd
- Python 3.10+
- Git
- OpenCode installed

### 1. Clone Repository
```bash
git clone https://github.com/your-username/oc-stack.git
cd oc-stack
```

### 2. Set Up Proxy
Clone and configure the proxy submodule:
```bash
git clone https://github.com/your-username/LLM-API-Key-Proxy.git ~/Work/repos/LLM-API-Key-Proxy
cd ~/Work/repos/LLM-API-Key-Proxy
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp /path/to/oc-stack/config/.env.example ~/Work/repos/LLM-API-Key-Proxy/.env
nano ~/Work/repos/LLM-API-Key-Proxy/.env
# Add your Gemini/Anthropic API keys
```

### 4. Install Service
```bash
./scripts/install-systemd-user-service.sh
./scripts/enable-linger.sh
```

### 5. Configure OpenCode
```bash
cp examples/opencode.json.example ~/.config/opencode/opencode.json
nano ~/.config/opencode/opencode.json
# Update apiKey values if needed
```

### 6. Verify
```bash
./scripts/verify-config.sh
./scripts/status.sh
```

## Model Providers

| Provider | Models | Auth Method |
|----------|--------|-------------|
| **OpenAI** | 22 | OAuth (Direct via plugin) |
| **Gemini** | 4 | Proxy (Localhost) |
| **Antigravity** | 3 | Proxy (Localhost) |

**Total: 29 models** available for development and testing.

## Plugin Ecosystem

This stack relies on a core set of plugins to provide autonomy and speed:

*   **opencode-github-autonomy**: Full GitHub integration (Issues, PRs, Repos).
*   **opencode-openai-codex-auth**: Handles OAuth handshakes for OpenAI access.
*   **opencode-morph-fast-apply**: Accelerated code application for AI agents.
*   **oh-my-opencode**: UX enhancements and shortcuts.
*   **type-inject** / **dcp**: Essential developer utilities.

See [docs/PLUGINS.md](docs/PLUGINS.md) for installation and configuration details.

## MCP Integrations

*   **Exa**: High-precision web search and code context retrieval, allowing the agent to find up-to-date documentation and implementation examples.

## Security

See [SECURITY.md](SECURITY.md) for hardening guidelines and threat models.
*   Proxy binds strictly to `127.0.0.1`.
*   API keys are never committed (use `.env`).
*   Service runs as a user-level systemd unit.

## License

[MIT](LICENSE)
