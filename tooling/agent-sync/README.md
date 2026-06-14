# agent-sync — one persona, three runtimes (Codex · OpenCode · Claude)

**Problem this fixes:** Brooks (and every Team RAM agent) existed as two hand-edited files —
`.opencode/agent/core/<name>.md` (Codex) and `.claude/agents/<name>.md` (Claude). They were
*supposed* to differ only by model, but hand-editing two surfaces let them drift (four Brooks
copies, contradictory model fields). Two edit surfaces always drift — Allura already ruled this
out for Notion/GitHub ("prevents two parallel edit surfaces").

**The rule:**

- **Author once** in `.opencode/agent/core/<name>.md` — the source of truth (body + persona + protocols).
- The **only** per-runtime difference is the **model**, declared in `models.map.json` by tier.
- `.claude/agents/<name>.md` is a **generated mirror**. Never hand-edit it (it carries a DO-NOT-EDIT banner).
- Run the generator after editing any source agent. CI runs `--check` and fails on drift.

## Usage

```bash
# refresh mirrors + align source models to the map
node tooling/agent-sync/sync-agents.mjs

# CI / pre-commit: fail if anything is out of sync
node tooling/agent-sync/sync-agents.mjs --check
```

## How models are decided

`models.map.json` maps each agent to a **tier**, and each tier to a per-runtime model:

| Tier | Codex (`.codex/*.toml`) | OpenCode (`.opencode/*.md`) | Claude (`.claude/*.md`) |
| --- | --- | --- | --- |
| ultrabrain | `gpt-5.5` * | `openai/gpt-5.5` | `opus` |
| standard | `gpt-5` * | `ollama-cloud/minimax-m3` | `sonnet` |
| cheap | `gpt-5` * | `ollama-cloud/minimax-m3` | `haiku` |

Change a model in one place (the map), regenerate, done. Brooks = `ultrabrain`.

**Three surfaces, three formats:** Codex = TOML (`developer_instructions` = body), OpenCode &
Claude = Markdown. The body is identical across all three; only model + format differ.

**\* Codex model binding is different:** the model is NOT stored in the `.codex/*.toml` agent
file — it lives in `.codex/config.toml` (profiles) / per-thread. The generator writes it only as
a reference comment. Confirm the exact Codex model ids (`gpt-5.x` / `gpt-5.x-codex` family) with
`codex`'s model list — `gpt-5.5`/`gpt-5` above are placeholders.

## Precedent

Pattern validated against `MichelKerkmeester/Opencode_Dev_Environment` (`.opencode` source →
`.claude`/`.codex` mirrors), `wshobson/agents` ("never hand-edit generated files; CI fails on
drift"), and `madebywild/agent-harness` (single source + per-runtime overrides).

## Verify before trusting model ids (needs shell)

- `opencode models openai` → confirm `gpt-5.5` exists
- confirm an `ollama-cloud` provider block is defined (root `opencode.jsonc` references it but
  doesn't define it — if undefined, those models won't resolve)
- confirm `opus`/`sonnet`/`haiku` aliases resolve in the `.claude` runtime

## TODO (needs shell — bash sandbox was down at authoring time)

1. `node sync-agents.mjs` to regenerate all `.claude` mirrors from `.opencode` source.
2. Delete the stale forks (`allura-memory/.opencode` + `.claude` brooks copies, worktree copies)
   so `.opencode/agent/core/` in this harness is the only source.
3. Wire `--check` into CI / a pre-commit hook.
