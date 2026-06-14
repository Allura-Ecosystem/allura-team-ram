---
name: memory-client
description: "Compatibility alias for allura-memory-skill. Use Allura Brain for persistent memory across sessions, but prefer the canonical allura-memory-skill for governance, group_id discipline, and promotion policy."
---

# Allura Brain — Field Guide for Agents

> Compatibility note: `memory-client` is the legacy skill name. New Team RAM and Codex instructions should load `allura-memory-skill`; keep this skill only so older prompts and agent files still resolve.

You are stateless. Brain is your memory. Use it.

## The Loop

Every interaction with Brain follows one pattern:

**Search → Work → Log**

Search before you guess. Log what matters. Skip the noise.

## Connection

Brain is exposed via MCP tools. Use the canonical `allura-brain_*` tools first; fall back to governed `MCP_DOCKER` database/graph access only when you need lower-level inspection.

**group_id**: Always `allura-system`. Every read and write requires it. Pattern: `^allura-[a-z0-9-]+$`.

## Tools

| Tool | When to use |
|------|-------------|
| `allura-brain_memory_search` | Before guessing. Before proposing. Before debugging. Always search first. |
| `allura-brain_memory_add` | After decisions. After fixing bugs. After discovering patterns. |
| `allura-brain_memory_get` | When you have a specific event ID to look up. |
| `allura-brain_memory_list` | When you need recent activity for a user/agent. |
| `allura-brain_memory_update` | Append-only versioned update to an existing memory. Never mutates. |
| `allura-brain_memory_delete` | Soft-delete only. Marks as deprecated, doesn't remove. |
| `allura-brain_memory_promote` | Request curator promotion to knowledge graph. Requires HITL approval. |
| `allura-brain_memory_restore` | Undo a soft-delete within the recovery window. |
| `allura-brain_memory_export` | Export memories for backup or migration. |
| `allura-brain_memory_list_deleted` | Find soft-deleted memories within recovery window. |

## Five Modes

### 1. Hydrate (Session Start)

Before doing anything, find out what you already know.

```javascript
// What happened recently?
allura-brain_memory_search({ query: "session reflection", group_id: "allura-system", limit: 5 })

// What's blocking?
allura-brain_memory_search({ query: "BLOCKER", group_id: "allura-system", limit: 5 })

// What decisions are live?
allura-brain_memory_search({ query: "ARCHITECTURE_DECISION", group_id: "allura-system", limit: 5 })
```

Don't skip this. Your past self left breadcrumbs — follow them.

If Brain is temporarily unavailable, continue with repo evidence instead of guessing, and log the gap once memory returns.

### 2. Plan (Starting Work)

Before breaking down a task, check if it's been planned before.

```javascript
// Has this been attempted?
allura-brain_memory_search({ query: "memory() wrapper implementation", group_id: "allura-system" })

// What similar work has been done?
allura-brain_memory_search({ query: "TraceMiddleware integration", group_id: "allura-system" })
```

After planning, write the plan down:

```javascript
allura-brain_memory_add({
  group_id: "allura-system",
  user_id: "brooks",
  content: "Plan: Implement memory() wrapper. Steps: 1) Define type signature 2) Wire to coordinator 3) Add trace middleware hook. Depends on: Story 1.1 (complete). Risk: coordinator circular dependency."
})
```

### 3. Build (Doing the Work)

Before writing code, search for conventions and past solutions.

```javascript
// How was this done before?
allura-brain_memory_search({ query: "postgres connection pooling pattern", group_id: "allura-system" })

// Any gotchas?
allura-brain_memory_search({ query: "Zod validation boundary convention", group_id: "allura-system" })
```

After making a decision, log it — especially the "why":

```javascript
allura-brain_memory_add({
  group_id: "allura-system",
  user_id: "woz",
  content: "Decision: Use polling not queue for embedding backfill. Why: Simpler, sufficient for current scale (~50K events). Revisit if event volume exceeds 500K. Batch size: 10, model: nomic-embed-text."
})
```

**What's worth logging during build:**
- Decisions and their rationale (most valuable)
- Patterns discovered ("this module assumes X")
- Gotchas ("must handle NULL content rows")
- Convention choices ("validate at boundary only")

**What's noise:**
- "Started working on X" (your git log says this)
- "Read file Y" (ephemeral)
- Play-by-play of steps taken (too granular)

### 4. Debug (Something Breaks)

**Search before investigating.** This is the highest-value habit.

```javascript
// Have we seen this error before?
allura-brain_memory_search({ query: "connection pool exhausted", group_id: "allura-system" })

// Has this component failed before?
allura-brain_memory_search({ query: "neo4j authentication failure", group_id: "allura-system" })
```

After finding the root cause, log the full chain:

```javascript
allura-brain_memory_add({
  group_id: "allura-system",
  user_id: "bellard",
  content: "Bug: Neo4j showing unhealthy, repeated 'missing key credentials' errors. Symptom: MCP tools failing to connect. Root cause: Docker MCP Toolkit had allura-brain enabled, spawning orphan containers from old GHCR image without proper env vars. Fix: docker mcp server disable allura-brain, kill orphans. Prevention: Don't add allura-brain to Toolkit — it runs locally."
})
```

**The debug log format that compounds:**
- Symptom (what you saw)
- Root cause (what was actually wrong)
- Fix (what you did)
- Prevention (how to avoid it next time)

If the same error shows up 3+ times, promote it:

```javascript
allura-brain_memory_promote({
  id: "<memory-id>",
  group_id: "allura-system"
})
```

This queues it for curator approval to enter the knowledge graph.

### 5. Reflect (Session End)

Write what matters for next-you:

```javascript
allura-brain_memory_add({
  group_id: "allura-system",
  user_id: "brooks",
  content: "Session 2026-04-20: Fixed MCP topology. Consolidated MCP config to opencode.json as single source of truth. Allura Brain remains the canonical memory path. Open: allura-web and allura-http-gateway still showing unhealthy — need restart."
})
```

**Good reflections answer:** What changed? What's still open? What should next-me check first?

## Invariants

These are non-negotiable. Violating them causes data corruption or CHECK constraint failures.

- **group_id on every call** — always `allura-system` for this project
- **Postgres is append-only** — never update or delete trace rows
- **Neo4j uses SUPERSEDES** — create new version nodes, never edit existing ones
- **Promotion requires HITL** — agents cannot self-promote; goes through curator pipeline
- **user_id** — use the agent persona name (brooks, woz, bellard, etc.)

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Tools not available | Is Allura Brain reachable and configured? |
| Empty search results | Verify group_id is `allura-system`, not the old `roninclaw-*` |
| Auth errors in Neo4j logs | Something is connecting without credentials — check for orphan containers |
| memory_add fails | Check group_id pattern matches `^allura-[a-z0-9-]+$` |
| Promotion stuck | Normal — requires human approval via `curator:approve` |
