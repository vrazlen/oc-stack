# Production Deployment & Management

This document covers managing the `oc-stack` proxy in a production-like environment using systemd.

## Deployment Strategy

We use a **Systemd User Service** for deployment. This allows:
- running without root privileges.
- automatic restarts on failure.
- standard logging via `journald`.
- easy management via `systemctl --user`.

## Service Management

### Basic Commands

Manage the service using `systemctl --user`. The service name is `llm-proxy`.

| Action | Command |
|--------|---------|
| **Start** | `systemctl --user start llm-proxy` |
| **Stop** | `systemctl --user stop llm-proxy` |
| **Restart** | `systemctl --user restart llm-proxy` |
| **Status** | `systemctl --user status llm-proxy` |
| **Logs** | `journalctl --user -u llm-proxy -f` |

### Enable Boot Autostart (Lingering)

By default, user services stop when the user logs out. To keep the proxy running 24/7 (even after logout/reboot), enable "lingering" for your user.

We provide a script to handle this:

```bash
./scripts/enable-linger.sh
```

Or manually:

```bash
loginctl enable-linger $USER
```

## Security Hardening

- **Firewall**: Ensure port `8000` (or your configured port) is NOT exposed to the public internet. It should only be accessible via `localhost` or a secure VPN.
- **Permissions**: The `.env` file contains sensitive keys. Ensure it has restricted permissions:
  ```bash
  chmod 600 .env
  ```
- **Updates**: Regularly update the `LLM-API-Key-Proxy` submodule:
  ```bash
  git submodule update --remote
  systemctl --user restart llm-proxy
  ```

## Monitoring & Health Checks

- **Health Endpoint**: The proxy exposes a health check at `/health` (if configured in `main.py`).
- **Scripted Check**: Use our built-in status script:
  ```bash
  ./scripts/status.sh
  ```
- **Resource Usage**: Monitor CPU/Memory via `systemd-cgtop`.

## Troubleshooting

If the service fails to start:

1. Check logs: `journalctl --user -u llm-proxy -n 50 --no-pager`
2. Verify Python venv path in the service file (`~/.config/systemd/user/llm-proxy.service`).
3. Ensure `.env` is valid and accessible.
