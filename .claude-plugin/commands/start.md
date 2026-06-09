---
description: "Session initialization — health check, Brain hydration, context load, command menu"
---

# /start — Session Start Protocol

Run at the start of every session. Verifies infrastructure, hydrates context from Allura Brain, and presents the command menu.

## Step 1: Health Check

Verify Brain connectivity:
- Search Allura Brain with `memory_list` or `memory_search` to confirm both PostgreSQL and Neo4j are responding
- Report status. If either fails, warn before continuing.

## Step 2: Scout Hydration

Search for recent context:
1. **Recent activity** — PostgreSQL events: `agent_id='brooks'`, ORDER BY `created_at` DESC LIMIT 5
2. **Blockers** — events WHERE `event_type` IN ('BLOCKER', 'ARCHITECTURE_DECISION')
3. **Insights** — Neo4j insights matching `allura-system`

## Step 3: Synthesize

Report:
- What's active (current work threads)
- What's blocking (open blockers)
- What was decided last session (recent ADRs)

## Step 4: Log Session Start

Add Brain event:
```
allura-brain__memory_add({
  group_id: "allura-system",
  user_id: "brooks-architect",
  content: "SESSION_START [timestamp]",
  metadata: { event_type: "session_start", agent_id: "brooks" }
})
```

## Step 5: Present Menu

```
WS  Status          VA  Validate Arch
NX  Next Steps      CA  Create Arch
GO  Execute         DG  Define Goal
PM  Party Mode      SK  Skill Create
MH  Full Menu       DA  Exit
```
