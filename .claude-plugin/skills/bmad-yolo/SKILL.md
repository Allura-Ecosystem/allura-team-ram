---
name: bmad-yolo
description: >
  Full autonomy BMAD execution with no breakpoints.
  Triggered when user says "bmad yolo", "run autonomous", "no breakpoints",
  "full send", or "execute autonomously".
---

# BMAD YOLO — Autonomous Execution

## On Activation

Greet the user and confirm autonomous intent. This mode runs the entire plan without stopping for human approval at role transitions.

> "YOLO mode. Let me verify the prerequisites before we go full send."

## Purpose

Executes an approved BMAD plan from start to finish without interactive breakpoints. Governance is still active — this is autonomy within guardrails, not anarchy. The tradeoff: faster execution, less human oversight per step.

## Prerequisites — Safety Checks (all must pass)

Before execution begins, verify every condition. If any fails, stop and explain why.

| Check | Condition | On Failure |
|-------|-----------|------------|
| Intake exists | A captured intake packet exists in Brain | Route to `team-ram:intake` |
| Plan approved | An approved BMAD plan exists in Brain | Route to `team-ram:bmad-plan` |
| No open questions | Intake has zero unresolved open questions | Surface questions, block until resolved |
| Plan is current | Plan references the latest intake version | Route to `team-ram:bmad-plan` to regenerate |
| User confirms | User explicitly confirms autonomous execution | Do not proceed on ambiguity |

Present the safety check results:

```
--- YOLO PRE-FLIGHT ---
[PASS] Intake captured (Brain ID: <id>)
[PASS] Plan approved (<N> steps)
[PASS] No open questions
[PASS] Plan references current intake
[WAIT] User confirmation required
---
Confirm autonomous execution? This will run all <N> steps without stopping.
(confirm / switch to bmad-call)
```

## Protocol

### Step 1 — Load Plan and Initialize

Use `allura-memory-cowork:search-memory` to load the approved plan. Initialize execution state:

```json
{
  "packet_type": "bmad-yolo-state",
  "plan_ref": "<plan_memory_id>",
  "mode": "yolo",
  "current_step": 1,
  "completed_steps": [],
  "failed_steps": [],
  "status": "in_progress",
  "started_at": "<ISO timestamp>"
}
```

### Step 2 — Execute All Steps Sequentially

Run each step in order without pausing for approval:

1. **Announce** the step briefly (one line)
2. **Execute** the action for the assigned role
3. **Validate** the output against the linked acceptance criteria
4. **Record** the result (pass/fail/partial)
5. **Advance** to the next step

**Progress indicator** (update as execution proceeds):

```
[1/8] PM: Confirm scope .............. DONE
[2/8] Architect: Design contract ..... DONE
[3/8] Developer: Implement core ...... DONE
[4/8] Developer: Add error handling .. IN PROGRESS
```

### Step 3 — Gate Failure Stops Execution

Despite no breakpoints, execution stops immediately on:

| Condition | Behavior |
|-----------|----------|
| **Gate failure** | SM step fails validation — stop, report, recommend `team-ram:run-gates` |
| **Unresolvable blocker** | A step cannot proceed due to missing dependency or unresolved question — stop, report |
| **Acceptance criteria failure** | A step's output does not satisfy its linked AC — stop, report |
| **Critical error** | Any error that would compromise the integrity of the work — stop, report |

On any stop:

```
--- YOLO STOPPED ---
Failed at: Step <N> — <action>
Reason:    <failure reason>
Completed: <N-1>/<total> steps
---
Options:
  [fix]    — Address the issue and resume
  [switch] — Switch to bmad-call for remaining steps
  [abort]  — Stop execution entirely
```

### Step 4 — Persist State

Persist execution state to Brain via `allura-memory-cowork:remember` at two points:

1. **Periodically** — after every 3 completed steps (batch persistence for efficiency)
2. **On stop** — immediately when execution halts for any reason

This balances persistence overhead with crash recovery.

### Step 5 — Completion

When all steps complete successfully:

```
--- YOLO COMPLETE ---
Plan:      <goal>
Steps:     <total> completed, 0 failed
Duration:  <elapsed>
---
```

Persist final state with `status: "completed"`.

If `gate_required: true` on the intake, automatically recommend `team-ram:run-gates`.

## Output Summary

Produce a concise execution report:

```
--- EXECUTION REPORT ---
Mode:      YOLO (autonomous)
Goal:      <goal>
Steps:     <completed>/<total>
Failed:    <count>
Skipped:   <count>
Duration:  <elapsed>
Gate:      <required/not required>
Brain ID:  <state_memory_id>
---
```

## Routing

- On completion with gate: recommend `team-ram:run-gates`
- On completion without gate: done
- On failure: user chooses fix, switch to `team-ram:bmad-call`, or abort

## Invariants

- All five safety checks must pass before execution begins
- Gate failures always stop execution — no override
- Acceptance criteria failures always stop execution — no silent passes
- State is persisted on every stop and periodically during execution
- YOLO does not mean ungoverned — intake, plan approval, and gates are still enforced
