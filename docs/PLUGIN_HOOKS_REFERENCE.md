# OpenCode Plugin Hooks - Complete Reference

**Generated:** 2026-01-13  
**Based on:** OpenCode v0.x source analysis (commit ddd9c71)  
**Authoritative Source:** [packages/plugin/src/index.ts](https://github.com/opencode-ai/opencode/blob/ddd9c71cca1f30a8214174fc10975e2ff3bb4635/packages/plugin/src/index.ts#L148-L218)

---

## Table of Contents

1. [Overview](#overview)
2. [Hook Types](#hook-types)
3. [Lifecycle Hooks](#lifecycle-hooks)
4. [Experimental Hooks](#experimental-hooks)
5. [Security Patterns](#security-patterns)
6. [Real-World Examples](#real-world-examples)
7. [Best Practices](#best-practices)

---

## Overview

OpenCode plugins extend functionality through **hooks**—async functions that intercept specific lifecycle events. Hooks execute sequentially across all loaded plugins in order of registration.

### Plugin Structure

```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "my-plugin",
  version: "1.0.0",
  hooks: {
    "chat.message": async (input, output) => {
      // Your logic here
    }
  }
} satisfies Hook
```

### Plugin Loading Order

1. **npm packages** (from `node_modules`)
2. **Project plugins** (`.opencode/plugin/`)
3. **User plugins** (`~/.config/opencode/plugin/`)

---

## Hook Types

### Complete Hook Interface

**Source:** [index.ts:148-218](https://github.com/opencode-ai/opencode/blob/ddd9c71cca1f30a8214174fc10975e2ff3bb4635/packages/plugin/src/index.ts#L148-L218)

```typescript
export interface Hooks {
  // Configuration
  event?: (input: { event: Event }) => Promise<void>
  config?: (input: Config) => Promise<void>
  tool?: { [key: string]: ToolDefinition }
  auth?: AuthHook
  
  // Core Lifecycle Hooks
  "chat.message"?: (input, output) => Promise<void>
  "chat.params"?: (input, output) => Promise<void>
  "permission.ask"?: (input, output) => Promise<void>
  "tool.execute.before"?: (input, output) => Promise<void>
  "tool.execute.after"?: (input, output) => Promise<void>
  
  // Experimental Hooks
  "experimental.chat.messages.transform"?: (input, output) => Promise<void>
  "experimental.chat.system.transform"?: (input, output) => Promise<void>
  "experimental.session.compacting"?: (input, output) => Promise<void>
  "experimental.text.complete"?: (input, output) => Promise<void>
}
```

---

## Lifecycle Hooks

### `chat.message`

**Purpose:** Intercept and modify messages before they reach the LLM.

**Signature:**
```typescript
"chat.message": async (input: {
  message: string
  sessionID: string
}, output: {
  message: string
}) => Promise<void>
```

**Use Cases:**
- RAG injection (inject retrieved context)
- Auto-capture user messages to memory
- Content filtering/moderation
- Message enrichment

**Real Example:** [opencode-mem0/src/index.ts](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-mem0/src/index.ts#L45-L67)

```typescript
"chat.message": async (input, output) => {
  if (config.ragEnabled) {
    const memories = await mem0.search(input.message, { limit: 5 })
    if (memories.length > 0) {
      const context = memories.map(m => m.memory).join('\n')
      output.message = `<RelevantMemories>\n${context}\n</RelevantMemories>\n\n${input.message}`
    }
  }
  
  if (config.autoAdd && input.message.length < 2000) {
    await mem0.add(input.message, { role: "user" })
  }
}
```

---

### `tool.execute.before`

**Purpose:** Validate or block tool execution before it runs.

**Signature:**
```typescript
"tool.execute.before": async (input: {
  tool: string
  sessionID: string
  callID: string
}, output: {
  args: any
}) => Promise<void>
```

**Use Cases:**
- Security validation (block dangerous commands)
- Argument transformation/sanitization
- Logging/auditing
- Rate limiting

**Security Pattern:**
```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool === "bash") {
    const cmd = output.args.command
    
    // Block dangerous commands
    if (cmd.includes("rm -rf /")) {
      throw new Error("Dangerous command blocked")
    }
    
    // Sanitize paths
    if (cmd.includes("..")) {
      throw new Error("Path traversal blocked")
    }
  }
}
```

**Real Example:** [oh-my-opencode validation](https://github.com/johnlindquist/oh-my-opencode/blob/main/src/index.ts)

---

### `tool.execute.after`

**Purpose:** Process or modify tool output after execution.

**Signature:**
```typescript
"tool.execute.after": async (input: {
  tool: string
  sessionID: string
  callID: string
  args: any
}, output: {
  result: any
}) => Promise<void>
```

**Use Cases:**
- Output sanitization (scrub secrets)
- Result transformation
- Post-execution logging
- Error handling

**Security Pattern:**
```typescript
"tool.execute.after": async (input, output) => {
  if (typeof output.result === "string") {
    // Scrub API keys from output
    output.result = output.result.replace(
      /sk-[a-zA-Z0-9]{48}/g, 
      "***REDACTED***"
    )
  }
}
```

---

### `chat.params`

**Purpose:** Modify LLM API parameters before request.

**Signature:**
```typescript
"chat.params": async (input: {
  sessionID: string
}, output: {
  params: {
    model?: string
    temperature?: number
    max_tokens?: number
    // ... other LLM params
  }
}) => Promise<void>
```

**Use Cases:**
- Dynamic model selection
- Temperature adjustment based on task
- Token budget management

**Example:**
```typescript
"chat.params": async (input, output) => {
  // Use faster model for simple tasks
  if (input.sessionID.startsWith("quick-")) {
    output.params.model = "gpt-4-turbo"
  }
  
  // Lower temperature for code generation
  output.params.temperature = 0.2
}
```

---

### `permission.ask`

**Purpose:** Customize permission prompts or auto-approve actions.

**Signature:**
```typescript
"permission.ask": async (input: {
  action: string
  context: any
}, output: {
  prompt?: string
  autoApprove?: boolean
}) => Promise<void>
```

**Use Cases:**
- Auto-approve trusted operations
- Custom permission messages
- Conditional approval logic

---

## Experimental Hooks

### `experimental.chat.system.transform`

**Purpose:** Modify system instructions dynamically.

**Signature:**
```typescript
"experimental.chat.system.transform": async (input: {
  sessionID: string
}, output: {
  system: string[]
}) => Promise<void>
```

**Use Cases:**
- Inject custom agent instructions
- Add project-specific guidelines
- Dynamic role configuration

**Real Example:** [Plannotator plugin](https://github.com/johnlindquist/plannotator)

```typescript
"experimental.chat.system.transform": async (input, output) => {
  output.system.push(`
## Plan Submission Protocol

When the user asks you to create a plan:
1. Use the submit_plan tool
2. Wait for approval before executing
3. Track progress in the todo list
  `)
}
```

---

### `experimental.chat.messages.transform`

**Purpose:** Transform the entire message history.

**Signature:**
```typescript
"experimental.chat.messages.transform": async (input: {
  sessionID: string
}, output: {
  messages: Array<{
    role: "user" | "assistant" | "system"
    content: string
  }>
}) => Promise<void>
```

**Use Cases:**
- Message compression/summarization
- Context window optimization
- Conversation rewriting

---

### `experimental.session.compacting`

**Purpose:** Provide custom context during session compaction.

**Signature:**
```typescript
"experimental.session.compacting": async (input: {
  sessionID: string
}, output: {
  context: string[]
  prompt?: string
}) => Promise<void>
```

**Use Cases:**
- Preserve critical information during compaction
- Add metadata/tags to compacted sessions
- Custom summarization prompts

---

## Security Patterns

### 1. Command Validation (tool.execute.before)

**Pattern:** Block dangerous commands before execution.

```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool === "bash") {
    const cmd = output.args.command
    
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,           // Delete root
      /dd\s+if=.*of=\/dev\//,     // Disk write
      /mkfs/,                     // Format disk
      /:(){ :|:& };:/,            // Fork bomb
      /wget.*\|\s*bash/,          // Remote execution
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(cmd)) {
        throw new Error(`Blocked dangerous command: ${cmd}`)
      }
    }
  }
}
```

---

### 2. Path Traversal Prevention

```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool === "read" || input.tool === "write") {
    const path = output.args.filePath
    
    // Block path traversal
    if (path.includes("..") || path.startsWith("/etc/")) {
      throw new Error("Path traversal blocked")
    }
    
    // Restrict to project directory
    const projectRoot = process.cwd()
    const resolved = require("path").resolve(path)
    if (!resolved.startsWith(projectRoot)) {
      throw new Error("Access outside project directory blocked")
    }
  }
}
```

---

### 3. Secret Scrubbing (tool.execute.after)

**Pattern:** Remove secrets from tool output.

```typescript
"tool.execute.after": async (input, output) => {
  if (typeof output.result === "string") {
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{48}/g,              // OpenAI keys
      /ghp_[a-zA-Z0-9]{36}/g,             // GitHub PAT
      /AKIA[0-9A-Z]{16}/g,                // AWS keys
      /AIza[0-9A-Za-z\\-_]{35}/g,         // Google API keys
      /xox[baprs]-[0-9a-zA-Z]{10,48}/g,   // Slack tokens
    ]
    
    for (const pattern of secretPatterns) {
      output.result = output.result.replace(pattern, "***REDACTED***")
    }
  }
}
```

**Real Implementation:** [opencode-mem0 secret scrubbing](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-mem0/src/secrets.ts)

---

### 4. Allowlist-Based Access Control

**Pattern:** Restrict write operations to approved resources.

```typescript
const allowedRepos = ["owner/repo1", "owner/repo2"]

"tool.execute.before": async (input, output) => {
  if (input.tool === "github_repo_file_put") {
    const repo = output.args.repo
    
    if (!allowedRepos.includes(repo)) {
      throw new Error(
        `Write access to ${repo} not approved. ` +
        `Allowed: ${allowedRepos.join(", ")}`
      )
    }
  }
}
```

**Real Implementation:** [opencode-github-autonomy policy](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-github-autonomy/src/policy.ts)

---

## Real-World Examples

### Example 1: RAG Injection (Mem0)

**File:** [plugins/opencode-mem0/src/index.ts](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-mem0/src/index.ts)

```typescript
export default {
  name: "opencode-mem0",
  hooks: {
    "chat.message": async (input, output) => {
      // Search for relevant memories
      const memories = await mem0.search(input.message, {
        user_id: config.userId,
        limit: 5
      })
      
      if (memories.length > 0) {
        const context = memories.map(m => m.memory).join('\n')
        output.message = `<RelevantMemories>\n${context}\n</RelevantMemories>\n\n${input.message}`
      }
      
      // Auto-capture new memories
      if (input.message.length < 2000) {
        await mem0.add(input.message, {
          user_id: config.userId,
          metadata: { role: "user", session: input.sessionID }
        })
      }
    }
  }
}
```

---

### Example 2: Security Guardrails (GitHub Autonomy)

**File:** [plugins/opencode-github-autonomy/src/policy.ts](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-github-autonomy/src/policy.ts)

```typescript
"tool.execute.before": async (input, output) => {
  const writeOps = ["github_repo_file_put", "github_pr_create", "github_issue_comment"]
  
  if (writeOps.includes(input.tool)) {
    const repo = output.args.repo
    const policy = loadPolicy()
    
    // Check allowlist
    if (!policy.allowlist.includes(repo)) {
      // Check session approval
      if (!sessionApprovals.has(repo)) {
        throw new Error(
          `NEEDS_APPROVAL: Write access to ${repo} requires user approval. ` +
          `Use github_session_allow_repo to approve.`
        )
      }
    }
    
    // Block forbidden operations
    if (output.args.message?.includes("--force")) {
      throw new Error("Force push blocked by security policy")
    }
  }
}
```

---

### Example 3: Custom Instructions (Plannotator)

**Source:** [johnlindquist/plannotator](https://github.com/johnlindquist/plannotator/blob/main/src/index.ts)

```typescript
"experimental.chat.system.transform": async (input, output) => {
  output.system.push(`
## Plan Submission Protocol

Before executing multi-step tasks:
1. Use submit_plan tool with detailed steps
2. Wait for user approval
3. Track progress using todo list
4. Report completion when done

Example plan format:
- Step 1: Research existing implementations
- Step 2: Draft initial code structure
- Step 3: Implement core functionality
- Step 4: Write tests
- Step 5: Document usage
  `)
}
```

---

## Best Practices

### 1. Hook Execution Order

Hooks execute **sequentially** across all loaded plugins. Each plugin's hook completes before the next runs.

```
Plugin A: chat.message (runs first)
  ↓
Plugin B: chat.message (runs second)
  ↓
Plugin C: chat.message (runs third)
  ↓
Modified message sent to LLM
```

**Implication:** Later plugins can see modifications from earlier plugins.

---

### 2. Error Handling

**Throw errors to block execution:**

```typescript
"tool.execute.before": async (input, output) => {
  if (shouldBlock(output.args)) {
    throw new Error("Blocked: reason here")
  }
}
```

**Don't throw errors for non-critical issues:**

```typescript
"chat.message": async (input, output) => {
  try {
    const context = await fetchContext(input.message)
    output.message = context + "\n\n" + input.message
  } catch (error) {
    console.error("Context fetch failed:", error)
    // Don't throw - let message proceed without context
  }
}
```

---

### 3. Performance Considerations

- **Minimize latency:** Hooks run on every message/tool call
- **Use caching:** Store expensive computations
- **Parallel API calls:** Use `Promise.all()` when possible
- **Async properly:** Always return Promises

```typescript
"chat.message": async (input, output) => {
  // BAD: Sequential API calls
  const context1 = await fetchContext1()
  const context2 = await fetchContext2()
  
  // GOOD: Parallel API calls
  const [context1, context2] = await Promise.all([
    fetchContext1(),
    fetchContext2()
  ])
}
```

---

### 4. Output Modification

Always modify the `output` parameter, never return values:

```typescript
// CORRECT
"chat.message": async (input, output) => {
  output.message = "Modified: " + input.message
}

// WRONG - return value is ignored
"chat.message": async (input, output) => {
  return { message: "Modified: " + input.message }
}
```

---

### 5. Testing Hooks

Use OpenCode's plugin testing utilities:

```typescript
import { test } from "bun:test"
import plugin from "./index"

test("chat.message RAG injection", async () => {
  const input = { message: "test query", sessionID: "test-123" }
  const output = { message: input.message }
  
  await plugin.hooks["chat.message"](input, output)
  
  expect(output.message).toContain("<RelevantMemories>")
})
```

---

### 6. Environment Configuration

Use environment variables for configuration:

```typescript
const config = {
  enabled: process.env.PLUGIN_ENABLED !== "false",
  apiKey: process.env.PLUGIN_API_KEY,
  debug: process.env.PLUGIN_DEBUG === "true"
}

export default {
  name: "my-plugin",
  hooks: {
    "chat.message": async (input, output) => {
      if (!config.enabled) return
      // ... hook logic
    }
  }
}
```

---

## Official Resources

- **Main Documentation:** https://opencode.ai/docs/plugins/
- **Comprehensive Guide:** https://gist.github.com/johnlindquist/0adf1032b4e84942f3e1050aba3c5e4a
- **Tutorial:** https://dev.to/einarcesar/does-opencode-support-hooks-a-complete-guide-to-extensibility-k3p
- **Source Code:** https://github.com/opencode-ai/opencode/tree/main/packages/plugin
- **Example Plugins:** https://github.com/opencode-ai (search for "opencode-plugin-")

---

## Contributing

Found an error? Have a better example? Contribute to this document:
1. Fork the repository
2. Edit `docs/PLUGIN_HOOKS_REFERENCE.md`
3. Submit a PR with examples and permalinks

---

**Last Updated:** 2026-01-13  
**Maintained by:** OpenCode Community
