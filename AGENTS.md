# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-13 17:45:00
**Commit:** aaace31
**Branch:** main

## OVERVIEW
Infrastructure/configuration wrapper for LLM-API-Key-Proxy + OpenCode integration with plugin ecosystem. Shell scripts, systemd service, config templates only—NO application code, NO build/test commands.

## STRUCTURE
```
oc-stack/
├── config/.env.example          # Proxy config template (empty secrets)
├── examples/opencode.json.example  # OpenCode config template
├── scripts/                     # Shell automation (5 scripts)
├── systemd/llm-proxy.service    # User service template
├── docs/                        # Installation, security docs (7 files)
├── plugins/                     # Git submodules (github-autonomy, mem0)
└── LLM-API-Key-Proxy/           # Nested repo (READ-ONLY, NOT submodule)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Install proxy service | `scripts/install-systemd-user-service.sh` | Absolute paths, --user mode |
| Validate setup | `scripts/verify-config.sh` | Only "test" available, uses helper functions |
| Check service health | `scripts/status.sh` | journalctl --user logs |
| Enable user lingering | `scripts/enable-linger.sh` | Prevents service stop on logout |
| Config templates | `config/.env.example`, `examples/opencode.json.example` | NEVER create actual .env |
| Security policy | `SECURITY.md`, `docs/THREAT_MODEL.md` | API key handling, binding rules |
| Plugin docs | `plugins/*/INSTRUCTIONS.md` | GitHub autonomy, Mem0 memory |

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

## CONVENTIONS

**Shell Scripts (MANDATORY):**
```bash
#!/usr/bin/env bash
set -euo pipefail

# Constants
SERVICE_NAME="llm-proxy"  # UPPER_SNAKE_CASE

# Conditionals: [[ ]] not [ ]
[[ -f "$file" ]] && echo "[OK]" || echo "[MISSING]"

# Silent checks
systemctl --user is-active llm-proxy &>/dev/null

# Output format
echo "=== Section Header ==="
echo "[OK] Description"
echo "[MISSING] Description"
echo "ERROR: Message"
```

**Config Files:**
- `.env`: UPPER_SNAKE_CASE, `# === Section ===` headers, **empty secret values in templates**
- `.json`: 2-space indent, no trailing commas, `/path/to` placeholders
- `.service`: Absolute paths with placeholders, bind `127.0.0.1` NEVER `0.0.0.0`

## ANTI-PATTERNS (CRITICAL)

| NEVER DO | Consequence |
|----------|-------------|
| Commit `.env`, API keys, tokens | **Security incident—rotate keys** |
| Expose port 8000 publicly | No auth on proxy |
| `LOG_BODIES=true` in prod | Leaks prompts to logs |
| Modify `LLM-API-Key-Proxy/*` | Read-only nested repo (has .git but NOT in .gitmodules) |
| Use `[ ]` instead of `[[ ]]` | Inconsistent, less safe |
| Omit `set -euo pipefail` | Silent failures |
| Use `localhost` in bindings | Use `127.0.0.1` explicitly |
| Use `#!/bin/bash` | Use `#!/usr/bin/env bash` |
| Create actual `.env` files | Only `.example` templates |
| Use systemd without `--user` | Wrong service context |

## UNIQUE STYLES

**Helper Function Pattern:**
```bash
check_file() {
    local file="$1" desc="$2"
    [[ -f "$file" ]] && echo "[OK] $desc" || echo "[MISSING] $desc"
}

check_service() {
    local service="$1"
    systemctl --user is-enabled "$service" &>/dev/null && echo "[OK]" || echo "[MISSING]"
}
```

**Systemd Service Pattern:**
```ini
[Service]
Type=simple
WorkingDirectory=/path/to/LLM-API-Key-Proxy  # Template placeholder
ExecStart=/path/to/venv/bin/python -m llm_proxy --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

## COMMANDS

```bash
# Validation (only "test" available)
./scripts/verify-config.sh

# Service operations (ALWAYS --user)
systemctl --user start llm-proxy
systemctl --user stop llm-proxy
systemctl --user status llm-proxy
systemctl --user restart llm-proxy

# Logs
journalctl --user -u llm-proxy -f --no-pager
journalctl --user -u llm-proxy --since "1 hour ago"

# Setup
git submodule update --init --recursive
./scripts/install-systemd-user-service.sh
./scripts/enable-linger.sh
```

## DEVELOPMENT STANDARDS

### Build & Verification
**Runtime:** [Bun](https://bun.sh) (v1.0+) is REQUIRED for plugins. `npm`/`yarn` will fail.

| Command | Action | Notes |
|---------|--------|-------|
| `bun install` | Install Deps | **Mandatory** after clone. Fixes SIGABRT. |
| `bun run tsc --noEmit` | Type Check | The primary verification method. |
| `bun run build` | Build | Output to `dist/` (if configured). |
| `lsp_diagnostics` | Static Analysis | **MUST RUN** before committing. |

*Note: No automated test suites (`*.test.ts`) currently exist. Verification relies on `bun run tsc` success, `lsp_diagnostics` checks, and runtime validation.*

### Code Style
- **Language:** TypeScript (Strict)
- **Formatting:** 2 spaces, No semicolons, Double quotes.
- **Naming:**
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_OUTPUT_CHARS`)
  - Interfaces: PascalCase (e.g., `SafetyConfig`)
  - Variables: camelCase
- **Structure:** Imports → Constants → Types → State → Logic.

### Operational Rules
1.  **Context First:** Always read `INSTRUCTIONS.md` of the target plugin before editing.
2.  **No Magic Strings:** Move all configuration/limits to top-level `const` definitions.
3.  **Error Handling:** Never swallow errors. Propagate or catch-and-log with context.
4.  **Types:** No `any`. Define interfaces for all API responses.

### Hardening & Safety
1.  **Network:** Proxy **MUST** bind to `127.0.0.1`. **NEVER** `0.0.0.0`.
2.  **Secrets:**
    - `opencode-mem0` scrubs keys/tokens via regex (lines 16-26).
    - No secrets in `.env` templates.
    - Logs redacted by default.
3.  **Filesystem:** `fail_closed` policy. Blocked: `.github/workflows/**`, `.github/actions/**`.

## NOTES

**LLM-API-Key-Proxy Confusion:**
- Has `.git` directory (nested repo)
- **NOT** in `.gitmodules` (only plugins are submodules)
- Docs claim it's a submodule—**WRONG**, treat as read-only dependency

**Plugins (actual submodules):**
- `plugins/opencode-github-autonomy`: GitHub operations with security guardrails
- `plugins/opencode-mem0`: Long-term memory with Mem0 API

**Security Checklist (before commit):**
- [ ] No API keys, tokens, credentials
- [ ] `.example` files have empty/placeholder secrets
- [ ] Proxy binds to `127.0.0.1`
- [ ] No `LOG_BODIES=true` in examples
- [ ] Run secret-scan from `docs/RELEASE.md` before release

**Project Scale:** 738 files, 78k lines, max depth 8—most are in submodules/nested repos
