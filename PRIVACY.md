# Privacy Policy

This document describes how the LLM API Key Proxy handles data.

## Data Categories

The proxy processes the following types of data:

### Request Data

- **Prompts**: Text sent to upstream model providers
- **Model parameters**: Temperature, max tokens, etc.
- **Headers**: Authorization, content-type, custom headers

### Response Data

- **Model outputs**: Generated text from upstream providers
- **Metadata**: Token counts, model identifiers, timing

### Operational Data

- **Logs**: Request timestamps, status codes, error messages
- **Metrics**: Request counts, latency measurements (if enabled)

## Data Flow

```
Client → Proxy → Upstream Provider (OpenAI, Gemini, Anthropic, etc.)
                      ↓
              Model Response
                      ↓
         Proxy → Client
```

**Important**: All prompts and responses pass through the proxy to upstream providers. The proxy does not store conversation history.

## Logging Behavior

### Default Configuration

- Request/response bodies are **not logged** by default
- Logged fields: timestamp, HTTP method, path, status code, latency
- API keys are **redacted** in logs

### Configurable Options

- Enable debug logging (development only)
- Enable request/response body logging (not recommended for production)
- Adjust log retention period
- Disable logging entirely

## Data Retention

The proxy itself does **not** persist:

- Prompts or responses (stateless)
- Conversation history
- User data

Logs (if enabled) are written to stdout/stderr and handled by your logging infrastructure.

## Third-Party Data Sharing

By using this proxy, data is sent to upstream model providers:

| Provider | Data Sent | Provider Privacy Policy |
|----------|-----------|-------------------------|
| OpenAI | Prompts, parameters | https://openai.com/privacy |
| Google (Gemini) | Prompts, parameters | https://policies.google.com/privacy |
| Anthropic | Prompts, parameters | https://www.anthropic.com/privacy |

**Users are responsible for:**

- Reviewing upstream provider privacy policies
- Not sending sensitive, personal, or regulated data unless configured appropriately
- Complying with applicable data protection regulations (GDPR, CCPA, etc.)

## Security of Data in Transit

- All connections to upstream providers use HTTPS/TLS
- Local connections (client → proxy) should use TLS via reverse proxy in production
- API keys are transmitted in headers (use HTTPS to protect)

## User Responsibilities

- **Do not send secrets** (passwords, API keys, credentials) in prompts
- **Do not send regulated data** (PHI, PII, financial data) without appropriate controls
- **Configure logging appropriately** for your compliance requirements
- **Use TLS** for all connections in production

## Questions

For privacy-related questions, please open a GitHub Issue with the `privacy` label.
