# Manual Validation Checklist

Perform these checks to ensure the plugin is behaving correctly.

## 1. Installation
- [ ] Plugin loads without errors.
- [ ] `GitHub Autonomy Plugin loaded` message appears in logs.

## 2. Policy Enforcement
- [ ] **Read Test**: `github.issue.list` on a public repo (e.g., `facebook/react`) should SUCCEED.
- [ ] **Write Test (Deny)**: `github.issue.create` on a non-allowlisted repo should FAIL with "needs_approval".
- [ ] **Write Test (Allow)**: Add a test repo to `allowlist`. `github.issue.create` should SUCCEED (or prompt session approval if configured to prompt).

## 3. Approval Flow
- [ ] Trigger a write on a non-allowlisted repo.
- [ ] Use `github.session.allow_repo` tool.
- [ ] Retry write; it should SUCCEED.

## 4. Guardrails
- [ ] Attempt to write to `.github/workflows/test.yml`. Should FAIL (blocked by logic).

## 5. Audit
- [ ] Check logs; ensure no raw tokens are visible.
- [ ] Verify `decision` field reflects `allowed` / `needs_approval`.
