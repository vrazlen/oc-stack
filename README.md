# oc-stack

Documentation and configuration wrapper for deploying LLM-API-Key-Proxy with OpenCode integration.

## What This Is

A hardened, reproducible deployment guide that combines:
- **LLM-API-Key-Proxy**: Routes API requests to multiple LLM providers (Gemini, Anthropic)
- **OpenCode Integration**: Configures OpenCode to use OpenAI OAuth + local proxy
- **Systemd Automation**: User service for autostart without root

### What This Is NOT

- Not a secrets vault
- Not a compliance solution (HIPAA, SOC2, etc.)
- Not designed for public internet exposure
- Not a Docker/Kubernetes deployment

## Model Support

| Provider | Models | Access Method |
|----------|--------|---------------|
| OpenAI | 22 models (GPT-5.1, GPT-5.2 series) | OAuth via opencode-openai-codex-auth |
| Gemini | 4 models (2.5 Pro, 2.5 Flash, 3 Pro) | Via LLM-API-Key-Proxy |
| Anthropic | 3 models (Claude Sonnet 4.5, Opus 4.5) | Via LLM-API-Key-Proxy |

**Total: 29 models** available in OpenCode.

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

Clone and configure the proxy:

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
```

Add your API keys (Gemini, Anthropic).

### 4. Install Systemd Service

```bash
./scripts/install-systemd-user-service.sh
```

### 5. Enable Boot Autostart

```bash
./scripts/enable-linger.sh
```

### 6. Configure OpenCode

```bash
cp examples/opencode.json.example ~/.config/opencode/opencode.json
nano ~/.config/opencode/opencode.json
```

Update `apiKey` values for proxy providers.

### 7. Verify

```bash
./scripts/verify-config.sh
./scripts/status.sh
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   OpenCode  │────▶│ LLM-API-Key-    │────▶│ Gemini API   │
│             │     │ Proxy (8000)    │────▶│ Anthropic API│
└─────────────┘     └─────────────────┘     └──────────────┘
       │
       │ (OAuth)
       ▼
┌─────────────┐
│ OpenAI      │
│ Codex API   │
└─────────────┘
```

- **OpenAI models**: Direct OAuth via opencode-openai-codex-auth plugin
- **Gemini/Anthropic models**: Routed through local proxy

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `.env` | `~/Work/repos/LLM-API-Key-Proxy/.env` | Proxy API keys |
| `opencode.json` | `~/.config/opencode/opencode.json` | OpenCode providers |
| `llm-proxy.service` | `~/.config/systemd/user/` | Systemd service |

## Documentation

- [Installation Guide](docs/INSTALL.md)
- [Production Deployment](docs/PRODUCTION.md)
- [Observability & Logging](docs/OBSERVABILITY.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [External References](docs/REFERENCES.md)
- [Release Checklist](docs/RELEASE.md)

## Security

See [SECURITY.md](SECURITY.md) for:
- Vulnerability reporting
- Hardening guidelines
- Security checklist

**Key Points**:
- Bind proxy to localhost only
- Never commit `.env` files
- Use TLS via reverse proxy for external access

## Privacy

See [PRIVACY.md](PRIVACY.md) for:
- Data handling practices
- Logging and retention
- Third-party data flow

## External Repositories

This project integrates with:

| Repository | Purpose |
|------------|---------|
| [LLM-API-Key-Proxy](https://github.com/your-username/LLM-API-Key-Proxy) | Core proxy implementation |
| [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth) | OpenAI OAuth plugin |
| [OpenCode](https://opencode.ai) | AI coding assistant |

## License

[MIT](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md).
