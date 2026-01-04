# External References

This document lists all external repositories, tools, and resources used by or referenced in this project.

## Core Dependencies

### LLM-API-Key-Proxy

The main proxy implementation that routes LLM API requests.

- **Repository**: https://github.com/your-username/LLM-API-Key-Proxy
- **Purpose**: API key management, request routing, provider normalization
- **License**: MIT

### OpenCode

The IDE/CLI that consumes this configuration.

- **Website**: https://opencode.ai
- **Documentation**: https://opencode.ai/docs
- **Purpose**: AI-powered coding assistant

## OpenCode Plugins

### opencode-openai-codex-auth

OpenAI OAuth authentication plugin for OpenCode, enabling access to GPT models via ChatGPT subscription.

- **Repository**: https://github.com/numman-ali/opencode-openai-codex-auth
- **npm**: https://www.npmjs.com/package/opencode-openai-codex-auth
- **Version Used**: 4.2.0
- **Purpose**: OAuth authentication for OpenAI Codex API

### oh-my-opencode

OpenCode plugin ecosystem for extended functionality.

- **Purpose**: Plugin management and extensions
- **Note**: Configuration file at `~/.config/opencode/oh-my-opencode.json` should not be modified by this project

## Upstream Model Providers

### OpenAI

- **API Documentation**: https://platform.openai.com/docs
- **Models Used**: GPT-5.1, GPT-5.2 series (via OAuth)

### Google Gemini

- **API Documentation**: https://ai.google.dev/docs
- **Models Used**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 3 Pro Preview

### Anthropic

- **API Documentation**: https://docs.anthropic.com
- **Models Used**: Claude Sonnet 4.5, Claude Opus 4.5

## Standards and Specifications

### Systemd

- **Documentation**: https://systemd.io
- **User Services**: https://wiki.archlinux.org/title/Systemd/User

### Keep a Changelog

- **Specification**: https://keepachangelog.com/en/1.1.0/
- **Purpose**: Changelog format used in this project

### Semantic Versioning

- **Specification**: https://semver.org/spec/v2.0.0.html
- **Purpose**: Version numbering scheme

### Contributor Covenant

- **Specification**: https://www.contributor-covenant.org/version/2/1/code_of_conduct/
- **Purpose**: Code of conduct template

## Version Matrix

| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.10+ | Required runtime |
| opencode-openai-codex-auth | 4.2.0 | Pinned in config |
| LLM-API-Key-Proxy | main | Latest recommended |
