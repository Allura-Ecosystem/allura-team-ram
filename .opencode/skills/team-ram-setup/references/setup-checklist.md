# Setup checklist

## Receipt

```text
Team RAM setup:
- version parity: pass|fail
- public skills: 10/10 materialized
- canonical roster: 10/10
- modes: DAY_BUILD, NIGHT_BUILD, AUTO
- Brain: connected|unauthorized|unreachable|not configured
- group_id: allura-system
- result: ready|degraded|blocked
```

Brain is optional. A missing Brain connection means standalone mode unless the
task requires durable memory evidence. Never claim a live Brain check from a
local configuration file alone.

## Safe remediation

- Missing or stale public skills: in canonical source, run
  `bun run sync:codex-skills`, then `bun run validate:packed`.
- Version mismatch: rebuild and reinstall the plugin through its marketplace or
  normal plugin manager. Do not edit the installed cache.
- Agent drift: run `node tooling/agent-sync/sync-agents.mjs --check`; review any
  proposed regeneration before applying it.
- Brain authentication or reachability failure: repair the host MCP connection;
  do not change tenant, credentials, or endpoints silently.
