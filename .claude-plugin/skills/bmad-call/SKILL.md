---
name: bmad-call
description: >
  Interactive BMAD execution with breakpoints at every role transition.
  Triggered when user says "bmad call", "run plan", "execute with breakpoints",
  "interactive execution", or "step through plan".
---

# BMAD Call — Interactive Execution with Breakpoints

## On Activation

Greet the user and load the current execution state. If resuming, show where we left off. If starting fresh, confirm the plan to execute.

> "Loading your execution plan. Let me check where we are."

## Purpose

Executes a BMAD plan step-by-step with mandatory breakpoints at every role transition. The human stays in the loop at every handoff point, maintaining control over scope, quality, and direction throughout execution.

## Prerequisites

- An approved BMAD plan must exist in Allura Brain (produced by `team-ram:bmad-plan`)
- If no approved plan is found, stop and route to `team-ram:bmad-plan`
- If no intake exists, stop and route to `team-ram:intake`

## Protocol

### Step 1 — Load Execution State

Use `allura-memory-cowork:search-memory` to find:

1. The approved plan (tagged `bmad-plan`, status `approved`)
2. Any existing execution state (tagged `bmad-call-state`)

If execution state exists, resume from the last completed step. Present:

```
--- RESUMING EXECUTION ---
Plan:     <goal>
Progress: <completed>/<total> steps
Current:  Step <N> — <action>
Role:     <current role>
---
Continue? (yes / review plan / abort)
```

If starting fresh, initialize execution state:

```json
{
  "packet_type": "bmad-call-state",
  "plan_ref": "<plan_memory_id>",
  "current_step": 1,
  "completed_steps": [],
  "skipped_steps": [],
  "status": "in_progress",
  "started_at": "<ISO timestamp>",
  "last_updated": "<ISO timestamp>"
}
```

### Step 2 — Execute Current Step

For each step in the plan:

1. **Announce** the step: number, action, role, linked acceptance criteria
2. **Execute** the action appropriate to the role:
   - **PM**: Scope confirmation, stakeholder questions, priority calls
   - **Architect**: Design decisions, interface contracts, ADR creation
   - **Developer**: Code implementation, file changes, tests
   - **QA**: Test execution, acceptance verification, bug reporting
   - **SM**: Gate preparation, status checks, promotion readiness
3. **Report** what was done, what was produced, any issues encountered

### Step 3 — Check for Breakpoint

After completing a step, check if the next step triggers a breakpoint:

**Breakpoint triggers (always stop):**
- Role transition (current step role differs from next step role)
- Steps explicitly marked with `breakpoint: true` in the plan
- Gate/SM steps
- Any step that surfaced an issue or open question during execution

**At a breakpoint, present:**

```
--- BREAKPOINT ---
Completed: Step <N> — <action> (<role>)
Next:      Step <N+1> — <action> (<next_role>)
Transition: <current_role> -> <next_role>

Choose:
  [approve]  — Continue to next step
  [skip]     — Skip next step (with reason)
  [stop]     — Pause execution (resume later)
  [change]   — Modify the remaining plan
  [review]   — Review what was done so far
---
```

**User options:**

| Option | Behavior |
|--------|----------|
| `approve` | Proceed to the next step |
| `skip` | Mark step as skipped with a reason, advance to the one after |
| `stop` | Persist current state to Brain, exit cleanly |
| `change` | User describes changes; regenerate remaining steps (preserves completed work) |
| `review` | Show summary of all completed and skipped steps, then re-present the breakpoint |

### Step 4 — Persist Progress

After each completed or skipped step, update the execution state and persist via `allura-memory-cowork:remember`:

- Update `current_step`, `completed_steps`, `skipped_steps`
- Update `last_updated` timestamp
- **Tags**: `bmad-call-state`, the plan's phase

This ensures crash recovery — if the session ends unexpectedly, the next activation resumes from the last persisted state.

### Step 5 — Handle Plan Changes

If the user chooses `change` at a breakpoint:

1. Show the remaining (unexecuted) steps
2. Let the user describe the desired changes
3. Regenerate only the remaining steps (completed steps are locked)
4. Present the revised plan for approval
5. On approval, store the updated plan as a new version referencing the original
6. Continue execution from the next step in the revised plan

### Step 6 — Completion

When all steps are completed (or remaining steps skipped):

```
--- EXECUTION COMPLETE ---
Plan:      <goal>
Completed: <count> steps
Skipped:   <count> steps
Duration:  <start> to <now>
---
```

If the intake has `gate_required: true`, recommend `team-ram:run-gates` next.

Update the execution state to `status: "completed"` and persist.

## Routing

- On completion with gate required: recommend `team-ram:run-gates`
- On completion without gate: done
- On stop: state is persisted, user can resume with `bmad-call` later

## Invariants

- Breakpoints at role transitions are mandatory and cannot be removed
- Completed steps are immutable — they cannot be re-executed or modified
- Every state change is persisted to Brain before presenting the next breakpoint
- Skipped steps require a reason (no silent skips)
- Plan changes only affect unexecuted steps
