---
name: plugin-builder
description: "Build plugins compatible with Codex, Codex CLI, and/or OpenCode. Generates correct directory structure, manifests (plugin.json), hooks, skills, agents, and commands for each target runtime. Use this skill whenever the user wants to create a plugin, build an extension, package skills/hooks/agents into a distributable plugin, scaffold a plugin project, make a Codex plugin, make a Codex plugin, make an OpenCode plugin, or port a plugin between runtimes. Also use when the user asks about plugin structure, plugin anatomy, or how plugins work across runtimes."
---

# Plugin Builder

Build plugins that work across Codex, Codex CLI, and OpenCode from a single source. This skill walks you through intent capture, scaffolding, content creation, wiring, and packaging — outputting the correct manifests and directory structure for each target runtime.

## Why This Exists

Codex, Codex CLI, and OpenCode share ~80% of their plugin anatomy (hooks, skills, agents, commands), but each runtime has its own manifest format and discovery mechanism. Building a plugin without a guide means guessing at field names, hook event types, and directory conventions. This skill eliminates that guesswork.

## Phase 1: Capture Intent

Before scaffolding anything, understand what the plugin needs to do. Ask these questions (skip any the conversation already answers):

1. **What does this plugin do?** — One sentence.
2. **Which runtimes?** — Codex, Codex CLI, OpenCode, or all three?
3. **What does it contain?** Check all that apply:
   - [ ] **Hooks** — Intercept tool calls or user prompts (governance, logging, guards)
   - [ ] **Skills** — Reusable playbooks/workflows (SKILL.md files)
   - [ ] **Agents** — Persona definitions with tools/skills/model assignments
   - [ ] **Commands** — Named workflow entry points (slash commands)
   - [ ] **MCP servers** — External tool servers (databases, APIs, search)
4. **Does it need governance?** — Will it touch Allura Brain, databases, or sensitive operations?
5. **Plugin metadata** — name, version, author, license, description, category

If the user only targets one runtime, generate only that runtime's manifest. Don't force triple output.

## Phase 2: Scaffold

Generate the directory structure based on Phase 1 answers. The canonical layout:

```
<plugin-name>/
├── .Codex-plugin/           # Codex manifest (if targeting CC)
│   └── plugin.json
├── .codex-plugin/            # Codex CLI manifest (if targeting Codex)
│   └── plugin.json
├── hooks/                    # Shared hook scripts + registration
│   ├── hooks.json            # Hook event → script mapping
│   └── <hook-name>.py        # Hook executables (Python or shell)
├── skills/                   # Shared skills directory
│   └── <skill-name>/
│       └── SKILL.md
├── agents/                   # Agent definitions
│   └── <agent-name>.md
├── commands/                 # Command definitions
│   └── <command-name>.md
└── README.md                 # Plugin documentation
```

For **OpenCode-only** plugins, the structure maps to `.opencode/` conventions instead:

```
.opencode/
├── agent/<agent-name>.md     # YAML frontmatter + markdown
├── command/<command-name>.md  # YAML frontmatter + markdown
├── skills/<skill-name>/SKILL.md
├── hooks/<hook-name>.ts       # TypeScript (not Python)
└── config/                    # MCP and agent metadata
```

### Manifest Templates

Generate the appropriate manifest(s) based on target runtimes.

#### Codex — `.Codex-plugin/plugin.json`

```json
{
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "<what it does>",
  "author": { "name": "<author>" },
  "license": "MIT",
  "keywords": ["<tag1>", "<tag2>"],
  "skills": "./skills/",
  "agents": ["./agents/<name>.md"],
  "commands": ["./commands/<name>.md"],
  "interface": {
    "displayName": "<Human Readable Name>",
    "shortDescription": "<one-liner>",
    "longDescription": "<full description>",
    "category": "<Coding|Productivity|DevOps|Security|Other>",
    "capabilities": ["<Read|Write|Interactive|Memory>"],
    "brandColor": "#6D5EF7"
  }
}
```

**Fields explained:**
- `skills` — Directory path. All `SKILL.md` files inside become available as `/skill-name` commands.
- `agents` — Array of file paths to agent markdown definitions.
- `commands` — Array of file paths to command markdown definitions.
- `interface` — UI metadata for plugin marketplaces. Optional but recommended.
- `interface.capabilities` — Declares what permission categories the plugin needs.

#### Codex CLI — `.codex-plugin/plugin.json`

Same schema as Codex, plus:

```json
{
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "<what it does>",
  "author": { "name": "<author>" },
  "license": "MIT",
  "keywords": ["<tag1>", "<tag2>"],
  "hooks": "./hooks/hooks.json",
  "skills": "./skills/",
  "agents": ["./agents/<name>.md"],
  "commands": ["./commands/<name>.md"],
  "interface": {
    "displayName": "<Human Readable Name>",
    "shortDescription": "<one-liner>",
    "longDescription": "<full description>",
    "category": "<Coding|Productivity|DevOps|Security|Other>",
    "capabilities": ["<Read|Write|Interactive|Memory>"],
    "brandColor": "#6D5EF7"
  }
}
```

**Key difference:** Codex requires the `hooks` field pointing to `hooks.json`. Codex loads hooks from the same `hooks.json` but doesn't need the field in its manifest — discovery is automatic.

#### OpenCode — `opencode.json` (project-level)

OpenCode doesn't use `plugin.json`. Instead, extensibility is configured in the project's `opencode.json` and the `.opencode/` directory structure:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "<default-model>",
  "mcp": {
    "<server-name>": {
      "type": "local",
      "command": ["bun", "run", "<path>"],
      "enabled": true
    }
  }
}
```

Agents, commands, and skills are discovered by convention from `.opencode/agent/`, `.opencode/command/`, and `.opencode/skills/`.

## Phase 3: Build Content

### Skills (SKILL.md)

Skills are the same format across all three runtimes:

```markdown
---
name: <skill-name>
description: "<when to trigger — be specific and slightly pushy>"
allowed-tools: [<tool1>, <tool2>]
---

# Skill Title

<Instructions for the AI to follow when this skill is invoked>
```

**Tips for good skill descriptions:**
- Include both what the skill does AND when to use it
- List trigger phrases: "Use when the user mentions X, Y, or Z"
- Lean slightly pushy — skills undertrigger more often than overtrigger

**`allowed-tools`** restricts which tools the skill can invoke. Omit to allow all tools. Common tools: `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `Skill`, `Agent`.

### Agents (agent-name.md)

#### Codex / Codex format:

```markdown
---
name: <agent-name>
description: "<role and responsibilities>"
model: <opus|sonnet|haiku>
tools:
  - Read
  - Grep
  - Bash
skills:
  - <skill-name>
---

# Agent Persona

<Instructions, constraints, protocols>
```

#### OpenCode format:

```yaml
---
name: <agent-name>
description: "<role and responsibilities>"
mode: <primary|subagent>
persona: <character-name>
category: <Core|Code|System|Content|Data|Testing>
type: <primary|subagent>
status: active
model: <opus|sonnet|haiku>
tools:
  - Read
  - Grep
  - Bash
skills:
  - <skill-name>
---
```

OpenCode agents have additional fields: `mode`, `persona`, `category`, `type`, `status`. These control routing and discovery in the OpenCode harness.

### Commands (command-name.md)

```markdown
---
description: "<what this command does>"
argument-hint: "<syntax hint, e.g. [target]>"
allowed-tools: [<tool1>, <tool2>]
---

# Command Instructions

<Steps the AI follows when this command is invoked>
```

Commands are invoked as `/command-name` in all runtimes.

### Hooks

Hooks intercept lifecycle events. They receive JSON on STDIN and can block execution by printing a JSON response to STDOUT.

#### hooks.json — Event Registration

```json
{
  "hooks": {
    "<EventType>": [
      {
        "matcher": "<regex-for-tool-names|empty-for-all>",
        "hooks": [
          {
            "type": "command",
            "command": "<path-to-executable>"
          }
        ]
      }
    ]
  }
}
```

**Event types:**
| Event | When it fires | Use case |
|-------|--------------|----------|
| `UserPromptSubmit` | Before user input is processed | Inject context, enforce policies |
| `PreToolUse` | Before a tool executes | Guard/block dangerous operations |
| `PostToolUse` | After a tool completes | Log, audit, post-process |

**Matcher:** Regex against tool names. Empty string `""` matches all tools. Example: `"Bash|mcp__"` matches only Bash and MCP tools.

**Important design consideration:** If your hook inspects tool input fields like `query`, `command`, or `sql`, make sure it only runs on tools that actually use those fields for their intended purpose. A `query` field on `ToolSearch` is a schema lookup, not SQL — don't treat it as a database query. Guard your checks with tool name filters. See `references/hook-patterns.md` for examples.

#### Hook Script Contract

**STDIN** (JSON):
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /"
  }
}
```

**STDOUT to block** (JSON):
```json
{
  "decision": "block",
  "reason": "BLOCKED — destructive command detected."
}
```

**STDOUT to allow:** Print nothing (empty output) or exit without printing.

**Exit code:** Always `0`. Non-zero may cause undefined behavior depending on the runtime.

#### Hook Script Template (Python)

```python
#!/usr/bin/env python3
"""<Hook description>"""
import json
import re
import sys

def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0  # If we can't parse input, don't block

    tool_name = str(payload.get("tool_name") or payload.get("tool") or "")
    tool_input: dict = payload.get("tool_input") or payload.get("input") or {}

    # Your check logic here
    # Example: block a specific pattern
    if tool_name == "Bash":
        cmd = str(tool_input.get("command") or "")
        if re.search(r"dangerous_pattern", cmd):
            print(json.dumps({
                "decision": "block",
                "reason": "BLOCKED — reason here."
            }))

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

#### OpenCode Hooks (TypeScript)

OpenCode hooks are TypeScript files in `.opencode/hooks/`:

```typescript
// .opencode/hooks/session-start.ts
export default async function onSessionStart() {
  // Lifecycle hook logic — e.g., health checks, memory hydration
}
```

OpenCode hooks are lifecycle-based (session-start, task-complete) rather than tool-interception-based. They fire on agent lifecycle events, not individual tool calls.

## Phase 4: Wire

### MCP Server Registration

If the plugin includes or depends on MCP servers:

#### Codex / Codex — Add to plugin or user config

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "bun",
      "args": ["run", "<path-to-server>"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

#### OpenCode — Add to `opencode.json`

```json
{
  "mcp": {
    "<server-name>": {
      "type": "local",
      "command": ["bun", "run", "<path>"],
      "enabled": true
    }
  }
}
```

### Governance Integration

If the plugin touches sensitive operations (databases, memory, deployments), add governance hooks. At minimum:

1. **PreToolUse guard** — Validate inputs before execution
2. **PostToolUse logger** — Audit trail of what happened
3. **Tool-name filtering** — Only check tools that actually need checking (see hook design note above)

For Allura-governed plugins, ensure:
- `group_id` enforcement on all DB operations (pattern: `^allura-[a-z0-9-]+$`)
- Append-only event tables (no UPDATE/DELETE)
- HITL for semantic memory promotion

## Phase 5: Package

### Installation Methods

#### Codex — Local marketplace

1. Place plugin directory anywhere on disk
2. Register in `~/.Codex/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "<marketplace-name>": {
      "source": "directory",
      "path": "/path/to/plugins/directory"
    }
  },
  "enabledPlugins": {
    "<plugin-name>@<marketplace-name>": true
  }
}
```

3. Plugin is discovered on next session start.

#### Codex CLI

Same as Codex — Codex reads `.codex-plugin/plugin.json` from the same cache structure.

#### OpenCode

Copy agents, commands, skills, and hooks into the project's `.opencode/` directory. Update `opencode.json` if MCP servers are needed. No separate installation step — OpenCode discovers by convention.

### Verification Checklist

After packaging, verify:

- [ ] Each target runtime's manifest is valid JSON with required fields
- [ ] Hook scripts are executable (`chmod +x`)
- [ ] Hook scripts handle malformed STDIN gracefully (don't crash on bad JSON)
- [ ] Skills have `name` and `description` in frontmatter
- [ ] Agents have all required frontmatter fields for their target runtime
- [ ] Commands are invocable as `/command-name`
- [ ] MCP servers start without errors
- [ ] README.md documents installation and usage

### Test Hook Execution

Validate hooks work by piping test payloads:

```bash
# Should pass through (no output):
echo '{"tool_name":"Read","tool_input":{"file_path":"/tmp/test"}}' | python3 hooks/my-hook.py

# Should block (prints JSON):
echo '{"tool_name":"Bash","tool_input":{"command":"dangerous thing"}}' | python3 hooks/my-hook.py
```

## Cross-Runtime Compatibility Notes

| Feature | Codex | Codex CLI | OpenCode |
|---------|------------|-----------|----------|
| Manifest | `.Codex-plugin/plugin.json` | `.codex-plugin/plugin.json` | `opencode.json` + convention |
| Hooks format | Python/Shell via hooks.json | Same | TypeScript lifecycle |
| Hook events | PreToolUse, PostToolUse, UserPromptSubmit | Same | session-start, task-complete |
| Skills | `skills/*/SKILL.md` | Same | `.opencode/skills/*/SKILL.md` |
| Agents | `agents/*.md` (simple frontmatter) | Same | `.opencode/agent/*.md` (extended frontmatter) |
| Commands | `commands/*.md` | Same | `.opencode/command/*.md` |
| MCP config | `mcpServers` in plugin or settings | Same | `mcp` in `opencode.json` |
| Discovery | Marketplace + enabledPlugins | Same | Directory convention |
| Installation | Settings.json registration | Same | Copy to `.opencode/` |

**Porting tips:**
- Codex ↔ Codex: Nearly identical. Copy manifest, add `hooks` field for Codex.
- Either → OpenCode: Convert agent frontmatter (add `mode`, `persona`, `category`, `type`, `status`), move files to `.opencode/` paths, convert Python hooks to TypeScript if needed.
- OpenCode → Either: Simplify agent frontmatter, create `plugin.json`, convert TS hooks to Python.
