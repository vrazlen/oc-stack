# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

Only the `main` branch receives security updates. We recommend always using the latest version.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it via GitHub Issues with the `security` label. For sensitive vulnerabilities that should not be disclosed publicly, please use GitHub's private vulnerability reporting feature.

**What to include in your report:**

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

**Response timeline:**

- Initial acknowledgment: within 48 hours
- Status update: within 7 days
- Resolution target: within 30 days for critical issues

## Security Hardening Guidelines

This proxy handles API keys and routes requests to upstream model providers. Follow these guidelines for secure deployment:

### Authentication

- **Always require authentication in production**
- Never expose the proxy without auth on public networks
- Use strong, unique API keys for proxy access
- Rotate keys periodically

### Network Security

- **Bind to localhost (127.0.0.1) by default**
- Use a reverse proxy (nginx, Caddy) for TLS termination
- Never bind to 0.0.0.0 without proper firewall rules
- Use allowlists to restrict upstream providers (prevents SSRF)

### Logging and Data Protection

- **Disable request/response body logging in production**
- Redact API keys and tokens from logs
- Set appropriate log retention periods
- Avoid logging prompts or model outputs

### Rate Limiting

- Enable rate limiting to prevent abuse
- Set per-client and global limits
- Monitor for unusual traffic patterns

### Upstream Provider Security

- Only allow connections to trusted upstream hosts
- Validate upstream SSL certificates
- Use environment variables for upstream API keys (never hardcode)

## Security Checklist for Production

- [ ] Authentication enabled
- [ ] Bound to localhost or behind reverse proxy
- [ ] TLS enabled (via reverse proxy)
- [ ] Request/response logging disabled or redacted
- [ ] Upstream hosts allowlisted
- [ ] Rate limiting configured
- [ ] API keys stored in environment variables
- [ ] `.env` file has restrictive permissions (600)
- [ ] No secrets in git history

## Known Limitations

This proxy does **not** provide:

- End-to-end encryption of prompts/responses (rely on HTTPS)
- Automatic secret rotation
- Built-in DLP or content filtering
- Compliance certification (HIPAA, SOC2, etc.)

Users are responsible for configuring appropriate security controls for their use case.
