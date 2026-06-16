---
name: "source-command-end-session"
description: "Session finalization - MUST run at end of every session"
---

# source-command-end-session

Use this skill when the user asks to run the migrated source command `end-session`.

## Command Template

# Session End Protocol

**MANDATORY: Run this at the end of EVERY session**

This command persists a durable session reflection and verifies write success using the Allura Brain memory surface.

## Usage

```bash
/end-session Completed Epic docs cleanup and memory hardening updates.
```

## Required Steps

1. Ensure Allura Brain memory access is configured and reachable
2. Create a Reflection entity scoped to `group_id='roninmemory'`
3. Read back to prove durability

## Canonical Write Template (Using Allura Brain Tools)

```javascript
// Step 1: Persist the session reflection
// episodic; auto-queued for curator:approve — never a direct graph write
mcp__allura-brain__memory_add({
  group_id: "allura-system",
  user_id: "openagent",
  content: "Session reflection (" + new Date().toISOString() + "): " + summary,
  metadata: { source: "manual", agent_id: "openagent" }
});

// Step 2: Verify by searching
mcp__allura-brain__memory_search({
  query: "Session Reflection",
  group_id: "allura-system"
});
```

## Success Criteria

- Reflection entity is created
- Search returns the newly written record
- Summary includes what changed + why

## Alternative: Add to Memory Master

Instead of creating new Reflection entities, you can add observations to Memory Master:

```javascript
// episodic; auto-queued for curator:approve — never a direct graph write
mcp__allura-brain__memory_add({
  group_id: "allura-system",
  user_id: "openagent",
  content: "2026-04-03: Completed session - hardened governed memory integration",
  metadata: { source: "manual", agent_id: "openagent" }
});
```

## Never Do This

❌ Direct graph writes or raw Cypher (use the governed `mcp__allura-brain__memory_add` surface instead)
❌ Skip verification step

## Always Do This

✅ Use the Allura Brain memory surface and approved MCP write tools
✅ Verify by searching or reading back
✅ Include timestamp and group_id in observations
