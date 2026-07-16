---
description: "Auto-mode — bounded autonomous execution governed by Allura Brain. Loopy finds/crafts the loop, ultra executes it, debrief writes outcome to Brain. Single front door for /auto. --epic flag extends to full sprint via bmad-sprint-loop."
---

# Auto-Mode Skill

Auto-mode is the **single front door** for bounded autonomous execution in the
Team RAM harness. It unifies three existing surfaces — `ultra` (single-task
bounded loop), `run-night` (autonomous session), and `bmad-sprint-loop` (full
epic) — under one Brain-governed contract.

## Layering (Non-Negotiable)

```
loopy (META)         → finds or crafts the right loop
  ↓ hands off a bounded loop
ultra / ralph        → executes the loop, returns evidence
  ↓ writes outcome
Allura Brain         → canonical memory (group_id="allura-system")
```

Auto-mode is the **orchestrator**, not a second execution engine. It never
executes loops itself — it delegates to loopy for curation and ultra/ralph for
execution.

## The Contract — 6-Step Feedback Cycle

Every auto-mode run follows this cycle. No step is optional.

1. **Observe** — Scout hydrates local context + `allura-brain_memory_search`
   with `group_id: "allura-system"` for prior blockers, decisions, and patterns
   relevant to the task.
2. **Choose** — Brooks routes to the specialist via complexity-based selection
   (SIMPLE → single pass, MULTI → ultra loop, EPIC → bmad-sprint-loop). The
   `--epic` flag forces EPIC routing.
3. **Act** — Woz or the routed specialist executes **one bounded slice** — the
   smallest reversible change that moves toward the goal.
4. **Verify** — Run an **explicit validation command** (tests, typecheck, lint,
   or a task-specific check). "Lightest meaningful checks" is not acceptable
   (per the ultra.md repair ADR). If no validation command is known, ask the
   user before proceeding.
5. **Record** — `allura-brain_memory_add` writes an outcome trace with
   `group_id: "allura-system"`, `user_id: "auto-mode"`, `agent_id: "auto-mode"`.
6. **Repeat or Stop** — Continue only while progress is measurable and the
   iteration budget remains. Otherwise enter a named terminal state.

## Terminal States

Every run ends in exactly one of these. **Never report an error or exhausted
budget as success.**

| State | Meaning |
|-------|---------|
| **success** | Goal achieved, validation passed |
| **clean no-op** | Inspected state, nothing needed, no change made |
| **blocked** | Hard blocker — no agent, no fallback, missing dependency |
| **approval-required** | Next action is destructive/production and needs HITL |
| **exhausted** | Iteration budget consumed without convergence |
| **stagnated** | No measurable progress across N iterations |

## Hard Stops (Auto-Mode Halts Immediately)

1. **Max iterations exceeded** — default 10 (single-task) or 5 stories (epic)
2. **RuVix / governance violation** — any policy gate failure
3. **Missing authority** — action requires permissions the agent does not have
4. **Destructive action without approval** — file deletion, schema migration,
   `.env` changes, dependency changes, force push, governance/hook/agent edits

## HITL Boundary (Non-Negotiable)

Auto-mode **writes traces only**. It does not:
- Promote memories to semantic store (POL-004 — HITL curator only)
- Approve destructive, production, or external-message actions
- Commit without explicit user approval (unless user has enabled auto-approval)
- Bypass governance gates

Auto-mode is bounded autonomy: it never stops without proof, escalation, or a
governance blocker — but it never crosses a HITL gate without a human.

## --epic Flag

When `$ARGUMENTS` starts with `--epic`, auto-mode delegates to
`bmad-sprint-loop` for full epic execution (multiple stories until DoD) instead
of single-task `ultra`. The same 6-step contract applies at the epic scale:
each story is one Observe→Choose→Act→Verify→Record cycle, and the epic ends in
a terminal state.

## Brain Protocol

**Before (Observe):**
```
allura-brain_memory_search({
  query: "<task> blockers decisions patterns",
  group_id: "allura-system",
  limit: 10
})
```

**After (Record):**
```
allura-brain_memory_add({
  group_id: "allura-system",
  user_id: "auto-mode",
  content: "AUTO_MODE_OUTCOME: <task>. Terminal state: <state>. Strategy: <simple|multi|epic>. Evidence: <validation result>",
  metadata: { agent_id: "auto-mode", source: "conversation" }
})
```

## Validation Requirement

Every auto-mode run must run an **explicit validation command** before
declaring success. Acceptable forms:
- `bun test && bun run typecheck && bun run lint`
- A task-specific check (e.g., `curl localhost:7654/health`)
- A user-supplied acceptance command

If no validation command is known, **ask the user**. Do not proceed on
assumption. This is the lesson from the ultra.md repair: "lightest meaningful
checks" was a material weakness that produced false-success reports.

## Graceful Degradation

If Allura Brain is unavailable, auto-mode continues with local context only
and logs to console. It does not pretend hydration happened. Every Brain call
is wrapped in a try/catch that reports degradation, not silence.