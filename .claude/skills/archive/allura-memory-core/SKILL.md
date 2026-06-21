---
name: allura-memory-core
description: "Core governed Allura memory behavior for OpenClaw sessions: retrieve before planning, write trace summaries after substantive work, enforce group_id/user_id scope, and use approved-only retrieval by default."
---

# allura-memory-core — Governed Memory for OpenClaw

## When to Use

This skill applies to **every OpenClaw session** (interactive, cron, sub-agent). It is the default memory behavior — not an opt-in.

## Core Rules

### 1. Retrieve Before Planning

Before generating any substantive response, plan, or task execution:

```
allura-brain__memory_search(query=<user intent>, group_id=<resolved group>, limit=5)
```

- Use the query that captures the user's *intent*, not just keywords
- If results return, incorporate approved insights into reasoning
- If results return empty with `degraded: false`, that's legitimate "no approved memory" — proceed
- If results return with `degraded: true`, note the degraded state and fall back to native `memory_search`

### 2. Trace After Execution

After completing any non-trivial task (tool use, answer, decision):

```
allura-brain__memory_add(
  group_id=<resolved group>,
  user_id=<resolved user>,
  content=<factual summary of what happened>,
  metadata={ source: "conversation", agent_id: <self>, conversation_id: <session> }
)
```

**What to trace:**
- Decisions made and rationale
- Tasks completed and outcomes
- Errors encountered and resolutions
- User preferences discovered
- Architectural insights

**What NOT to trace:**
- Greetings, acknowledgments
- Raw tool outputs
- Temporary reasoning steps
- Anything the user explicitly says not to record

### 3. Scope Resolution (Implicit)

Every Allura call must carry correct scope. Resolve from session context:

| Field | Source | Default |
|-------|--------|---------|
| `group_id` | `allura-default` for direct chats; group-specific for projects | `allura-default` |
| `user_id` | Sender ID from inbound metadata | Required |
| `project_id` | Workspace or explicit project | `null` (future) |
| `agent_id` | `gilliam-v3` | `gilliam-v3` |
| `session_id` | OpenClaw session key | Auto |

**Never skip scope.** If scope cannot be resolved, log a warning and use `allura-default` — do not omit the call.

### 4. Approved-Only Retrieval

By default, `memory_search` returns **approved insights only**. These are memories that have passed through the curator and approval workflow.

If you need proposed or deprecated insights for debugging, explicitly set `include_global: true` or search with broader filters — but never use unapproved data for production reasoning without acknowledging the source status.

### 5. Cron Job Memory

Scheduled/headless jobs follow the same rules:

```
# At cron job start:
1. memory_search(query=<job context>, group_id=<job group>, limit=5)

# At cron job end:
2. memory_add(group_id=<job group>, user_id=<job agent>, content=<run summary>, metadata={ source: "conversation", agent_id: <cron-agent> })
```

Cron metadata should include: `job_name`, `run_id`, `scheduled_for`, `attempt`.

### 6. Degraded State Handling

When Allura backend is unavailable:

| State | Response |
|-------|----------|
| `no_approved_memory` | Proceed normally; note that no prior context exists |
| `backend_unavailable` | Fall back to native `memory_search`; log warning |
| `scope_error` | Use `allura-default` scope; log warning |

**Never silently treat a backend failure as "no memories exist."** These are different states.

## Prohibited Behaviors

- ❌ Do NOT write directly to Neo4j — all writes go through `memory_add` (episodic trace → curator → approval)
- ❌ Do NOT skip the retrieve-before-plan step, even if you think context is fresh
- ❌ Do NOT store raw user messages as memory — always summarize/distill first
- ❌ Do NOT use unapproved/proposed insights as authoritative knowledge
- ❌ Do NOT parallelize Allura tools with native memory tools as if they're interchangeable

## Fallback Chain

```
Allura memory_search (approved, scoped)
  → If backend unavailable: native memory_search (MEMORY.md + memory/*.md)
    → If both fail: proceed without memory context, note the gap in response
```

## Examples

### Interactive session
```
User: "What did we decide about the auth architecture?"

1. allura-brain__memory_search(query="auth architecture decision", group_id="allura-default", limit=5)
2. [If results found]: "Based on approved memory, the decision was..."
3. [If no results]: "No approved memory found for that topic."
4. allura-brain__memory_add(group_id="allura-default", user_id="+17043309400", content="User asked about auth architecture decision; no approved memory found")
```

### Cron job
```
Job: nightly-health-check

1. allura-brain__memory_search(query="health check failures", group_id="allura-default", limit=5)
2. [Run health checks]
3. allura-brain__memory_add(group_id="allura-default", user_id="cron-agent", content="Nightly health check: 3 warnings found, 0 critical", metadata={ source: "conversation", agent_id: "cron-nightly-health" })
```

## Status

- Version: 0.1.0 (M1 — scope + retrieval + bootstrap)
- Last updated: 2026-04-20
- Owner: Gilliam v3 / Captain
