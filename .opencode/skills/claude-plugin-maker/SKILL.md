---
name: claude-plugin-maker
description: >
  Create a Claude Code plugin and make it installable via the plugin marketplace.
  Use when the user wants to make/scaffold a Claude Code plugin, publish a plugin,
  fix a plugin that "won't add" to the marketplace, write a marketplace.json,
  bundle agents/commands/skills/hooks/MCP into a distributable plugin, or run
  `/plugin marketplace add` / `claude plugin install`. Covers the Claude Code
  `.claude-plugin/` layout specifically (not Codex/OpenCode — use plugin-builder for those).
---

# Claude Code Plugin Maker

Turn a directory of agents, commands, skills, hooks, or MCP servers into a Claude Code
plugin that installs cleanly from a marketplace.

## The #1 gotcha (root cause of "won't add")

A plugin manifest (`.claude-plugin/plugin.json`) is **not** addable on its own.
`/plugin marketplace add` looks for **`.claude-plugin/marketplace.json`**. If only
`plugin.json` exists, the add silently bounces. Every plugin you want to distribute
needs a marketplace entry — either its own `marketplace.json` (self-marketplace) or an
entry in an existing marketplace repo.

## The #2 gotcha (commands)

`/plugin ...` is a Claude Code **slash command** — it only runs **inside** the Claude
Code REPL, never in bash. From a shell, use the CLI form:

| Inside Claude Code REPL | From bash |
| --- | --- |
| `/plugin marketplace add <path-or-repo>` | `claude plugin marketplace add <path-or-repo>` |
| `/plugin install <name>@<marketplace>`   | `claude plugin install <name>@<marketplace>` |

## Anatomy of a Claude Code plugin

```
my-plugin/
├── .claude-plugin/
│   ├── plugin.json          # required — the plugin manifest
│   └── marketplace.json     # required to be addable as a marketplace
├── agents/        *.md       # auto-discovered (or list paths in plugin.json "agents")
├── commands/      *.md       # auto-discovered (or "commands")
├── skills/        */SKILL.md # auto-discovered (or "skills")
├── hooks/         hooks.json # referenced by plugin.json "hooks"
└── .mcp.json                 # auto-discovered MCP servers
```

Paths in `plugin.json` are relative to the **plugin root** (the dir that contains
`.claude-plugin/`), NOT to `.claude-plugin/` itself.

## plugin.json — minimal valid manifest

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "One sentence on what it does.",
  "author": { "name": "You" },
  "license": "MIT",
  "repository": "https://github.com/owner/repo.git"
}
```

Recognized optional keys: `homepage`, `keywords`, `commands`, `agents`, `skills`,
`hooks`, `mcpServers`. Components in `agents/`, `commands/`, `skills/`, `hooks/hooks.json`,
and `.mcp.json` are auto-discovered — only add an explicit field when files live
elsewhere.

### Schema gotchas that bite at load time (not add time)
- **`mcp` is not a recognized key.** Use `mcpServers`, or rely on auto-discovery of a
  root `.mcp.json` and drop the field. (`mcp` is silently ignored.)
- **Non-standard component paths** (e.g. pointing `agents` at `./.opencode/agent/...`)
  load only if every listed file exists and is Claude-compatible markdown. Prefer the
  native `agents/`, `commands/`, `skills/` layout.
- **Custom keys** like `interface` are ignored by Claude Code — harmless but not honored.
- Hook commands should use `${CLAUDE_PLUGIN_ROOT}` for portable absolute paths.

## marketplace.json — makes it addable

```json
{
  "name": "my-marketplace",
  "owner": { "name": "You", "url": "https://github.com/owner" },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./",
      "description": "Same one-sentence summary.",
      "version": "0.1.0",
      "category": "Coding"
    }
  ]
}
```

- `source: "./"` means the plugin lives at the repo root (where `.claude-plugin/` is).
- For a marketplace that hosts a plugin in a subdir, use `"source": "./subdir"`.
- For a remote plugin: `"source": { "source": "github", "repo": "owner/repo" }`.
- The `name` in each plugin entry must match the `name` in that plugin's `plugin.json`.

## Workflow

1. **Confirm intent** — plugin name, what it bundles, self-marketplace vs. an existing one.
2. **Scaffold** `.claude-plugin/plugin.json` (start from the minimal manifest above).
3. **Add `marketplace.json`** listing the plugin with `source: "./"`.
4. **Validate** — run the bundled checker:
   ```bash
   python3 "${SKILL_DIR}/validate-plugin.py" <plugin-root>
   ```
   It confirms both JSON files parse, the plugin name matches, and every referenced
   agent/command/skill/hook/MCP path actually exists.
5. **Add the marketplace** (bash): `claude plugin marketplace add <plugin-root>`.
6. **Install**: `claude plugin install <name>@<marketplace-name>`.
7. **Verify**: `claude plugin list` (or `/plugin` in the REPL) shows it with 0 errors.

## Verification checklist
- [ ] `.claude-plugin/plugin.json` parses and has `name`
- [ ] `.claude-plugin/marketplace.json` parses and lists the plugin
- [ ] plugin entry `name` == `plugin.json` `name`
- [ ] every path in `agents`/`commands`/`skills`/`hooks`/`mcp(Servers)` resolves
- [ ] no `mcp` key where `mcpServers` (or auto-discovery) is meant
- [ ] `claude plugin marketplace add` succeeds, then `install` resolves, 0 errors on restart
