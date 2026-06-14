# Brooks Agent Tracking — Unified Cross-Platform Architecture Performance

**Single source of truth:** PostgreSQL `events` table with runtime identification and session grouping.

All Brooks decisions across Claude Code, Copilot, OpenClaw, and OpenCode are logged to the same audit trail. One architect. One ledger.

---

## Overview

```
Claude Code (this session)    
    ↓ metadata: runtime='claude-code', session_id='{uuid}'
Postgres events table (agent_id='brooks', group_id='allura-system')
    ↑ metadata: runtime='copilot', session_id='{uuid}'
Copilot (GitHub integrations)

OpenClaw, OpenCode follow the same pattern
```

---

## Schema

### Events Table (Enhanced)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | bigint | Event ID |
| `agent_id` | varchar | `'brooks'` for all Brooks work |
| `event_type` | varchar | `ADR_CREATED`, `INTERFACE_DEFINED`, `TECH_STACK_DECISION`, etc |
| `runtime` | varchar | `claude-code`, `copilot`, `openclaw`, `opencode` |
| `session_id` | varchar | UUID linking work across platforms |
| `confidence` | numeric | 0.0–1.0 (decision quality) |
| `status` | varchar | `completed`, `blocked`, `proposed` |
| `metadata` | jsonb | Reasoning, principle, alternatives |
| `created_at` | timestamp | When decision was made |
| `group_id` | varchar | `'allura-system'` (tenant isolation) |

### Constraint

```sql
-- Enforce: Brooks must have a runtime specified
ALTER TABLE events ADD CONSTRAINT check_brooks_consistency
  CHECK (agent_id != 'brooks' OR runtime IS NOT NULL);
```

---

## Views for Tracking

### 1. `brooks_decisions`
All architectural decisions by Brooks, any runtime:

```sql
SELECT * FROM brooks_decisions;
-- Returns: id, event_type, runtime, session_id, confidence, status, created_at, metadata
```

**Use:** Dashboard, audit log, decision history.

### 2. `brooks_metrics`
Performance by runtime:

```sql
SELECT * FROM brooks_metrics;
-- Returns: runtime, total_decisions, completed, blocked, avg_confidence, first_decision, last_decision
```

**Example output:**
```
runtime     | total_decisions | completed | blocked | avg_confidence | last_decision
------------|-----------------|-----------|---------|---|---
claude-code | 12              | 11        | 1       | 0.89 | 2026-04-09 10:30:00
copilot     | 5               | 5         | 0       | 0.91 | 2026-04-09 09:15:00
openclaw    | 8               | 7         | 1       | 0.85 | 2026-04-09 08:00:00
```

### 3. `brooks_session_timeline`
Decisions within each session:

```sql
SELECT * FROM brooks_session_timeline
WHERE session_id = '{uuid}';
-- Returns: session_id, runtime, decision_count, completed, avg_confidence, session_start, session_end, duration_seconds, event_types
```

### 4. `brooks_confidence_distribution`
Decision quality by runtime:

```sql
SELECT * FROM brooks_confidence_distribution
ORDER BY runtime, confidence_band;
-- Shows: % of decisions in High/Medium/Low/VeryLow confidence bands
```

### 5. `brooks_principles_applied`
Which Brooksian principles are invoked:

```sql
SELECT * FROM brooks_principles_applied
ORDER BY usage_count DESC;
-- Returns: principle_applied, usage_count, avg_confidence_for_principle
```

---

## How Each Runtime Logs

### Claude Code (This Session)

When logging a decision:

```typescript
// 1. Generate session ID (once per session)
const sessionId = crypto.randomUUID();

// 2. Log to events table with runtime='claude-code'
INSERT INTO events (
  event_type, group_id, agent_id, runtime, session_id,
  status, confidence, metadata
)
VALUES (
  'ADR_CREATED',
  'allura-system',
  'brooks',
  'claude-code',  // ← Runtime identifier
  '${sessionId}',  // ← Session grouping
  'completed',
  0.92,
  jsonb_build_object(
    'principle', 'Conceptual Integrity',
    'decision', 'Cache layer required',
    'reasoning', [...],
    'alternatives', [...]
  )
);
```

### Copilot (GitHub)

Same pattern, but `runtime='copilot'`:

```sql
INSERT INTO events (
  event_type, group_id, agent_id, runtime, session_id, ...
)
VALUES (
  'INTERFACE_DEFINED',
  'allura-system',
  'brooks',
  'copilot',  -- ← Different runtime
  '${sessionId}',
  ...
);
```

### OpenClaw & OpenCode

Same pattern, with `runtime='openclaw'` or `runtime='opencode'`.

---

## Queries for Accountability

### Query 1: All Brooks Decisions This Week

```sql
SELECT
  runtime,
  created_at,
  event_type,
  confidence,
  metadata->>'principle' as principle
FROM brooks_decisions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Query 2: Which Runtime Is Most Active?

```sql
SELECT runtime, COUNT(*) as decision_count
FROM events
WHERE agent_id = 'brooks'
GROUP BY runtime
ORDER BY decision_count DESC;
```

### Query 3: Cross-Platform Session View

```sql
SELECT
  session_id,
  COUNT(DISTINCT runtime) as platforms_involved,
  STRING_AGG(DISTINCT runtime, ', ') as runtimes,
  COUNT(*) as total_decisions,
  AVG(confidence)::NUMERIC(3,2) as avg_confidence
FROM events
WHERE agent_id = 'brooks'
GROUP BY session_id
ORDER BY MAX(created_at) DESC;
```

### Query 4: Confidence Trend

```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as decisions,
  AVG(confidence)::NUMERIC(3,2) as avg_confidence
FROM events
WHERE agent_id = 'brooks'
GROUP BY hour
ORDER BY hour DESC;
```

---

## Session Flow (Updated)

### 1. **Startup** (Claude Code)

```
START SESSION
  ↓
Generate session_id = crypto.randomUUID()
  ↓
Read Brooks persona (.claude/agents/brooks.md)
  ↓
Query: SELECT last 5 events FROM brooks_decisions
  ↓
Display Bootstrap Report (includes current runtime stats)
  ↓
Show Command Menu
  ↓
WAIT FOR USER INPUT
```

### 2. **When Invoking `CA` (Create Architecture)**

```
User: CA
  ↓
Brooks creates ADR + contracts
  ↓
INSERT INTO events (
  event_type='ADR_CREATED',
  agent_id='brooks',
  runtime='claude-code',  ← Captured here
  session_id='${sessionId}',  ← Grouped here
  confidence=0.92,
  metadata={principle, reasoning, alternatives}
)
  ↓
Emit Reflection block (includes event logged confirmation)
  ↓
Return ADR to user
```

### 3. **Exit (`DA`)**

```
User: DA
  ↓
Validation Query:
  SELECT event_type, COUNT(*)
  FROM brooks_decisions
  WHERE session_id='${sessionId}'
  GROUP BY event_type
  ↓
✅ PASS (≥1 ADR created) → Exit permitted
❌ FAIL (0 events) → "No architectural work logged this session"
  ↓
INSERT final session summary event
  ↓
EXIT
```

---

## Metadata Schema (Standardized)

Every Brooks decision includes:

```json
{
  "principle": "Conceptual Integrity|No Silver Bullet|Surgical Team|etc",
  "decision": "What was decided",
  "reasoning": ["step1", "step2", ...],
  "alternatives": [
    {"name": "alt1", "reason_rejected": "..."},
    {"name": "alt2", "reason_rejected": "..."}
  ],
  "tradeoffs": {
    "pro": ["benefit1", "benefit2"],
    "con": ["cost1", "cost2"],
    "risk": ["risk1", "risk2"]
  },
  "context": "situational background"
}
```

This format is consistent across all runtimes.

---

## Dashboard Query (For Monitoring)

```sql
WITH brooks_stats AS (
  SELECT
    runtime,
    COUNT(*) as total_decisions,
    AVG(confidence)::NUMERIC(3,2) as avg_confidence,
    MAX(created_at) as last_decision
  FROM events
  WHERE agent_id = 'brooks'
  GROUP BY runtime
),
principles AS (
  SELECT
    (metadata->>'principle') as principle,
    COUNT(*) as usage_count
  FROM events
  WHERE agent_id = 'brooks'
    AND metadata->>'principle' IS NOT NULL
  GROUP BY principle
  ORDER BY usage_count DESC
)
SELECT 'Brooks Unified Tracking Dashboard' as title,
  (SELECT json_build_object(
    'by_runtime', (SELECT json_object_agg(runtime, to_jsonb(t.*)) FROM brooks_stats t),
    'principles_applied', (SELECT json_object_agg(principle, usage_count) FROM principles)
  )) as metrics;
```

---

## Integration Checklist

- [x] Add `runtime` column to events table
- [x] Add `session_id` column to events table
- [x] Create `brooks_decisions` view
- [x] Create `brooks_metrics` view
- [x] Create `brooks_session_timeline` view
- [x] Create `brooks_confidence_distribution` view
- [x] Create `brooks_principles_applied` view
- [x] Add indexes for performance
- [x] Add constraint for consistency
- [ ] **TODO:** Update Claude Code startup to populate `runtime='claude-code'` + `session_id`
- [ ] **TODO:** Document Copilot integration (how to populate runtime='copilot')
- [ ] **TODO:** Document OpenClaw integration
- [ ] **TODO:** Document OpenCode integration
- [ ] **TODO:** Wire session_id generation in each runtime
- [ ] **TODO:** Add dashboard to admin panel

---

## Key Invariants

1. **agent_id is always 'brooks'** for all Brooks work
2. **group_id is always 'allura-system'** (tenant isolation)
3. **runtime must be populated** when agent_id='brooks' (constraint enforces this)
4. **session_id groups cross-platform work** (same session across Claude Code → Copilot → OpenClaw)
5. **Metadata schema is consistent** (principle, decision, reasoning, alternatives, tradeoffs)
6. **All writes are append-only** (no UPDATE/DELETE on trace rows)

---

## Performance Notes

Indexes created on:
- `events(runtime)` — Fast lookups by platform
- `events(session_id)` — Fast session grouping
- `events(agent_id, created_at)` where agent_id='brooks' — Fast Brooks-only queries
- `events(confidence, agent_id)` — Fast quality distribution analysis

Views are read-only and efficient (no full table scans).

---

## Accountability

Every Brooks decision is:
1. **Logged** — To Postgres with timestamp
2. **Identified** — With agent_id='brooks' + runtime
3. **Grouped** — By session_id for cross-platform tracking
4. **Reasoned** — Metadata includes principle + alternatives
5. **Scored** — Confidence 0.0–1.0 (decision quality)
6. **Auditable** — Query any view to see full decision trail

**No black boxes. Full transparency.**

---

## Next Steps

1. **Deploy** — Run `10-brooks-tracking.sql` on Postgres (migration system will handle it)
2. **Integrate Claude Code** — Populate `runtime='claude-code'` + `session_id` in startup
3. **Integrate Copilot** — Document flow for GitHub integrations
4. **Integrate OpenClaw** — Document flow for OpenCode orchestration
5. **Build Dashboard** — Query `brooks_metrics` + `brooks_decisions` for admin panel

---

**Single architect. One audit trail. Multiple tools.**

*Conceptual integrity is preserved at scale through unified accountability.*
