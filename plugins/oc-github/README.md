# OpenCode GitHub Autonomy Plugin

A production-ready OpenCode plugin for autonomous GitHub operations, designed with a strict **allowlist-centric** security model.

## Features

* **Unified Facade**: Single `github.*` tool namespace covering search, issues, PRs, and file ops.
* **Safety First**: Writes are denied by default unless allowlisted or approved per-session.
* **Audit Logging**: All actions are logged with decision context; tokens are redacted.
* **Session Approvals**: Granular, session-scoped write permissions.
* **GitHub App Auth**: First-class support for installation tokens (short-lived, secure).

## Installation

1. Add to your `.opencode/config.json` or `~/.config/opencode/opencode.json`:

```json
{
  "plugins": [
    "./plugins/oc-github"
  ],
  "instructions": [
    "./plugins/oc-github/INSTRUCTIONS.md"
  ]
}
```

2. Configure auth and policy in `~/.config/opencode/github-policy.yaml`:

```yaml
policy:
  mode: fail_closed
  allowlist:
    - "my-org/*"
    - "personal-repo"

auth:
  appId: "123456"
  installationId: "789012"
  privateKeyPath: "/home/user/.ssh/github-app.pem"
  # or githubToken: "pat..." for read-only fallback
```

## Tools

- `github.search`: Search code/issues (read-only).
- `github.issue.*`: Manage issues (read-only list, write create/comment guarded).
- `github.pr.*`: Manage pull requests (read-only list, write create guarded).
- `github.repo.file.get`: Read file content.
- `github.repo.file.put`: Write file content (guarded).
- `github.session.allow_repo`: Grant write permission for a repo in the current session.

## Development

```bash
cd plugins/oc-github
bun install
bun run build
```
