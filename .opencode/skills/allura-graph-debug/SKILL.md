---
name: allura-graph-debug
description: >
  "show me the graph for X", "debug graph connections", "what does the memory graph look like", "trace relationships for X"
---

# Allura Graph Debug (Read-Only)

## Trigger
"show me the graph for X", "debug graph connections", "what does the memory graph look like", "trace relationships for X"

## Required Inputs
| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `group_id` | string | **YES** | Tenant namespace (must match `^allura-*`). No calls without it. |
| `query` | string | yes | Entity name or search term to find in the graph |
| `depth` | number | no | Relationship depth to traverse (default: 2, max: 4) |

## MCP Tool Allowlist
- `mcp__allura-brain__memory_search` — governed Brain search (lead with this)
- Use the host's exposed list/graph diagnostic schema only within authorized tenant scope; never assert persona identity or request an unscoped graph dump

## Output Contract
```json
{
  "nodes": "number — count of entities found",
  "edges": "number — count of relationships",
  "depth": "number — actual traversal depth used",
  "entities": [{ "name": "string", "type": "string", "observations": ["string"] }],
  "relations": [{ "source": "string", "target": "string", "relationType": "string" }]
}
```

## Guardrails
- **READ-ONLY.** This skill must NEVER create, update, or delete any entity or relationship.
- **group_id required.** Every call must include group_id. Reject if missing.
- **Governed access only.** Inspect host schemas for `memory_search` / `memory_list` and supported graph diagnostics. If absent, report the capability unavailable; no direct database fallback. Preserve immutable `SUPERSEDES` lineage.
- **Depth cap.** Never traverse beyond depth 4 — risk of OOM on large graphs.
- **No exfiltration.** Never return data from a group_id the caller doesn't belong to.
