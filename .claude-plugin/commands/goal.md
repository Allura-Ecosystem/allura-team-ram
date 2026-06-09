---
description: "Long-horizon autonomous goal. /goal <objective> defines a goal. /goal run [goal-id] executes one bounded iteration. status | pause | resume | clear manage lifecycle."
argument-hint: "<objective> | run [goal-id] | status | pause | resume | clear [goal-id]"
---

# /goal — Long-Horizon Autonomous Objective

You are operating in **Goal Mode** — a long-horizon execution loop that persists state in Allura Brain, decomposes objectives into bounded tasks, and drives autonomous work without constant human intervention.

## Parse Arguments

`$ARGUMENTS` is one of:
- `status` — show active goal from Brain
- `run [goal-id]` — execute one bounded iteration for the active goal
- `pause` — suspend current goal
- `resume [goal-id]` — resume a paused goal
- `clear [goal-id]` — abandon a goal
- anything else — treat as a new objective

---

## Subcommand: `status`

1. Search Brain: `allura-brain__memory_list({ group_id: "allura-system", user_id: "brooks-architect", limit: 50, sort: "created_at_desc" })`
2. Filter results where `content` starts with `GOAL_`
3. Display active goals with objective, stopping condition, and plan path
4. If none found: "No active goals. Run /goal <objective> to start one."

---

## Subcommand: `pause`

1. Find the latest active goal via `memory_list`
2. Add a new Brain entry with `event_type: "GOAL_PAUSED"`, `state: "paused"`
3. Print: "Goal paused. Resume with /goal resume [goal-id]"

---

## Subcommand: `resume [goal-id]`

1. Search Brain for paused goal matching goal-id
2. Add Brain entry with `event_type: "GOAL_RESUMED"`, `state: "active"`
3. Do not auto-run. Print: "Goal resumed. Run /goal run [goal-id] to execute."

---

## Subcommand: `run [goal-id]`

1. Resolve the active goal via `memory_list`. If `[goal-id]` supplied, require that goal.
2. Read the goal plan file
3. Execute one bounded iteration against the next incomplete task
4. Mark task complete, report results

---

## Subcommand: `clear [goal-id]`

1. Search Brain for the goal
2. Add superseding entry with `state: "abandoned"`
3. Print: "Goal [goal-id] cleared."

---

## New Objective (default path)

### Step 1 — Conflict Check
Search Brain for active goals. If one exists, warn and stop unless user confirms override.

### Step 2 — Elicit Stopping Condition
If `$ARGUMENTS` lacks a verifiable stopping condition, ask ONE clarifying question:
> "How will we know this is done?"

### Step 3 — Goal Definition
Extract objective, stopping condition, guardrails. Show to user. Wait for sign-off.

### Step 4 — Persist to Brain
Generate goal ID: `goal-[YYYYMMDD-HHMM]`. Write to Brain with `group_id: "allura-system"`, `user_id: "brooks-architect"`.

### Step 5 — Generate Plan
Write goal plan with 3-10 concrete, testable tasks.

### Step 6 — Stop Before Execution
Present management commands. Do not auto-execute.

---

## Allura Rules (Non-Negotiable)

1. `group_id = "allura-system"` on every Brain operation
2. `user_id = "brooks-architect"` for goal entries
3. Never mutate Brain entries — always add superseding entries
4. Stopping condition must be verifiable — binary yes/no
5. Guardrails are enforced — scope violations halt the loop
