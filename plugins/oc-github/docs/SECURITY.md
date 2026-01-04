# Security Policy & Threat Model

## Threat Model

1. **Prompt Injection**: AI agents may be tricked by untrusted content in issues/PRs.
   * **Mitigation**: Treat all issue/PR content as untrusted. Never execute code found in issues without explicit user review. Output is redacted.

2. **Privilege Escalation**: Agent might try to modify workflow files to gain execution rights.
   * **Mitigation**: Writes to `.github/workflows` are hard-blocked by the plugin logic unless explicitly approved and allowlisted.

3. **Token Leakage**: Logs might expose tokens.
   * **Mitigation**: All logs pass through a redactor that strips `ghp_`, `gho_`, etc. Tokens are held in memory only.

## Storage

* Tokens: In-memory (session scope) or OS Keychain (future).
* Config: Local file (`~/.config/opencode/github-policy.yaml`).
* Logs: In-memory / ephemeral.

## Branch Protection

The plugin respects GitHub branch protection rules by virtue of using the API, but agents should also check for protected branches before attempting writes.
