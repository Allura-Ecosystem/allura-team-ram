---
name: openclaw-admin
description: "Manage OpenClaw agents, bindings, and routing. Use when adding, listing, configuring, or deleting OpenClaw agents; binding agents to channels; managing agent identity; or troubleshooting agent routing."
---

# OpenClaw Agent Administration

## Agent Management

### List agents
```bash
openclaw agents list              # table view
openclaw agents list --bindings   # include routing bindings
openclaw agents list --json       # machine-readable
```

### Add an agent
```bash
openclaw agents add <id> --workspace <dir> [--model <provider/model>] [--bind <channel[:accountId]>]

# Examples
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents add research --workspace ~/research --model claude-proxy/claude-sonnet-4 --bind discord:*
```

### Delete an agent
```bash
openclaw agents delete <id>
openclaw agents delete <id> --force   # skip confirmation
```

## Routing Bindings

Bindings route messages from channels to specific agents. Format: `channel[:accountId]` where `*` matches any account.

```bash
# View bindings
openclaw agents bindings
openclaw agents bindings --agent work

# Add bindings
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
openclaw agents bind --agent work --bind telegram:*

# Remove bindings
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

**Match priority:** peer → guildId → teamId → accountId (exact) → accountId (`*`) → default agent

## Agent Identity

```bash
openclaw agents set-identity --agent main --name "Allura" --emoji "🧠" --avatar avatars/allura.png
openclaw agents set-identity --agent main --from-identity   # read from IDENTITY.md
```

## Run an Agent Turn (CLI)

```bash
openclaw agent --agent <id> --message "your prompt" [flags]

# Flags
--local              # embedded (no gateway)
--model <id>         # override model
--thinking <level>   # off|minimal|low|medium|high|xhigh|adaptive|max
--deliver            # send reply to channel
--json               # JSON output
--timeout <seconds>  # override 600s default
--session-id <id>    # explicit session

# Examples
openclaw agent --agent ops --message "check system health" --deliver
openclaw agent --agent work --message "summarize PRs" --thinking medium --json
```

## Config File Location

`~/.openclaw/openclaw.json` (JSON5 format)

### Agent config in openclaw.json
```json5
{
  agents: {
    defaults: {
      model: { primary: "claude-proxy/claude-sonnet-4", fallbacks: ["ollama/deepseek-v4-flash:cloud"] },
      workspace: "~/.openclaw/workspace",
      thinkingDefault: "medium",
      bootstrapMaxChars: 50000,
      bootstrapTotalMaxChars: 300000,
      maxConcurrent: 3,
      timeoutSeconds: 600
    },
    list: [
      {
        id: "work",
        workspace: "~/.openclaw/workspace-work",
        model: { primary: "claude-proxy/claude-opus-4" },
        skills: ["allura-memory-skill", "code-review"],
        subagents: { allowAgents: ["talon-code-reviewer"] },
        tools: { alsoAllow: ["allura-brain__memory_search"] }
      }
    ]
  }
}
```

### Per-agent overrides
Every `agents.defaults` field can be overridden in `agents.list[]` entries. Key per-agent fields:
- `id` (required), `name`, `agentDir`, `workspace`
- `model`, `skills`, `tools`, `subagents`
- `identity` (name, theme, emoji, avatar)
- `groupChat` (mention patterns)
- `runtime` (for ACP agents)

## Troubleshooting

```bash
openclaw doctor                    # overall health check
openclaw config get agents         # dump agent config
openclaw config get agents.defaults.model  # check default model
```
