# Observability & Logging

This document outlines how to observe the behavior of the `llm-proxy` service, analyze logs, and troubleshoot issues.

## Logging Configuration

The `LLM-API-Key-Proxy` uses `structlog` or standard Python logging (depending on version) to emit logs to **Standard Output (stdout)** and **Standard Error (stderr)**.

Because the application runs as a systemd service, these streams are automatically captured by `journald`.

### Accessing Logs

Use `journalctl` to view logs:

```bash
# Follow logs in real-time (like tail -f)
journalctl --user -u llm-proxy -f

# View the last 100 lines
journalctl --user -u llm-proxy -n 100

# View logs since boot
journalctl --user -u llm-proxy -b
```

## Log Levels

| Level | Usage |
|-------|-------|
| **DEBUG** | Detailed request/response flow, payload sizes, routing decisions. |
| **INFO** | Startup events, successful requests (summary), configuration changes. |
| **WARNING** | Retries, non-critical API errors, rate limit warnings. |
| **ERROR** | Request failures, exceptions, configuration errors. |
| **CRITICAL** | System failure, inability to start. |

To change the log level, update the `LOG_LEVEL` environment variable in your `.env` file and restart the service.

```ini
LOG_LEVEL=DEBUG
```

## Data Privacy & Redaction

**CRITICAL**: The proxy handles sensitive API keys and potentially confidential prompts/responses.

- **API Keys**: The proxy is designed to **redact** or omit API keys from logs. Ensure `detailed_logger.py` or `request_logger.py` is configured to mask credentials.
- **Prompts/Responses**: By default, full body logging might be disabled in Production. If enabled for debugging, ensure logs are secure.

## Retention

`journald` manages log rotation automatically. You can configure the retention policy in `/etc/systemd/journald.conf` if you need longer retention, but the default defaults (usually ~10% of disk space) are typically sufficient for recent debugging.

## Troubleshooting Scenarios

### 1. "401 Unauthorized" Errors
- **Check**: Look for logs indicating which provider failed.
- **Action**: Verify the API key in `.env`.

### 2. "Connection Refused"
- **Check**: Is the service running? (`systemctl --user status llm-proxy`)
- **Action**: Check if the port (default 8000) is in use or blocked.

### 3. Slow Responses
- **Check**: Look at the duration field in INFO logs.
- **Action**: Identify if a specific provider is slow or if it's network latency.
