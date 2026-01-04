# AGENTS.md - AI Agent Instructions

**Project:** oc-stack  
**Type:** Infrastructure/Configuration repository (no application code)  
**Purpose:** Deployment wrapper for LLM-API-Key-Proxy + OpenCode integration

---

## OVERVIEW

Configuration and documentation repo that routes Gemini/Anthropic via local proxy (port 8000), OpenAI via OAuth. Contains shell scripts, systemd service template, and example configs. 29 models total.

**This is NOT an application codebase.** No build/test/lint commands exist. Changes are config files, shell scripts, and documentation.

---

## STRUCTURE

```
oc-stack/
├── config/              # .env.example template
├── docs/                # Installation, production, security docs
├── examples/            # opencode.json configuration example
├── scripts/             # Automation (install, verify, status, linger)
├── systemd/             # llm-proxy.service template
└── LLM-API-Key-Proxy/   # Git submodule - DO NOT modify here
```

---

## COMMANDS

```bash
# Verification (the closest thing to "tests")
./scripts/verify-config.sh    # Checks config files exist

# Service operations
systemctl --user start llm-proxy
systemctl --user status llm-proxy
systemctl --user stop llm-proxy
journalctl --user -u llm-proxy -f

# Installation
git submodule update --init --recursive
./scripts/install-systemd-user-service.sh
./scripts/enable-linger.sh
```

**No build, lint, or test commands.** Validation is manual or via `verify-config.sh`.

---

## CODE STYLE (Shell Scripts)

All scripts in `scripts/` follow these conventions:

### Shebang and Safety
```bash
#!/usr/bin/env bash
set -euo pipefail
```
- **ALWAYS** use `#!/usr/bin/env bash` (not `#!/bin/bash`)
- **ALWAYS** use `set -euo pipefail` on line 2
- `-e`: Exit on error
- `-u`: Error on undefined variables
- `-o pipefail`: Catch pipe failures

### Variables
```bash
# Constants: UPPER_SNAKE_CASE
SERVICE_NAME="llm-proxy.service"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"

# Computed paths: Use $() for subshells
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
```

### Conditionals
```bash
# Use [[ ]] for tests (not [ ])
if [[ -f "$path" ]]; then
    echo "[OK] File exists"
fi

# Redirect stderr for silent checks
if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
    echo "Running"
fi
```

### Output Style
```bash
echo "=== Section Header ==="    # Major sections
echo ""                          # Blank lines for readability
echo "[OK] Check passed"         # Status prefixes
echo "[MISSING] Check failed"
echo "ERROR: Something wrong"
echo "WARNING: Potential issue"
```

### User Prompts
```bash
read -p "Continue? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    # Default is Yes
fi
```

### Functions
```bash
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
```

---

## FILE EDITING GUIDELINES

### Config Files (.env, .json)
- **NEVER** add real API keys, tokens, or credentials
- Keep `.example` suffix for templates
- Document each setting with comments

### Systemd Service Files
- Paths must be absolute
- Include comments explaining customization needed
- Use `127.0.0.1` not `localhost` for binding

### Documentation (.md)
- Use tables for structured info
- Include command examples in code blocks
- Keep security warnings prominent

---

## ANTI-PATTERNS (CRITICAL)

| Forbidden | Reason |
|-----------|--------|
| Commit .env, API keys, tokens | Secret leakage - rotate immediately if committed |
| Expose port 8000 publicly | No auth on proxy - localhost only |
| LOG_BODIES=true in prod | Leaks prompts/responses to logs |
| .env permissions != 600 | Keys readable by other users |
| Skip submodule init | Proxy won't exist |
| Modify LLM-API-Key-Proxy/ directly | It's a submodule with its own repo |
| Use `[ ]` instead of `[[ ]]` in bash | Less safe, inconsistent with codebase |
| Omit `set -euo pipefail` | Scripts may silently fail |

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

---

## SECURITY CHECKLIST

Before committing any changes:

- [ ] No API keys, tokens, or credentials in code
- [ ] `.env.example` has placeholder values only
- [ ] Proxy binds to `127.0.0.1` (not `0.0.0.0`)
- [ ] Documentation reflects security best practices

---

## NOTES FOR AI AGENTS

1. **No tests exist** - use `./scripts/verify-config.sh` as the only validation
2. **Submodule is read-only** - never modify files in `LLM-API-Key-Proxy/`
3. **User services only** - all systemd commands use `--user` flag
4. **Paths in templates** - service files have placeholder paths that users must customize
5. **This repo is documentation** - most "code" is config templates and shell scripts
