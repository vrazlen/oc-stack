# OpenCode Plugin Ecosystem

**Overview:** This project includes OpenCode plugins as git submodules for extended functionality.

---

## 📚 Documentation

### Complete Plugin Development Guides

| Guide | Description | Size |
|-------|-------------|------|
| [**PLUGIN_QUICKSTART.md**](./PLUGIN_QUICKSTART.md) | Get started in 15 minutes - your first plugin | 16KB |
| [**PLUGIN_HOOKS_REFERENCE.md**](./PLUGIN_HOOKS_REFERENCE.md) | Complete hook documentation with examples | 17KB |
| [**PLUGIN_API_REFERENCE.md**](./PLUGIN_API_REFERENCE.md) | TypeScript API reference for @opencode-ai/plugin | 20KB |
| [**PLUGIN_SECURITY_PATTERNS.md**](./PLUGIN_SECURITY_PATTERNS.md) | Security best practices and guardrails | 18KB |

**Total:** 71KB of comprehensive, production-ready documentation

---

## Installed Plugins

### 1. GitHub Autonomy Plugin

**Location:** `plugins/opencode-github-autonomy/`  
**Source:** https://github.com/vrazlen/opencode-github-autonomy

**Features:**
- GitHub operations with security guardrails
- Allowlist-based access control (READ open, WRITE restricted)
- Session-based approval workflow
- Forbidden operations blocking (force push, workflow modification)

**Quick Reference:**
- `github_status` - Check plugin health
- `github_search` - Search repositories/issues/code
- `github_issue_*` - Issue operations (list, create, comment)
- `github_pr_*` - Pull request operations (list, create)
- `github_repo_file_*` - File operations (get, put)
- `github_session_allow_repo` - Approve write access for session

**Configuration:** `~/.config/opencode/github-policy.json`

**Documentation:** See `plugins/opencode-github-autonomy/INSTRUCTIONS.md`

---

### 2. Mem0 Long-Term Memory Plugin

**Location:** `plugins/opencode-mem0/`  
**Source:** https://github.com/vrazlen/opencode-mem0

**Features:**
- Persistent memory across sessions using Mem0 API
- Automatic RAG injection (retrieves relevant memories)
- Auto-capture of user messages
- Secret scrubbing before storage
- User/project scope separation

**Quick Reference:**
- `memory(action="search", query="...")` - Search memories
- `memory(action="add", query="...")` - Store memory
- `memory(action="delete", memory_id="...")` - Remove memory
- `memory(action="list")` - List recent memories
- `memory(action="clear")` - Delete all memories
- `memory_status` - Check configuration

**Environment Variables:**
```bash
MEM0_API_KEY=your-api-key          # Required
MEM0_USER_ID=anonymous             # Optional (default: anonymous)
MEM0_ENABLED=true                  # Optional (default: true)
MEM0_RAG_ENABLED=true              # Optional (default: true)
MEM0_AUTO_ADD=true                 # Optional (default: true)
```

**Documentation:** See `plugins/opencode-mem0/INSTRUCTIONS.md`

---

## Plugin Management

### Sync All Plugins

```bash
git submodule update --init --recursive
```

### Update to Latest

```bash
git submodule update --remote --merge
```

### Add New Plugin

```bash
git submodule add https://github.com/user/opencode-plugin-name plugins/plugin-name
```

### Remove Plugin

```bash
git submodule deinit -f plugins/plugin-name
git rm -f plugins/plugin-name
rm -rf .git/modules/plugins/plugin-name
```

---

## Plugin Development

### Quick Start (5 minutes)

1. **Create plugin directory:**
```bash
mkdir -p ~/.config/opencode/plugin/my-plugin
cd ~/.config/opencode/plugin/my-plugin
```

2. **Initialize:**
```bash
bun init -y
bun add -D @opencode-ai/plugin typescript
```

3. **Create plugin:**
```typescript
// src/index.ts
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "my-plugin",
  version: "1.0.0",
  hooks: {
    "chat.message": async (input, output) => {
      output.message = `Enhanced: ${input.message}`
    }
  }
} satisfies Hook
```

4. **Test it:**
```bash
# Restart OpenCode and type any message
# You should see "Enhanced:" prepended
```

### Full Tutorial

See [PLUGIN_QUICKSTART.md](./PLUGIN_QUICKSTART.md) for complete walkthrough including:
- Hook implementations
- Custom tool creation
- Security patterns
- Testing strategies
- Publishing options

---

## Plugin Architecture

### Hook Lifecycle

```
User Message
    ↓
chat.message hooks (all plugins, sequential)
    ↓
experimental.chat.system.transform hooks
    ↓
chat.params hooks
    ↓
LLM API Call
    ↓
Assistant Response
    ↓
Tool Calls Detected
    ↓
tool.execute.before hooks (validation)
    ↓
Tool Execution
    ↓
tool.execute.after hooks (sanitization)
    ↓
Final Output
```

### Hook Categories

| Category | Hooks | Use Cases |
|----------|-------|-----------|
| **Chat** | `chat.message`, `chat.params` | RAG, filtering, model selection |
| **Tools** | `tool.execute.before/after` | Validation, sanitization, logging |
| **System** | `experimental.chat.system.transform` | Custom instructions, guidelines |
| **Permissions** | `permission.ask` | Access control, approval workflows |

---

## Security Considerations

### Plugin Trust Model

- **User-level plugins** (`~/.config/opencode/plugin/`): Trusted by user
- **Project-level plugins** (`.opencode/plugin/`): Review before use
- **npm packages**: Verify source before installing

### Security Best Practices

1. **Input Validation:** Always validate tool arguments in `tool.execute.before`
2. **Secret Scrubbing:** Remove secrets in `tool.execute.after`
3. **Access Control:** Use allowlists for write operations
4. **Path Canonicalization:** Prevent directory traversal
5. **Error Handling:** Don't leak sensitive data in errors

See [PLUGIN_SECURITY_PATTERNS.md](./PLUGIN_SECURITY_PATTERNS.md) for detailed security patterns.

---

## Available Hooks

### Stable Hooks ✅

| Hook | Purpose | Common Uses |
|------|---------|-------------|
| `chat.message` | Modify messages before LLM | RAG injection, filtering |
| `chat.params` | Modify LLM parameters | Model selection, temperature |
| `tool.execute.before` | Validate before tool runs | Security, access control |
| `tool.execute.after` | Process tool output | Sanitization, logging |
| `permission.ask` | Customize permission prompts | Auto-approval, custom messages |

### Experimental Hooks ⚠️

| Hook | Purpose | Warning |
|------|---------|---------|
| `experimental.chat.system.transform` | Inject system instructions | API may change |
| `experimental.chat.messages.transform` | Modify conversation history | API may change |
| `experimental.session.compacting` | Control session compaction | API may change |
| `experimental.text.complete` | Customize text completion | API may change |

See [PLUGIN_HOOKS_REFERENCE.md](./PLUGIN_HOOKS_REFERENCE.md) for complete hook documentation.

---

## Real-World Examples

### Example 1: RAG Injection

```typescript
"chat.message": async (input, output) => {
  const context = await searchKnowledgeBase(input.message)
  if (context.length > 0) {
    output.message = `<Context>\n${context}\n</Context>\n\n${input.message}`
  }
}
```

**See:** [opencode-mem0/src/index.ts](../plugins/opencode-mem0/src/index.ts)

---

### Example 2: Command Validation

```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool === "bash") {
    if (/rm\s+-rf\s+\//.test(output.args.command)) {
      throw new Error("Dangerous command blocked")
    }
  }
}
```

**See:** [PLUGIN_SECURITY_PATTERNS.md](./PLUGIN_SECURITY_PATTERNS.md)

---

### Example 3: Secret Scrubbing

```typescript
"tool.execute.after": async (input, output) => {
  if (typeof output.result === "string") {
    output.result = output.result.replace(
      /sk-[a-zA-Z0-9]{48}/g, 
      "***REDACTED***"
    )
  }
}
```

**See:** [opencode-mem0/src/secrets.ts](../plugins/opencode-mem0/src/secrets.ts)

---

### Example 4: Access Control

```typescript
const approved = new Set<string>()

"tool.execute.before": async (input, output) => {
  if (input.tool === "github_repo_file_put") {
    const repo = output.args.repo
    if (!approved.has(repo)) {
      throw new Error(`Write access to ${repo} requires approval`)
    }
  }
}
```

**See:** [opencode-github-autonomy/src/policy.ts](../plugins/opencode-github-autonomy/src/policy.ts)

---

## Troubleshooting

### Plugin Not Loading

1. **Check plugin location:**
```bash
ls ~/.config/opencode/plugin/
ls .opencode/plugin/
```

2. **Verify package.json:**
```json
{
  "main": "src/index.ts",  // or "dist/index.js"
  "type": "module"
}
```

3. **Check for errors:**
```bash
export OPENCODE_DEBUG=true
opencode
```

---

### Hook Not Firing

1. **Verify hook name:** Must match exactly (case-sensitive)
2. **Check hook signature:** Must be async and return Promise<void>
3. **Enable debug logging:**
```typescript
"chat.message": async (input, output) => {
  console.error("[my-plugin] chat.message called", input)
  // ... your logic
}
```

---

### TypeScript Errors

1. **Install types:**
```bash
bun add -D @opencode-ai/plugin typescript
```

2. **Use `satisfies Hook`:**
```typescript
export default {
  name: "my-plugin",
  hooks: { /* ... */ }
} satisfies Hook  // Type checking
```

---

## Official Resources

- **Main Documentation:** https://opencode.ai/docs/plugins/
- **Comprehensive Guide:** https://gist.github.com/johnlindquist/0adf1032b4e84942f3e1050aba3c5e4a
- **Tutorial:** https://dev.to/einarcesar/does-opencode-support-hooks-a-complete-guide-to-extensibility-k3p
- **Source Code:** https://github.com/opencode-ai/opencode/tree/main/packages/plugin
- **Community Plugins:** https://github.com/topics/opencode-plugin

---

## Contributing

### Creating a Plugin

1. Develop and test locally
2. Publish to npm or GitHub
3. Add to this project as submodule (if generally useful)
4. Document in INSTRUCTIONS.md

### Submitting to This Project

```bash
# Fork this repo
git clone https://github.com/yourusername/oc-stack
cd oc-stack

# Add your plugin as submodule
git submodule add https://github.com/yourusername/opencode-plugin-name plugins/plugin-name

# Commit and create PR
git commit -am "Add plugin-name plugin"
git push origin main
```

---

## License

Each plugin has its own license. See individual plugin directories for details.

---

**Last Updated:** 2026-01-13  
**Plugin Count:** 2 active plugins  
**Documentation:** 71KB across 4 comprehensive guides
