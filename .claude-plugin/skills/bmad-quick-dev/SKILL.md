---
name: bmad-quick-dev
description: >
  Fast intent-to-code workflow that takes a user requirement, bug fix, change request,
  or feature idea and produces clean working code. Activated when the user says
  "quick dev", "implement this", "build this", "fix this", "dev story", "code this up",
  or "quick build". Enforces scope discipline and sequential checkpoints.
---

# BMAD Quick Dev

Turn user intent into working code through a structured 7-step workflow. Enforces scope discipline (single goal, 900-1600 token spec), sequential execution, and checkpoint-based user approval.

## Activation

When the user requests implementation of a feature, bug fix, refactor, or any code change, run this skill. Execute steps sequentially. Never skip a step. Halt at every **[CHECKPOINT]** for user confirmation before proceeding.

## Critical Rules

1. **Sequential execution** — steps run in order 1 through 7, no parallelism, no skipping.
2. **Halt at checkpoints** — every checkpoint requires explicit user approval to continue.
3. **Single goal** — one user-facing goal per invocation. Multi-goal work gets split.
4. **Scope standard** — optimal spec size is 900-1600 tokens. Under 900 is fine for small fixes. Over 1600 signals the scope is too large.
5. **Project conventions first** — follow the project's existing patterns, naming, and style.

## Step 1: Clarify Intent

Ask the user what they want to accomplish. If they have already stated it clearly, confirm understanding. Classify the work:

| Type | Description | Typical Scope |
|------|-------------|---------------|
| **New feature** | Adding capability that does not exist | Medium-large |
| **Bug fix** | Correcting incorrect behavior | Small-medium |
| **Refactor** | Restructuring without changing behavior | Medium |
| **Tweak** | Small adjustment to existing behavior | Small |

Capture:
- **Goal**: one sentence describing the desired outcome
- **Type**: classification from above
- **Context**: any files, components, or systems the user mentions

If the user's intent is ambiguous, ask ONE clarifying question. Do not ask more than one question at this step.

**[CHECKPOINT]** — Confirm: "Goal: {goal}. Type: {type}. Proceed?"

## Step 2: Gather Context

Read relevant project files to understand the codebase:

1. **Direct references** — any files the user mentioned
2. **Neighbors** — files in the same directory or module as the target
3. **Imports/dependencies** — trace imports to understand the dependency graph
4. **Tests** — find existing tests for the target area
5. **Config** — check for relevant configuration (tsconfig, package.json, project settings)

Search Brain for related decisions and patterns:

```
allura-memory-cowork:search-memory
  query: "{goal keywords} architecture decision pattern"
```

Build a mental model:
- What conventions does this project use? (naming, file structure, patterns)
- What testing framework is in place?
- Are there type definitions or schemas that constrain the work?
- What are the adjacent components that might be affected?

Do NOT present a lengthy context dump to the user. Internalize it silently.

## Step 3: Spec the Work

Produce a concise, actionable specification:

```
Spec: {Goal in one line}
Type: {new-feature | bug-fix | refactor | tweak}
Files:
  - {path/to/file.ts} — {what changes here}
  - {path/to/other.ts} — {what changes here}
  - {path/to/test.ts} — {new or updated tests}

Actions:
  1. {Specific action in imperative form}
  2. {Specific action}
  3. {Specific action}

Acceptance Criteria:
  Given {precondition}
  When {action}
  Then {expected outcome}

  Given {precondition}
  When {action}
  Then {expected outcome}
```

Rules for the spec:
- Every file that will be touched must be listed with a reason
- Actions must be specific enough to implement without guessing
- Acceptance criteria use Given/When/Then format
- At least 2 acceptance criteria, no more than 5

**[CHECKPOINT]** — Present spec to user. "Spec ready. Approve, adjust, or split?"

## Step 4: Scope Check

Evaluate the spec against scope standards:

### Token Count Assessment
- **Under 900 tokens**: fine for tweaks and small bug fixes. Proceed.
- **900-1600 tokens**: optimal range. Proceed.
- **Over 1600 tokens**: scope is too large. Propose splitting.

### Multi-Goal Detection
If the spec contains more than one independent user-facing goal, propose splitting:

```
Scope Check: This spec covers {n} independent goals:
  1. {goal A} — suggest separate quick-dev
  2. {goal B} — suggest separate quick-dev

Recommend: Split into {n} invocations. Proceed with goal 1 first?
```

### User Override
The user can override scope warnings. If they say "proceed anyway" or "keep it together", respect that and continue. Log the override.

**[CHECKPOINT]** — If scope issues found, present them. Otherwise, auto-proceed to Step 5 with a brief note: "Scope OK. Implementing."

## Step 5: Implement

Write the code. Follow these principles:

### Implementation Order
1. **Types/interfaces first** — if new types are needed, define them before use
2. **Core logic** — the main implementation
3. **Integration points** — wire into existing code (imports, exports, registrations)
4. **Tests** — write or update tests to cover the acceptance criteria

### Code Standards
- Follow the project's existing conventions discovered in Step 2
- Use explicit types (no `any` unless the project already uses it pervasively)
- Handle error cases — do not leave happy-path-only code
- Keep functions focused — one responsibility per function
- Add comments only where the WHY is non-obvious (do not comment WHAT)

### File Operations
- Prefer editing existing files over creating new ones
- If creating a new file, follow the project's naming convention
- Never create documentation files unless the spec explicitly requires it

### Test Writing
- Match the project's testing framework and patterns
- Cover the acceptance criteria from the spec
- Include at least one edge case or error case
- Keep tests focused — one assertion per test when practical

## Step 6: Review

Self-check against the spec before presenting to the user:

### Checklist
- [ ] Every file in the spec was touched (or explicitly decided not to)
- [ ] Every action in the spec was completed
- [ ] Every acceptance criterion has a corresponding test or is verifiable
- [ ] No unrelated changes were introduced
- [ ] Error cases are handled
- [ ] Types are correct (no type errors introduced)
- [ ] Imports are correct and complete

### Run Available Checks
If the project has:
- **Type checking** (tsc, typecheck): run it
- **Linting**: run it
- **Tests**: run the relevant test file(s)

If any check fails, fix the issue before proceeding. If the fix would expand scope significantly, report it as a known issue rather than fixing it.

**[CHECKPOINT]** — If checks fail and cannot be fixed within scope, present the issue: "Implementation complete but {check} found {issue}. Fix now or defer?"

## Step 7: Report

Summarize what was done:

```
Quick Dev Complete
==================
Goal: {original goal}
Type: {type}

Changes:
  {path/to/file.ts}
    - {what changed, one line}
  {path/to/other.ts}
    - {what changed, one line}
  {path/to/test.ts}
    - {tests added/updated}

Acceptance Criteria:
  ✅ Given {x} When {y} Then {z}
  ✅ Given {a} When {b} Then {c}

Checks:
  ✅ Types pass
  ✅ Tests pass ({n} tests, {n} new)
  {or ⚠️ Known issue: {description}}

Files modified: {n}
Lines changed: ~{n}
```

### Brain Integration

Record the completed work:

```
allura-memory-cowork:remember
  content: "Implemented: {goal}. Type: {type}. Files: {file list}. All acceptance criteria met."
  tags: quick-dev, implementation, {project-name}
```

## Handling Edge Cases

### User Wants to Skip Steps
Explain that sequential execution is a core rule of this skill. If they want a faster path, suggest a direct edit instead of this workflow.

### Work Expands During Implementation
If Step 5 reveals the scope is larger than the spec anticipated:
1. Stop implementing
2. Report what was discovered
3. Propose an updated spec or a split
4. **[CHECKPOINT]** — Get user approval before continuing

### No Tests Possible
If the project has no test infrastructure, skip the test-writing part of Step 5 but note it in the report. Acceptance criteria are still verified manually.

### Dependent on External Systems
If the implementation requires a running database, API, or service that is not available, note it clearly. Write the code to be correct, and list manual verification steps in the report.

## Cross-Skill References

- To check sprint context first: `team-ram:bmad-sprint-status`
- To plan a larger effort: `team-ram:bmad-sprint-planning`
