# OpenCode Plugin Ecosystem

Plugins extend the capabilities of OpenCode with new tools, authentication methods, and workflow enhancements. The `oc-stack` environment is designed to support a modular plugin architecture.

## Plugin Matrix

| Name | Purpose | Install | Repo |
|------|---------|---------|------|
| **opencode-github-autonomy** | GitHub operations with security guardrails | `bun install` | `plugins/oc-github` (local) |
| **opencode-openai-codex-auth** | OpenAI OAuth authentication | `npm install` | [vrazlen/opencode-openai-codex-auth](https://github.com/vrazlen/opencode-openai-codex-auth) |
| **oh-my-opencode** | Enhanced OpenCode experience | `bun install` | [code-yeongyu/oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) |
| **opencode-morph-fast-apply** | Fast code editing via Morph AI | `bun install` | (local) |
| **opencode-mem0** | Long-term memory with RAG injection | `bun install` | `plugins/opencode-mem0` (local) |

## Installation Guide

To install a plugin, follow these general steps:

1.  **Clone or Download**: Get the plugin source code.
    *   External plugins: `git clone <repo-url>`
    *   Local plugins: Located in `plugins/` directory or your preferred workspace.
2.  **Install Dependencies**: Run the package manager inside the plugin directory.
    ```bash
    cd <plugin-directory>
    bun install  # or npm install
    ```
3.  **Register Plugin**: Add the absolute path to your `opencode.json` configuration.
    ```json
    {
      "plugin": [
        "/absolute/path/to/plugin-directory"
      ]
    }
    ```
4.  **Add Instructions**: If the plugin provides an instruction file (e.g., `INSTRUCTIONS.md`), add it to the `instructions` array for better AI context.

## GitHub Autonomy Plugin

The **OpenCode GitHub Autonomy Plugin** (`plugins/oc-github`) is the core integration for this stack, providing secure, AI-driven GitHub operations.

### Key Features
*   **Safe Operations**: Granular permission controls for repository management.
*   **Guardrails**: Critical paths like `.github/workflows` are protected from accidental modification.
*   **Session Approvals**: Write operations on non-allowlisted repos require explicit user confirmation.
*   **Comprehensive Tools**:
    *   `github_issue_*`: Manage issues (list, create, comment).
    *   `github_pr_*`: Handle pull requests.
    *   `github_search`: Search code and repositories.
    *   `github_repo_file_*`: Read and write files securely.

### Setup
1.  Navigate to `plugins/oc-github`.
2.  Run `bun install`.
3.  Ensure `OPENCODE_GITHUB_TOKEN` is set in your environment.
4.  Add to `opencode.json` (see Configuration below).

## Mem0 Long-Term Memory Plugin

The **Mem0 plugin** (`plugins/opencode-mem0`) provides persistent memory across sessions via [Mem0](https://mem0.ai).

### Key Features
*   **Passive RAG Injection**: Automatically searches and injects relevant memories at session start.
*   **Auto-Capture**: Silently stores user messages as project memories.
*   **Secret Scrubbing**: API keys, tokens, and credentials are redacted before storage.
*   **Dual Scoping**: User-level (cross-project) and project-level memories.
*   **Active Tool**: `memory` tool for search/add/delete/list/clear operations.

### Setup
1.  Navigate to `plugins/opencode-mem0`.
2.  Run `bun install`.
3.  Set `MEM0_API_KEY` in your environment.
4.  Optionally set `MEM0_USER_ID` for cross-project memory identity.
5.  Add to `opencode.json` (see Configuration below).

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `MEM0_API_KEY` | (required) | Mem0 API key |
| `MEM0_USER_ID` | `anonymous` | User identifier |
| `MEM0_ENABLED` | `true` | Master toggle |
| `MEM0_RAG_ENABLED` | `true` | Passive injection |
| `MEM0_AUTO_ADD` | `true` | Auto-capture messages |

## Configuration

Add plugins to your `~/.config/opencode/opencode.json` file.

```json
{
  "plugin": [
    "/home/user/Work/oc-stack/plugins/oc-github",
    "opencode-openai-codex-auth@4.2.0"
  ],
  "instructions": [
    "/home/user/Work/oc-stack/plugins/oc-github/INSTRUCTIONS.md"
  ]
}
```

*Note: Replace `/home/user/Work/oc-stack` with your actual project path.*
