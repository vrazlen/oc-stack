# OpenCode Plugin Security Patterns

**Generated:** 2026-01-13  
**Purpose:** Security best practices and guardrail implementations for OpenCode plugins

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Threat Model](#threat-model)
3. [Guardrail Patterns](#guardrail-patterns)
4. [Secret Management](#secret-management)
5. [Access Control](#access-control)
6. [Real-World Implementations](#real-world-implementations)

---

## Security Principles

### 1. Defense in Depth

Implement multiple layers of security:

```
User Input
  ↓
[Input Validation] ← tool.execute.before hook
  ↓
[Command Execution]
  ↓
[Output Sanitization] ← tool.execute.after hook
  ↓
Final Output
```

### 2. Allowlist-Centric Design

**Default:** DENY  
**Explicit:** ALLOW

```typescript
const ALLOWED_REPOS = ["owner/trusted-repo"]

if (!ALLOWED_REPOS.includes(repo)) {
  throw new Error("Access denied")
}
```

### 3. Least Privilege

Grant minimal permissions necessary:
- READ operations: Open by default (public repos)
- WRITE operations: Require explicit approval
- DESTRUCTIVE operations: Multiple confirmations

### 4. Untrusted Content Assumption

Treat ALL external content as untrusted:
- Issue comments
- PR descriptions
- User messages
- API responses

---

## Threat Model

### Attack Vectors

| Vector | Risk | Mitigation |
|--------|------|------------|
| **Command Injection** | High | Input validation, allowlist patterns |
| **Path Traversal** | High | Path canonicalization, directory restrictions |
| **Secret Leakage** | Critical | Output scrubbing, environment isolation |
| **Unauthorized Access** | High | Allowlist + session approval |
| **Remote Code Execution** | Critical | Command validation, no eval/exec |
| **DoS (Resource Exhaustion)** | Medium | Rate limiting, timeout enforcement |

### Vulnerable Operations

**High-Risk Tools:**
- `bash`: Arbitrary command execution
- `write`: File system modification
- `github_repo_file_put`: Remote write access
- `github_pr_create`: Public commits

**Validation Required:**
- All file paths
- All bash commands
- All network requests
- All API credentials

---

## Guardrail Patterns

### Pattern 1: Command Allowlist

**Use Case:** Only allow specific bash commands

```typescript
const ALLOWED_COMMANDS = ["git", "npm", "node", "bun"]

"tool.execute.before": async (input, output) => {
  if (input.tool === "bash") {
    const cmd = output.args.command.trim()
    const baseCmd = cmd.split(/\s+/)[0]
    
    if (!ALLOWED_COMMANDS.includes(baseCmd)) {
      throw new Error(
        `Command '${baseCmd}' not allowed. ` +
        `Permitted: ${ALLOWED_COMMANDS.join(", ")}`
      )
    }
  }
}
```

---

### Pattern 2: Command Blocklist

**Use Case:** Block dangerous commands while allowing most operations

```typescript
const DANGEROUS_PATTERNS = [
  // Destructive operations
  /rm\s+-rf\s+\//,
  /dd\s+if=.*of=\/dev\//,
  /mkfs/,
  
  // Fork bombs
  /:(){ :|:& };:/,
  
  // Remote execution
  /wget.*\|\s*bash/,
  /curl.*\|\s*sh/,
  
  // Privilege escalation
  /sudo/,
  /su\s+/,
  
  // Network exposure
  /nc\s+-l/,              // netcat listener
  /python.*-m\s+http\.server/,
  /php\s+-S\s+0\.0\.0\.0/,
]

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
```

---

### Pattern 3: Path Canonicalization

**Use Case:** Prevent directory traversal attacks

```typescript
import path from "path"

"tool.execute.before": async (input, output) => {
  const fileTools = ["read", "write", "morph_edit"]
  
  if (fileTools.includes(input.tool)) {
    const filePath = output.args.filePath || output.args.target_filepath
    const projectRoot = process.cwd()
    
    // Resolve to absolute path
    const resolved = path.resolve(projectRoot, filePath)
    
    // Block if outside project directory
    if (!resolved.startsWith(projectRoot)) {
      throw new Error(
        `Access denied: ${filePath} is outside project directory`
      )
    }
    
    // Block sensitive paths
    const BLOCKED_PATHS = ["/etc/", "/root/", "/sys/", "/proc/"]
    if (BLOCKED_PATHS.some(p => resolved.startsWith(p))) {
      throw new Error(`Access to ${resolved} is blocked`)
    }
  }
}
```

---

### Pattern 4: Resource Allowlist

**Use Case:** Restrict operations to approved resources

```typescript
interface Policy {
  allowlist: string[]
  sessionApprovals: Set<string>
}

const policy: Policy = {
  allowlist: ["owner/repo1", "owner/repo2"],
  sessionApprovals: new Set()
}

"tool.execute.before": async (input, output) => {
  const writeOps = [
    "github_repo_file_put",
    "github_pr_create", 
    "github_issue_comment"
  ]
  
  if (writeOps.includes(input.tool)) {
    const repo = output.args.repo
    
    // Check permanent allowlist
    if (policy.allowlist.includes(repo)) {
      return // Approved
    }
    
    // Check session approval
    if (policy.sessionApprovals.has(repo)) {
      return // Approved for this session
    }
    
    // Deny with instructions
    throw new Error(
      `NEEDS_APPROVAL: Write access to ${repo} requires approval.\n` +
      `Use github_session_allow_repo("${repo}") to approve.`
    )
  }
}
```

**Session approval tool:**

```typescript
tool: {
  github_session_allow_repo: {
    description: "Grant write access to a repository for this session",
    parameters: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository (owner/name)" }
      },
      required: ["repo"]
    },
    execute: async ({ repo }) => {
      policy.sessionApprovals.add(repo)
      return `Write access granted to ${repo} for this session.`
    }
  }
}
```

**Real Implementation:** [opencode-github-autonomy](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-github-autonomy/src/policy.ts)

---

### Pattern 5: Argument Sanitization

**Use Case:** Clean potentially dangerous arguments

```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool === "bash") {
    let cmd = output.args.command
    
    // Remove shell metacharacters
    const dangerous = [";", "&&", "||", "|", "`", "$()"]
    for (const char of dangerous) {
      if (cmd.includes(char) && !isSafeContext(cmd, char)) {
        throw new Error(`Unsafe shell metacharacter: ${char}`)
      }
    }
    
    // Escape single quotes in arguments
    cmd = cmd.replace(/'/g, "'\\''")
    
    output.args.command = cmd
  }
}

function isSafeContext(cmd: string, char: string): boolean {
  // Allow in quoted strings
  const quoted = /["'].*\1/.test(cmd)
  if (quoted) return true
  
  // Allow pipe for specific commands
  if (char === "|" && /^(grep|awk|sed).*\|/.test(cmd)) {
    return true
  }
  
  return false
}
```

---

## Secret Management

### Pattern 6: Secret Scrubbing (Output)

**Use Case:** Remove secrets from tool output before showing to user

```typescript
const SECRET_PATTERNS = [
  // OpenAI
  { pattern: /sk-[a-zA-Z0-9]{48}/g, name: "OpenAI API Key" },
  
  // GitHub
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: "GitHub PAT" },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: "GitHub OAuth" },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: "GitHub App Secret" },
  
  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS Access Key" },
  { pattern: /[0-9a-zA-Z\/+]{40}/g, name: "AWS Secret Key" },
  
  // Google
  { pattern: /AIza[0-9A-Za-z\\-_]{35}/g, name: "Google API Key" },
  
  // Slack
  { pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g, name: "Slack Token" },
  
  // Generic patterns
  { pattern: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g, name: "Private Key" },
  { pattern: /Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/g, name: "Bearer Token" },
  { pattern: /password\s*[:=]\s*["']?[^"'\s]+/gi, name: "Password" },
]

"tool.execute.after": async (input, output) => {
  if (typeof output.result === "string") {
    for (const { pattern, name } of SECRET_PATTERNS) {
      output.result = output.result.replace(pattern, `***${name} REDACTED***`)
    }
  }
  
  // Also scrub nested objects
  if (typeof output.result === "object") {
    output.result = scrubObject(output.result)
  }
}

function scrubObject(obj: any): any {
  if (typeof obj === "string") {
    for (const { pattern, name } of SECRET_PATTERNS) {
      obj = obj.replace(pattern, `***${name} REDACTED***`)
    }
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(scrubObject)
  }
  
  if (typeof obj === "object" && obj !== null) {
    const scrubbed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      scrubbed[key] = scrubObject(value)
    }
    return scrubbed
  }
  
  return obj
}
```

**Real Implementation:** [opencode-mem0 secret scrubbing](https://github.com/vrazlen/oc-stack/blob/main/plugins/opencode-mem0/src/secrets.ts)

---

### Pattern 7: Secret Scrubbing (Input)

**Use Case:** Prevent secrets from being sent to memory/logging

```typescript
"chat.message": async (input, output) => {
  // Scrub secrets before storing in memory
  let cleanMessage = input.message
  
  for (const { pattern, name } of SECRET_PATTERNS) {
    cleanMessage = cleanMessage.replace(pattern, `***${name}***`)
  }
  
  // Only store scrubbed version
  await memory.add(cleanMessage, { 
    user_id: config.userId 
  })
  
  // Don't modify output - let original message proceed to LLM
}
```

---

### Pattern 8: Environment Isolation

**Use Case:** Separate secrets by environment

```typescript
// Load secrets from environment-specific files
const ENV = process.env.NODE_ENV || "development"

const secretsPath = {
  production: "/etc/opencode/secrets.json",
  development: "./.env.local"
}[ENV]

const secrets = loadSecrets(secretsPath)

// Never commit secrets
if (process.env.CI && !secrets.API_KEY) {
  throw new Error("API_KEY not configured in CI environment")
}
```

**Repository Protection:**

```gitignore
# .gitignore
.env
.env.local
.env.production
secrets.json
**/credentials.json
**/*-key.json
```

**Template Pattern:**

```bash
# config/.env.example
API_KEY=
SECRET_TOKEN=
DATABASE_URL=

# Actual secrets in .env (gitignored)
API_KEY=sk-actual-key-here
SECRET_TOKEN=actual-token-here
DATABASE_URL=postgres://user:pass@localhost/db
```

---

## Access Control

### Pattern 9: Role-Based Access

**Use Case:** Different permissions for different users

```typescript
interface User {
  id: string
  roles: string[]
}

const permissions = {
  admin: ["read", "write", "delete"],
  developer: ["read", "write"],
  viewer: ["read"]
}

"tool.execute.before": async (input, output) => {
  const user = getCurrentUser(input.sessionID)
  const requiredPermission = getPermission(input.tool)
  
  const userPermissions = user.roles.flatMap(r => permissions[r])
  
  if (!userPermissions.includes(requiredPermission)) {
    throw new Error(
      `Permission denied: ${input.tool} requires ${requiredPermission}. ` +
      `User has: ${userPermissions.join(", ")}`
    )
  }
}

function getPermission(tool: string): string {
  if (tool.includes("delete") || tool.includes("remove")) return "delete"
  if (tool.includes("create") || tool.includes("update") || tool.includes("put")) return "write"
  return "read"
}
```

---

### Pattern 10: Time-Based Access

**Use Case:** Restrict operations to specific time windows

```typescript
"tool.execute.before": async (input, output) => {
  const destructiveOps = ["github_repo_file_put", "bash"]
  
  if (destructiveOps.includes(input.tool)) {
    const now = new Date()
    const hour = now.getHours()
    
    // Block destructive operations outside business hours (9am-6pm)
    if (hour < 9 || hour >= 18) {
      throw new Error(
        `Destructive operations are blocked outside business hours (9am-6pm). ` +
        `Current time: ${now.toLocaleTimeString()}`
      )
    }
    
    // Block on weekends
    const day = now.getDay()
    if (day === 0 || day === 6) {
      throw new Error("Destructive operations are blocked on weekends")
    }
  }
}
```

---

### Pattern 11: Rate Limiting

**Use Case:** Prevent abuse through excessive operations

```typescript
interface RateLimit {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimit>()

const LIMITS = {
  "github_pr_create": { max: 10, window: 3600000 }, // 10 PRs per hour
  "github_issue_comment": { max: 50, window: 3600000 }, // 50 comments per hour
  "bash": { max: 100, window: 60000 } // 100 bash commands per minute
}

"tool.execute.before": async (input, output) => {
  const limit = LIMITS[input.tool]
  if (!limit) return
  
  const key = `${input.sessionID}:${input.tool}`
  const now = Date.now()
  
  let rateLimit = rateLimits.get(key)
  
  // Reset if window expired
  if (!rateLimit || now > rateLimit.resetAt) {
    rateLimit = { count: 0, resetAt: now + limit.window }
    rateLimits.set(key, rateLimit)
  }
  
  // Check limit
  if (rateLimit.count >= limit.max) {
    const resetIn = Math.ceil((rateLimit.resetAt - now) / 1000)
    throw new Error(
      `Rate limit exceeded for ${input.tool}. ` +
      `Max ${limit.max} per ${limit.window / 1000}s. ` +
      `Resets in ${resetIn}s.`
    )
  }
  
  rateLimit.count++
}
```

---

## Real-World Implementations

### GitHub Autonomy Plugin

**Repository:** [oc-stack/plugins/opencode-github-autonomy](https://github.com/vrazlen/oc-stack/tree/main/plugins/opencode-github-autonomy)

**Security Features:**
1. **Allowlist + Session Approval**: READ open, WRITE restricted
2. **Forbidden Operations**: Force push, workflow modification blocked
3. **Untrusted Content Warning**: Issues/PRs treated as untrusted
4. **Audit Logging**: All write operations logged

**Key Code:**
```typescript
// src/policy.ts
export function checkPermission(tool: string, args: any): void {
  const writeOps = ["github_repo_file_put", "github_pr_create", "github_issue_comment"]
  
  if (writeOps.includes(tool)) {
    const repo = args.repo
    const policy = loadPolicy()
    
    if (!policy.allowlist.includes(repo) && !sessionApprovals.has(repo)) {
      throw new Error(`NEEDS_APPROVAL: ${repo}`)
    }
    
    // Block force operations
    if (args.force || args.message?.includes("--force")) {
      throw new Error("Force operations blocked")
    }
  }
}
```

---

### Mem0 Memory Plugin

**Repository:** [oc-stack/plugins/opencode-mem0](https://github.com/vrazlen/oc-stack/tree/main/plugins/opencode-mem0)

**Security Features:**
1. **Secret Scrubbing**: API keys/tokens removed before storage
2. **Size Limits**: Messages >2000 chars not auto-captured
3. **Metadata Isolation**: User memories separated by user_id
4. **Environment Validation**: API key required, fails safely if missing

**Key Code:**
```typescript
// src/secrets.ts
export function scrubSecrets(text: string): string {
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "***REDACTED***")
  }
  return text
}

// src/index.ts
"chat.message": async (input, output) => {
  if (config.autoAdd && input.message.length < 2000) {
    const scrubbed = scrubSecrets(input.message)
    await mem0.add(scrubbed, { user_id: config.userId })
  }
}
```

---

## Security Checklist

Before deploying a plugin, verify:

### Input Validation
- [ ] All file paths canonicalized and restricted
- [ ] Bash commands validated against allowlist/blocklist
- [ ] API arguments sanitized (no injection)
- [ ] Rate limits enforced

### Secret Management
- [ ] No secrets committed to repository
- [ ] Secrets loaded from environment/config files
- [ ] Output scrubbed for API keys/tokens
- [ ] Memory/logs don't contain secrets

### Access Control
- [ ] Write operations require approval
- [ ] Destructive operations have confirmations
- [ ] Resource access restricted by allowlist
- [ ] Session-based approvals tracked

### Error Handling
- [ ] Errors don't leak sensitive information
- [ ] Validation failures are informative
- [ ] Graceful degradation (don't crash on failures)

### Testing
- [ ] Unit tests for validation logic
- [ ] Integration tests for security boundaries
- [ ] Penetration testing for injection vulnerabilities

---

## Common Pitfalls

### 1. Regex Bypasses

**Problem:**
```typescript
// VULNERABLE: Can be bypassed with "rm -r /" (no 'f')
if (/rm -rf/.test(cmd)) {
  throw new Error("Blocked")
}
```

**Solution:**
```typescript
// SECURE: Anchored pattern with word boundaries
if (/\brm\s+(-\w*[rf]\w*\s+)+\//.test(cmd)) {
  throw new Error("Blocked")
}
```

### 2. Path Traversal

**Problem:**
```typescript
// VULNERABLE: Relative paths can escape
if (filePath.startsWith("/etc/")) {
  throw new Error("Blocked")
}
```

**Solution:**
```typescript
// SECURE: Canonicalize before checking
const resolved = path.resolve(projectRoot, filePath)
if (!resolved.startsWith(projectRoot)) {
  throw new Error("Blocked")
}
```

### 3. Incomplete Secret Scrubbing

**Problem:**
```typescript
// VULNERABLE: Only scrubs strings, not objects
if (typeof output.result === "string") {
  output.result = scrub(output.result)
}
```

**Solution:**
```typescript
// SECURE: Recursive scrubbing
output.result = scrubRecursive(output.result)
```

### 4. Race Conditions

**Problem:**
```typescript
// VULNERABLE: TOCTOU (Time-of-check, Time-of-use)
if (isAllowed(repo)) {
  // Repo policy could change here
  await writeToRepo(repo)
}
```

**Solution:**
```typescript
// SECURE: Atomic check-and-execute
const token = await requestApproval(repo)
await writeToRepo(repo, token) // Token validates at execution time
```

---

## Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

**Contact:** See [SECURITY.md](../SECURITY.md) for responsible disclosure process.

---

**Last Updated:** 2026-01-13  
**Maintained by:** OpenCode Security Team
