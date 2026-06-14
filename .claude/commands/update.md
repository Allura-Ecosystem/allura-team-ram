---
description: "Quick update — sync documentation with Allura Brain"
allowed-tools: ["Write", "Read", "Grep", "mcp__MCP_DOCKER__*"]
---

# Quick Update Command

Quickly update Allura Brain and canonical docs with insights from the current session.

## Usage

```
/update <target> <change description>
```

## Targets

| Target          | Destination                                    | Purpose               |
| --------------- | ---------------------------------------------- | --------------------- |
| `decision`      | Allura Brain (memory_add)                      | Architecture decision |
| `blocker`       | Allura Brain (memory_add)                      | Critical blocker      |
| `insight`       | Allura Brain (memory_add)                      | General insight       |
| `blueprint`     | `docs/allura/BLUEPRINT.md` + Brain             | System blueprint      |
| `solution-arch` | `docs/allura/SOLUTION-ARCHITECTURE.md` + Brain | Architecture          |
| `design`        | `docs/allura/DESIGN-ALLURA.md` + Brain         | Design contracts      |
| `requirements`  | `docs/allura/REQUIREMENTS-MATRIX.md` + Brain   | Requirements          |
| `risks`         | `docs/allura/RISKS-AND-DECISIONS.md` + Brain   | ADRs and risks        |
| `data-dict`     | `docs/allura/DATA-DICTIONARY.md` + Brain       | Schema reference      |

## Protocol

### Phase 1: Write to Brain

```javascript
// Store to Allura Brain (source of truth)
mcp__MCP_DOCKER__memory_add({
  group_id: "allura-system",
  user_id: agent_id,
  content: "<change description>",
  metadata: { source: "manual", update_target: target },
})
```

### Phase 2: Sync Canonical Doc (if applicable)

```javascript
// Only for docs/allura/ targets
Read({ path: `docs/allura/${targetFile}.md` })
Write({ path: `docs/allura/${targetFile}.md`, content: updatedContent })
```

### Phase 3: Log Event

```javascript
mcp__MCP_DOCKER__execute_sql({
  sql_query: `INSERT INTO events (event_type, agent_id, group_id, status, metadata, created_at)
    VALUES ('DOC_UPDATE', 'brooks', 'allura-system', 'completed', $1, NOW())`,
  params: [{ target, changeSummary }],
})
```

## Example

```
User: /update decision Decided to use RRF fusion for hybrid search

Updates:
- memory_add → Brain stores the decision
- RISKS-AND-DECISIONS.md gets ADR entry (if target='risks')
- Events logged for audit
```

---

**Invoke with:** `/update <target> <change description>`
