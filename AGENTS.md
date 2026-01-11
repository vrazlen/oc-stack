# AGENTS.md - AI Agent Instructions

**Project:** oc-stack (Infrastructure/Configuration - NO application code)  
**Purpose:** Deployment wrapper for LLM-API-Key-Proxy + OpenCode integration

---

## QUICK REFERENCE

```bash
# Validation (only "test" available)
./scripts/verify-config.sh

# Service operations (ALWAYS use --user)
systemctl --user start|stop|status llm-proxy
journalctl --user -u llm-proxy -f --no-pager

# Setup
git submodule update --init --recursive
./scripts/install-systemd-user-service.sh
./scripts/enable-linger.sh
```

**No build/lint/test commands exist.** This is a config-only repo.

---

## STRUCTURE

```
oc-stack/
├── config/.env.example          # Proxy config template
├── examples/opencode.json.example  # OpenCode config template
├── scripts/                     # Shell automation
├── systemd/llm-proxy.service    # Service template
├── docs/                        # Installation, security docs
└── LLM-API-Key-Proxy/           # Git submodule (READ-ONLY)
```

---

## SHELL SCRIPT STYLE

**Every script MUST start with:**
```bash
#!/usr/bin/env bash
set -euo pipefail
```

| Pattern | Example |
|---------|---------|
| Script dir | `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` |
| Constants | `SERVICE_NAME="llm-proxy"` (UPPER_SNAKE_CASE) |
| Local vars | `local file="$1"` inside functions |
| Conditionals | `[[ ]]` not `[ ]` |
| Silent checks | `&>/dev/null` or `grep -q` |
| Output | `[OK]`, `[MISSING]`, `ERROR:`, `WARNING:` prefixes |
| Section headers | `echo "=== Header ==="` |

**Helper function pattern:**
```bash
check_file() {
    local file="$1" desc="$2"
    [[ -f "$file" ]] && echo "[OK] $desc" || echo "[MISSING] $desc"
}
```

---

## CONFIG FILE STYLE

| Type | Convention |
|------|------------|
| `.env` | UPPER_SNAKE_CASE, `# === Section ===` headers, empty secret values |
| `.json` | 2-space indent, no trailing commas, `/path/to` placeholders |
| `.service` | Absolute paths with placeholders, bind `127.0.0.1` |

**.env structure:**
```bash
# === Proxy Settings ===
PROXY_HOST=127.0.0.1
PROXY_PORT=8000

# Secrets (empty in templates)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# WARNING: false in production
LOG_BODIES=false
```

---

## CRITICAL ANTI-PATTERNS

| NEVER DO | Consequence |
|----------|-------------|
| Commit `.env`, API keys, tokens | Security incident - rotate keys |
| Expose port 8000 publicly | No auth on proxy |
| `LOG_BODIES=true` in prod | Leaks prompts to logs |
| Modify `LLM-API-Key-Proxy/` | It's a read-only submodule |
| Use `[ ]` instead of `[[ ]]` | Inconsistent, less safe |
| Omit `set -euo pipefail` | Silent failures |
| Use `localhost` in bindings | Use `127.0.0.1` explicitly |
| Use `#!/bin/bash` | Use `#!/usr/bin/env bash` |
| Create actual `.env` files | Only `.example` templates |

---

## FILE MODIFICATION RULES

| Path | Editable | Notes |
|------|----------|-------|
| `scripts/*.sh` | YES | Include safety flags |
| `config/*.example` | YES | Empty secret values only |
| `examples/*.example` | YES | Placeholder paths only |
| `docs/*.md` | YES | Keep security warnings |
| `systemd/*.service` | YES | Template paths only |
| `LLM-API-Key-Proxy/*` | **NO** | Read-only submodule |
| Any `.env` (non-example) | **NO** | Never create |
| Real credentials anywhere | **NO** | Immediate incident |

---

## ARCHITECTURE

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  OpenCode   │────>│  LLM-API-Key-Proxy   │────>│ Gemini/Anthropic│
│             │     │  (127.0.0.1:8000)    │     │      APIs       │
└─────────────┘     └──────────────────────┘     └─────────────────┘
       │
       │  OAuth (direct)
       v
┌─────────────────┐
│   OpenAI API    │
└─────────────────┘
```

**29 models total:** OpenAI (22, OAuth), Gemini (4, Proxy), Anthropic (3, Proxy)

---

## SYSTEMD PATTERNS

```ini
[Service]
Type=simple
WorkingDirectory=/path/to/LLM-API-Key-Proxy
ExecStart=/path/to/venv/bin/python -m llm_proxy --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

- Always `--user` flag for systemctl commands
- Always bind `127.0.0.1`, never `0.0.0.0`
- Template uses `/path/to` placeholders

---

## SECURITY CHECKLIST

Before committing:
- [ ] No API keys, tokens, or credentials
- [ ] `.example` files have empty/placeholder secrets
- [ ] Proxy binds to `127.0.0.1`
- [ ] No `LOG_BODIES=true` in examples

---

## AI AGENT SUMMARY

1. **No tests** - `./scripts/verify-config.sh` is only validation
2. **Submodule read-only** - never touch `LLM-API-Key-Proxy/`
3. **User services** - always `systemctl --user`
4. **Templates only** - never create actual config files
5. **127.0.0.1 only** - never `0.0.0.0` or `localhost`
6. **Script boilerplate** - `#!/usr/bin/env bash` + `set -euo pipefail`
