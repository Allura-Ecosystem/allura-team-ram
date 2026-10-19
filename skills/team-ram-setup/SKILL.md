---
name: team-ram-setup
description: Verify a Team RAM install, its ten-agent roster, public skills, execution modes, and optional Allura Brain connection.
---

# Team RAM Setup

Use this after installing or upgrading the Team RAM plugin. It verifies state;
it does not install, rewrite, or repair anything without explicit approval.

## Fast path

1. From the plugin root, run `bun run team-ram:doctor`.
2. Confirm the receipt reports:
   - matching root, compatibility, and package versions;
   - ten materialized public skills;
   - Brooks, Jobs, Woz, Scout, Pike, Fowler, Bellard, Carmack, Knuth, and
     Hightower in each supported agent mirror;
   - `DAY_BUILD`, `NIGHT_BUILD`, and `AUTO` in the runtime contract.
3. If an installed-cache path is known, rerun with
   `bun run team-ram:doctor -- --installed-root <path>`.
4. If an Allura Brain memory tool is available, call `memory_search` with
   `group_id: allura-system`, a short setup-health query, and `limit: 1`.
   Report unavailable or unauthorized Brain access as degraded standalone mode.

The normal delivery route is Brooks -> Scout -> Woz. Route the other seven
specialists only when their perspective is relevant.

For receipt fields, failure meanings, and safe remediation, read
[`references/setup-checklist.md`](references/setup-checklist.md).
