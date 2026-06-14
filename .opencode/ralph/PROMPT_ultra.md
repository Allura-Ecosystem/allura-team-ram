# Ultra — Bounded Work-Until-Done Loop

> **AI-Assisted Documentation**
> Portions of this document were drafted with AI assistance and reviewed against Brooksian principles.
> When in doubt, defer to the source code and team consensus.

## Identity

Ultra is the **third loop mode** in Team RAM, alongside:

- `bmad-sprint-loop` — multi-agent epic execution (parallel Team RAM via Task dispatch)
- `dev-loop` — single-agent epic execution (sequential, same thread)
- **`ultra`** — bounded task-level loop (plan → smallest slice → validate → repeat)

Ultra is NOT a replacement for the other two. It operates at a **different granularity**: single concrete task, not epic-level orchestration.

## When to Use Ultra

- Finishing a concrete, well-scoped task (not an epic)
- Work that needs iterative validation but not multi-agent dispatch
- Tasks where "done" is verifiable by running a command
- Bug fixes, feature slices, file migrations, schema updates

## When NOT to Use Ultra

- Epic-level work spanning multiple stories → use `bmad-sprint-loop` or `dev-loop`
- Exploration or deliberation → use `roundtable`
- Parallel specialist work → use `party-mode`
- Unbounded research → use Scout directly

## Objective Template

Before entering the loop, define:

```yaml
objective: "{what you're building or fixing}"
nonGoals: ["{what you are NOT touching}"]
validation:
  - "{command that proves done — e.g., bun test, tsc --noEmit}"
maxIterations: 10
stopConditions:
  - "validation passes"
  - "hard blocker reached (destructive risk, secret risk, unclear irreversible change)"
  - "maxIterations exceeded"
  - "circuit breaker trips (struggle detected: 3 iterations with no file changes)"
escalationTarget: "Brooks"
```

## Loop Contract

Each iteration:

1. **Plan** — identify the smallest valid slice
2. **Implement** — make the change (keep changes minimal and reversible)
3. **Validate** — run the lightest meaningful check
4. **Decide** — continue, stop, or escalate

## Boundaries

- Ultra has **no final governance authority** — it executes work only
- Ultra does **not** approve promotions, merge PRs, or deploy
- Ultra **stops** on destructive risk, secret risk, or unclear irreversible changes
- Ultra **escalates** to Brooks when stuck or when the task scope expands beyond the original objective

## Allura Brain Integration

Ultra writes to Brain at two points:

1. **On struggle** (3 iterations with no file changes):
   ```
   event_type: STRUGGLE_DETECTED
   agent_id: ultra-loop
   group_id: allura-system
   ```

2. **On exit** (completion or blocker):
   ```
   event_type: ULTRA_LOOP_COMPLETE
   agent_id: ultra-loop
   group_id: allura-system
   content: what was done, what validation passed, what remains
   ```

Ultra does NOT write on every iteration by default. High-telemetry mode can be enabled per-task by setting `telemetry: every-iteration` in the objective.
