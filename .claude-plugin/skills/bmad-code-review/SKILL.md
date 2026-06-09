---
name: bmad-code-review
description: >
  Runs adversarial multi-layer code review against a completed story.
  Activated when the user says "code review", "review story", "review PR",
  "check my work", or "run review". Executes three parallel review layers
  (Blind Hunter, Edge Case Hunter, Acceptance Auditor), consolidates findings
  into a classified report, and routes the story forward or back to dev.
---

# Code Review — Adversarial Multi-Layer Review

## Purpose

Provide rigorous, multi-perspective code review that catches bugs, validates edge cases,
and audits acceptance criteria. Three independent review layers run in parallel to avoid
confirmation bias. Findings are classified by severity and the story is routed accordingly.

## Activation

Trigger: user requests code review on a story (explicit story ID or current in-review story).

## Workflow

### Step 1 — Gather Context

1. **Identify story** — read `sprint-status.yaml`, find the story with status `in-review`. If a story ID is provided as argument, use that instead.
2. **Read story file** — load the full story markdown including all acceptance criteria.
3. **Compute diff** — determine the `baseline_commit` from sprint-status.yaml and compute the full diff (`baseline_commit..HEAD`).
4. **Load project context** — read `project-context.md` for conventions, patterns, and standards.
5. **Brain search** — invoke `allura-memory-cowork:search-memory` for:
   - Known issues in similar code areas.
   - Review patterns from prior stories in this epic.
   - Architectural decisions that constrain this implementation.

### Step 2 — Run Parallel Review Layers

Execute all three layers independently. Each layer produces its own findings list.

#### Layer A — Blind Hunter

Reviews the diff **without reading the story or acceptance criteria**. Evaluates purely on code quality:

- **Logic errors** — incorrect conditionals, off-by-one, null derefs, race conditions.
- **Security issues** — injection, auth bypass, data exposure, unsafe deserialization.
- **Performance** — unnecessary allocations, N+1 queries, missing indices, unbounded loops.
- **Maintainability** — dead code, unclear naming, missing types, excessive coupling.
- **Convention violations** — deviations from project-context.md patterns.

The Blind Hunter does not know what the code is supposed to do. It only knows what good code looks like.

#### Layer B — Edge Case Hunter

Reviews with full context (story + diff). Focuses on what could break:

- **Boundary conditions** — empty inputs, max values, zero-length arrays, Unicode edge cases.
- **Error paths** — what happens when external calls fail, when data is malformed, when permissions are denied.
- **Concurrency** — shared state, race conditions, deadlocks, stale reads.
- **State transitions** — invalid state combinations, missing guards, incomplete cleanup.
- **Integration seams** — mismatched types at module boundaries, missing validation at API edges.

#### Layer C — Acceptance Auditor

Reviews with story file as the primary document. For every acceptance criterion:

- **Evidence mapping** — identify the exact code and test(s) that satisfy each AC.
- **Completeness check** — is the AC fully met, or only partially?
- **Test quality** — are the tests meaningful or do they just assert truthy values?
- **Missing ACs** — are there implicit requirements the story assumes but does not state?

Produces a checklist: each AC gets a status of `PASS` (with evidence), `FAIL` (with explanation), or `PARTIAL` (with gap description).

### Step 3 — Consolidate Findings

Merge findings from all three layers. Deduplicate where layers found the same issue.

Classify each finding:

| Severity | Meaning | Action |
|----------|---------|--------|
| **BLOCKER** | Must fix before merge. Bug, security issue, or failed AC. | Story returns to dev. |
| **WARNING** | Should fix. Code smell, weak test, or partial coverage. | Fix recommended but not blocking. |
| **NOTE** | Observation. Style preference, minor improvement, future consideration. | Informational only. |

### Step 4 — Produce Review Report

Generate a structured review report containing:

1. **Summary** — overall assessment (PASS / CHANGES REQUESTED / BLOCKED).
2. **Stats** — files reviewed, lines changed, tests added, ACs checked.
3. **Blocker findings** — each with file, line, description, and suggested fix.
4. **Warning findings** — each with file, line, description.
5. **Notes** — grouped by category.
6. **AC checklist** — from the Acceptance Auditor layer.
7. **Recommendation** — clear next action.

### Step 5 — Route

Based on the review outcome:

**PASS (no blockers, all ACs met):**
- Update `sprint-status.yaml` to `done`.
- Store review summary via `allura-memory-cowork:remember` with story ID and outcome.
- Recommend next story or retrospective via `team-ram:bmad-dev-story` or `team-ram:bmad-retrospective`.

**CHANGES REQUESTED (blockers found or ACs failed):**
- Update `sprint-status.yaml` to `changes-requested`.
- Store review findings via `allura-memory-cowork:remember` for implementation continuity.
- The review report is available for `team-ram:bmad-dev-story` to pick up as continuation context (Step 3 of dev-story).

## Review Principles

- **Adversarial, not hostile.** The goal is to find problems, not to criticize the developer.
- **Evidence-based.** Every finding references specific code. No vague complaints.
- **Actionable.** Every blocker includes a suggested fix or approach.
- **Proportional.** Do not block on style preferences. Reserve blockers for real issues.

## Outputs

- Structured review report with classified findings.
- Updated `sprint-status.yaml` (done or changes-requested).
- Review outcome stored in Brain for pattern learning.
