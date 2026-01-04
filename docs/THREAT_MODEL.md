# Threat Model

This document identifies potential security threats to the `oc-stack` deployment and the mitigations in place.

## Assets

1.  **API Keys**: Credentials for OpenAI, Gemini, Anthropic, etc. (High Criticality)
2.  **User Prompts**: Code snippets and intellectual property sent to LLMs. (High Confidentiality)
3.  **Model Responses**: Generated code and answers. (High Confidentiality)
4.  **Availability**: The ability for OpenCode to access LLM services.

## Threat Actors

-   **Malicious Local User**: Another user on the same machine (if multi-user system).
-   **Network Attacker**: Attacker on the local network (if port exposed).
-   **Compromised Dependency**: Malicious code inside a Python package.

## Threats & Mitigations

### 1. Secret Leakage (API Keys)
-   **Threat**: API keys in `.env` or logs are read by unauthorized users.
-   **Mitigation**:
    -   File permissions on `.env` set to `600` (user read/write only).
    -   Logs configured to **redact** keys.
    -   `.gitignore` prevents committing `.env` to version control.

### 2. Server-Side Request Forgery (SSRF) / Abuse
-   **Threat**: An attacker uses the proxy to flood LLM APIs, causing excessive costs.
-   **Mitigation**:
    -   Service listens on `127.0.0.1` (localhost) by default.
    -   Firewall rules (should) block external access to port 8000.
    -   No authentication is implemented on the proxy itself, relying on **local loopback trust**.

### 3. Log Exfiltration
-   **Threat**: Logs containing sensitive prompt data are read.
-   **Mitigation**:
    -   Systemd journal access is restricted to the user (and root).
    -   Avoid logging full request bodies in production (configurable).

### 4. Privilege Escalation
-   **Threat**: Exploiting the proxy to gain root access.
-   **Mitigation**:
    -   Service runs as a **non-root user** (Systemd User Service).
    -   No `sudo` required for operation.

## Non-Goals

-   **Public Internet Exposure**: This stack is NOT designed to be exposed to the public internet. It lacks authentication (OAuth/JWT) on the incoming request side.
-   **DDoS Protection**: It is assumed to be running on a trusted local network/machine.
