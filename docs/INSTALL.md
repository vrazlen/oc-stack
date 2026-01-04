# Installation Guide

This guide details how to set up the `oc-stack` environment, which deploys the `LLM-API-Key-Proxy` as a systemd user service and integrates it with OpenCode.

## Prerequisites

Ensure your system meets the following requirements:

- **Operating System**: Linux (systemd required)
- **Python**: Version 3.10 or higher
- **Git**: For version control
- **OpenCode**: Installed and configured

## 1. Clone the Repository

If you haven't already, clone the `oc-stack` repository. This repository acts as the deployment wrapper.

```bash
git clone <your-repo-url> oc-stack
cd oc-stack
```

## 2. Initialize Submodules

The core proxy logic resides in the `LLM-API-Key-Proxy` submodule.

```bash
git submodule update --init --recursive
```

## 3. Set Up Python Environment

Create a virtual environment to isolate dependencies.

```bash
# Create venv in the root of oc-stack
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

Install the dependencies for the proxy:

```bash
# Install dependencies from the submodule
pip install -r LLM-API-Key-Proxy/requirements.txt
```

## 4. Configuration

### Environment Variables

Copy the example configuration to a production `.env` file.

```bash
cp .env.example .env
```

Edit `.env` to add your API keys (e.g., Gemini, OpenAI, Anthropic).

```bash
nano .env
```

### OpenCode Integration

Configure OpenCode to use the local proxy. An example configuration is provided.

```bash
# View the example configuration
cat examples/opencode.json.example
```

Merge these settings into your OpenCode user settings (typically found at `~/.opencode/settings.json` or via the IDE settings UI).

## 5. Install Systemd Service

Use the provided script to install the systemd user service. This ensures the proxy runs in the background and starts automatically.

```bash
./scripts/install-systemd-user-service.sh
```

## 6. Verify Installation

Run the verification script to check if the service is running and responding.

```bash
./scripts/verify-config.sh
```

If successful, you should see a "Service is healthy" message.
