---
name: team-ram-doctor
description: Diagnose Team RAM packaging, cache, skill, agent-mirror, metadata, mode, and optional Brain connection drift without mutating it.
---

# Team RAM Doctor

Use this when Team RAM agents or skills are missing, stale, duplicated, or
unexpectedly unavailable. Diagnosis is read-only.

## Workflow

1. Run `bun run team-ram:doctor` from canonical source or an unpacked plugin.
2. To compare an installed copy, add `--installed-root <path>`.
3. To inspect another discoverable skill catalog for duplicate names, add
   `--catalog-root <path>`; repeat the flag for additional catalogs.
4. If an Allura Brain memory tool is exposed, run one scoped `memory_search`
   using `group_id: allura-system`. Distinguish unauthorized, unreachable,
   budget-halted, and healthy results.
5. Return the diagnostic receipt and exact suggested command. Never apply a
   repair or edit an installed cache automatically.

The doctor checks version/cache parity, the exact public skill allowlist,
missing content, symlinks, duplicate skill names, oversized descriptions,
canonical agent mirrors, and the three execution modes.

For diagnostic codes and remediation, read
[`references/diagnostics.md`](references/diagnostics.md).
