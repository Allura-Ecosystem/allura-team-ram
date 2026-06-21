---
name: openclaw-config
description: "OpenClaw gateway configuration reference — openclaw.json structure, all top-level keys, gateway settings, channels, auth, models, sessions, cron, hooks, secrets, logging, diagnostics. Use when configuring the OpenClaw gateway, modifying openclaw.json, or troubleshooting gateway settings."
---

# OpenClaw Configuration Reference

Config file: `~/.openclaw/openclaw.json` (JSON5 format). All fields optional — safe defaults applied.

## Top-Level Keys

| Section | Purpose |
|---------|---------|
| `agents` | Agent defaults, multi-agent routing, per-agent overrides |
| `channels` | Per-channel settings (WhatsApp, Discord, Telegram, Slack) |
| `models` | Provider definitions, model catalog, pricing |
| `mcp` | MCP server definitions (see openclaw-mcp skill) |
| `skills` | Bundled/custom skill config and loading paths |
| `plugins` | Plugin discovery, enablement, per-plugin config |
| `gateway` | Mode, port, auth, TLS, reload |
| `auth` | Auth profiles, storage, cooldown policies |
| `hooks` | Webhook ingress mappings |
| `secrets` | Secret providers (env, file, exec) |
| `cron` | Scheduled job execution |
| `browser` | Browser automation, CDP, SSRF policy |
| `acp` | Agent Conversation Protocol settings |
| `logging` | Log levels, file output, redaction |
| `diagnostics` | OpenTelemetry, cache tracing |
| `env` | Inline environment variables |
| `update` | Release channel, auto-update |

## Gateway Config

```json5
{
  gateway: {
    mode: "local",                    // "local" | "remote"
    port: 18789,                      // default
    bind: "loopback",                 // loopback | lan | auto | tailnet | custom
    auth: {
      mode: "token",                  // none | token | password | trusted-proxy
      token: "oc_xxx",               // SecretRef supported
      rateLimit: { /* ... */ }
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      allowedOrigins: ["http://127.0.0.1:3334"]
    },
    tls: { enabled: false, certPath: "", keyPath: "" },
    tailscale: { mode: "off" },       // off | serve | funnel
    reload: { mode: "hot", debounceMs: 500 }
  }
}
```

## Models Config

```json5
{
  models: {
    mode: "merge",                    // "merge" | "replace"
    providers: {
      "ollama": {
        api: "ollama",
        apiKey: "ollama-local",
        baseUrl: "http://127.0.0.1:11434",
        models: [
          { id: "deepseek-v4-flash:cloud", reasoning: true, contextWindow: 1048576 }
        ]
      },
      "claude-proxy": {
        // Anthropic proxy with aliases
      }
    }
  }
}
```

## Channel Config

```json5
{
  channels: {
    whatsapp: {
      enabled: true,
      dmPolicy: "allowlist",
      allowFrom: ["+17043309400"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+17043309400"],
      selfChatMode: true,
      debounceMs: 0,
      mediaMaxMb: 50
    },
    discord: { enabled: false, dmPolicy: "pairing", groupPolicy: "allowlist" },
    telegram: { enabled: false },
    slack: { enabled: false }
  }
}
```

## Session Config

```json5
{
  session: {
    scope: "per-sender",              // per-sender | global
    dmScope: "main",                  // main | per-peer | per-channel-peer
    reset: { mode: "daily", atHour: 4 },
    resetTriggers: ["/new", "/reset"],
    agentToAgent: { maxPingPongTurns: 5 }
  }
}
```

## Auth Config

```json5
{
  auth: {
    profiles: {
      "ollama:default": { mode: "api_key", provider: "ollama-cloud" },
      "openai:user@email.com": { provider: "openai", mode: "oauth" }
    },
    cooldowns: {
      billingBackoffHours: 5,
      authPermanentBackoffMinutes: 10
    }
  }
}
```

## Secrets Config

```json5
{
  secrets: {
    providers: {
      "vault": { source: "exec", command: "vaultwarden-get.sh" },
      "env": { source: "env" },
      "file": { source: "file", path: "~/.openclaw/secrets.json" }
    }
  }
}
```

## Cron Config

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 8,
    sessionRetention: "24h",
    retry: { maxAttempts: 3, backoffMs: [1000, 5000, 15000] },
    failureAlert: { enabled: true, after: 3 }
  }
}
```

## Hooks (Webhook Ingress)

```json5
{
  hooks: {
    enabled: true,
    token: "bearer_token_here",
    path: "/hooks",
    mappings: [
      { path: "/deploy", action: "agent", agent: "ops", message: "deployment webhook" }
    ]
  }
}
```

## Logging & Diagnostics

```json5
{
  logging: {
    level: "info",
    file: "~/.openclaw/logs/gateway.log",
    redactSensitive: "tools",
    redactPatterns: ["sk-[a-zA-Z0-9]+"]
  },
  diagnostics: {
    enabled: false,
    otel: { enabled: false, endpoint: "http://localhost:4318", sampleRate: 0.1 }
  }
}
```

## CLI Commands

```bash
openclaw config get <path>           # read any config value
openclaw config set <path> <value>   # set a config value
openclaw config schema               # print full JSON Schema
openclaw configure                   # interactive setup wizard
openclaw configure --section models  # reconfigure specific section
openclaw doctor                      # health check
openclaw gateway install             # install as service
openclaw gateway restart             # restart gateway
```
