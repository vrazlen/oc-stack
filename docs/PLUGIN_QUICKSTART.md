# OpenCode Plugin Quick Start Guide

**Target Audience:** Developers new to OpenCode plugin development  
**Time to Complete:** 15-30 minutes  
**Prerequisites:** Node.js 18+, TypeScript basics

---

## Table of Contents

1. [Your First Plugin](#your-first-plugin)
2. [Plugin Structure](#plugin-structure)
3. [Common Use Cases](#common-use-cases)
4. [Testing Your Plugin](#testing-your-plugin)
5. [Debugging Tips](#debugging-tips)
6. [Publishing](#publishing)

---

## Your First Plugin

Let's create a simple plugin that adds a custom greeting to every chat message.

### Step 1: Create Plugin Directory

```bash
# Option A: User-level plugin (available in all projects)
mkdir -p ~/.config/opencode/plugin/hello-plugin
cd ~/.config/opencode/plugin/hello-plugin

# Option B: Project-level plugin (specific to one project)
mkdir -p .opencode/plugin/hello-plugin
cd .opencode/plugin/hello-plugin
```

### Step 2: Initialize Package

```bash
bun init -y
bun add -D @opencode-ai/plugin typescript
```

### Step 3: Create Plugin File

**src/index.ts:**
```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "hello-plugin",
  version: "1.0.0",
  hooks: {
    "chat.message": async (input, output) => {
      // Add a friendly greeting to every message
      output.message = `👋 Hello! ${input.message}`
    }
  }
} satisfies Hook
```

### Step 4: Configure Build

**package.json:**
```json
{
  "name": "hello-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "@opencode-ai/plugin": "latest"
  }
}
```

### Step 5: Test It

```bash
# In your OpenCode session
# Type any message - you should see the greeting prepended!
```

**Expected behavior:**
```
User: "Help me write a function"
OpenCode sees: "👋 Hello! Help me write a function"
```

---

## Plugin Structure

### Minimal Plugin

```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "my-plugin",
  version: "1.0.0",
  hooks: {}
} satisfies Hook
```

### Complete Plugin Template

```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "my-plugin",
  version: "1.0.0",
  
  // Lifecycle hooks
  hooks: {
    "chat.message": async (input, output) => {
      // Modify messages before they reach the LLM
    },
    
    "tool.execute.before": async (input, output) => {
      // Validate or block tool execution
    },
    
    "tool.execute.after": async (input, output) => {
      // Process tool output
    },
    
    "experimental.chat.system.transform": async (input, output) => {
      // Inject custom system instructions
    }
  },
  
  // Custom tools (optional)
  tool: {
    my_custom_tool: {
      description: "Does something useful",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string", description: "Input parameter" }
        },
        required: ["input"]
      },
      execute: async ({ input }) => {
        return `Processed: ${input}`
      }
    }
  },
  
  // Auth handler (optional)
  auth: async (context) => {
    // Handle authentication
  },
  
  // Config handler (optional)
  config: async (config) => {
    // Process configuration
  }
} satisfies Hook
```

### File Structure

```
my-plugin/
├── src/
│   ├── index.ts          # Main plugin export
│   ├── hooks/            # Hook implementations
│   │   ├── chat.ts
│   │   └── tools.ts
│   ├── tools/            # Custom tool definitions
│   │   └── my-tool.ts
│   └── utils/            # Helper functions
│       └── helpers.ts
├── tests/
│   └── index.test.ts     # Plugin tests
├── package.json
├── tsconfig.json
└── README.md
```

---

## Common Use Cases

### Use Case 1: Message Enhancement (RAG)

**Goal:** Inject relevant context from a knowledge base

```typescript
import { Hook } from "@opencode-ai/plugin"
import { searchKnowledgeBase } from "./kb"

export default {
  name: "rag-plugin",
  hooks: {
    "chat.message": async (input, output) => {
      // Search for relevant context
      const context = await searchKnowledgeBase(input.message)
      
      if (context.length > 0) {
        // Prepend context to message
        output.message = `
<Context>
${context.map(c => c.content).join('\n\n')}
</Context>

${input.message}
`
      }
    }
  }
} satisfies Hook
```

**Real Example:** [opencode-mem0 plugin](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-mem0/src/index.ts)

---

### Use Case 2: Command Validation

**Goal:** Block dangerous bash commands

```typescript
import { Hook } from "@opencode-ai/plugin"

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /dd\s+if=.*of=\/dev\//,
  /:(){ :|:& };:/,  // Fork bomb
  /wget.*\|\s*bash/,
]

export default {
  name: "safety-plugin",
  hooks: {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const cmd = output.args.command
        
        for (const pattern of DANGEROUS_PATTERNS) {
          if (pattern.test(cmd)) {
            throw new Error(`Blocked dangerous command: ${cmd}`)
          }
        }
      }
    }
  }
} satisfies Hook
```

---

### Use Case 3: Secret Scrubbing

**Goal:** Remove API keys from outputs

```typescript
import { Hook } from "@opencode-ai/plugin"

const SECRET_PATTERNS = [
  { regex: /sk-[a-zA-Z0-9]{48}/g, name: "OpenAI Key" },
  { regex: /ghp_[a-zA-Z0-9]{36}/g, name: "GitHub Token" },
  { regex: /AKIA[0-9A-Z]{16}/g, name: "AWS Key" },
]

export default {
  name: "secret-scrubber",
  hooks: {
    "tool.execute.after": async (input, output) => {
      if (typeof output.result === "string") {
        for (const { regex, name } of SECRET_PATTERNS) {
          output.result = output.result.replace(regex, `***${name} REDACTED***`)
        }
      }
    }
  }
} satisfies Hook
```

**Real Example:** [opencode-mem0 secret scrubbing](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-mem0/src/secrets.ts)

---

### Use Case 4: Custom System Instructions

**Goal:** Add project-specific guidelines to the AI

```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "coding-standards",
  hooks: {
    "experimental.chat.system.transform": async (input, output) => {
      output.system.push(`
## Project Coding Standards

1. **TypeScript**: Always use strict mode
2. **Error Handling**: Wrap async operations in try-catch
3. **Testing**: Write unit tests for all functions
4. **Documentation**: Add JSDoc comments to public APIs
5. **Style**: Follow Prettier conventions

When writing code, ALWAYS adhere to these standards.
      `)
    }
  }
} satisfies Hook
```

---

### Use Case 5: Custom Tool

**Goal:** Add a tool to fetch data from an API

```typescript
import { Hook } from "@opencode-ai/plugin"

export default {
  name: "weather-plugin",
  tool: {
    get_weather: {
      description: "Get current weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'London', 'Tokyo')"
          }
        },
        required: ["city"]
      },
      execute: async ({ city }) => {
        const apiKey = process.env.WEATHER_API_KEY
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
        
        const response = await fetch(url)
        const data = await response.json()
        
        return {
          temperature: data.main.temp,
          conditions: data.weather[0].description,
          humidity: data.main.humidity
        }
      }
    }
  }
} satisfies Hook
```

---

### Use Case 6: Access Control

**Goal:** Require approval for write operations

```typescript
import { Hook } from "@opencode-ai/plugin"

const approvedRepos = new Set<string>()

export default {
  name: "access-control",
  hooks: {
    "tool.execute.before": async (input, output) => {
      const writeTools = ["github_repo_file_put", "github_pr_create"]
      
      if (writeTools.includes(input.tool)) {
        const repo = output.args.repo
        
        if (!approvedRepos.has(repo)) {
          throw new Error(
            `Write access to ${repo} requires approval. ` +
            `Use approve_repo("${repo}") first.`
          )
        }
      }
    }
  },
  
  tool: {
    approve_repo: {
      description: "Approve write access to a repository",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository (owner/name)" }
        },
        required: ["repo"]
      },
      execute: async ({ repo }) => {
        approvedRepos.add(repo)
        return `Write access approved for ${repo}`
      }
    }
  }
} satisfies Hook
```

**Real Example:** [opencode-github-autonomy](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-github-autonomy/src/policy.ts)

---

## Testing Your Plugin

### Unit Testing with Bun

**tests/index.test.ts:**
```typescript
import { test, expect } from "bun:test"
import plugin from "../src/index"

test("chat.message adds greeting", async () => {
  const input = {
    message: "Hello world",
    sessionID: "test-123"
  }
  const output = { message: input.message }
  
  await plugin.hooks["chat.message"]!(input, output)
  
  expect(output.message).toContain("👋 Hello!")
  expect(output.message).toContain("Hello world")
})

test("tool.execute.before blocks dangerous commands", async () => {
  const input = {
    tool: "bash",
    sessionID: "test-123",
    callID: "call-1"
  }
  const output = {
    args: { command: "rm -rf /" }
  }
  
  await expect(
    plugin.hooks["tool.execute.before"]!(input, output)
  ).rejects.toThrow("Blocked dangerous command")
})
```

**Run tests:**
```bash
bun test
```

---

### Integration Testing

**Test in real OpenCode session:**

1. **Enable debug mode:**
```bash
export OPENCODE_DEBUG=true
```

2. **Load your plugin:**
```bash
# User-level
cp -r my-plugin ~/.config/opencode/plugin/

# Project-level
cp -r my-plugin .opencode/plugin/
```

3. **Test each hook:**
```
# Test chat.message
User: "Test message"
# Verify output is modified

# Test tool.execute.before
User: "Run this bash command: rm -rf /"
# Verify command is blocked
```

---

## Debugging Tips

### 1. Enable Debug Logging

```typescript
const DEBUG = process.env.PLUGIN_DEBUG === "true"

function log(...args: any[]) {
  if (DEBUG) {
    console.error(`[${new Date().toISOString()}] [my-plugin]`, ...args)
  }
}

export default {
  name: "my-plugin",
  hooks: {
    "chat.message": async (input, output) => {
      log("chat.message called", { input, output })
      // ... your logic
      log("chat.message result", { output })
    }
  }
} satisfies Hook
```

**Usage:**
```bash
export PLUGIN_DEBUG=true
opencode
```

---

### 2. Inspect Hook Arguments

```typescript
"tool.execute.before": async (input, output) => {
  console.error("Tool:", input.tool)
  console.error("Args:", JSON.stringify(output.args, null, 2))
  console.error("Session:", input.sessionID)
  console.error("Call ID:", input.callID)
}
```

---

### 3. Handle Errors Gracefully

```typescript
"chat.message": async (input, output) => {
  try {
    const context = await fetchContext(input.message)
    output.message = context + "\n\n" + input.message
  } catch (error) {
    console.error("Error fetching context:", error)
    // Don't throw - let message proceed without context
  }
}
```

---

### 4. Validate Environment

```typescript
const API_KEY = process.env.MY_API_KEY

if (!API_KEY) {
  console.error("WARNING: MY_API_KEY not set, plugin will be disabled")
}

export default {
  name: "my-plugin",
  hooks: {
    "chat.message": async (input, output) => {
      if (!API_KEY) return // Skip if not configured
      // ... your logic
    }
  }
} satisfies Hook
```

---

### 5. TypeScript Type Checking

```typescript
import { Hook } from "@opencode-ai/plugin"

// This will give you type errors if your hook signatures are wrong
export default {
  name: "my-plugin",
  hooks: {
    // ✅ Correct
    "chat.message": async (input, output) => {
      output.message = "test"
    },
    
    // ❌ TypeScript error - wrong signature
    "chat.message": async (msg: string) => {
      return msg
    }
  }
} satisfies Hook
```

---

## Publishing

### Option 1: NPM Package

**package.json:**
```json
{
  "name": "opencode-plugin-myname",
  "version": "1.0.0",
  "description": "My awesome OpenCode plugin",
  "keywords": ["opencode", "opencode-plugin"],
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "bun test",
    "prepublishOnly": "bun run build"
  },
  "peerDependencies": {
    "@opencode-ai/plugin": "^0.1.0"
  }
}
```

**Publish:**
```bash
bun run build
npm publish
```

**Users install:**
```bash
npm install opencode-plugin-myname
```

---

### Option 2: GitHub Repository

**Structure:**
```
opencode-plugin-myname/
├── src/index.ts
├── package.json
├── README.md
└── INSTRUCTIONS.md  # Usage instructions for OpenCode
```

**INSTRUCTIONS.md:**
```markdown
# My Plugin

Quick reference: my_custom_tool

## Installation

\`\`\`bash
git clone https://github.com/user/opencode-plugin-myname ~/.config/opencode/plugin/myname
cd ~/.config/opencode/plugin/myname
bun install
\`\`\`

## Usage

This plugin does X, Y, and Z...
```

**Users install:**
```bash
git clone https://github.com/user/opencode-plugin-myname ~/.config/opencode/plugin/myname
cd ~/.config/opencode/plugin/myname
bun install
```

---

### Option 3: Git Submodule (Recommended for this project)

**Add as submodule:**
```bash
cd /home/vrazlen/Work/oc-stack
git submodule add https://github.com/user/opencode-plugin-myname plugins/myname
git submodule update --init --recursive
```

**Users sync:**
```bash
git submodule update --init --recursive
```

---

## Next Steps

1. **Read the full references:**
   - [PLUGIN_HOOKS_REFERENCE.md](./PLUGIN_HOOKS_REFERENCE.md) - Complete hook documentation
   - [PLUGIN_SECURITY_PATTERNS.md](./PLUGIN_SECURITY_PATTERNS.md) - Security best practices

2. **Study real examples:**
   - [opencode-mem0](../plugins/opencode-mem0) - RAG + memory management
   - [opencode-github-autonomy](../plugins/opencode-github-autonomy) - Access control

3. **Explore community plugins:**
   - [oh-my-opencode](https://github.com/johnlindquist/oh-my-opencode) - Multiple hooks
   - [plannotator](https://github.com/johnlindquist/plannotator) - System transform

4. **Join the community:**
   - GitHub Discussions: https://github.com/opencode-ai/opencode/discussions
   - Discord: [link if available]

---

## Quick Reference

### Hook Cheat Sheet

| Hook | When | Common Uses |
|------|------|-------------|
| `chat.message` | Before LLM | RAG, filtering, enrichment |
| `tool.execute.before` | Before tool runs | Validation, blocking, auth |
| `tool.execute.after` | After tool runs | Scrubbing, logging, transform |
| `chat.params` | Before LLM API call | Model selection, parameters |
| `experimental.chat.system.transform` | Before LLM | Inject instructions |

### Common Patterns

```typescript
// Block execution
throw new Error("Reason")

// Modify output
output.message = "new value"
output.args.param = "modified"

// Add context
output.message = context + "\n\n" + input.message

// Scrub secrets
output.result = output.result.replace(/pattern/g, "***REDACTED***")

// Conditional logic
if (condition) {
  // modify
} else {
  // skip
}
```

---

**Happy Plugin Building!** 🚀
