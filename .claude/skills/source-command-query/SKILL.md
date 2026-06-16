---
name: "source-command-query"
description: "Memory query — search Allura Brain for insights"
---

# source-command-query

Use this skill when the user asks to run the migrated source command `query`.

## Command Template

# Memory Query

Search Allura Brain for relevant insights.

## Usage

```
/query <search term>
```

## Protocol

### Phase 1: Search Memory

```javascript
// Search Allura Brain
mcp__allura-brain__memory_search({ 
  query: "<search term>",
  group_id: "allura-system",
  limit: 10,
  min_score: 0.7
})
```

### Phase 2: Find Related Entities

```javascript
// List related memories for this persona/tenant
mcp__allura-brain__memory_list({ 
  group_id: "allura-system",
  user_id: "scout-recon",
  limit: 10
})
```

### Phase 3: Present Results

Present:
- Top insights with confidence scores
- Related entities
- Links to source events
- Recommendations for next steps

## Example

```
User: /query authentication patterns

Results:
- INS-042: OAuth2 pattern adopted (confidence: 0.92)
- INS-038: JWT token rotation strategy (confidence: 0.88)
- INS-015: Session management approach (confidence: 0.85)

Related entities:
- TASK-042: Add OAuth2 authentication
- EVT-123: Architecture decision on auth
- ADR-007: Authentication strategy

Recommendation: Review INS-042 for current auth implementation.
```

---

**Invoke with:** `/query <search term>`
