---
description: "Show current system status — Brain health, active work, blockers, goals"
---

# /status — System Status

Quick status check. Pull from Allura Brain and report.

## What to Show

1. **Brain Health** — Is governed retrieval available? Report subsystem health only with current evidence.
2. **Active Goals** — Search Brain for `GOAL_SET` / `GOAL_RESUMED` entries with `state: active`
3. **Recent Activity** — Last 5 events from `agent_id: 'brooks'`
4. **Open Blockers** — Events with `event_type: 'BLOCKER'` that have no resolution
5. **Recent Decisions** — Latest `ARCHITECTURE_DECISION` events

## Format

```
━━━ Team RAM Status ━━━
Brain:    [Retrieval: available/unavailable] [Subsystem health: verified evidence/unverified]
Goals:    [count active] active, [count paused] paused
Blockers: [count] open
Last:     [most recent event summary]
━━━━━━━━━━━━━━━━━━━━━━━
```

Then present the command menu.
