# AGENTS.md - AI Agent Instructions

**Project:** oc-stack  
**Type:** Infrastructure/Configuration repository (no application code)  
**Purpose:** Deployment wrapper for LLM-API-Key-Proxy + OpenCode integration

---

## OVERVIEW

Configuration and documentation repo routing Gemini/Anthropic via local proxy (port 8000), OpenAI via OAuth. Contains shell scripts, systemd service template, and example configs. **29 models total.**

**This is NOT an application codebase.** No build/test/lint commands exist.

---

## STRUCTURE

```
oc-stack/
├── config/              # .env.example template
├── docs/                # Installation, production, security docs
├── examples/            # opencode.json.example configuration
├── scripts/             # Automation (install, verify, status, linger)
├── systemd/             # llm-proxy.service template
└── LLM-API-Key-Proxy/   # Git submodule - DO NOT modify
```

---

## COMMANDS

```bash
# Validation (closest thing to "tests")
./scripts/verify-config.sh

# Service operations (always use --user flag)
systemctl --user start llm-proxy
systemctl --user status llm-proxy
systemctl --user stop llm-proxy
journalctl --user -u llm-proxy -f --no-pager

# Installation
git submodule update --init --recursive
./scripts/install-systemd-user-service.sh
./scripts/enable-linger.sh

# Quick status check
./scripts/status.sh
```

**No build, lint, or test commands.** Use `verify-config.sh` for validation.

---

## CODE STYLE

### Shell Scripts (`scripts/*.sh`)

Every script MUST start with:
```bash
#!/usr/bin/env bash
set -euo pipefail
```

| Convention | Example |
|------------|---------|
| Shebang | `#!/usr/bin/env bash` (not `#!/bin/bash`) |
| Safety flags | `set -euo pipefail` on line 2 |
| Script dir | `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` |
| Constants | `UPPER_SNAKE_CASE` (e.g., `SERVICE_NAME="llm-proxy"`) |
| Local vars | `local var="$1"` inside functions |
| Conditionals | `[[ ]]` (not `[ ]`) |
| Silent checks | `&>/dev/null` or `grep -q` |
| Output prefixes | `[OK]`, `[MISSING]`, `ERROR:`, `WARNING:` |
| Section headers | `echo "=== Header ==="` |
| User prompts | `read -p "Continue? [Y/n] " -n 1 -r` |
| Editor fallback | `${EDITOR:-nano}` |

### Helper Function Pattern

```bash
check_file() {
    local file="$1"
    local desc="$2"
    if [[ -f "$file" ]]; then
        echo "[OK] $desc: $file"
    else
        echo "[MISSING] $desc: $file"
    fi
}
```

### Config Files

| File Type | Convention |
|-----------|------------|
| `.env` | UPPER_SNAKE_CASE, section headers with `# ===`, empty values for secrets |
| `.json` | 2-space indent, no trailing commas, no comments |
| `.service` | Absolute paths with `/path/to` placeholders, bind to `127.0.0.1` |
| `.md` | Tables for structured info, code blocks for commands |

### .env Structure Pattern

```bash
# === Section Header ===
PROXY_HOST=127.0.0.1
PROXY_PORT=8000

# Secrets (empty in template)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# WARNING: Set to false in production
LOG_BODIES=false
```

---

## ANTI-PATTERNS (CRITICAL)

| Forbidden | Reason |
|-----------|--------|
| Commit `.env`, API keys, tokens | Secret leakage - rotate immediately if committed |
| Expose port 8000 publicly | No auth on proxy - localhost only |
| `LOG_BODIES=true` in prod | Leaks prompts/responses to logs |
| `.env` permissions != 600 | Keys readable by other users |
| Skip submodule init | Proxy won't exist |
| Modify `LLM-API-Key-Proxy/` directly | It's a submodule with its own repo |
| Use `[ ]` instead of `[[ ]]` | Less safe, inconsistent with codebase |
| Omit `set -euo pipefail` | Scripts may silently fail |
| Use `localhost` in bindings | Use `127.0.0.1` explicitly |
| Use `#!/bin/bash` | Use `#!/usr/bin/env bash` for portability |

---

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add new script | `scripts/` - follow existing patterns |
| Update proxy config template | `config/.env.example` |
| Update OpenCode config template | `examples/opencode.json.example` |
| Update systemd service | `systemd/llm-proxy.service` |
| Security documentation | `SECURITY.md`, `docs/THREAT_MODEL.md` |
| Installation docs | `docs/INSTALL.md` |
| Production deployment | `docs/PRODUCTION.md` |

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

---

## SYSTEMD SERVICE PATTERNS

Template uses placeholders users must customize:
```ini
[Service]
WorkingDirectory=/path/to/LLM-API-Key-Proxy
ExecStart=/path/to/venv/bin/python -m llm_proxy --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3
```

Key patterns:
- `Type=simple` for foreground processes
- `Restart=always` with `RestartSec=3` for resilience
- `WantedBy=default.target` for user services
- Always bind to `127.0.0.1`, never `0.0.0.0`

---

## SECURITY CHECKLIST

Before committing:

- [ ] No API keys, tokens, or credentials in code
- [ ] `.env.example` has placeholder/empty values only
- [ ] Proxy binds to `127.0.0.1` (not `0.0.0.0`)
- [ ] Documentation reflects security best practices
- [ ] No `LOG_BODIES=true` in examples

---

## AI AGENT RULES

1. **No tests exist** - `./scripts/verify-config.sh` is the only validation
2. **Submodule is read-only** - never modify files in `LLM-API-Key-Proxy/`
3. **User services only** - all systemd commands use `--user` flag
4. **Paths in templates** - service files have `/path/to` placeholders users must customize
5. **Template suffix** - config templates use `.example` suffix; never create actual `.env`
6. **JSON config** - `opencode.json.example` uses 2-space indent, no trailing commas
7. **Binding address** - always use `127.0.0.1`, never `0.0.0.0` or `localhost`
8. **Script boilerplate** - every `.sh` file needs `#!/usr/bin/env bash` + `set -euo pipefail`

### File Modification Rules

| Action | Allowed | Notes |
|--------|---------|-------|
| Edit `scripts/*.sh` | Yes | Follow existing patterns, include safety flags |
| Edit `config/*.example` | Yes | Placeholder/empty values only |
| Edit `examples/*.example` | Yes | Placeholder values only |
| Edit `docs/*.md` | Yes | Keep security warnings prominent |
| Edit `systemd/*.service` | Yes | Template paths only |
| Create new `.env` | **NO** | Only `.example` templates |
| Modify `LLM-API-Key-Proxy/*` | **NO** | Read-only submodule |
| Add real credentials | **NO** | Immediate security incident |
