---
name: allura-governance
description: >
  Enforces Allura governance gates for Team RAM workflows.
  Activated when the user says "run with governance", "governed workflow",
  "allura gates", "enforce gates", or when any other skill needs governance
  wrapping. Executes 7 mandatory gates around any workflow: Scout hydration,
  doc impact check, Team RAM owner assignment, workflow execution, board update,
  validation evidence, and Brain outcome log.
---

# Allura Governance — 7-Gate Workflow Enforcement

## Purpose

Wrap any Team RAM workflow in Allura's governance framework. Ensures that every
piece of work is context-aware (Brain hydration), properly routed (Team RAM ownership),
tracked (board updates), validated (evidence collection), and recorded (Brain outcome log).
No work completes without passing all 7 gates.

## Activation

Trigger: user requests governed execution of a workflow, or another skill delegates
through governance. Can wrap any `team-ram:*` skill.

## Invariants (Non-Negotiable)

These rules apply to every gate and cannot be bypassed:

- **`group_id` required** — every Brain operation must include `group_id` matching pattern `^allura-[a-z0-9-]+$`. Missing group_id is a hard failure.
- **Append-only events** — no UPDATE or DELETE on episodic records. Corrections are new events that reference the original.
- **SUPERSEDES versioning** — knowledge updates create new versions linked via SUPERSEDES relationship. Never edit existing knowledge nodes.
- **HITL required for promotion** — no autonomous promotion from episodic to canonical knowledge. Route through curator approval.
- **No self-certification** — the agent that performed the work cannot be the sole validator. Validation requires a different review perspective.

## The 7 Gates

### Gate 1 — Scout Hydration

**Before any work begins, search Brain for context.**

Invoke `allura-memory-cowork:search-memory` with:
- The task description or story title.
- Key technical terms from the work scope.
- The project's group_id.

Retrieve:
- Related architectural decisions.
- Prior work in the same domain.
- Known blockers or constraints.
- Recent session context from the same project.

**Gate pass condition:** Search completed (even if no results found). The point is to look, not to require results.

**Gate fail condition:** Brain is unreachable AND the work involves architecture or data model changes. For implementation-only work, Brain unavailability is a warning, not a blocker.

### Gate 2 — Doc Impact Check

**Identify which documentation artifacts are affected by this work.**

Evaluate the work scope against:
- `project-context.md` — does this change conventions or tech stack?
- Architecture docs — does this change system boundaries or interfaces?
- Data dictionary — does this add, rename, or remove fields?
- Story files — does the implementation deviate from the story spec?
- Sprint status — does the board need updating?

Produce an impact list: which docs need updating, and whether the update is required (blocking) or recommended (non-blocking).

**Gate pass condition:** Impact list produced. Required doc updates are tracked for Gate 5.

### Gate 3 — Team RAM Owner Assignment

**Route the work to the correct specialist agent.**

Use the routing table:

| Work Type | Owner | Rationale |
|-----------|-------|-----------|
| Architecture decisions | Brooks | Conceptual integrity |
| Scope/intent questions | Jobs | Intent gate |
| Implementation | Woz | Builder |
| Architecture consultation | Pike | Read-only review |
| Codebase search | Scout | Fast recon |
| Refactoring | Fowler | Safe incremental change |
| Performance work | Bellard / Carmack | Measurement-first |
| Schema/data design | Knuth | Correctness before speed |
| Infrastructure/CI/CD | Hightower | Deployment readiness |

**Gate pass condition:** Owner identified and work is within their declared permissions. If the work spans multiple owners, identify the primary and supporting agents.

### Gate 4 — Workflow Execution

**Run the assigned workflow or skill.**

Execute the target skill (e.g., `team-ram:bmad-dev-story`, `team-ram:bmad-code-review`, `team-ram:bmad-create-story`).

This gate is a pass-through — it invokes the skill and captures the result. The governance wrapper does not interfere with the skill's internal logic.

**Gate pass condition:** The skill completes without unrecoverable errors. Partial completion (e.g., story blocked) is still a pass — the state is recorded accurately.

### Gate 5 — Board Update

**Update tracking to reflect current state.**

Update `sprint-status.yaml` with:
- Current story/task status.
- Timestamps for state transitions.
- Any blockers or dependencies discovered.

If doc impact was identified in Gate 2 and doc updates were marked as required:
- Verify the updates were made during Gate 4.
- If not, flag as an open action item in the board.

**Gate pass condition:** Sprint status accurately reflects the current state of work.

### Gate 6 — Validation Evidence

**Collect proof that the work meets its acceptance criteria.**

Evidence types by work category:

| Work Type | Required Evidence |
|-----------|------------------|
| Implementation | Test results, AC checklist with pass/fail |
| Code review | Review report with finding classifications |
| Story creation | Story file exists, ACs are testable, sprint-status updated |
| Architecture decision | ADR recorded, alternatives documented |
| Refactoring | Before/after metrics, no regression in tests |

**Gate pass condition:** Evidence collected and attached to the work record. Evidence must come from a source other than the implementing agent (no self-certification).

For implementation work, this means tests must pass (automated validation). For review work, this means the review was conducted by a different perspective than the implementer.

### Gate 7 — Brain Outcome Log

**Store the outcome in Allura Brain.**

Invoke `allura-memory-cowork:remember` with:
- **group_id** — project's allura group identifier.
- **event_type** — the type of work completed (implementation, review, story-creation, architecture-decision, retrospective).
- **agent_id** — which Team RAM agent performed the work.
- **status** — outcome (completed, blocked, changes-requested).
- **metadata** — summary of what was done, key decisions, open items.
- **references** — story ID, epic ID, file paths, related Brain memory IDs.

**Gate pass condition:** Memory stored successfully. If Brain is unreachable, log locally and flag for retry.

## Gate Failure Handling

When a gate fails:

1. **Log the failure** — which gate, why, what was attempted.
2. **Do not proceed past the failed gate** — unless the failure is classified as non-blocking (see individual gate conditions).
3. **Report to user** — clearly state which gate failed and what action is needed.
4. **Store failure event** — via `allura-memory-cowork:remember` if Brain is available, or locally if not.

## Outputs

- Gate execution log showing pass/fail status for all 7 gates.
- Updated `sprint-status.yaml` reflecting current state.
- Outcome stored in Brain with full metadata.
- Doc impact list with required/recommended updates tracked.
