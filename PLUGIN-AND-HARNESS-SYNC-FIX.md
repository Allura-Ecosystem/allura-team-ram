# Plugin + Harness Sync Fix — Runbook

_Diagnosis date: 2026-06-14. Author: Brooks (architect). Status: diagnosis complete; remediation pending UI + shell access._

## TL;DR

Two unrelated problems were bundled as "plugins not working + harness not syncing":

1. **Plugins fail to load** = marketplace **name drift**. The Cowork plugin manager pins plugins to marketplace IDs that don't exist. The global CLI config is clean; the bad pins live in the **Cowork desktop app's own plugin store** (not a JSON on disk that the agent can edit).
2. **Harness doesn't sync cross-project** = no propagation mechanism. Agents are hand-copied into `.claude/`, `.opencode/`, and again into each project. Nothing keeps them in sync, so they drift.

---

## 1. Plugin fix (do in the Cowork plugin manager UI)

The global registry (`~/.claude/plugins/known_marketplaces.json`) has exactly these real marketplaces:

| Marketplace key | Source |
| --- | --- |
| `claude-plugins-official` | github:anthropics/claude-plugins-official |
| `harness-marketplace` | github:revfactory/harness |
| `superpowers-dev` | github:obra/superpowers |
| `team-durham-local` | github:Charitablebusinessronin/team_durham |
| `allura-local` | git:Charitablebusinessronin/Allura_Memory.git |

`allura-local` already publishes: `allura`, `allura-cowork`, `allura-governance`, `allura-memory-cowork`, `allura-scout`, `superpowers`, **`team-ram`**.

### Repoint map

| Broken pin | Correct pin | Action |
| --- | --- | --- |
| `superpowers@superpowers-marketplace` | `superpowers@superpowers-dev` | repoint |
| `allura-cowork@allura-cowork` | `allura-cowork@allura-local` | repoint |
| `allura-governance@allura-governance` | `allura-governance@allura-local` | repoint |
| `team-ram@team-ram` | `team-ram@allura-local` | repoint + re-enable (currently disabled) |
| `team-durham@team-durham` | `team-durham@team-durham-local` | repoint |
| `allura-brain@allura-brain` | — | **DELETE** — `allura-brain` is an HTTP MCP server (`localhost:5888`), not a plugin |
| `team-ram-coding@team-ram-coding` | — | no published plugin; leave disabled or add to `allura-local` |
| `a2a-bridge@a2a-bridge` | — | **REMOVE** — source path is dead (see below) |

Then **restart the session**. Errors should drop to zero (or just `team-ram-coding`).

> Note: do NOT "fix" this by creating alias-marketplaces named `team-ram`, `allura-cowork`, etc. to match the bad pins. That cements the drift. Correct the pins.

### a2a-bridge (confirmed dead)

Registry entry points at:
`/media/ronin704/Games/linux-home/.nvm/versions/node/v24.14.0/lib/node_modules/a2a-bridge`
— this path no longer exists (node moved off `v24.14.0`). Remove `a2a-bridge` from the Cowork plugin manager. To also remove the stale registry entry, hand-edit `~/.claude/plugins/known_marketplaces.json` and delete the `"a2a-bridge": { ... }` block (the agent can't — it's a protected path).

---

## 2. Harness sync fix (needs shell)

### Why there are two dirs (this is intentional)

`brooks.md` frontmatter is `platform: Both`. Claude Code reads `.claude/agent/`; OpenCode reads `.opencode/agent/`. Both copies are required for dual-runtime support. The 11 core agents are byte-duplicated across:

- `Agent-Harnesses/Allura-TeamRam/.claude/agent/core/*.md`
- `Agent-Harnesses/Allura-TeamRam/.opencode/agent/core/*.md`

The problem is they're maintained by hand and drift. `install.sh` does NOT fix this — it's the third-party OpenAgentsControl installer (`darrenhinde/OpenAgentsControl`) that pulls `.opencode/` content from a *remote* registry. Don't use it as a sync tool.

### Recommended: single source of truth + symlink

Pick `.claude/agent/core/` as canonical (the one confirmed authoritative). Make `.opencode` mirror it so edits can't diverge:

```bash
cd "Agent-Harnesses/Allura-TeamRam/.opencode/agent"
# back up first
mv core core.bak-$(date +%Y%m%d)
# point opencode at the canonical claude copy
ln -s ../../.claude/agent/core core
# verify
ls -l core && diff -r core/ core.bak-*/   # expect no differences
# if clean, remove the backup
rm -rf core.bak-*
```

If symlinks are undesirable in the submodule, replace the symlink step with a committed sync script run in CI / pre-commit:

```bash
rsync -a --delete "Agent-Harnesses/Allura-TeamRam/.claude/agent/core/" \
                  "Agent-Harnesses/Allura-TeamRam/.opencode/agent/core/"
```

---

## 3. De-fork mortgage-audit (Path A)

`allura module/mortgage-audit/.opencode/agent/brooks.md` is a full FORK of the harness agent with project-specific values:

| Field | Harness canonical | Mortgage fork |
| --- | --- | --- |
| `model` | `openai/gpt-5.5` | `ollama-cloud/deepseek-v4-pro` |
| `group_id` (memory) | `allura-system` | `allura-mortgage` |
| skills | harness defaults | mortgage skills (mortgate-orchestrator, carlos-guidelines, sf-deploy, sf-data-model) |

Maintaining a whole forked agent set per project is the drift source. Path A: the project consumes `team-ram@allura-local` and keeps only a **thin override** of the few fields that actually differ, instead of copying all 11 agents.

Override-only file (project keeps just the deltas; everything else inherits from the plugin):

```yaml
---
name: brooks
extends: team-ram/core/brooks   # inherit harness canonical
model: ollama-cloud/deepseek-v4-pro
memory:
  group_id: allura-mortgage
  user_id: brooks-architect-mortgage
skills:
  - mortgate-orchestrator
  - carlos-guidelines
  - sf-deploy
  - sf-data-model
---
# Mortgage-specific addenda only. Persona, protocols, invariants inherit from the harness.
```

> Confirm the override/`extends` mechanism your runtime supports before deleting the forked copies. If `extends` isn't supported, keep a generated copy produced by the sync script in section 2, not a hand-edited fork.

---

## Status checklist

- [ ] P0 — repoint 5 pins, delete `allura-brain`, remove `a2a-bridge` in Cowork plugin manager, restart
- [ ] P1 — symlink/sync `.claude/agent/core` ↔ `.opencode/agent/core` (needs shell)
- [ ] P2 — replace mortgage-audit forked agents with thin overrides (confirm `extends` support first)
- [ ] Verify — 0 plugin errors on restart; harness edits propagate to both runtimes; mortgage inherits harness persona
