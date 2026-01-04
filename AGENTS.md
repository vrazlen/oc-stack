# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-04
**Commit:** 993b6ba
**Branch:** main

## OVERVIEW

Deployment wrapper for LLM-API-Key-Proxy + OpenCode. Routes Gemini/Anthropic via local proxy (port 8000), OpenAI via OAuth. 29 models total.

## STRUCTURE

```
oc-stack/
├── config/              # .env.example template
├── docs/                # Installation, production, security docs
├── examples/            # opencode.json configuration example
├── scripts/             # Automation (install, verify, status, linger)
├── systemd/             # llm-proxy.service template
└── LLM-API-Key-Proxy/   # Git submodule - DO NOT document here
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Install from scratch | docs/INSTALL.md | Submodule init, venv, pip install |
| Run in production | docs/PRODUCTION.md | systemctl --user commands |
| Configure proxy | config/.env.example → .env | API keys, ports, allowlists |
| Configure OpenCode | examples/opencode.json.example | Copy to ~/.config/opencode/ |
| Install systemd service | scripts/install-systemd-user-service.sh | Copies + enables service |
| Verify setup | scripts/verify-config.sh | Checks all config files |
| Check status | scripts/status.sh | Service status + last 10 logs |
| Enable boot autostart | scripts/enable-linger.sh | loginctl enable-linger |
| Security guidance | SECURITY.md, docs/THREAT_MODEL.md | Binding, logging, permissions |

## ARCHITECTURE

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  OpenCode   │────▶│  LLM-API-Key-Proxy   │────▶│ Gemini/Anthropic│
│             │     │  (127.0.0.1:8000)    │     │      APIs       │
└─────────────┘     └──────────────────────┘     └─────────────────┘
       │
       │  OAuth (direct)
       ▼
┌─────────────────┐
│   OpenAI API    │
└─────────────────┘
```

## CONVENTIONS

- **Systemd**: User services only, no root. `systemctl --user` commands.
- **Logs**: `journalctl --user -u llm-proxy -f`
- **Paths in service**: Must be absolute, update template before use.
- **Submodule**: `git submodule update --init --recursive` on clone.

## ANTI-PATTERNS (CRITICAL)

| Forbidden | Reason |
|-----------|--------|
| Commit .env, API keys, tokens | Secret leakage - rotate immediately if committed |
| Expose port 8000 publicly | No auth on proxy - localhost only |
| LOG_BODIES=true in prod | Leaks prompts/responses to logs |
| .env permissions != 600 | Keys readable by other users |
| Skip submodule init | Proxy won't exist |

## SECURITY CHECKLIST

- [ ] `.env` permissions: `chmod 600 .env`
- [ ] Bind to localhost only (default)
- [ ] Firewall port 8000 if needed
- [ ] `LOG_BODIES=false` in production
- [ ] Redact API keys from any logs shared
- [ ] Enable rate limiting if exposed to team

## COMMANDS

```bash
# Install
git submodule update --init --recursive
python3 -m venv .venv && source .venv/bin/activate
pip install -r LLM-API-Key-Proxy/requirements.txt
cp config/.env.example .env  # Edit with real keys
./scripts/install-systemd-user-service.sh

# Verify
./scripts/verify-config.sh

# Operations
systemctl --user start llm-proxy
systemctl --user status llm-proxy
systemctl --user stop llm-proxy
journalctl --user -u llm-proxy -f

# Boot autostart
./scripts/enable-linger.sh
systemctl --user enable llm-proxy
```

## NOTES

- LLM-API-Key-Proxy is a **git submodule** with its own docs - check there for proxy internals.
- opencode.json goes in `~/.config/opencode/opencode.json`, not in this repo.
- Service template needs path edits before use (WorkingDirectory, EnvironmentFile, ExecStart venv path).
- Update submodule: `git submodule update --remote`
