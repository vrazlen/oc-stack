# OpenCode Plugin API Reference

**Complete TypeScript API documentation for `@opencode-ai/plugin`**

**Source:** [packages/plugin/src/index.ts](https://github.com/opencode-ai/opencode/blob/ddd9c71cca1f30a8214174fc10975e2ff3bb4635/packages/plugin/src/index.ts)

---

## Table of Contents

1. [Core Types](#core-types)
2. [Hook Interface](#hook-interface)
3. [Tool Definition](#tool-definition)
4. [Context Object](#context-object)
5. [Hook Signatures](#hook-signatures)
6. [Event Types](#event-types)
7. [Configuration](#configuration)

---

## Core Types

### Hook

The main plugin export type.

```typescript
export interface Hook {
  name: string
  version?: string
  hooks?: Hooks
  tool?: { [key: string]: ToolDefinition }
  auth?: AuthHook
  config?: (input: Config) => Promise<void>
  event?: (input: { event: Event }) => Promise<void>
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Plugin identifier (unique) |
| `version` | `string` | ❌ | Semantic version (e.g., "1.0.0") |
| `hooks` | `Hooks` | ❌ | Lifecycle hook implementations |
| `tool` | `{ [key: string]: ToolDefinition }` | ❌ | Custom tool definitions |
| `auth` | `AuthHook` | ❌ | Authentication handler |
| `config` | `(input: Config) => Promise<void>` | ❌ | Configuration handler |
| `event` | `(input: { event: Event }) => Promise<void>` | ❌ | Event handler |

**Example:**
```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "my-plugin",
  version: "1.0.0",
  hooks: { /* ... */ },
  tool: { /* ... */ }
} satisfies Hook
```

---

## Hook Interface

### Hooks

Complete hook definitions for all lifecycle events.

**Source:** [index.ts:148-218](https://github.com/opencode-ai/opencode/blob/ddd9c71cca1f30a8214174fc10975e2ff3bb4635/packages/plugin/src/index.ts#L148-L218)

```typescript
export interface Hooks {
  "chat.message"?: ChatMessageHook
  "chat.params"?: ChatParamsHook
  "permission.ask"?: PermissionAskHook
  "tool.execute.before"?: ToolExecuteBeforeHook
  "tool.execute.after"?: ToolExecuteAfterHook
  "experimental.chat.messages.transform"?: ChatMessagesTransformHook
  "experimental.chat.system.transform"?: ChatSystemTransformHook
  "experimental.session.compacting"?: SessionCompactingHook
  "experimental.text.complete"?: TextCompleteHook
}
```

### Hook Categories

| Category | Hooks | Stability |
|----------|-------|-----------|
| **Chat** | `chat.message`, `chat.params` | Stable ✅ |
| **Tools** | `tool.execute.before`, `tool.execute.after` | Stable ✅ |
| **Permissions** | `permission.ask` | Stable ✅ |
| **Experimental** | `experimental.*` | Unstable ⚠️ |

---

## Tool Definition

### ToolDefinition

Custom tool specification following JSON Schema.

```typescript
export interface ToolDefinition {
  description: string
  parameters: JSONSchema
  execute: (args: any, context: Context) => Promise<any>
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string` | Human-readable tool description |
| `parameters` | `JSONSchema` | Parameter schema (JSON Schema format) |
| `execute` | `(args, context) => Promise<any>` | Tool execution function |

**Example:**
```typescript
const myTool: ToolDefinition = {
  description: "Fetches user data from API",
  parameters: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User ID to fetch"
      },
      includeDetails: {
        type: "boolean",
        description: "Include detailed information",
        default: false
      }
    },
    required: ["userId"]
  },
  execute: async ({ userId, includeDetails }, context) => {
    const response = await fetch(`/api/users/${userId}`)
    const data = await response.json()
    
    if (!includeDetails) {
      return { id: data.id, name: data.name }
    }
    
    return data
  }
}
```

### JSONSchema

Subset of JSON Schema for parameter validation.

```typescript
type JSONSchema = {
  type: "object" | "string" | "number" | "boolean" | "array"
  properties?: { [key: string]: JSONSchema }
  required?: string[]
  items?: JSONSchema
  description?: string
  default?: any
  enum?: any[]
}
```

**Common patterns:**

```typescript
// String parameter
{
  type: "string",
  description: "File path",
  default: "./default.txt"
}

// Enum parameter
{
  type: "string",
  description: "Log level",
  enum: ["debug", "info", "warn", "error"]
}

// Array parameter
{
  type: "array",
  description: "List of tags",
  items: { type: "string" }
}

// Nested object
{
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" }
  },
  required: ["name"]
}
```

---

## Context Object

### Context

Execution context provided to tools and hooks.

```typescript
export interface Context {
  client: Client
  project: Project
  $: Shell
  directory: string
  worktree: string
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `client` | `Client` | OpenCode client instance |
| `project` | `Project` | Current project metadata |
| `$` | `Shell` | Bun shell for command execution |
| `directory` | `string` | Plugin directory path |
| `worktree` | `string` | Git worktree path |

**Usage in tools:**
```typescript
execute: async (args, context) => {
  // Execute shell command
  const result = await context.$`ls -la ${context.worktree}`
  
  // Access project info
  console.log("Project:", context.project.name)
  
  // Read file relative to plugin directory
  const configPath = `${context.directory}/config.json`
  const config = await Bun.file(configPath).json()
  
  return result.stdout
}
```

### Client

OpenCode client interface (subset shown).

```typescript
interface Client {
  sessionID: string
  invoke: (tool: string, args: any) => Promise<any>
  // ... additional methods
}
```

### Project

Project metadata.

```typescript
interface Project {
  name: string
  path: string
  // ... additional fields
}
```

### Shell

Bun shell interface for command execution.

```typescript
interface Shell {
  // Template literal execution
  (strings: TemplateStringsArray, ...values: any[]): Promise<ShellOutput>
}

interface ShellOutput {
  stdout: string
  stderr: string
  exitCode: number
}
```

**Example:**
```typescript
const output = await context.$`git status`
console.log(output.stdout) // Git status output
```

---

## Hook Signatures

### chat.message

**Type:** `ChatMessageHook`

```typescript
type ChatMessageHook = (
  input: {
    message: string
    sessionID: string
  },
  output: {
    message: string
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `message` | `string` | Original user message |
| `input` | `sessionID` | `string` | Current session identifier |
| `output` | `message` | `string` | Message to send to LLM (modifiable) |

**Example:**
```typescript
"chat.message": async (input, output) => {
  // Prepend context
  output.message = `Context: ${getContext()}\n\n${input.message}`
}
```

---

### chat.params

**Type:** `ChatParamsHook`

```typescript
type ChatParamsHook = (
  input: {
    sessionID: string
  },
  output: {
    params: {
      model?: string
      temperature?: number
      max_tokens?: number
      top_p?: number
      frequency_penalty?: number
      presence_penalty?: number
      stop?: string[]
      [key: string]: any
    }
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `sessionID` | `string` | Current session identifier |
| `output` | `params` | `object` | LLM API parameters (modifiable) |

**Example:**
```typescript
"chat.params": async (input, output) => {
  // Use faster model for quick sessions
  if (input.sessionID.startsWith("quick-")) {
    output.params.model = "gpt-4-turbo"
  }
  
  // Lower temperature for code generation
  output.params.temperature = 0.2
  output.params.max_tokens = 4000
}
```

---

### tool.execute.before

**Type:** `ToolExecuteBeforeHook`

```typescript
type ToolExecuteBeforeHook = (
  input: {
    tool: string
    sessionID: string
    callID: string
  },
  output: {
    args: any
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `tool` | `string` | Tool name being executed |
| `input` | `sessionID` | `string` | Current session identifier |
| `input` | `callID` | `string` | Unique call identifier |
| `output` | `args` | `any` | Tool arguments (modifiable) |

**Throwing errors blocks execution:**
```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool === "bash" && output.args.command.includes("rm -rf /")) {
    throw new Error("Dangerous command blocked")
  }
}
```

---

### tool.execute.after

**Type:** `ToolExecuteAfterHook`

```typescript
type ToolExecuteAfterHook = (
  input: {
    tool: string
    sessionID: string
    callID: string
    args: any
  },
  output: {
    result: any
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `tool` | `string` | Tool name that was executed |
| `input` | `sessionID` | `string` | Current session identifier |
| `input` | `callID` | `string` | Unique call identifier |
| `input` | `args` | `any` | Tool arguments (read-only) |
| `output` | `result` | `any` | Tool result (modifiable) |

**Example:**
```typescript
"tool.execute.after": async (input, output) => {
  // Scrub secrets from output
  if (typeof output.result === "string") {
    output.result = output.result.replace(/sk-[a-zA-Z0-9]{48}/g, "***REDACTED***")
  }
}
```

---

### permission.ask

**Type:** `PermissionAskHook`

```typescript
type PermissionAskHook = (
  input: {
    action: string
    context: any
  },
  output: {
    prompt?: string
    autoApprove?: boolean
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `action` | `string` | Action requiring permission |
| `input` | `context` | `any` | Additional context |
| `output` | `prompt` | `string?` | Custom permission prompt |
| `output` | `autoApprove` | `boolean?` | Auto-approve without asking |

**Example:**
```typescript
"permission.ask": async (input, output) => {
  if (input.action === "write_file") {
    output.prompt = `Allow writing to ${input.context.path}?`
  }
  
  // Auto-approve safe operations
  if (input.action === "read_file" && input.context.path.endsWith(".md")) {
    output.autoApprove = true
  }
}
```

---

### experimental.chat.system.transform

**Type:** `ChatSystemTransformHook`

```typescript
type ChatSystemTransformHook = (
  input: {
    sessionID: string
  },
  output: {
    system: string[]
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `sessionID` | `string` | Current session identifier |
| `output` | `system` | `string[]` | System prompt sections (modifiable) |

**Example:**
```typescript
"experimental.chat.system.transform": async (input, output) => {
  output.system.push(`
## Custom Instructions

Always follow these project guidelines:
1. Use TypeScript strict mode
2. Write tests for all functions
3. Document public APIs with JSDoc
  `)
}
```

---

### experimental.chat.messages.transform

**Type:** `ChatMessagesTransformHook`

```typescript
type ChatMessagesTransformHook = (
  input: {
    sessionID: string
  },
  output: {
    messages: Array<{
      role: "user" | "assistant" | "system"
      content: string
    }>
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `sessionID` | `string` | Current session identifier |
| `output` | `messages` | `Message[]` | Conversation history (modifiable) |

**Example:**
```typescript
"experimental.chat.messages.transform": async (input, output) => {
  // Summarize old messages
  if (output.messages.length > 20) {
    const old = output.messages.slice(0, -10)
    const summary = await summarize(old)
    
    output.messages = [
      { role: "system", content: `Previous context: ${summary}` },
      ...output.messages.slice(-10)
    ]
  }
}
```

---

### experimental.session.compacting

**Type:** `SessionCompactingHook`

```typescript
type SessionCompactingHook = (
  input: {
    sessionID: string
  },
  output: {
    context: string[]
    prompt?: string
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `sessionID` | `string` | Session being compacted |
| `output` | `context` | `string[]` | Context to preserve (append to this) |
| `output` | `prompt` | `string?` | Custom compaction prompt |

**Example:**
```typescript
"experimental.session.compacting": async (input, output) => {
  // Preserve important facts
  output.context.push("User prefers TypeScript")
  output.context.push("Project uses React + Vite")
  
  // Custom summarization prompt
  output.prompt = "Summarize the conversation, focusing on decisions made."
}
```

---

### experimental.text.complete

**Type:** `TextCompleteHook`

```typescript
type TextCompleteHook = (
  input: {
    text: string
    sessionID: string
  },
  output: {
    completion: string
  }
) => Promise<void>
```

**Parameters:**

| Param | Field | Type | Description |
|-------|-------|------|-------------|
| `input` | `text` | `string` | Text to complete |
| `input` | `sessionID` | `string` | Current session identifier |
| `output` | `completion` | `string` | Completion result (modifiable) |

**Example:**
```typescript
"experimental.text.complete": async (input, output) => {
  // Add project-specific completions
  if (input.text.startsWith("import")) {
    output.completion = `import { } from "./";\n${output.completion}`
  }
}
```

---

## Event Types

### Event

System events that plugins can listen to.

```typescript
type Event = 
  | { type: "session.start"; sessionID: string }
  | { type: "session.end"; sessionID: string }
  | { type: "tool.execute"; tool: string; args: any }
  | { type: "error"; error: Error; context: any }
```

**Example:**
```typescript
event: async ({ event }) => {
  switch (event.type) {
    case "session.start":
      console.log("Session started:", event.sessionID)
      break
    
    case "session.end":
      console.log("Session ended:", event.sessionID)
      // Cleanup
      break
    
    case "tool.execute":
      console.log("Tool executed:", event.tool)
      break
    
    case "error":
      console.error("Error occurred:", event.error)
      break
  }
}
```

---

## Configuration

### Config

Plugin configuration object.

```typescript
interface Config {
  plugins: string[]
  models: ModelConfig[]
  // ... additional fields
}
```

**Example:**
```typescript
config: async (input) => {
  console.log("Loaded plugins:", input.plugins)
  console.log("Available models:", input.models)
  
  // Validate configuration
  if (!process.env.REQUIRED_API_KEY) {
    throw new Error("REQUIRED_API_KEY not set")
  }
}
```

---

## Best Practices

### 1. Type Safety

Always use `satisfies Hook` for type checking:

```typescript
export default {
  name: "my-plugin",
  hooks: { /* ... */ }
} satisfies Hook  // ✅ Type-checked
```

### 2. Error Handling

Non-critical hooks should not throw:

```typescript
"chat.message": async (input, output) => {
  try {
    const context = await fetchContext(input.message)
    output.message = context + "\n\n" + input.message
  } catch (error) {
    console.error("Context fetch failed:", error)
    // Don't throw - let message proceed
  }
}
```

Validation hooks should throw to block:

```typescript
"tool.execute.before": async (input, output) => {
  if (shouldBlock(output.args)) {
    throw new Error("Blocked: reason")  // ✅ Blocks execution
  }
}
```

### 3. Async/Await

All hooks must be async and return Promise<void>:

```typescript
// ✅ Correct
"chat.message": async (input, output) => {
  await doSomethingAsync()
  output.message = "modified"
}

// ❌ Wrong - not async
"chat.message": (input, output) => {
  output.message = "modified"
}

// ❌ Wrong - returns value
"chat.message": async (input, output) => {
  return { message: "modified" }
}
```

### 4. Output Modification

Always modify the `output` parameter in-place:

```typescript
// ✅ Correct
output.message = "new value"
output.args.param = "modified"

// ❌ Wrong - reassignment doesn't work
output = { message: "new value" }
```

### 5. Performance

Minimize hook latency:

```typescript
// ❌ Bad - sequential
const a = await fetch("/a")
const b = await fetch("/b")

// ✅ Good - parallel
const [a, b] = await Promise.all([
  fetch("/a"),
  fetch("/b")
])
```

Cache expensive computations:

```typescript
const cache = new Map()

"chat.message": async (input, output) => {
  if (!cache.has(input.message)) {
    cache.set(input.message, await expensiveOperation(input.message))
  }
  
  const result = cache.get(input.message)
  output.message = result + "\n\n" + input.message
}
```

---

## Version Compatibility

| Package Version | OpenCode Version | Notes |
|-----------------|------------------|-------|
| `0.1.x` | `0.x` | Initial release |
| `0.2.x` | `0.x` | Added experimental hooks |

**Checking compatibility:**
```typescript
import { version } from "@opencode-ai/plugin"

if (version < "0.2.0") {
  console.warn("Plugin requires @opencode-ai/plugin >= 0.2.0")
}
```

---

## Complete Example

```typescript
import { Hook } from "@opencode-ai/plugin"

// Configuration
const API_KEY = process.env.MY_API_KEY
const DEBUG = process.env.PLUGIN_DEBUG === "true"

function log(...args: any[]) {
  if (DEBUG) console.error("[my-plugin]", ...args)
}

// Plugin export
export default {
  name: "my-plugin",
  version: "1.0.0",
  
  hooks: {
    "chat.message": async (input, output) => {
      log("chat.message", input.message)
      
      try {
        const context = await fetchContext(input.message)
        output.message = `${context}\n\n${input.message}`
      } catch (error) {
        log("Error:", error)
      }
    },
    
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash" && isDangerous(output.args.command)) {
        throw new Error("Dangerous command blocked")
      }
    },
    
    "tool.execute.after": async (input, output) => {
      if (typeof output.result === "string") {
        output.result = scrubSecrets(output.result)
      }
    }
  },
  
  tool: {
    my_tool: {
      description: "Custom tool",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string", description: "Input text" }
        },
        required: ["input"]
      },
      execute: async ({ input }, context) => {
        log("my_tool called with:", input)
        const result = await processInput(input)
        return result
      }
    }
  },
  
  config: async (config) => {
    if (!API_KEY) {
      throw new Error("MY_API_KEY not set")
    }
    log("Plugin configured successfully")
  }
} satisfies Hook

// Helper functions
async function fetchContext(message: string): Promise<string> {
  const response = await fetch("/api/context", {
    method: "POST",
    body: JSON.stringify({ query: message })
  })
  return response.text()
}

function isDangerous(command: string): boolean {
  const patterns = [/rm\s+-rf\s+\//, /dd\s+if=/]
  return patterns.some(p => p.test(command))
}

function scrubSecrets(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9]{48}/g, "***REDACTED***")
}

async function processInput(input: string): Promise<any> {
  // Implementation
  return { processed: input }
}
```

---

## See Also

- [PLUGIN_HOOKS_REFERENCE.md](./PLUGIN_HOOKS_REFERENCE.md) - Detailed hook documentation
- [PLUGIN_SECURITY_PATTERNS.md](./PLUGIN_SECURITY_PATTERNS.md) - Security best practices
- [PLUGIN_QUICKSTART.md](./PLUGIN_QUICKSTART.md) - Getting started guide

---

**Last Updated:** 2026-01-13  
**Source Commit:** [ddd9c71](https://github.com/opencode-ai/opencode/tree/ddd9c71cca1f30a8214174fc10975e2ff3bb4635)
