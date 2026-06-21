---
name: perplexica-mcp
description: MCP server integration for Perplexica (open-source AI search engine). Use when user wants to connect Codex to Perplexica search, configure MCP servers for web search, or set up perplexica-mcp. Provides installation, configuration, and usage guidance for self-hosted Perplexica with MCP.
---

# Perplexica MCP Server

## Purpose

Perplexica MCP Server connects Codex to Perplexica — an open-source AI-powered search engine — enabling live web search through a self-hosted instance instead of relying on external APIs.

## When to Use This Skill

Activate Perplexica MCP when the user:
- Wants to connect Codex to Perplexica search
- Needs to configure an MCP server for web search capabilities
- Is setting up perplexica-mcp from PyPI or GitHub
- Has Vane/Perplexica running in Docker and wants MCP integration
- Needs to troubleshoot MCP server connectivity or port conflicts

## Prerequisites

1. **Perplexica/Vane running** (Docker container on port 3222 by default)
2. **Python 3.10+** with `uv` or `uvx` installed
3. **VS Code** with GitHub Copilot Chat

## Installation

### Method 1: Using uvx (Recommended)

```bash
# Run directly without installing
uvx perplexica-mcp --help

# Start HTTP transport on custom port (avoid port 3222 if Vane is running)
uvx perplexica-mcp http 0.0.0.0 7722
```

### Method 3: Using Docker (Recommended for Production)

```bash
# Build the Docker image
docker build -f Dockerfile.mcp -t perplexica-mcp:latest .

# Run the container
docker run -d \
  --name perplexica-mcp \
  --restart unless-stopped \
  -p 7722:7722 \
  perplexica-mcp:latest

# Or use docker-compose (includes Perplexica + SearXNG + MCP)
docker-compose up -d
```

## Configuration

### VS Code Settings

Add to `~/.config/Code/User/settings.json`:

```json
{
    "chat.mcp.servers": {
        "perplexica-mcp": {
            "command": "uvx",
            "args": ["perplexica-mcp", "http", "0.0.0.0", "7722"],
            "env": {}
        }
    }
}
```

### Port Configuration

| Service | Default Port | Notes |
|---------|-------------|-------|
| Vane (Perplexica UI) | 3222 | Docker container (mapped from internal 3000) |
| perplexica-mcp HTTP | 7722 | **Use this to avoid conflict** |

**⚠️ Important**: If Vane is running on port 3222, always use a different port for the MCP server (e.g., 7722).

## Transport Options

```bash
# stdio transport (for direct MCP client integration)
uvx perplexica-mcp stdio

# SSE transport
uvx perplexica-mcp sse

# HTTP transport with custom host/port
uvx perplexica-mcp http 0.0.0.0 7722
```

## Verification

```bash
# Check if server is running
curl -s http://localhost:7722/mcp

# Expected response: JSON-RPC 2.0 error (normal for GET requests)
# {"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,...}}
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3222
lsof -i :3222

# Use a different port for MCP server
uvx perplexica-mcp http 0.0.0.0 7722
```

### Server Not Responding

1. Check if Vane/Perplexica is running: `docker ps | grep vane`
2. Verify MCP server process: `ps aux | grep perplexica-mcp`
3. Test endpoint: `curl -s http://localhost:7722/mcp`

### PEP 668 Error (Externally-Managed Environment)

If `pip install` fails with PEP 668 error, use `uvx` instead:

```bash
# Instead of: pip install perplexica-mcp
# Use:
uvx perplexica-mcp --help
```

## Architecture

```
Codex
    ↓ MCP Protocol (HTTP)
perplexica-mcp (port 7722) — Docker container
    ↓ HTTP API → host.docker.internal:3222/api/search
Vane/Perplexica (port 3222) — Docker container
    ↓ Ollama (nemotron-3-super:cloud + nomic-embed-text)
    ↓ SearXNG (port 8080)
    ↓ Search
Internet / Search APIs
```

## Required Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `PERPLEXICA_BACKEND_URL` | `http://host.docker.internal:3222/api/search` | Vane API endpoint |
| `PERPLEXICA_CHAT_MODEL_PROVIDER` | `ollama` | From Vane config.toml |
| `PERPLEXICA_CHAT_MODEL_NAME` | `nemotron-3-super:cloud` | From Vane config.toml |
| `PERPLEXICA_EMBEDDING_MODEL_PROVIDER` | `ollama` | From Vane config.toml |
| `PERPLEXICA_EMBEDDING_MODEL_NAME` | `nomic-embed-text` | From Vane config.toml |

All baked into `Dockerfile.mcp`. Override with `-e` flags if Vane config changes.

## Resources

- **PyPI Package**: https://pypi.org/project/perplexica-mcp/
- **GitHub Repository**: https://github.com/thetom42/perplexica-mcp
- **Perplexica**: https://github.com/ItzCrazyKns/Perplexica
- **Vane (Perplexica Fork)**: https://github.com/ItzCrazyKns/Vane
