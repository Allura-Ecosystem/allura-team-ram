---
name: allura-menu
description: Show the compact public Team RAM command surface on request and route only executable installed skills.
---

# Allura Menu

Do not print a menu during ordinary work. By default, show only the active lead,
the decision or result, and one compact next move.

When the user asks for `menu`, `help`, or `MH`, show:

```text
Work       Run the Brooks -> Scout -> Woz delivery path
Rehydrate  Refresh local context plus one focused allura-system Brain query
Research   Route local, API, or current evidence to the proper source
Council    Convene 2–4 real specialists for a bounded decision
Party      Dispatch only useful independent specialist slices
Debug      Find and evidence root cause before changing code
Review     Run findings-first correctness and contract review
Setup      Verify plugin version, roster, skills, modes, and optional Brain
Doctor     Diagnose cache, packaging, skill, agent, and metadata drift
```

## Executable routes

- **Work** uses `team-ram-cowork`.
- **Rehydrate** uses `allura-memory-skill` with
  `group_id: allura-system`; it reuses the current ContextPacket when fresh.
- **Research** uses `multi-search`.
- **Council** uses `roundtable`; it never simulates specialists.
- **Party** uses `party-mode` and dispatches only useful independent slices,
  never every agent by default.
- **Debug** uses `systematic-debugging-memory`.
- **Review** uses `code-review`.
- **Setup** uses `team-ram-setup`.
- **Doctor** uses `team-ram-doctor`.

The menu exposes no command, dashboard, agent shortcut, promotion flow, or
external plugin that is absent from the ten-skill public package. Memory
promotion remains a separate human-governed workflow and is never a menu side
effect.
