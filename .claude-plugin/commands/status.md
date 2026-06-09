---
description: "Show current system status — Brain health, active work, blockers, goals"
---

# /status — System Status

Quick status check. Pull from Allura Brain and report.

## What to Show

1. **Brain Health** — Are PostgreSQL and Neo4j responding?
2. **Active Goals** — Search Brain for `GOAL_SET` / `GOAL_RESUMED` entries with `state: active`
3. **Recent Activity** — Last 5 events from `agent_id: 'brooks'`
4. **Open Blockers** — Events with `event_type: 'BLOCKER'` that have no resolution
5. **Recent Decisions** — Latest `ARCHITECTURE_DECISION` events

## Format

```
━━━ Team RAM Status ━━━
Brain:    [PostgreSQL: OK/FAIL] [Neo4j: OK/FAIL]
Goals:    [count active] active, [count paused] paused
Blockers: [count] open
Last:     [most recent event summary]
━━━━━━━━━━━━━━━━━━━━━━━
```

Then present the command menu.
