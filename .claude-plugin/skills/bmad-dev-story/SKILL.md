---
name: bmad-dev-story
description: >
  Implements a full story from sprint backlog using red-green-refactor cycle.
  Activated when the user says "implement story", "dev story", "work on story",
  "start story", or "pick up next story". Reads sprint-status.yaml to find the
  target story, loads all context from epic and Brain, implements with tests,
  validates acceptance criteria, and updates sprint tracking on completion.
---

# Dev Story — Full Implementation Workflow

## Purpose

Drive a single story from ready-for-dev through implementation, testing, validation,
and into review. Follows red-green-refactor discipline, records baseline commit for
clean diffing, and updates sprint-status.yaml at every state transition.

## Activation

Trigger: user requests story implementation (explicit story ID or auto-select).

## Workflow

### Step 1 — Find Story

Read `sprint-status.yaml` from the project root. Identify the target story:

- If the user passed a story ID as argument, use that.
- Otherwise, auto-select the first story with status `in-progress` (resume).
- If none in-progress, select the first story with status `ready-for-dev`.
- If no eligible stories exist, report and stop.

Record the story ID for all subsequent steps.

### Step 2 — Load Context

Gather everything needed before writing code:

1. **Story file** — read the story markdown from the stories directory.
2. **Epic context** — read the parent epic file for broader goals and constraints.
3. **Project context** — read `project-context.md` for conventions, tech stack, file structure.
4. **Brain search** — invoke `allura-memory-cowork:search-memory` with the story title and key terms to find:
   - Related architectural decisions
   - Prior implementation patterns for similar work
   - Known blockers or gotchas

Synthesize loaded context into a working plan before proceeding.

### Step 3 — Detect Review Continuation

Check if the story status was previously `in-review` or `changes-requested`:

- If yes, load the most recent code review report (look for review artifacts in the stories directory or Brain).
- Extract specific feedback items that need addressing.
- Build a checklist of required changes before re-implementation.
- This is a continuation, not a fresh start — do not redo completed work.

If the story is fresh (status was `ready-for-dev`), skip this step.

### Step 4 — Mark In-Progress

Update `sprint-status.yaml`:

- Set story status to `in-progress`.
- Record `started_at` timestamp.
- Record `baseline_commit` — the current HEAD commit hash. This enables clean `git diff baseline_commit..HEAD` for review.

### Step 5 — Implement

Follow red-green-refactor for each acceptance criterion:

1. **Red** — Write a failing test that captures the AC.
2. **Green** — Write the minimum code to make the test pass.
3. **Refactor** — Clean up without changing behavior. Run tests to confirm.

Implementation rules:

- Follow all conventions from `project-context.md` (naming, file structure, imports).
- Use the project's existing patterns — grep the codebase for similar implementations.
- Keep changes scoped to the story. Flag anything out-of-scope rather than implementing it.
- Commit logical units of work with clear messages referencing the story ID.

### Step 6 — Test

Run the project's test suite:

- Execute the project-specific test command (from `project-context.md` or package.json scripts).
- Verify all new tests pass.
- Verify no existing tests regressed.
- If tests fail, diagnose and fix before proceeding.

### Step 7 — Validate

Walk through every acceptance criterion from the story file:

- For each AC, identify the test(s) and code that satisfy it.
- Confirm the AC is fully met, not partially.
- If any AC is unmet, return to Step 5 for that specific criterion.
- Check for obvious gaps: error handling, edge cases, accessibility (if UI).

### Step 8 — Mark Review

Update `sprint-status.yaml`:

- Set story status to `in-review`.
- Record `review_ready_at` timestamp.

### Step 9 — Story Completion Communication

Produce a summary:

- **What was implemented** — brief description of changes.
- **Files changed** — list of modified/created files.
- **Tests added** — count and description of new tests.
- **ACs met** — checklist showing each acceptance criterion and its evidence.
- **Diff range** — `git diff <baseline_commit>..HEAD` for reviewer convenience.

Store the implementation summary via `allura-memory-cowork:remember` with:
- Story ID, epic ID, key decisions made during implementation.

### Step 10 — Recommend Next

Suggest the logical next action:

- **Code review** — invoke `team-ram:bmad-code-review` on this story.
- **Next story** — if there are more `ready-for-dev` stories in the sprint.
- **Retrospective** — if this was the last story in the epic, suggest `team-ram:bmad-retrospective`.

## Error Handling

- If the story file is missing or malformed, report the issue and stop.
- If tests fail after 3 fix attempts, flag as blocked and update sprint-status.yaml accordingly.
- If Brain is unreachable, continue without Brain context (log a warning).

## Outputs

- Implemented code with tests.
- Updated `sprint-status.yaml` with status transitions and timestamps.
- Implementation summary stored in Brain.
- Baseline commit recorded for clean diffing.
