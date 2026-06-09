# Team RAM Configuration Guide

> Complete reference for configuring the Team RAM multi-agent harness across both OpenCode and Claude Code runtimes.

## Table of Contents

- [Config Files](#config-files)
- [opencode.json Reference](#opencodejson-reference)
- [team-ram-presets.jsonc](#team-ram-presetsjsonc)
- [Agent Frontmatter](#agent-frontmatter)
- [Model Format](#model-format)
- [Fallback Chains](#fallback-chains)
- [Permissions](#permissions)
- [Dual-Runtime Notes](#dual-runtime-notes)

---

## Config Files

| File | Runtime | Purpose | Scope |
|------|---------|---------|-------|
| `opencode.json` | OpenCode | Core config — model provider, agents, permissions, MCP servers, plugins | Per-repo |
| `.opencode/team-ram-presets.jsonc` | Cross-repo | Agent model presets + fallback chains | Per-repo |
| `.opencode/agent/*.md` | OpenCode | Agent persona prompts + model override | Per-repo |
| `.claude/agents/*.md` | Claude Code | Agent persona prompts (Claude format) | Per-repo or global |
| `.claude-plugin/plugin.json` | OpenCode Plugin | Team RAM plugin manifest | Per-repo |
| `.mcp.json` | Both | MCP server definitions | Per-repo |
| `CLAUDE.md` | OpenCode | Per-repo developer instructions | Per-repo |

---

## opencode.json Reference

### Top-level keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `$schema` | string | Yes | `"https://opencode.ai/config.json"` |
| `default_agent` | string | No | Default primary agent when no agent specified |
| `model` | string | No | Global default model (used when agent has no model) |
| `instructions` | string[] | No | Files to inject into all agent contexts |
| `skills.paths` | string[] | No | Directories to scan for SKILL.md files |
| `mcp` | object | No | MCP server definitions |
| `plugin` | string[] | No | Installed plugins (e.g., `["opencode-scheduler", "@razroo/opencode-model-fallback"]` ) |
| `provider` | object | No | Provider-specific model lists |
| `permission` | object | No | Global tool permissions |
| `agent` | object | **Yes** | Agent definitions |

### `provider` section

Define available models per provider. Only affects model autocomplete — agents reference models by `provider/model-id`.

```json
"provider": {
  "ollama": {
    "name": "Ollama",
    "npm": "@ai-sdk/openai-compatible",
    "options": {
      "baseURL": "http://127.0.0.1:11434/v1",
      "timeout": 600000
    },
    "models": {
      "deepseek-v4-pro:cloud": {"name": "deepseek-v4-pro:cloud"},
      "glm-5.1:cloud":         {"name": "glm-5.1:cloud"},
      "kimi-k2.6:cloud":       {"name": "kimi-k2.6:cloud"},
      "qwen3-coder-next:cloud":{"name": "qwen3-coder-next:cloud"}
    }
  }
}
```

### `agent` section

Each key is an agent identifier (matching the agent's `name` frontmatter). OpenCode uses this to merge into markdown agent definitions.

| Key | Type | Description |
|-----|------|-------------|
| `mode` | string | `"primary"` or `"subagent"` |
| `path` | string | Relative path to `.md` file |
| `model` | string | `provider/model-id` or alias |
| `fallback_model` | string | Single fallback model (non-standard field) |
| `permission` | object | Agent-specific tool permissions (overrides global) |

**Example:**

```json
{
  "agent": {
    "brooks": {
      "mode": "primary",
      "path": ".opencode/agent/brooks.md",
      "model": "ollama/glm-5.1:cloud",
      "fallback_model": "ollama/deepseek-v4-pro:cloud",
      "permission": {
        "task": "allow",
        "skill": {"*": "allow"}
      }
    }
  }
}
```

### `permission` sections

Global (top-level) or per-agent. Tool-level permissions:

| Action | Values | Meaning |
|--------|--------|---------|
| `allow` | free | Agent can use tool without asking |
| `ask` | free | Agent prompts user before each use |
| `deny` | free | Agent cannot use tool |

Special `skill` permission supports glob patterns:

```json
{
  "permission": {
    "skill": {
      "allura-memory-skill": "allow",
      "mcp-docker": "allow",
      "*": "allow"
    }
  }
}
```

---

## team-ram-presets.jsonc

Single source of truth for agent model assignments. Edit here, then run `scripts/apply-preset.sh` to propagate to all surfaces.

### Preset structure

```jsonc
{
  // Active preset. Switching this changes which preset is applied on next run.
  "preset": "ollama",

  "presets": {
    "ollama": {
      "brooks": { "model": "ollama/glm-5.1:cloud", "variant": "high" },
      // ... all agents
    },
    "openai": { /* ... */ },
    "anthropic": { /* ... */ },
    "mixed": { /* ... */ }
  },

  "fallback": {
    "enabled": true,
    "timeoutMs": 15000,
    "chains": {
      "brooks": ["ollama/glm-5.1:cloud", "ollama/deepseek-v4-pro:cloud"]
    }
  }
}
```

### Preset fields

| Field | Type | Description |
|-------|------|-------------|
| `preset` | string | Active preset name (`ollama`/`openai`/`anthropic`/`mixed`) |
| `presets.{name}.{agent}.model` | string | Model ID in `provider/model-id` format |
| `presets.{name}.{agent}.variant` | string | Reasoning effort: `"low"`, `"medium"`, `"high"` |
| `fallback.enabled` | boolean | Enable fallback chains |
| `fallback.timeoutMs` | number | Time before aborting and trying next model |
| `fallback.chains.{agent}` | string[] | Ordered list of fallback models |

### Available presets

| Preset | Best For | Cost |
|--------|----------|------|
| `ollama` | Zero API costs. Self-hosted Ollama with cloud fallback. | Free (cloud models may have quotas) |
| `openai` | Production workloads. Best reasoning quality. | ~$30-50/mo for heavy use |
| `anthropic` | Claude Code users who want best-in-class coding. | ~$30-50/mo |
| `mixed` | Cost/quality optimization. Mix providers per agent. | ~$15-30/mo |

---

## Agent Frontmatter

OpenCode agent markdown files use YAML frontmatter:

```yaml
---
name: brooks                    # Must match opencode.json agent key
description: "Chief Architect..."
mode: primary                   # primary | subagent
status: active                  # active | deprecated | sandbox
model: ollama/glm-5.1:cloud     # Overrides opencode.json if present
fallback_model: ollama/deepseek-v4-pro:cloud  # Non-standard — see fallback.md
tools:                          # DEPRECATED — use permission instead
permissions:                    # OpenCode: agent-specific overrides
  edit: allow
  skill:
    "*": allow
skills:                         # Preloaded skill names
  - team-ram-cowork
  - allura-memory-skill
---
```

### Name normalization

Agent `name:` fields **must be lowercase** and match the opencode.json agent key. If the markdown `name` field and the agent key in `opencode.json` differ, the agent definition merges but may be ambiguous.

### Claude Code frontmatter differences

Claude Code `.claude/agents/*.md` uses a slightly different format:

```yaml
---
name: brooks
description: "Chief Architect..."
model: opus                # Claude model alias: opus, sonnet, haiku
color: "#DC2626"           # Display color in Claude Code UI
tools:                     # Whitelist of tool names
  - Read
  - Grep
  - Bash
skills:                    # Preloaded skill names
  - team-ram-cowork
---
```

Key differences:
- `model` uses Claude aliases (`opus`, `sonnet`, `haiku`) instead of `provider/model-id`
- `tools` is a whitelist array (deprecated in OpenCode, use `permission`)
- `color` field for UI theming
- No `permission` section — use `permissionMode: default|acceptEdits|auto|...`
- `mode`, `status`, `fallback_model` fields are **not recognized** in Claude Code

---

## Model Format

### OpenCode format
- `provider/model-id` e.g., `ollama/glm-5.1:cloud`, `openai/gpt-5.5`
- Provider is the **npm package name** used for that model
- If using `@ai-sdk/openai-compatible` (Ollama), model IDs are arbitrary strings you define in `provider.ollama.models`

### Claude Code format
- `opus` → `claude-opus-4-6`
- `sonnet` → `claude-sonnet-4`
- `haiku` → `claude-haiku-4-5`
- Full model IDs also accepted: `claude-opus-4-6`

### Claude-OpenCode mapping

| Purpose | Ollama Preset | Claude Code Alias | OpenAI Preset |
|---------|--------------|-------------------|---------------|
| Chief architect | `ollama/glm-5.1:cloud` | `opus` | `openai/gpt-5.5` |
| Intent gate | `ollama/deepseek-v4-pro:cloud` | `opus` | `openai/gpt-5.5` |
| Builder | `ollama/qwen3-coder-next:cloud` | `sonnet` | `openai/gpt-5.5` |
| Recon | `ollama/nemotron-3-super:cloud` | `haiku` | `openai/gpt-5.4-mini` |
| Diagnostics | `ollama/glm-5.1:cloud` | `sonnet` | `openai/gpt-5.4-mini` |
| Optimization | `ollama/qwen3-coder-next:cloud` | `sonnet` | `openai/gpt-5.4-mini` |
| Interface | `ollama/deepseek-v4-pro:cloud` | `sonnet` | `openai/gpt-5.4-mini` |
| Refactoring | `ollama/glm-5.1:cloud` | `sonnet` | `openai/gpt-5.5` |
| Data | `ollama/qwen3-coder-next:cloud` | `sonnet` | `openai/gpt-5.5` |
| Infrastructure | `ollama/deepseek-v4-pro:cloud` | `sonnet` | `openai/gpt-5.5` |

---

## Fallback Chains

### How fallback works

Team RAM uses `fallback.chains` in `team-ram-presets.jsonc`. The fallback mechanism requires one of:

1. **`@razroo/opencode-model-fallback` plugin** (recommended): Native OpenCode plugin with TTFT timeout, cooldown, auto-recovery
2. **OpenCode PR #8669 `fallbacks` config**: If merged into your OpenCode version
3. **OpenCode `fallback_model` field**: Single fallback, works with OpenCode's built-in retry

### Fallback chain example

```jsonc
"fallback": {
  "enabled": true,
  "timeoutMs": 15000,      // Abort after 15s of no first token
  "retryDelayMs": 500,
  "chains": {
    "brooks": [
      "ollama/glm-5.1:cloud",       // Primary
      "ollama/deepseek-v4-pro:cloud", // Fallback 1
      "ollama/qwen3-coder-next:cloud"  // Fallback 2
    ]
  }
}
```

### Fallback without the plugin

If you don't install `@razroo/opencode-model-fallback`, fallback only works via the `opencode.json` `fallback_model` field (single fallback). The full `fallback.chains` arrays need the plugin to work.

---

## Dual-Runtime Notes

Running Team RAM across both Claude Code and OpenCode requires understanding field equivalences:

| Concept | OpenCode (`.opencode/`) | Claude Code (`.claude/`) |
|---------|------------------------|--------------------------|
| Config file | `opencode.json` | `.claude/settings.json` (optional) |
| Agent directory | `.opencode/agent/*.md` | `.claude/agents/*.md` |
| Agent manifest | `.claude-plugin/plugin.json` agents array | Plugin or manual install |
| Model IDs | `provider/model-id` | `opus`, `sonnet`, `haiku`, full Claude IDs |
| Fallback | `fallback_model` + `fallback.chains` | **Not supported** |
| Permissions | `permission: { edit: allow }` | `permissionMode: default|auto|...` |
| Tools list | `permission` with glob patterns | `tools: [Read, Grep, Bash]` whitelist |
| Skills | `skills: [...]` | `skills: [...]` |
| MCP servers | `mcp: { ... }` | `.claude.json` or `.mcp.json` |
| Hooks | `hooks.json` in plugin | `.claude/hooks/` |

The `scripts/apply-preset.sh` script handles the mapping automatically. You should never manually edit Claude Code model assignments — let the script translate from the shared preset config.

---

## Next Steps

- See [Presets](presets.md) — switch presets and add custom ones
- See [Agents](agents.md) — full agent roster with personas
- See [Dual-Runtime Guide](dual-runtime.md) — running on both Claude Code and OpenCode
- See [API Reference](quick-reference.md) — cheat sheet for all commands

---
*For questions or issues, run: `./scripts/apply-preset.sh --help` or check `.opencode/team-ram-presets.jsonc`.*
