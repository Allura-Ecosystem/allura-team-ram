---
name: intake
description: >
  Captures a structured work packet before implementation begins.
  Triggered when user says "intake", "new task", "capture work", "start work packet",
  or when beginning any new implementation effort.
---

# Intake — Structured Work Packet Capture

## On Activation

Greet the user and confirm the project context. If a project group_id is available from the current session or environment, use it. Otherwise default to `allura-project`.

> "Ready to capture a work packet. What are we building?"

## Purpose

Every implementation must begin with a structured intake. No code, no plan, no execution without a captured work packet. This skill produces a JSON-structured packet that feeds directly into `team-ram:bmad-plan`.

## Protocol

### Step 1 — Identify Work Type

Ask the user (or infer from context) what type of work this is:

| Type | Description |
|------|-------------|
| `feature` | New capability |
| `bugfix` | Defect correction |
| `refactor` | Structural improvement, no behavior change |
| `spike` | Time-boxed investigation |
| `infra` | Infrastructure, CI/CD, deployment |
| `docs` | Documentation-only change |

If ambiguous, ask. Do not guess.

### Step 2 — Gather Intake Fields

Collect the following through conversation. Push back on vague answers. Every field must be explicit before the packet is finalized.

| Field | Required | Description |
|-------|----------|-------------|
| `goal` | Yes | One sentence: what does "done" look like? |
| `phase` | Yes | Which build phase this belongs to (e.g., Phase 0, Phase 1) |
| `scope` | Yes | What is IN scope — list of concrete deliverables |
| `out_of_scope` | Yes | What is explicitly excluded — prevents scope creep |
| `acceptance_criteria` | Yes | Numbered list of testable conditions for completion |
| `gate_required` | Yes | Boolean — does this work require a governance gate before promotion? |
| `first_role` | Yes | Which BMAD role starts execution (PM, Architect, Developer, QA, SM) |
| `work_type` | Yes | From Step 1 |
| `open_questions` | No | Unresolved items that must be answered before or during execution |
| `dependencies` | No | Other work packets, services, or decisions this depends on |
| `risk_notes` | No | Known risks or concerns |

### Step 3 — Construct the Packet

Assemble the JSON packet:

```json
{
  "packet_type": "intake",
  "work_type": "<type>",
  "goal": "<goal>",
  "phase": "<phase>",
  "scope": ["<item1>", "<item2>"],
  "out_of_scope": ["<item1>", "<item2>"],
  "acceptance_criteria": [
    "AC-1: <criterion>",
    "AC-2: <criterion>"
  ],
  "gate_required": true,
  "first_role": "<role>",
  "open_questions": [],
  "dependencies": [],
  "risk_notes": [],
  "status": "captured",
  "created_at": "<ISO timestamp>"
}
```

### Step 4 — Store in Allura Brain

Use `allura-memory-cowork:remember` to persist the packet:

- **Content**: The full JSON packet as a structured memory
- **group_id**: Use the project's group_id (e.g., `allura-mortagate`, `allura-system`) or default `allura-project`
- **Tags**: `intake`, `work-packet`, the work_type, the phase

### Step 5 — Create Completion Marker

After successful storage, note the memory ID returned by Brain. This ID is the intake reference that `team-ram:bmad-plan` will load.

### Step 6 — Output Summary

Present a clean summary to the user:

```
--- INTAKE CAPTURED ---
Goal:     <goal>
Type:     <work_type>
Phase:    <phase>
Scope:    <count> items
Gate:     <yes/no>
First:    <role>
Questions: <count> open
Brain ID: <memory_id>
Status:   captured
---
Next: Run `bmad-plan` to generate the execution plan.
```

## Routing

After intake is captured, recommend `team-ram:bmad-plan` as the next step. Do not auto-invoke — the user decides when to plan.

## Invariants

- No implementation begins without a captured intake
- Every intake has an explicit `out_of_scope` — even if it is "nothing excluded"
- Open questions are first-class: they block execution until resolved
- The packet is immutable once stored — amendments create a new version referencing the original
