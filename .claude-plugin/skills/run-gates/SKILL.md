---
name: run-gates
description: >
  Runs governance gates to validate phase completion before promotion.
  Triggered when user says "run gates", "gate check", "validate phase",
  "governance check", or "ready for promotion".
---

# Run Gates — Governance Gate Validation

## On Activation

Greet the user and identify which phase gate to run. Load the relevant execution state from Brain.

> "Gate runner ready. Let me identify the phase and load your execution state."

## Purpose

Validates that a phase of work meets its acceptance criteria before promotion to the next phase. Produces a deterministic PASS/FAIL verdict with evidence. Gates enforce quality — no self-certification allowed.

## Prerequisites

- An executed BMAD plan (completed or partially completed via `team-ram:bmad-call`, `team-ram:bmad-yolo`, or `team-ram:bmad-forever`)
- The original intake with acceptance criteria
- The implementer (Developer role) cannot run their own gate — a different role or the user must invoke this skill

## No Self-Certification Rule

The agent or role that implemented the work cannot certify its own gate. This is enforced by checking:

- The execution state's primary implementer role
- The gate runner must be a different role (SM or QA) or the human user
- If self-certification is detected, the gate fails with reason `SELF_CERTIFICATION_BLOCKED`

## Protocol

### Step 1 — Identify Gate Phase

Use `allura-memory-cowork:search-memory` to load:

1. The intake packet (for acceptance criteria and phase)
2. The execution state (for completed steps and outputs)
3. The approved plan (for step-to-AC mapping)

Present the gate context:

```
--- GATE CHECK ---
Phase:     <phase>
Goal:      <goal>
Criteria:  <count> acceptance criteria to validate
Steps:     <completed>/<total> executed
---
Running validation...
```

### Step 2 — Run Validation Checks

For each acceptance criterion in the intake, run a validation check:

| Check Type | Method |
|------------|--------|
| **Criterion coverage** | Is there at least one completed step linked to this AC? |
| **Output verification** | Does the step output satisfy the criterion's testable condition? |
| **No skipped dependencies** | Were any steps linked to this AC skipped? If so, flag. |
| **Quality check** | Does the output meet the standard expected by the role? |

Produce a check result for each criterion:

| Result | Meaning |
|--------|---------|
| `PASS` | Criterion fully satisfied with evidence |
| `FAIL` | Criterion not satisfied — specific gap identified |
| `PARTIAL` | Criterion partially satisfied — remaining work identified |
| `SKIPPED` | Linked steps were skipped — cannot validate |
| `UNVERIFIABLE` | Cannot determine pass/fail from available evidence |

### Step 3 — Produce Verdict

Aggregate the individual check results into a gate verdict:

**PASS conditions (all must be true):**
- Zero FAIL results
- Zero UNVERIFIABLE results
- All PARTIAL results have documented follow-up plans
- No skipped steps that block critical acceptance criteria

**FAIL conditions (any one triggers):**
- One or more FAIL results
- One or more UNVERIFIABLE results without justification
- Self-certification detected

Present the verdict:

```
--- GATE VERDICT: <PASS/FAIL> ---
Phase: <phase>

  AC   | Result       | Evidence
-------|--------------|------------------------------------------
  AC-1 | PASS         | Scope confirmed in Step 1 output
  AC-2 | PASS         | Endpoint implemented, tests passing
  AC-3 | FAIL         | Integration test missing for error path
  AC-4 | PASS         | Documentation updated

Overall: <PASS/FAIL>
Failed:  <count> criteria
---
```

### Step 4 — Route Based on Verdict

**On PASS:**

```
--- GATE PASSED ---
Phase <phase> is complete.
Storing gate result in Brain.
---
Next: Proceed to next phase or promote work.
```

- Store `gate_result` in Brain via `allura-memory-cowork:remember`:
  ```json
  {
    "packet_type": "gate_result",
    "phase": "<phase>",
    "intake_ref": "<intake_memory_id>",
    "plan_ref": "<plan_memory_id>",
    "verdict": "PASS",
    "checks": [...],
    "gate_runner": "<role or user>",
    "passed_at": "<ISO timestamp>"
  }
  ```
- Tags: `gate-result`, `gate-pass`, the phase
- Route to SM role for promotion or next phase planning

**On FAIL:**

```
--- GATE FAILED ---
Phase <phase> did not pass.
<count> criteria failed validation.

Failed criteria:
  AC-3: Integration test missing for error path

---
Route back to Developer to address failures.
Re-run gates after fixes are applied.
```

- Store the failure result in Brain (same structure, `verdict: "FAIL"`)
- Tags: `gate-result`, `gate-fail`, the phase
- Route back to Developer role to address the failures
- After fixes, the user re-invokes `run-gates`

### Step 5 — Gate History

Each gate run (pass or fail) is stored in Brain as an immutable record. This provides:

- Audit trail of all gate attempts per phase
- Evidence of what passed and what failed on each attempt
- Timestamp chain showing progression from fail to pass

Use `allura-memory-cowork:search-memory` with tag `gate-result` and the phase to retrieve gate history.

## Routing

- On PASS: recommend next phase intake (`team-ram:intake`) or promotion
- On FAIL: route back to implementation (`team-ram:bmad-call` for targeted fixes)
- Gate history available via `allura-memory-cowork:search-memory`

## Invariants

- No self-certification — implementer cannot run their own gate
- Gate results are immutable — each run produces a new record
- FAIL verdict requires specific evidence of what failed and why
- PASS verdict requires evidence for every acceptance criterion
- Gate results are always stored in Brain regardless of verdict
- UNVERIFIABLE results are treated as FAIL unless explicitly justified
