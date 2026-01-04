# Contributing

Thank you for your interest in contributing to this project!

## Getting Started

### Prerequisites

- Python 3.10+
- systemd (for service management)
- Git

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/oc-stack.git
   cd oc-stack
   ```

2. Set up the proxy (see [docs/INSTALL.md](docs/INSTALL.md))

3. Verify the setup:
   ```bash
   ./scripts/verify-config.sh
   ```

## Making Changes

### Code Changes

1. Create a feature branch from `main`
2. Make your changes
3. Test locally
4. Submit a pull request

### Documentation Changes

- Keep documentation up-to-date with code changes
- Use clear, concise language
- Include examples where helpful

## Security-Sensitive Changes

Changes to the following areas require extra review:

- **Authentication/Authorization**: Any auth-related changes
- **Request routing**: URL rewriting, upstream selection
- **Logging**: What data is logged, log formatting
- **Configuration**: New config options, defaults

For security-sensitive PRs, please include:

- Threat model considerations
- Security implications of the change
- Any new attack surfaces introduced

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows existing patterns
- [ ] Documentation updated (if applicable)
- [ ] No secrets or credentials in code
- [ ] Security implications considered

### PR Description

Include:

- What the change does
- Why it's needed
- Any breaking changes
- Testing performed

## No Secrets Policy

**Never commit:**

- API keys or tokens
- Passwords or credentials
- `.env` files with real values
- Private keys or certificates

If you accidentally commit a secret:

1. Rotate the secret immediately
2. Contact maintainers
3. The commit will need to be removed from history

## Code of Conduct

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Open a GitHub Issue for:

- Feature requests
- Bug reports
- General questions

Use appropriate labels (`bug`, `enhancement`, `question`, `security`).
