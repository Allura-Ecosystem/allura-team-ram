---
name: bmad-plan
description: >
  Generates a numbered execution plan from a captured intake packet.
  Triggered when user says "plan", "bmad plan", "generate plan", "create execution plan",
  or after completing an intake.
---

# BMAD Plan — Execution Plan Generator

## On Activation

Greet the user and confirm which intake packet to plan against. If the most recent intake is available in context, offer to use it. Otherwise, search Brain.

> "Let me pull your intake and build an execution plan."

## Purpose

Transforms a raw intake packet into a sequenced, role-assigned execution plan with complexity estimates and risk annotations. The plan is the contract between intent (intake) and execution (bmad-call or bmad-yolo).

## Prerequisites

- A captured intake packet must exist in Allura Brain (produced by `team-ram:intake`)
- If no intake is found, stop and route the user to `team-ram:intake` first

## Protocol

### Step 1 — Load Intake from Brain

Use `allura-memory-cowork:search-memory` to find the most recent intake packet:

- Search for memories tagged `intake`, `work-packet`
- Match against the current project's group_id
- If multiple intakes exist, present a short list and let the user choose
- Extract: goal, scope, acceptance_criteria, first_role, open_questions, dependencies

If open questions exist on the intake, surface them now. They must be resolved before the plan is finalized.

### Step 2 — Generate the Execution Plan

Produce a numbered plan where each step has:

| Field | Description |
|-------|-------------|
| `step_number` | Sequential integer (1, 2, 3...) |
| `action` | Concrete, verifiable action statement |
| `role` | BMAD role: PM, Architect, Developer, QA, or SM |
| `linked_ac` | Which acceptance criteria this step satisfies (e.g., AC-1, AC-3) |
| `complexity` | S (< 30 min), M (30 min - 2 hr), L (> 2 hr) |
| `breakpoint` | Boolean — true at every role transition by default |

**Role Sequencing Rules:**

1. PM steps come first (scope confirmation, stakeholder alignment)
2. Architect steps next (design decisions, interface contracts, ADRs)
3. Developer steps for implementation (ordered by dependency)
4. QA steps for validation (test writing, acceptance verification)
5. SM steps for gate checks and promotion

Not every plan needs all roles. A bugfix may skip PM and Architect entirely.

**Breakpoint Rules:**

- Every role transition gets a breakpoint by default
- The user can remove breakpoints during approval (Step 4)
- Gate steps (SM role) always have breakpoints regardless of user preference

### Step 3 — Surface Risks

Analyze the plan for risks and present them:

| Risk Type | Check |
|-----------|-------|
| **Complexity concentration** | Any single step rated L that could be split? |
| **Missing coverage** | Any acceptance criteria not linked to at least one step? |
| **Dependency gaps** | Steps that depend on unresolved open questions? |
| **Role overload** | More than 5 consecutive steps for one role? |
| **Gate absence** | Gate-required intake with no SM step? |

Present risks as a numbered list with severity (Low / Medium / High) and a suggested mitigation for each.

### Step 4 — Request Approval

Present the complete plan in a readable format:

```
--- EXECUTION PLAN ---
Intake: <goal>
Steps:  <count>
Roles:  <list of unique roles>
Est:    <total complexity bucket>

 #  | Action                          | Role      | AC    | Cplx | BP
----|---------------------------------|-----------|-------|------|----
 1  | Confirm scope with stakeholder  | PM        | AC-1  | S    | --
 2  | Design API contract             | Architect | AC-2  | M    | BP
 3  | Implement endpoint              | Developer | AC-2  | L    | BP
 4  | Write integration tests         | QA        | AC-3  | M    | BP
 5  | Run governance gate             | SM        | --    | S    | BP

Risks: <count> identified
---
Approve this plan? (approve / revise / reject)
```

The user may:
- **Approve** — plan is stored as-is
- **Revise** — user specifies changes, plan is regenerated
- **Reject** — plan is discarded, user may re-intake or abandon

### Step 5 — Store Plan in Brain

On approval, use `allura-memory-cowork:remember` to persist:

- **Content**: The full execution plan as structured JSON
- **group_id**: Same as the intake packet
- **Tags**: `bmad-plan`, `execution-plan`, the phase from intake
- **Metadata**: Link to the intake memory ID, approval timestamp, step count

Plan JSON structure:

```json
{
  "packet_type": "bmad-plan",
  "intake_ref": "<intake_memory_id>",
  "goal": "<from intake>",
  "steps": [
    {
      "step_number": 1,
      "action": "<action>",
      "role": "PM",
      "linked_ac": ["AC-1"],
      "complexity": "S",
      "breakpoint": false
    }
  ],
  "risks": [],
  "status": "approved",
  "approved_at": "<ISO timestamp>"
}
```

## Output Summary

```
--- PLAN STORED ---
Goal:      <goal>
Steps:     <count>
Breakpoints: <count>
Risks:     <count>
Brain ID:  <memory_id>
Status:    approved
---
Next: Run `bmad-call` (interactive) or `bmad-yolo` (autonomous).
```

## Routing

After plan approval, recommend execution mode:
- `team-ram:bmad-call` — interactive with breakpoints (recommended for first-time or complex work)
- `team-ram:bmad-yolo` — autonomous (only if plan is low-risk and user is confident)
- `team-ram:bmad-forever` — continuous cross-session (for multi-phase epics)

## Invariants

- No plan without a captured intake
- Every acceptance criterion must be linked to at least one step
- Plans are immutable once approved — amendments create a new plan version
- SM/gate steps always retain breakpoints regardless of user preference
