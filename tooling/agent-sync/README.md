# Agent sync

Keep Team RAM role instructions consistent across OpenCode, Claude Code, and Codex.

Author the role body in `.opencode/agent/core/<name>.md`. The generator copies that body into runtime adapters and plugin agent files, applying the runtime-specific format and model setting. Generated files carry a source banner and should not be edited by hand.

## Use from the repository root

```bash
# Read-only preview of files that would change
node tooling/agent-sync/sync-agents.mjs

# Read-only drift check; exits nonzero on differences
node tooling/agent-sync/sync-agents.mjs --check

# Regenerate mirrors and align source model frontmatter
node tooling/agent-sync/sync-agents.mjs --apply
```

The default command is a dry run. Only `--apply` writes files. Review the source and model map before applying, then inspect the diff and run the check.

## Source and generated paths

| Path | Role |
|---|---|
| `.opencode/agent/core/<name>.md` | Canonical body and OpenCode frontmatter |
| `tooling/agent-sync/models.map.json` | Agent tiers and per-runtime model policy |
| `.claude/agents/<name>.md` | Generated Claude adapter |
| `.codex/agents/<name>.toml` | Generated Codex adapter |
| `agents/<name>.md` | Generated portable plugin agent |
| `.claude-plugin/agents/<name>.md` | Generated Claude plugin agent |

The script reads only source agents listed in the model map. The public export contract separately controls which roles ship in a package.

## Model inheritance

All current tiers inherit the host's configured model: Claude uses `inherit`, OpenCode omits a model field, and the Codex adapter records inheritance in a comment. A Codex adapter does not select the session model.

Tiers describe responsibility; they do not establish a fixed model name or prove capability. If an explicit override is needed, verify that the target runtime supports it, change the map deliberately, then regenerate. The generator also removes source `fallback_model` fields because provider fallback belongs to host configuration.

The standalone direct API executor has a separate contract: it requires a concrete supported `TEAM_RAM_ANTHROPIC_MODEL` and offers text generation without workspace tools. CLI aliases such as `inherit` cannot stand in for a direct API model identifier.

## Validation limits

A clean drift check establishes that these files match the generator's output. It does not verify model availability, agent execution, tool access, or behavior in a live runtime. Those claims require runtime evidence.
