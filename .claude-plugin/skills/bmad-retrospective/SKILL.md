---
name: bmad-retrospective
description: >
  Runs a post-epic retrospective to capture learnings and action items.
  Activated when the user says "run retro", "retrospective", "epic review",
  "what did we learn", or "post-mortem". Analyzes all stories, reviews, and
  gate results from a completed epic, produces a structured retro document,
  and stores insights in Brain for future reference.
---

# Retrospective — Post-Epic Review

## Purpose

Capture what worked, what did not, and what to change for the next epic. Produces a
structured retrospective document with actionable items and stores key insights in
Allura Brain so future stories and epics benefit from accumulated learning.

## Activation

Trigger: user requests a retrospective (with epic ID or auto-detect the most recently completed epic).

## Workflow

### Step 1 — Epic Discovery

Identify the target epic:

1. If the user provides an epic ID, use that.
2. Otherwise, read `sprint-status.yaml` and find the epic where all stories have status `done` (or the most recently completed epic).
3. If no completed epic is found, check for an epic where all but the retrospective itself are done.
4. Report the selected epic and confirm with the user before proceeding.

### Step 2 — Document Loading

Gather all artifacts produced during the epic:

1. **Epic file** — the original epic definition with goals and success criteria.
2. **All story files** — every story markdown file belonging to this epic.
3. **Review reports** — any code review artifacts produced by `team-ram:bmad-code-review`.
4. **Sprint status history** — timestamps and status transitions from `sprint-status.yaml` for all stories in this epic.
5. **Gate results** — any governance gate results from `team-ram:allura-governance` if applicable.
6. **Project context** — read `project-context.md` for baseline conventions (to check if any were updated during the epic).

### Step 3 — Deep Story Analysis

For each story in the epic, analyze:

- **Cycle time** — how long from `ready-for-dev` to `done` (using timestamps from sprint-status.yaml).
- **Review rounds** — how many times the story went through review (count `in-review` to `changes-requested` transitions).
- **Blocker count** — number of blocker-severity findings from code reviews.
- **Common finding categories** — group review findings by type (logic errors, missing tests, convention violations, etc.).
- **AC completeness** — were all ACs met on first implementation attempt, or did some require rework?
- **Scope changes** — did the story grow or shrink during implementation?

Produce per-story summaries and aggregate statistics for the epic.

### Step 4 — Previous Retro Integration

Invoke `allura-memory-cowork:search-memory` to find insights from past retrospectives:

- **Recurring issues** — are the same problems appearing again? If so, prior action items may not have been effective.
- **Improvement trends** — are areas that were flagged before now performing better?
- **Action item follow-up** — were action items from the last retro actually implemented?

This step prevents the retrospective from repeating the same observations without progress.

### Step 5 — Next Epic Preview

Look ahead at upcoming work:

1. Read any planned but not-yet-started epics from the project's backlog.
2. Identify how lessons from this epic apply to the next one.
3. Flag any known risks or dependencies for upcoming work.

This ensures the retro produces forward-looking recommendations, not just backward-looking observations.

### Step 6 — Run Retrospective Discussion

Structure the analysis into three categories:

#### What Worked Well
- Patterns, tools, or approaches that accelerated delivery.
- Stories that went smoothly and why.
- Effective conventions or architectural decisions.
- Improvements from prior retro action items that paid off.

#### What Did Not Work Well
- Stories with high review rounds or long cycle times and root causes.
- Recurring review findings that suggest a systemic gap.
- Missing context that caused rework (bad story specs, unclear ACs, missing architecture docs).
- Tool or process friction.

#### Action Items
Each action item must be:
- **Specific** — not "improve testing" but "add integration test template to project-context.md".
- **Assignable** — routed to a Team RAM agent or human role.
- **Measurable** — define what success looks like.
- **Time-bound** — apply to the next epic or next N stories.

### Step 7 — Produce Retro Document

Write the retrospective document. Include:

1. **Header** — epic ID, title, date range, story count.
2. **Epic Summary** — goals, whether they were met, key metrics (total cycle time, average review rounds, blocker rate).
3. **What Worked Well** — findings with evidence.
4. **What Did Not Work Well** — findings with evidence and root cause analysis.
5. **Action Items** — numbered list with owner, description, and success criteria.
6. **Story-Level Detail** — per-story mini-summaries (collapsible or appendix).
7. **Comparison with Prior Retros** — trends and recurring themes.

### Step 8 — Update Sprint Status

Update `sprint-status.yaml`:

- Mark the retrospective as `done` for this epic.
- Record completion timestamp.

### Step 9 — Store Insights in Brain

Invoke `allura-memory-cowork:remember` to persist:

- **Retro summary** — epic ID, date, key findings, action items.
- **Pattern insights** — recurring issues, effective practices, convention updates.
- **Action items** — so they can be checked in the next retrospective (Step 4).

Tag memories with the epic ID and project identifier for future retrieval.

## Outputs

- Retrospective document in the project's docs or stories directory.
- Updated `sprint-status.yaml` with retrospective completion.
- Key insights and action items stored in Brain for future reference.
- Forward-looking recommendations for the next epic.
