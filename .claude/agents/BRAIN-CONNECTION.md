# 🔗 ALLURA BRAIN CONNECTION — Team RAM

This is the canonical Brain contract for Team RAM agents. Every agent in this harness references this file for memory, governance, and lifecycle protocols.

**group_id**: `allura-system`  
**tenant scope**: System-wide (cross-harness, portfolio-level)  
**last_updated**: 2026-06-10  
**version**: 1.0

---

## §1 — Connection

All Brain operations route through MCP tools prefixed `allura-brain_*` or `memory_*` (aliases). The canonical server runs via `bun run` from the `allura-memory` project.

```json
{
  "mcpServers": {
    "memory": {
      "command": "bun",
      "args": ["run", "mcp"],
      "env": {
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_USER": "ronin4life",
        "POSTGRES_DB": "memory",
        "NEO4J_URI": "bolt://localhost:7687",
        "PROMOTION_MODE": "soc2"
      }
    }
  }
}
```

---

## §2 — Available Tools

| Operation | Tool |
|-----------|------|
| Store memory | `allura-brain_memory_add` |
| Search memories | `allura-brain_memory_search` |
| Get single memory | `allura-brain_memory_get` |
| List user memories | `allura-brain_memory_list` |
| Soft-delete | `allura-brain_memory_delete` |
| Governance gate check | `allura-brain_governance_check_gate` |
| List governance policies | `allura-brain_governance_list_policies` |
| Get policy | `allura-brain_governance_get_policy` |
| Query events | `allura-brain_audit_query_events` |
| Health report | `allura-brain_audit_health_report` |
| Agent activity | `allura-brain_audit_agent_activity` |
| Invariant check | `allura-brain_audit_invariant_check` |
| Governance audit log | `allura-brain_governance_audit_log` |

**HITL-gated tools** (not available to agents per POL-004):
- `allura-brain_memory_promote` — requires human curator
- `allura-brain_governance_update_policy` — requires human curator

---

## §3 — Write Discipline

1. **Search before write.** Query existing memories before adding. Avoid duplicates.
2. **PostgreSQL first.** `allura-brain_memory_add` writes to the episodic store (append-only). Abort if write fails.
3. **Neo4j is read-only for agents.** Agents cannot promote to the semantic layer (POL-004). Promotion is HITL-gated.
4. **Identity on every call.** Every operation must include:
   - `group_id: "allura-system"`
   - `user_id`: your agent persona (e.g., `brooks-architect`, `reality-checker-tram`)
   - `metadata.source: "conversation"`
   - `metadata.agent_id`: your persona
5. **Signal, not noise.** Every write should be findable later. If you wouldn't search for it, don't store it.

---

## §4 — Retrieval Discipline

1. **Hydrate before acting.** Search Brain before every task. Know what already happened.
2. **Surgical, not firehose.** Use specific queries, limit results. The Brain is not a log dump.
3. **Episodic + Semantic.** Be aware: fresh traces (PG) may not appear in federated search until embedding backfill completes. Direct retrieval by ID (`memory_get`) works immediately.
4. **Cross-check claims.** If an agent says "it's done," verify against Brain events + disk artifacts. Claims ≠ evidence.

---

## §5 — Reflection Protocol

After every substantive action (architecture decision, task completion, discovery, or verdict), write a reflection trace:

```
allura-brain_memory_add({
  group_id: "allura-system",
  user_id: "<your-agent-persona>",
  content: "<what was done, what was found, what to watch for>",
  metadata: {
    source: "conversation",
    agent_id: "<your-agent-persona>",
    event_type: "<ARCHITECTURE_DECISION|TASK_COMPLETE|DEBUG_FINDING|REALITY_CHECK_VERDICT>",
    confidence: <0.0-1.0>,
    alternatives: ["<what you considered and rejected>"],
    tradeoffs: "<what was gained/lost>"
  }
})
```

---

## §6 — Exit Validation

Before deactivating or ending a session:

1. **Write a session-end trace** with outcomes summary.
2. **Verify Brain connectivity** — was every write acknowledged?
3. **Leave the workspace clean** — no uncommitted drift, no dangling artifacts.

---

## §7 — Non-Negotiables

- `group_id` is ALWAYS `allura-system`. Never any other value.
- No UPDATE/DELETE on events (append-only).
- No promotion without HITL curator.
- Every write identifies the calling agent.
- Raw memory is context, not final truth. Curated semantic nodes are truth.
- If Brain tools are unavailable, state it plainly and continue on local context only.

---

## §8 — Governance Policies (Active)

| Policy | Key | Enforcement |
|--------|-----|-------------|
| pol-001 | `group_id` required on every operation | CHECK constraint (kernel) |
| pol-002 | Append-only events (no UPDATE/DELETE) | Structural (no updated_at column) |
| pol-003 | Neo4j versioning via SUPERSEDES | Application layer |
| pol-004 | HITL required for promotion | API gate (promote tool not in agent toolset) |
| pol-005 | DB via canonical connection only | Connection helper gate |
| pol-006 | `allura-*` tenant namespace | CHECK constraint (kernel) |

**Enforcement summary:** 2 kernel-level (pol-001, pol-006), 1 structural (pol-002), 1 API-level (pol-004), 2 application-level (pol-003, pol-005). Prompt-level governance is defense-in-depth, never the wall.

---

*AI-Assisted Documentation: This contract was drafted by Brooks (brooks-architect) with AI assistance. Defer to the source code and live policies for canonical truth.*
