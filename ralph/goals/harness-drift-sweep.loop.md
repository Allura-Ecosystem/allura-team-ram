# Harness Drift Sweep

You are operating in a bounded loop execution context.

## Task

Read `.opencode/team-ram-presets.jsonc` and run `scripts/lint-agents.sh --ci`.
If drift is detected, pick the single most-drifted agent surface, reconcile it
to the preset, and re-run `scripts/lint-agents.sh --ci`. Stop when drift count
is zero or a pass makes no changes.

## Scope

- Only write to files inside `.opencode/` or `.claude/`
- Do not modify agent personas in `.claude/agent/core/`
- Do not change Allura Brain MCP or governance policies
- Ask before any destructive or irreversible action

## Success criteria

- `scripts/lint-agents.sh --ci` exits 0 (no drift), OR
- A pass produces no file changes (no progress), OR
- A hard blocker is reached

## Verification

```bash
bash scripts/lint-agents.sh --ci
```

Exit 0 = success. Exit 1 = drift remaining.

## Completion marker

End with: <promise>DONE</promise>