---
name: bmad-create-story
description: >
  Creates a comprehensive story file from epic context with full acceptance criteria.
  Activated when the user says "create story", "write story", "new story",
  "next story for epic", or "plan next story". Performs exhaustive artifact analysis,
  git intelligence, optional web research, and prior story learning to produce a
  complete story markdown file ready for implementation.
---

# Create Story — Comprehensive Story Authoring

## Purpose

Produce a fully specified story file that gives an implementer everything needed to
build and validate the feature. Draws from epic context, architecture docs, git history,
Brain knowledge, and optionally web research to create stories that are complete on
first read.

## Activation

Trigger: user requests story creation (with epic ID or story topic, or auto-detect from sprint-status.yaml).

## Workflow

### Step 1 — Exhaustive Artifact Analysis

Load all relevant project artifacts:

1. **Epic file** — read the target epic from the epics directory. Extract goals, scope, constraints, and story sequence.
2. **PRD / requirements** — read any product requirements document referenced by the epic or found in the docs directory.
3. **Architecture docs** — read architecture documents, design docs, and any ADRs relevant to this epic's domain.
4. **UX docs / wireframes** — if the epic involves UI work, check for design specs, component inventories, or wireframe references.
5. **Project context** — read `project-context.md` for conventions, tech stack, and file structure.
6. **Sprint status** — read `sprint-status.yaml` to understand what stories already exist, their statuses, and the current sprint scope.

### Step 2 — Git Intelligence

Examine the repository history for implementation patterns:

1. **Recent commits** — review the last 20 commits for patterns in the relevant code areas.
2. **File change frequency** — identify hotspots (files that change often) in the areas this story will touch.
3. **Previous story branches** — if prior stories in this epic have been completed, review their diffs for patterns, conventions, and architectural choices already established.

This step informs technical notes and helps avoid contradicting established patterns.

### Step 3 — Web Research (Conditional)

Only execute if the story involves:
- A library or framework version that may have changed since last known usage.
- An external API integration where docs may have updated.
- A technology the project has not used before.

If triggered, search for the latest documentation, breaking changes, migration guides, or best practices relevant to the story's technical domain.

If not triggered, skip entirely — do not perform speculative research.

### Step 4 — Previous Story Learning

Invoke `allura-memory-cowork:search-memory` to find insights from prior stories in this epic:

- **What worked** — patterns, approaches, or tools that succeeded.
- **What caused rework** — common review findings, missed edge cases, or misunderstood requirements.
- **Architectural decisions** — choices made during prior stories that constrain or inform this one.
- **Known blockers** — issues discovered but deferred from earlier stories.

If this is the first story in the epic, search for patterns from adjacent epics or the same project domain.

### Step 5 — Write Story File

Create the story markdown file in the stories directory. Use the naming convention from `project-context.md` (default: `story-<epic-id>-<sequence>.md`).

The story file must contain:

#### Header
- **Title** — clear, action-oriented (e.g., "Implement audit case creation from approved loan").
- **Epic** — parent epic ID and title.
- **Priority** — from epic backlog or user input.
- **Estimated complexity** — S/M/L/XL with brief rationale.

#### Description
- **What** — 2-3 sentences describing the user-visible outcome.
- **Why** — business context from the epic and PRD.
- **Who** — which user role or system component benefits.

#### Acceptance Criteria
Each AC uses Given/When/Then format:

```
**AC-1: [Short name]**
- Given: [precondition]
- When: [action]
- Then: [expected outcome]
```

Aim for 3-8 ACs per story. Each must be independently testable. Avoid compound criteria (multiple outcomes in one AC).

#### Technical Notes
- **Affected files/modules** — based on git intelligence and architecture analysis.
- **Key patterns to follow** — from existing codebase and project conventions.
- **Dependencies** — other stories, external services, or data prerequisites.
- **Testing approach** — unit, integration, or e2e tests expected.
- **Migration/data concerns** — if schema or data changes are involved.

#### Out of Scope
Explicitly list things this story does NOT include. This prevents scope creep during implementation and review.

#### References
Links to epic file, architecture docs, relevant Brain memories, and any external docs consulted.

### Step 6 — Update Sprint Status

Update `sprint-status.yaml`:

- Add the new story entry with status `ready-for-dev`.
- Include story file path, epic reference, and creation timestamp.

Store the story creation event via `allura-memory-cowork:remember` with:
- Story ID, epic ID, key decisions made during story writing, and any deferred items.

## Quality Checks

Before finalizing the story file, verify:

- [ ] Every AC is independently testable with Given/When/Then.
- [ ] Technical notes reference actual files/patterns from the codebase (not guesses).
- [ ] Out of scope section exists and is non-empty.
- [ ] No AC duplicates or contradicts another AC.
- [ ] Dependencies are explicitly stated if they exist.
- [ ] Complexity estimate has rationale.

## Outputs

- Story markdown file in the stories directory.
- Updated `sprint-status.yaml` with new story entry.
- Story creation context stored in Brain.
