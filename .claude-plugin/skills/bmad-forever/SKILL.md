---
name: bmad-forever
description: >
  Continuous cross-session BMAD execution with automatic resume.
  Triggered when user says "bmad forever", "continuous execution", "cross-session",
  "auto-resume", or "forever mode".
---

# BMAD Forever — Continuous Cross-Session Execution

## On Activation

Check Brain for an existing `forever_state`. If found, resume automatically. If not, confirm the plan to begin continuous execution.

> "Checking for active forever state..."

If resuming:
> "Found active execution. Resuming from Step <N> (<role>: <action>)."

If starting fresh:
> "No active forever state. Which approved plan should I run in continuous mode?"

## Purpose

Enables BMAD execution that spans multiple sessions. State is persisted in Allura Brain as `forever_state`, allowing automatic resume when a new session starts. Combines the autonomy of YOLO with mandatory stops at governance-critical points.

## Prerequisites

- An approved BMAD plan in Brain (from `team-ram:bmad-plan`)
- A completed intake in Brain (from `team-ram:intake`)
- No unresolved open questions on the intake

## Protocol

### Step 1 — Load or Initialize Forever State

Use `allura-memory-cowork:search-memory` to find an existing `forever_state` for the current project:

- Search tags: `forever-state`, project group_id
- If found and `status: "in_progress"`, resume from `current_step`
- If found and `status: "stopped"`, present the stop reason and ask whether to resume
- If not found, initialize:

```json
{
  "packet_type": "forever_state",
  "plan_ref": "<plan_memory_id>",
  "intake_ref": "<intake_memory_id>",
  "mode": "forever",
  "current_step": 1,
  "current_phase": "<phase from intake>",
  "completed_steps": [],
  "skipped_steps": [],
  "stop_reasons": [],
  "status": "in_progress",
  "sessions": ["<current_session_id>"],
  "started_at": "<ISO timestamp>",
  "last_updated": "<ISO timestamp>"
}
```

### Step 2 — Execute with Mandatory Stops

Run steps autonomously (like YOLO) but always stop for these conditions:

| Mandatory Stop | Why |
|----------------|-----|
| **First intake of a new phase** | Phase transitions need human confirmation of scope |
| **Gate failure** | Governance gates cannot be auto-bypassed |
| **Open questions surfaced** | Questions that emerge during execution block progress |
| **ADR decisions** | Architectural decisions require human sign-off |
| **Plan approval** | If the plan needs regeneration, human must approve |
| **SM role steps** | Scrum Master steps always require visibility |

Everything else runs without stopping.

**At a mandatory stop:**

```
--- FOREVER: MANDATORY STOP ---
Completed: Steps 1-<N> (<N> total)
Stopped at: Step <N+1> — <action>
Reason:    <stop reason>

This state is persisted. You can:
  [resolve] — Address the stop condition and continue
  [review]  — See full progress so far
  [switch]  — Switch to bmad-call for remaining steps
  [pause]   — End session, resume next time
---
```

### Step 3 — Persist After Every Step

Unlike YOLO (which batches), forever mode persists after every single step. This is the cross-session guarantee — if the session ends at any point, no work is lost.

Use `allura-memory-cowork:remember` to update the `forever_state`:

- Update `current_step`, `completed_steps`, `last_updated`
- Append the current session ID to `sessions` if not already present
- On stop: add the reason to `stop_reasons`, set `status: "stopped"`

### Step 4 — Session Boundary Handling

**When a session ends (gracefully or crash):**
- The forever_state in Brain reflects the last completed step
- No manual intervention needed

**When a new session starts:**
- On activation, the skill searches for `forever_state`
- If found with `status: "in_progress"`, automatically resume
- If found with `status: "stopped"`, present the stop reason
- The user does not need to remember where they left off

**Session tracking:**
- Each session ID is appended to the `sessions` array
- This provides a complete audit trail of which sessions contributed to execution

### Step 5 — Phase Transitions

When the current plan is fully executed and the intake spans multiple phases:

1. Mark the current phase as complete in the forever_state
2. **Mandatory stop**: present phase completion summary
3. Ask the user to create a new intake for the next phase (route to `team-ram:intake`)
4. Once new intake and plan are approved, update the forever_state with new references
5. Continue execution

```
--- PHASE COMPLETE ---
Phase:     <completed phase>
Steps:     <count> completed
Sessions:  <count> sessions
---
Next phase requires a new intake.
Run `intake` to capture the next work packet.
```

### Step 6 — Final Completion

When all steps across all phases are done:

```
--- FOREVER: COMPLETE ---
Goal:      <goal>
Phases:    <count> completed
Steps:     <total> across all phases
Sessions:  <count> sessions
Duration:  <first session start> to <now>
Brain ID:  <forever_state_memory_id>
---
```

Set `status: "completed"` and persist final state.

## Routing

- On mandatory stop: user resolves or pauses
- On phase completion: route to `team-ram:intake` for next phase
- On gate requirement: route to `team-ram:run-gates`
- On final completion: done

## Invariants

- State is persisted after every single step (not batched)
- Mandatory stops cannot be bypassed or configured away
- Phase transitions always require a new intake
- ADR decisions always require human sign-off
- The sessions array provides complete cross-session audit trail
- A forever_state with `status: "in_progress"` auto-resumes on next activation
