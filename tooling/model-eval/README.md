# MODEL_EVAL v1 — model-performance telemetry

> Team-reviewed design (party mode, 2026-07-04): Woz found the plumbing gap,
> Knuth shaped the event, Pike cut the scope, Bellard set the metrology rules.
> ADR and synthesis are in Allura Brain (`group_id: allura-system`).

## What it is

Every task served through the HTTP service (`POST /invoke`) now logs a
`TASK_COMPLETE` event carrying `{model, outcome, task_class, latency_ms,
tokens_in, tokens_out}` with `schema_version: 1`. The model ID is resolved
from `tooling/agent-sync/models.map.json` (tier → concrete Anthropic ID) —
the executor no longer hand-maintains per-agent model strings.

## What it is NOT (deliberate cuts, per Pike)

- **No bandit routing.** `models.map.json` routes; humans decide. Bandits need
  volume we do not have, and exploration gambles production work on the
  suspected-worse model.
- **No golden-suite eval runner yet** (v2). The `modelOverride` parameter on
  `spawnAgentProcess()` exists so v2 can replay tasks against candidate models.
- **No per-class objective graders yet** (v2). `outcome` currently reflects the
  invocation result envelope; grading sophistication grows where data shows
  it's needed.

## Reading the report

Run `report.sql` monthly through the Brain's governed read surface
(`MCP_DOCKER` SQL tools — never `docker exec`). Rules:

1. **Compare only within a `task_class` row group.** Cross-class aggregates
   measure routing, not models.
2. **A model "beats" another only when their Wilson intervals do not overlap**
   and both cells say `verdict = ok` (n ≥ 50). Otherwise the honest answer is
   "not enough data".
3. **`fallback_rescues` rising** means the primary model or its availability is
   degrading — investigate before it shows up in quality.
4. **Latency p95 here includes queue time.** For decode-only latency (Bellard's
   preferred metric), v2 will split `load_duration` / `eval_duration` when the
   opencode runtime's ollama telemetry is wired in.

## Design decisions

- [ADR-001 — Kernel-Witnessed Outcomes](ADR-001-kernel-witnessed-outcomes.md) (Proposed): make MODEL_EVAL outcomes objective via kernel-witnessed traces instead of executor self-report.

## Promotion path

Data petitions; it never decides. A model change is an ARCHITECTURE_DECISION:
curator-approved, applied as one edit to `tooling/agent-sync/models.map.json`,
propagated by `sync-agents.mjs --apply`, and verified by `--check`.
