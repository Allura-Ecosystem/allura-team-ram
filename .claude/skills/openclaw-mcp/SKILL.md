---
name: openclaw-mcp
description: "Manage OpenClaw MCP servers — add, remove, configure, probe, diagnose, filter tools. Use when adding MCP servers to OpenClaw, troubleshooting MCP connectivity, managing tool filters, or exposing OpenClaw as an MCP server."
---

# OpenClaw MCP Server Management

## List & Inspect

```bash
openclaw mcp list                    # table of configured servers
openclaw mcp show <name>             # single server details
openclaw mcp show <name> --json      # JSON output
openclaw mcp status                  # classify transports (no connect)
openclaw mcp status --verbose        # resolved details
```

## Add a Server

### stdio (local command)
```bash
openclaw mcp add <name> --command <cmd> [--arg <a>]... [--env <k=v>]... [--cwd <path>]

# Examples
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp add files --command npx --arg -y --arg @modelcontextprotocol/server-filesystem --arg "$HOME/Documents" --include 'read_file,list_directory'
openclaw mcp add context7 --command uvx --arg context7-mcp
```

### HTTP (remote endpoint)
```bash
openclaw mcp add <name> --url <endpoint> --transport <streamable-http|sse> [--auth oauth] [--timeout <s>]

# Examples
openclaw mcp add allura-brain --url http://localhost:5888/mcp --transport streamable-http
openclaw mcp add docs --url https://mcp.example.com/mcp --transport streamable-http --auth oauth --timeout 20
```

### Raw JSON
```bash
openclaw mcp set <name> '<json>'

# Examples
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set allura-brain '{"url":"http://localhost:5888/mcp","transport":"streamable-http"}'
```

### Skip probe on add
```bash
openclaw mcp add <name> --command <cmd> --no-probe
```

## Configure (Update Without Replacing)

```bash
openclaw mcp configure <name> [flags]

# Flags
--enabled <true|false>       # keep saved but exclude from discovery
--timeout <seconds>          # request timeout
--connect-timeout <seconds>  # connection timeout
--auth oauth                 # enable OAuth
--oauth-scope <scope>        # OAuth scope
--include <csv>              # tool include filter
--exclude <csv>              # tool exclude filter

# Examples
openclaw mcp configure allura-brain --timeout 30
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp configure context7 --enabled false   # disable without removing
```

## Tool Filters

```bash
openclaw mcp tools <name> [flags]

--include <csv>     # tool names and glob patterns to include
--exclude <csv>     # tool names and glob patterns to exclude
--clear             # remove all filters

# Examples
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp tools allura-brain --include 'memory_*'
openclaw mcp tools cua-driver --exclude 'dangerous_*'
```

## Diagnostics

```bash
openclaw mcp doctor                  # static checks on all definitions
openclaw mcp doctor <name>           # check single server
openclaw mcp doctor --probe          # static + live connectivity test
openclaw mcp probe <name>            # connect and report tool counts
openclaw mcp probe <name> --json     # machine-readable probe
```

## OAuth

```bash
openclaw mcp login <name>            # start OAuth flow
openclaw mcp login <name> --code <code>  # complete with auth code
openclaw mcp logout <name>           # clear credentials (keep definition)
```

## Remove & Reload

```bash
openclaw mcp unset <name>            # remove server definition
openclaw mcp reload                  # dispose cached MCP runtimes
```

## Expose OpenClaw as MCP Server

```bash
openclaw mcp serve                   # stdio server for MCP clients
openclaw mcp serve --url wss://host:18789 --token-file ~/.openclaw/gateway.token
openclaw mcp serve --verbose
openclaw mcp serve --claude-channel-mode off
```

This exposes OpenClaw channel conversations as MCP tools — an MCP client (Claude Code, etc.) can read/send messages through OpenClaw's channels.

## Config in openclaw.json

```json5
{
  mcp: {
    servers: {
      "allura-brain": {
        transport: "streamable-http",
        url: "http://localhost:5888/mcp"
      },
      "MCP_DOCKER": {
        command: "docker",
        args: ["mcp", "gateway", "run", "--profile", "openclaw", "--long-lived", "--static"]
      },
      "context7": {
        command: "uvx",
        args: ["context7-mcp"],
        enabled: true
      }
    },
    sessionIdleTtlMs: 600000   // 10 min idle timeout
  }
}
```

### Server fields
| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Executable (stdio transport) |
| `args` | string[] | Command arguments |
| `env` | object | Environment variables |
| `cwd` | string | Working directory |
| `url` | string | HTTP/HTTPS endpoint |
| `transport` | string | `"streamable-http"` or `"sse"` |
| `enabled` | boolean | Exclude without deletion |
| `timeout` | number | Request timeout (seconds) |
| `connectTimeout` | number | Connection timeout (seconds) |
| `auth` | string | `"oauth"` for OAuth servers |
| `toolFilter` | object | Include/exclude tool patterns |
