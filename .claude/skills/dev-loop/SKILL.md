---
name: dev-loop
description: "Allura-governed Ralph-style development loop that chains BMad dev-story, code review, and retrospective with Context7 doc lookups and Allura Brain memory at every phase. Searches Brain before each story, persists research findings, review patterns, and lessons learned so each story gets smarter. Triggers on: 'dev loop', 'sprint loop', 'run the stories', 'implement and review', 'dev cycle', 'story loop', or when the user wants to continuously implement, review, and retro through a backlog of stories."
---

# Dev Loop — Implement, Review, Retro, Repeat

A self-correcting development loop that drives stories to done by chaining three BMad skills with Context7 research and **Allura Brain memory at every phase**. Each story benefits from what the previous stories learned. Runs in a single session, Ralph-style.

## Why Allura matters here

Without memory, story 3 repeats the same mistakes as story 1. The dev loop writes structured traces after every phase — research findings, implementation decisions, review patterns, fix strategies — so that each subsequent story starts with the accumulated wisdom of the session. Across sessions, Brain retains what worked and what didn't, making the loop faster every time it runs.

## The Loop (with Brain reads/writes)

```
                    ┌──────────────────────────────────┐
                    │         STORY QUEUE               │
                    │  (sprint-status or story dir)     │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │  0. BRAIN HYDRATION               │
                    │     Search for story context,     │
                    │     prior blockers, patterns      │
                    │     ↕ READ                        │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │  1. RESEARCH (Context7)           │
                    │     Look up tech docs             │
                    │     ↕ READ prior lookups          │
                    │     ↓ WRITE useful findings       │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │  2. IMPLEMENT (bmad-dev-story)    │
                    │     Red-green-refactor            │
                    │     ↓ WRITE decisions made        │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │  3. REVIEW (bmad-code-review)     │
                    │     ↕ READ prior review patterns  │
                    │     ↓ WRITE recurring findings    │
                    └──────────┬───────────────────────┘
                               │
                         ┌─────▼─────┐
                         │  PASS?    │───no──→ FIX & RE-REVIEW
                         └─────┬─────┘         (max 3 cycles)
                               │ yes
                    ┌──────────▼───────────────────────┐
                    │  4. ADVANCE                       │
                    │     ↓ WRITE story outcome trace   │
                    └──────────┬───────────────────────┘
                               │
                          more stories? → loop to 0
                               │ no
                    ┌──────────▼───────────────────────┐
                    │  5. RETROSPECTIVE                 │
                    │     ↕ READ all session traces     │
                    │     ↓ WRITE lessons (promote?)    │
                    └──────────────────────────────────┘
```

---

## Allura Governance Contract

These rules apply to every Brain operation in the loop. They're not optional — the governance-preflight hook enforces them.

### Tenant & Identity

Resolve the project's `group_id` from `{project-root}/my-project/policies/allura-tenant.md` or AGENTS.md. Default: `allura-system`. For Mortgate: `allura-mortgage`.

Use the appropriate `user_id` per phase:

| Phase | Agent Identity | Role |
|-------|---------------|------|
| Hydration / Advance | `brooks-architect-{project}` | Orchestrator |
| Research | `scout-recon-{project}` | Research |
| Implement | `woz-builder-{project}` | Builder |
| Review | `pike-interface-review-{project}` | Reviewer |
| Retrospective | `brooks-architect-{project}` | Synthesis |

### Memory Content Taxonomy

Use structured prefixes so memories are searchable and filterable:

| Prefix | When | Example |
|--------|------|---------|
| `RESEARCH:` | Context7 finding worth persisting | `RESEARCH: LWC wire adapters require @salesforce/apex import, not @wire directly. Source: Context7 lwc docs.` |
| `DECISION:` | Implementation choice with rationale | `DECISION: US-1.1 orchestrator uses CustomEvent not pubsub — simpler, no shared state needed.` |
| `REVIEW_PATTERN:` | Recurring review finding | `REVIEW_PATTERN: Focus outlines missing on new interactive elements. Seen in US-1.1 and US-1.3.` |
| `FIX_STRATEGY:` | How a review finding was resolved | `FIX_STRATEGY: Missing focus rings — add :focus-visible with project's standard 2px charcoal outline.` |
| `STORY_COMPLETE:` | Story outcome trace | `STORY_COMPLETE: US-1.1 — orchestrator built. 6-screen state machine, 4 Jest tests. Files: ...` |
| `BLOCKER:` | Unresolved issue | `BLOCKER: US-1.5 chrome removal requires org access — cannot verify without mortgate-de.` |
| `LESSON:` | Retrospective insight | `LESSON: Starting with Jest tests (US-1.3) before orchestrator would have caught the event contract gap earlier.` |

### Invariants

1. **Brain-first.** Search before every story, not just at activation.
2. **Write after every phase** that produces a non-trivial finding.
3. **Append-only.** Never update or delete existing memories.
4. **HITL for promotion.** If a lesson's confidence ≥ 0.85, propose promotion — don't auto-promote.
5. **Degrade gracefully.** If Brain is unreachable, continue the loop with a `[DEGRADED]` flag and log what would have been written.

---

## On Activation

### 1. Discover tenant and work queue

Read the project's Allura tenant config to get `group_id` and agent identities. Then discover the story queue:

- Sprint-status file → stories with `ready-for-dev` or `in-progress`
- Story files directory → sort by number
- User-specified single story

### 2. Epic-level Brain hydration

Search Brain for the big picture before showing the queue:

```
allura-brain__memory_search(
  query: "<epic name> architecture decisions blockers patterns",
  group_id: "<tenant>",
  limit: 10
)
```

This surfaces lessons from prior sessions, blockers from prior stories, and review patterns that recurred. Summarize anything relevant under the queue announcement.

### 3. Announce and confirm

```
Dev Loop — EP-1 (3 stories queued)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] US-1.1  Onboarding orchestrator
[ ] US-1.3  Jest tests for untested LWCs
[ ] US-1.7  HITL decision promotion

Brain: 3 prior memories found (1 pattern, 1 decision, 1 blocker)
Context7: enabled
Retro: after all stories

Start? [Y/n]
```

---

## Phase 0: STORY-LEVEL BRAIN HYDRATION

**Before every story**, search Brain for context specific to this story's domain:

```
allura-brain__memory_search(
  query: "<story_id> <story domain keywords> blockers decisions review patterns",
  group_id: "<tenant>",
  limit: 5
)
```

Also search for Context7 research from prior sessions on the same tech:

```
allura-brain__memory_search(
  query: "RESEARCH: <technology the story uses>",
  group_id: "<tenant>",
  limit: 3
)
```

**Carry forward:** Compile a brief for the implementation phase:
- Prior decisions that constrain this story
- Review patterns to avoid (e.g., "last 3 stories had missing focus rings — check proactively")
- Cached Context7 findings that save a re-lookup
- Known blockers to watch for

---

## Phase 1: RESEARCH (Context7)

Before implementing, check if the story needs current documentation. **Check Brain first** — if a prior session already looked up the same library/topic, you may not need Context7 at all.

**When to research:**
- Story mentions a library, API, or framework you're not current on
- Story involves a pattern not in the codebase
- Story references version-specific behavior

**How:**
```bash
curl -s "https://context7.com/api/v2/libs/search?libraryName=LIBRARY&query=TOPIC" | jq '.results[0]'
curl -s "https://context7.com/api/v2/context?libraryId=LIBRARY_ID&query=TOPIC&type=txt"
```

**Brain write (if finding is non-trivial):**

If Context7 returns something that changes how you'd implement the story — a gotcha, a deprecation, a new API signature — persist it:

```
allura-brain__memory_add(
  group_id: "<tenant>",
  user_id: "scout-recon-<project>",
  content: "RESEARCH: <library> <topic> — <key finding in 1-2 sentences>. Source: Context7.",
  metadata: { source: "conversation", agent_id: "scout-recon-<project>" }
)
```

Skip the write if the finding is trivial or already in project docs. The goal is to avoid re-looking up the same thing in future sessions.

---

## Phase 2: IMPLEMENT (bmad-dev-story)

Invoke the `bmad-dev-story` workflow. Carry the hydration brief and Context7 findings into the implementation.

1. Read story file completely — acceptance criteria, tasks, dependencies, test plan.
2. Read relevant project docs (BLUEPRINT, DESIGN, DATA-DICTIONARY, existing patterns).
3. Red-green-refactor: failing test → minimal code → refactor.
4. Update story file: tasks, dev notes, file list, change log.
5. Run tests. All must pass.
6. Mark story as `review`.

**Brain write (significant decisions only):**

If you made a non-obvious implementation choice, record it:

```
allura-brain__memory_add(
  group_id: "<tenant>",
  user_id: "woz-builder-<project>",
  content: "DECISION: <story_id> — <what you chose and why, in 1 sentence>.",
  metadata: { source: "conversation", agent_id: "woz-builder-<project>" }
)
```

Don't write trivial decisions. Good candidates: architectural pattern choices, library selection, workarounds for platform limitations, deviations from the story spec with rationale.

**On HALT:** If you hit a hard blocker, write it to Brain before stopping:

```
content: "BLOCKER: <story_id> — <what's blocked and why>."
```

---

## Phase 3: REVIEW (bmad-code-review)

Invoke `bmad-code-review` against the changes. Before reviewing, **check Brain for recurring patterns** from this session:

```
allura-brain__memory_search(
  query: "REVIEW_PATTERN FIX_STRATEGY",
  group_id: "<tenant>",
  limit: 5
)
```

If prior stories had a recurring finding (e.g., "missing focus rings"), proactively check for it before running the full review. This turns accumulated review knowledge into prevention.

**Review covers:** correctness, regressions, security, contract drift, missing tests.

**Brain write (recurring findings):**

If a finding matches something seen in a prior story, it's a pattern — persist it:

```
allura-brain__memory_add(
  group_id: "<tenant>",
  user_id: "pike-interface-review-<project>",
  content: "REVIEW_PATTERN: <finding> — seen in <story_ids>. Root cause: <explanation>.",
  metadata: { source: "conversation", agent_id: "pike-interface-review-<project>" }
)
```

### Fix Loop (max 3 cycles)

On Critical/High findings:
1. Fix the issues.
2. Re-run affected tests.
3. Re-review changed areas only.

**Brain write after successful fix:**
```
content: "FIX_STRATEGY: <pattern> — resolved by <what you did>. Apply to future stories proactively."
```

This is the highest-value Brain write in the loop — it turns review rework into reusable knowledge.

---

## Phase 4: ADVANCE

After review passes:

1. Mark story `done` in sprint-status and story file.
2. **Write the story outcome trace:**

```
allura-brain__memory_add(
  group_id: "<tenant>",
  user_id: "brooks-architect-<project>",
  content: "STORY_COMPLETE: <story_id> — <what shipped, 1 sentence>. Files: <list>. Review: <cycles> cycles. Key decision: <most important choice>.",
  metadata: { source: "conversation", agent_id: "brooks-architect-<project>" }
)
```

3. Update the queue display.
4. Loop back to Phase 0 for the next story.

---

## Phase 5: RETROSPECTIVE (bmad-retrospective)

When all stories are done, invoke `bmad-retrospective`. But first, **read back all memories written during this session** to feed the retro with structured data:

```
allura-brain__memory_search(
  query: "STORY_COMPLETE DECISION REVIEW_PATTERN FIX_STRATEGY BLOCKER",
  group_id: "<tenant>",
  user_id: "brooks-architect-<project>",
  limit: 20
)
```

The retro covers:
- What went well (patterns, tools, decisions that paid off)
- What didn't (blockers, rework, surprises)
- Lessons learned (carry forward)
- Action items with owners

**Brain write (lessons with promotion):**

For each lesson the retro surfaces, write it:

```
allura-brain__memory_add(
  group_id: "<tenant>",
  user_id: "brooks-architect-<project>",
  content: "LESSON: <insight, 1-2 sentences>. Evidence: <which stories demonstrated this>.",
  metadata: { source: "conversation", agent_id: "brooks-architect-<project>" }
)
```

If a lesson has high confidence (based on evidence from 2+ stories), **propose promotion** — don't auto-promote. Tell the user: "This lesson appeared in N stories. Recommend promoting to canonical memory. Approve?"

**Epic outcome trace:**
```
content: "EPIC_COMPLETE: <epic_id> — <N> stories shipped. Key lessons: <top 2-3>. Residual risks: <any>."
```

---

## Configuration

| Flag | Default | Effect |
|------|---------|--------|
| `skip-review` | false | Skip Phase 3 (no review gate) |
| `skip-retro` | false | Skip Phase 5 (no retrospective) |
| `skip-research` | false | Skip Phase 1 (no Context7) |
| `skip-brain` | false | Skip all Brain reads/writes (ungoverned mode) |
| `max-review-cycles` | 3 | Fix-and-re-review rounds before HALT |
| `single-story` | false | One story only, no retro |
| `epic` | auto | Target epic |

```
/dev-loop                          # full governed loop
/dev-loop US-1.3                   # single story
/dev-loop skip-brain               # ungoverned (no Brain reads/writes)
/dev-loop skip-research skip-retro # raw dev+review only
```

---

## HALT Conditions

1. Hard blocker (write `BLOCKER:` to Brain before stopping)
2. 3 failed review cycles
3. 3 failed implementation attempts
4. Test suite broken
5. User interruption

On HALT: show story, phase, blocker, and suggested next steps.

---

## What this skill is NOT

- **Not a subagent dispatcher.** Single-threaded. Use `bmad-sprint-loop` for parallel Team RAM.
- **Not a CI/CD pipeline.** Implements and reviews, doesn't deploy.
- **Not autonomous-forever.** User confirms at start, HALT conditions are sacred.
- **Not a Brain dump.** Only write memories that help future stories. Trivial observations stay in the conversation.

---

## Brain Memory Flow Summary

| Phase | Reads | Writes |
|-------|-------|--------|
| Activation | Epic context, prior lessons | — |
| Phase 0 (Hydration) | Story context, prior research, review patterns | — |
| Phase 1 (Research) | Prior Context7 lookups | `RESEARCH:` (non-trivial findings) |
| Phase 2 (Implement) | — (uses hydration brief) | `DECISION:` (significant choices), `BLOCKER:` (on halt) |
| Phase 3 (Review) | Prior `REVIEW_PATTERN:`, `FIX_STRATEGY:` | `REVIEW_PATTERN:` (recurring), `FIX_STRATEGY:` (after fix) |
| Phase 4 (Advance) | — | `STORY_COMPLETE:` (outcome trace) |
| Phase 5 (Retro) | All session traces | `LESSON:` (insights), `EPIC_COMPLETE:` (summary) |

**Total per story:** 2-3 reads, 2-4 writes (varies by complexity).
**Total per epic:** All of the above + retro reads/writes.
