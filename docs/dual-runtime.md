# Dual-Runtime Guide

> Team RAM runs on both Claude Code and OpenCode. Here's how to keep both in sync.

## Runtimes Compared

| Feature | Claude Code | OpenCode |
|--------|-------------|----------|
| **Primary use** | Pair programming, chat-based coding | Multi-agent orchestration, commands |
| **Agent discovery** | `.claude/agents/*.md` | `.opencode/agent/*.md` |
| **Config file** | `.claude/settings.json` | `opencode.json` |
| **Plugin system** | Plugin manifest (`plugin.json`) | `opencode.json` `"plugin"` array |
| **Model IDs** | `opus`, `sonnet`, `haiku` | `provider/model-id` |
| **Fallback** | Not supported | `fallback_model` / `fallback.chains` |
| **Permissions** | `permissionMode` | `permission` with glob patterns |
| **Tools** | Whitelist array (`tools: [...]`) | `permission` object |
| **Skills** | `.claude/skills/*/SKILL.md` | `.opencode/skills/*/SKILL.md` |
| **MCP servers** | `.mcp.json` or `~/.claude.json` | `opencode.json` `mcp` section |
| **Hooks** | `.claude/hooks/` | `hooks.json` in plugin |
| **Session start** | Predefined (no injection) | `SessionStart` hook runs code |
| **Subagents** | `@agent-name` in chat | `task` tool dispatches agents |

## Directory Structure

```
allura-memory/                    # Product repo (Allura Brain)
├── .opencode/
│   ├── agent/
│   │   ├── core/                 # Primary agents
│   │   │   ├── brooks.md
│   │   │   ├── jobs.md
│   │   │   └── bahari.md
│   │   └── subagents/
│   │       ├── core/scout.md
│   │       ├── code/woz.md, bellard.md, carmack.md
│   │       ├── review/pike.md, fowler.md
│   │       └── infrastructure/knuth.md, hightower.md
│   ├── skills/
│   └── team-ram-presets.jsonc
├── .claude/
│   └── agents/*.md               # Claude Code agents (stale copy)
└── opencode.json                 # OpenCode config (canonical)

Allura-TeamRam/                   # Harness repo
├── .opencode/
│   ├── agent/*.md                # Flat agent surface (OpenCode)
│   └── skills/
├── .claude-plugin/               # OpenCode plugin manifest
│   ├── plugin.json
│   ├── agents/*.md               # Plugin-included agent prompts
│   ├── hooks/
│   └── skills/
├── .codex-plugin/                # Codex plugin (simpler)
│   └── plugin.json
└── opencode.json                 # OpenCode config
```

## Single Source of Truth

The **canonical source of truth** for model assignments is:

```
.opencode/team-ram-presets.jsonc
```

This file lives in both repos. Changes to this file propagate to all surfaces via `scripts/apply-preset.sh`.

### Synchronization Strategy

1. **Edit `.opencode/team-ram-presets.jsonc`** in ONE repo (prefer allura-memory, since it's the product)
2. **Run `scripts/apply-preset.sh`** in that repo
3. **Manually sync** the `.jsonc` file to the other repo
4. **Run `scripts/apply-preset.sh`** in the other repo

Future: A GitHub Action could auto-sync `team-ram-presets.jsonc` between repos via PR.

## Model Mapping

When switching presets, the script automatically maps OpenCode model IDs to Claude Code aliases:

| Quality Level | OpenCode Model | Claude Code Alias |
|---------------|---------------|-------------------|
| Highest | `ollama/glm-5.1:cloud` | `opus` |
| High | `ollama/deepseek-v4-pro:cloud` | `opus` |
| Medium | `ollama/qwen3-coder-next:cloud` | `sonnet` |
| Medium | `ollama/kimi-k2.6:cloud` | `sonnet` |
| Fast | `ollama/nemotron-3-super:cloud` | `haiku` |
| Tiny | `ollama/qwen3:0.6b` | `haiku` |

The mapping is bi-directional and handled by `scripts/apply-preset.sh`.

## Critical Differences

### 1. No Fallback in Claude Code

Claude Code agents do NOT support model fallback. If `claude-opus-4-6` is unavailable, the agent fails. This is a limitation of the Claude Code runtime, not Team RAM.

**Mitigation:** Use OpenCode agents for critical work where fallback matters.

### 2. Permission Model

**OpenCode:**
```yaml
permission:
  read: allow
  edit: allow
  bash: deny      # Agent cannot use Bash at all
  skill:
    "allura-memory-skill": allow
    "mcp-docker": allow
    "*": ask      # All other skills prompt user
```

**Claude Code:**
```yaml
permissionMode: auto          # or default, acceptEdits, etc.
tools:
  - Read
  - Grep
  - Bash                        # Tool is available
disallowedTools:
  - Edit                        # Tool explicitly denied
```

Claude Code's permission model is coarser — you can only allow/deny entire tools (not patterns), and skill permissions are not fine-grained.

### 3. Agent Registration

**OpenCode:** Agents are defined in `opencode.json` + `.opencode/agent/*.md`. OpenCode merges the YAML frontmatter with the JSON config.

**Claude Code:** Agents are loaded from `.claude/agents/*.md`. No separate config file — the frontmatter IS the config.

### 4. Skills

Both runtimes support `.md` skills with YAML frontmatter. **BUT:**
- OpenCode skills go in `.opencode/skills/<name>/SKILL.md`
- Claude Code skills go in `.claude/skills/<name>/SKILL.md`
- **The content is the same** — only the directory differs

### 5. Hooks

**OpenCode:** Hooks are TypeScript/JavaScript files referenced in `hooks.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bun run hooks/session-start.ts",
            "statusMessage": "Team RAM activate"
          }
        ]
      }
    ]
  }
}
```

**Claude Code:** Hooks are scripts in `.claude/hooks/`. Session-start injection is not supported natively — the script runs on startup, not on session join.

## Keeping Both Runtimes in Sync

### Option A: Manual (current)
- Edit preset in one repo
- Copy `.jsonc` file to other repo
- Run `apply-preset.sh` in both

### Option B: Git submodule
- Make `team-ram-presets.jsonc` a git submodule
- Both repos share the same file at `.opencode/team-ram-presets.jsonc`
- One edit propagates on `git submodule update`

### Option C: Shared config repo
- Create `Allura-TeamRam-config` repository
- Both repos clone it as a dependency
- CI syncs on every commit

### Option D: GitHub Action (recommended for production)
- Auto-PR from allura-memory to Allura-TeamRam when `.opencode/team-ram-presets.jsonc` changes
- Allura-TeamRam CI runs `apply-preset.sh --check` and blocks on drift
- Manual review required for cross-repo sync

## Claude Code-Only Features

These exist only in Claude Code and have no OpenCode equivalent:

| Feature | What it does |
|---------|-------------|
| `@agent` invocation | Type `@brooks` to delegate to agent |
| `--agent` CLI flag | Run Claude as a specific agent |
| Agent memory | `memory: user|project|local` scope |
| Effort levels | `effort: low|medium|high|xhigh|max` |
| Background mode | `background: true` for async agents |
| Isolation | `isolation: worktree` for isolated worktrees |
| Color theming | `color` field for UI display |

## OpenCode-Only Features

These exist only in OpenCode and have no Claude Code equivalent:

| Feature | What it does |
|---------|-------------|
| Preset switching | `/preset ollama` at runtime |
| Fallback chains | Automatic model failover |
| Permission globbing | `skill: {"mcp-*": allow}` |
| Tool deprecation | `tools` → `permission` migration |
| Plugin system | `opencode.json` `"plugin"` array |
| Commands | `/start-session`, `/party`, `/debug` |
| Task tool | Subagent dispatch with `task` |
| Todo tracking | `todowrite` tool |
| Web search | `websearch` integrated |
| LSP tools | Go-to-definition, find-references |

## When to Use Which

### Use Claude Code when:
- You're in a browser or VS Code
- You want natural `@agent` chat style delegation
- You have Anthropic credits
- You don't need fallback chains
- You're doing focused pair programming

### Use OpenCode when:
- You need multi-agent orchestration
- You want preset switching without editing files
- Fallback chains are critical
- You're running CI/CD or automation
- You need fine-grained skill permissions

## Migration Path

If you're switching from Claude Code to OpenCode:

1. Copy `.claude/agents/*.md` to `.opencode/agent/`
2. Convert model aliases (`opus` → `ollama/glm-5.1:cloud`)
3. Add `fallback_model` fields
4. Convert `tools` whitelist to `permission` object
5. Copy `.claude/skills/` to `.opencode/skills/`
6. Copy `.mcp.json` config to `opencode.json` `mcp` section
7. Create `opencode.json` with agent entries
8. Run `scripts/apply-preset.sh`

The `scripts/apply-preset.sh` script handles steps 2, 3, and 4 automatically.

## Next Steps

- See [Configuration](configuration.md) — full config reference
- See [Agents](agents.md) — full agent roster
- See [Presets](presets.md) — preset switching guide
- See [Quick Reference](quick-reference.md) — cheat sheet

---
*For questions: run `./scripts/apply-preset.sh --help` or check `.opencode/team-ram-presets.jsonc`.*
