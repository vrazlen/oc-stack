# OpenCode GitHub Autonomy Plugin

[![npm](https://img.shields.io/npm/v/opencode-github-autonomy)](https://www.npmjs.com/package/opencode-github-autonomy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready OpenCode plugin for autonomous GitHub operations, designed with a strict **allowlist-centric** security model. This plugin empowers AI agents to search, explore, and interact with GitHub repositories while maintaining rigorous safety boundaries.

## Features

* **Unified Facade**: Single `github_*` tool namespace covering search, issues, PRs, repo creation, and file ops.
* **Safety First**: Writes are denied by default unless allowlisted or approved per-session.
* **Audit Logging**: All actions are logged with decision context; tokens are redacted.
* **Session Approvals**: Granular, session-scoped write permissions.
* **GitHub App Auth**: First-class support for installation tokens (short-lived, secure).
* **Token Auth**: Fine-grained PAT support for user-level operations like repo creation.

## Installation

Install directly from the repository using npm or bun:

```bash
# Using npm
npm install git+https://github.com/opencode-stack/oc-github-autonomy.git

# Using bun
bun add git+https://github.com/opencode-stack/oc-github-autonomy.git
```

## Configuration

### Environment Variables

For repository creation and user-level operations, set your Fine-Grained Personal Access Token (PAT):

```bash
export OPENCODE_GITHUB_TOKEN="github_pat_..."
```

### Policy Configuration

Configure your security policy in `~/.config/opencode/github-policy.yaml`:

```yaml
policy:
  mode: fail_closed
  allowlist:
    - "my-org/*"
    - "personal-repo"

auth:
  appId: "YOUR_APP_ID"
  installationId: "YOUR_INSTALLATION_ID"
  privateKeyPath: "/path/to/github-app.pem"
  # Fallback to PAT if App auth is not used
  # githubToken: "github_pat_..."
```

## Tool Reference

| Tool | Description | Access |
|------|-------------|--------|
| `github_status` | Checks plugin health and configuration status. | Read-only |
| `github_search` | Search repositories, issues, or code. | Read-only |
| `github_issue_list` | List issues in a specific repository. | Read-only |
| `github_issue_create` | Create a new issue. | **Write** (Guarded) |
| `github_issue_comment` | Add a comment to an existing issue. | **Write** (Guarded) |
| `github_pr_list` | List pull requests in a repository. | Read-only |
| `github_pr_create` | Create a new pull request. | **Write** (Guarded) |
| `github_repo_file_get` | Read the content of a file. | Read-only |
| `github_repo_file_put` | Create or update a file. | **Write** (Guarded) |
| `github_repo_create` | Create a new repository for the authenticated user. | **Write** (Guarded) |

> **Note**: `github_repo_create` uses the GitHub Git Data API with `auto_init: false` to manually construct the initial commit with a README and `.gitignore`, ensuring a clean history.

## Usage Examples

### 1. Search and Inspect

Find a repository and inspect its README to understand the project structure.

```javascript
// 1. Search for the repository
const search = await github_search({
  query: "opencode-stack",
  type: "repositories"
});

// 2. Read the README.md
const readme = await github_repo_file_get({
  owner: "opencode-stack",
  repo: "oc-github-autonomy",
  path: "README.md"
});
```

### 2. Create a Bug Report

Identify a bug and file an issue with details.

```javascript
await github_issue_create({
  owner: "my-org",
  repo: "backend-service",
  title: "Bug: API returns 500 on valid request",
  body: "Steps to reproduce: ...\nExpected behavior: ..."
});
```

### 3. Initialize a New Repository

Create a completely new private repository with a Node.js `.gitignore`.

```javascript
await github_repo_create({
  name: "new-microservice",
  description: "A new service for processing data",
  private: true,
  gitignore_template: "Node"
});
```

## Fine-Grained PAT Permissions

To enable full autonomy, especially for repository creation, your Fine-Grained PAT requires the following permissions:

| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Administration** | Read and write | Create repositories |
| **Contents** | Read and write | Create blobs, trees, commits, refs |
| **Metadata** | Read | Required for most operations |
| **Issues** | Read and write | Create/comment on issues |
| **Pull requests** | Read and write | Create/manage PRs |

> **Important**: For `github_repo_create` to work, the token must be scoped to **"All repositories"** (not "Only select repositories") because the new repository does not exist at the time of token creation.

## Security Model

This plugin operates on a **Strict Allowlist** model to prevent unauthorized changes.

1.  **Fail-Closed**: By default, all write operations (`create`, `put`, `comment`) are denied.
2.  **Allowlist**: Repositories must be explicitly defined in `github-policy.yaml` to permit write access.
3.  **Session Approval**: If a tool attempts to write to a non-allowlisted repo, the operation fails with `NEEDS_APPROVAL`. The user can then grant permission for the current session.
4.  **Protected Paths**: Writing to `.github/workflows` is **strictly forbidden** at the code level to prevent privilege escalation via CI/CD pipeline modification.

## License

MIT
