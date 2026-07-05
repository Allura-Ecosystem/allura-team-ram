# ADR-001 — Kernel-Witnessed Outcomes for MODEL_EVAL

> [!NOTE]
> **AI-Assisted Documentation** — drafted with AI assistance, reviewed against source.
> When in doubt, defer to the code and team consensus.

| Field | Value |
| ----- | ----- |
| **Status** | **Proposed** — awaits owner sign-off (cross-repo failure semantics; see §Decides-alone gate) |
| **Date** | 2026-07-04 |
| **Owner** | Sabir (sign-off) · Brooks (author) |
| **Related** | `tooling/model-eval/README.md`, `.opencode/hooks/task-complete.ts`, allura-memory `docs/allura-hosted/DESIGN-AUDIT.md` (§MODEL_EVAL Bridge) |

## Context

MODEL_EVAL v1 (shipped this session, commit `5e38fa4`) logs a per-task `TASK_COMPLETE` event carrying `{model, outcome, task_class, latency_ms}` with an explicit outcome enum `success | failure | timeout | fallback_success`. The `outcome` is currently derived from the **executor's own report** of the invocation envelope (`src/agent-executor.ts`: `outcome = (parsed.success ?? true) ? "success" : "failure"`).

This is the objectivity gap Bellard named in the 2026-07-04 party review: **the model grades its own homework.** A model that returns a confident-but-wrong envelope is recorded as `success`. MODEL_EVAL's entire value — judging model swaps by data — is undermined if the data is self-reported.

The allura-memory RuVix kernel already has the fix substrate: **SYSCALL 5 `trace`** runs the proof/policy/tenant gate and the canonical event is append-only and hash-chained. A kernel-witnessed trace is an *observed* outcome, not a *claimed* one.

**Verified state (do not skip):** a grep for `trace_id` / `syscall_trace` / `kernel` in `allura-team-ram/src/` returns nothing. The bridge is **greenfield** — there is zero existing wiring. This ADR frames the decision; it does not describe an implementation.

## Decision (recommended)

Adopt **Option B — report-time reconciliation** as the target, with **Option A** as an explicit non-goal for v1.

MODEL_EVAL keeps writing its `TASK_COMPLETE` event at task end (unchanged). Separately, when a task's work flows through the allura-memory kernel, that path already emits a hash-chained trace with a `trace_id` (`^audit-<group_id>-trace-…`). A **reconciliation query** (extending `report.sql`) joins MODEL_EVAL events to kernel traces on a shared correlation key and, where a witnessed trace exists, **prefers the witnessed outcome over the self-reported one** — flagging any disagreement as a data-quality signal.

Rationale: report-time reconciliation is **non-invasive** (no change to the hot path, no cross-repo synchronous call, no new failure mode on the request path) and **honest about coverage** (tasks with no kernel trace simply fall back to self-report, visibly). It treats the kernel trace as the higher-authority source *when present* without making MODEL_EVAL depend on it.

## Options considered

| Option | Shape | Verdict |
| ------ | ----- | ------- |
| **A — write-time synchronous** | The executor calls the kernel `trace` syscall inline and blocks on the witnessed outcome before logging `TASK_COMPLETE`. | **Rejected for v1.** Puts a cross-repo/cross-runtime call on the request hot path — a new latency and failure mode. Violates the audit design's own rule ("audit writes must not block the request path beyond bounded latency"). |
| **B — report-time reconciliation** *(recommended)* | Both sides log independently; a batch query joins them and prefers the witnessed outcome. | **Recommended.** Non-invasive, coverage-honest, reuses `report.sql`. The disagreement count becomes a free data-quality metric. |
| **C — do nothing** | Keep self-reported outcomes. | **Rejected.** Leaves the objectivity gap Bellard flagged; MODEL_EVAL conclusions stay vibes-adjacent. |

## The correlation key (open question — owner input needed)

Option B needs a shared key linking a MODEL_EVAL task to its kernel trace. Candidates, none yet decided:

1. **`session_id` + timestamp window** — cheap, approximate, risks mismatches under concurrency.
2. **Explicit `task_id` propagated** into the kernel trace's metadata — precise, but requires the harness to thread a task id into whatever kernel-touching work the task does (a small, non-hot-path change).
3. **`group_id` + agent + task_class bucket** — coarse; good for aggregate reconciliation, useless per-task.

Recommendation leans to (2) for precision, (1) as a fallback for tasks that don't touch the kernel. **This is a design choice the owner should confirm** — it determines how much harness plumbing the bridge costs.

## Consequences / tradeoffs

- **Gain:** MODEL_EVAL's `outcome` becomes trustworthy for the subset of tasks that touch the governed kernel path; disagreement between self-report and witness becomes a monitored signal.
- **Give up:** full coverage — tasks that never call the kernel keep self-reported outcomes (visibly flagged, not silently). That is acceptable: partial objective coverage beats none, and it degrades honestly.
- **No new hot-path risk** (the whole point of choosing B over A).

## Decides-alone gate (why this is Proposed, not Decided)

The repo's `AI-GUIDELINES.md` reserves **failure semantics** and **cross-repo/breaking changes** for human decision. This bridge is both cross-repo (allura-team-ram ↔ allura-memory) and about outcome-truth semantics. Brooks recommends Option B + correlation-key (2); **Sabir signs off before any implementation.** Until then this is a documented proposal, and MODEL_EVAL v1 continues on self-reported outcomes.

## Follow-up if accepted

1. Confirm correlation key.
2. Extend `report.sql` with the reconciliation join + a `witnessed_vs_reported_disagreement` column.
3. If key (2): thread `task_id` into kernel-touching harness calls (non-hot-path).
4. Re-run the stratified report; verify witnessed outcomes flow and disagreements surface.
