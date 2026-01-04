# Release Checklist

Pre-publish verification steps before making a GitHub release.

## Pre-Release Audit

### 1. Secret Scan

Verify no secrets are committed in the repository:

```bash
git grep -i "api.?key\|secret\|password\|token\|credential" -- ':!*.example' ':!*.md'
```

Check for common secret patterns:

```bash
git grep -E "(sk-|ghp_|gho_|AKIA|AIza)" .
```

### 2. History Check

Scan git history for accidentally committed secrets:

```bash
git log -p --all -S 'api_key' -- . ':!*.md'
git log -p --all -S 'secret' -- . ':!*.md'
```

If secrets were ever committed, they must be rotated immediately, even if removed.

### 3. File Permissions

Verify sensitive files are not tracked:

```bash
git ls-files | grep -E "\.env$|\.pem$|\.key$|credentials"
```

Expected output: empty (no matches).

### 4. .gitignore Verification

Confirm `.gitignore` blocks sensitive files:

```bash
cat .gitignore | grep -E "\.env|\.key|\.pem|credentials"
```

### 5. Example Files

Verify example files contain only placeholders:

```bash
grep -r "YOUR_" config/ examples/
```

Should show placeholder values, not real keys.

## Functional Verification

### 1. Fresh Clone Test

```bash
cd /tmp
git clone <repo-url> test-oc-stack
cd test-oc-stack
```

### 2. Documentation Review

- [ ] README.md is complete and accurate
- [ ] All doc links work
- [ ] Quickstart instructions are correct
- [ ] No broken references

### 3. Script Verification

```bash
bash -n scripts/*.sh
```

All scripts should parse without errors.

## Release Process

### 1. Update Changelog

Edit `CHANGELOG.md`:
- Move items from `[Unreleased]` to new version section
- Add release date
- Follow Keep a Changelog format

### 2. Create Git Tag

```bash
git tag -a v0.1.0 -m "Initial public release"
git push origin v0.1.0
```

### 3. GitHub Release

1. Go to Releases → Draft a new release
2. Select the tag
3. Title: `v0.1.0 - Initial Release`
4. Description: Copy from CHANGELOG.md
5. Publish release

## Post-Release

### 1. Verify Release

- Download release tarball
- Extract and verify contents
- Test installation from release

### 2. Announce

- Update any external documentation
- Notify users of new release

## Emergency: Secret Exposure

If a secret was accidentally exposed:

1. **Rotate immediately**: Generate new API keys
2. **Revoke old keys**: Disable compromised credentials
3. **Clean history**: Use `git filter-branch` or BFG Repo-Cleaner
4. **Force push**: After cleaning (coordinate with team)
5. **Notify**: Inform affected parties if necessary
