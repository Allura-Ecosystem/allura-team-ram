# Performance Logging Design: OpenAgentsControl Harness

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

This document describes how the OpenAgentsControl Harness logs performance events, what event types are supported, and how metrics are calculated for continuous improvement. It maps logging behavior to the functional requirements defined in [BLUEPRINT.md](BLUEPRINT.md).

---

## Table of Contents

- [Overview](#overview)
- [Functional Requirements](#functional-requirements)
- [Event Schema](#event-schema)
- [Event Types](#event-types)
- [Logging Contract](#logging-contract)
- [Benchmark Metrics](#benchmark-metrics)
- [Use Cases](#use-cases)
- [Important Constraints](#important-constraints)

---

## Overview

The Performance Log is the authoritative source of truth for routing decisions and continuous improvement. It records every agent invocation, task lifecycle event, and routing decision. The log is stored in Postgres and accessed via MCP_DOCKER tools.

The logging system is designed for:

1. **Determinism** — Every event is logged with consistent schema
2. **Queryability** — Metrics can be calculated for any agent, task type, or time range
3. **Auditability** — All events are persisted for analysis
4. **Continuous Improvement** — Performance history drives routing decisions

---

## Functional Requirements

| # | Requirement | Satisfied by |
|---|-------------|--------------|
| [F7](BLUEPRINT.md#f7) | The system MUST log all agent invocations with event type, agent ID, status, and metadata | Event Schema §[Event Schema](#event-schema) |
| [F9](BLUEPRINT.md#f9) | The system MUST record all performance events to Postgres via MCP_DOCKER tools | Logging Contract §[Logging Contract](#logging-contract) |
| [F10](BLUEPRINT.md#f10) | The system MUST support event types: TASK_START, TASK_COMPLETE, TASK_FAILED, AGENT_INVOKED, AGENT_COMPLETED, AGENT_FAILED, FALLBACK_TRIGGERED, BLOCKER_HIT, APPROVAL_REQUESTED, APPROVAL_GRANTED, APPROVAL_DENIED | Event Types §[Event Types](#event-types) |
| [F11](BLUEPRINT.md#f11) | The system MUST provide queryable metrics for reliability, speed, and quality benchmarks | Benchmark Metrics §[Benchmark Metrics](#benchmark-metrics) |

---

## Event Schema

All events are stored in the `events` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  group_id VARCHAR(100) NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | serial | Yes | Auto-incrementing ID |
| `event_type` | varchar(100) | Yes | Type of event (see [Event Types](#event-types)) |
| `group_id` | varchar(100) | Yes | Grouping identifier (e.g., task ID) |
| `agent_id` | varchar(100) | Yes | Agent responsible (e.g., `contextscout`) |
| `status` | varchar(50) | Yes | Outcome (`success`, `failed`, `pending`) |
| `metadata` | jsonb | No | Additional context (duration, error message, etc.) |
| `created_at` | timestamp | Yes | Event timestamp (UTC) |

### Indexes

```sql
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_agent_id ON events(agent_id);
CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_created_at ON events(created_at);
```

---

## Event Types

### Task Lifecycle Events

| Event Type | Description | Status Values |
|------------|-------------|---------------|
| `TASK_START` | Task submitted to harness | `pending` |
| `TASK_COMPLETE` | Task completed successfully | `success` |
| `TASK_FAILED` | Task failed (hard blocker or error) | `failed` |

### Agent Lifecycle Events

| Event Type | Description | Status Values |
|------------|-------------|---------------|
| `AGENT_INVOKED` | Agent invoked by routing policy | `pending` |
| `AGENT_COMPLETED` | Agent completed successfully | `success` |
| `AGENT_FAILED` | Agent failed (error or validation failure) | `failed` |

### Routing Events

| Event Type | Description | Status Values |
|------------|-------------|---------------|
| `FALLBACK_TRIGGERED` | Fallback agent invoked after primary failure | `pending` |
| `BLOCKER_HIT` | Hard blocker encountered (no fallback available) | `failed` |

### Approval Events

| Event Type | Description | Status Values |
|------------|-------------|---------------|
| `APPROVAL_REQUESTED` | Agent requested approval (DAY_BUILD mode) | `pending` |
| `APPROVAL_GRANTED` | User granted approval | `success` |
| `APPROVAL_DENIED` | User denied approval | `failed` |

### Documentation Compliance Events

| Event Type | Description | Status Values |
|------------|-------------|---------------|
| `DOC_COMPLIANCE_CHECK` | Documentation compliance gate check | `success` or `failed` |

---

## Logging Contract

### Mandatory Logging

Every agent invocation MUST log:

1. `AGENT_INVOKED` — Before execution begins
2. `AGENT_COMPLETED` or `AGENT_FAILED` — After execution ends

Every task MUST log:

1. `TASK_START` — When task is submitted
2. `TASK_COMPLETE` or `TASK_FAILED` — When task ends

Every fallback MUST log:

1. `FALLBACK_TRIGGERED` — When fallback agent is invoked

Every blocker MUST log:

1. `BLOCKER_HIT` — When hard blocker is encountered

Every documentation compliance check MUST log:

1. `DOC_COMPLIANCE_CHECK` — Before task completion

### Documentation Adherence Logging

Every run MUST log documentation adherence signals:

```json
{
  "event_type": "DOC_COMPLIANCE_CHECK",
  "group_id": "task-123",
  "agent_id": "coderagent",
  "status": "success",
  "metadata": {
    "guidelines_loaded": true,
    "required_artifacts_present": true,
    "missing_artifacts": [],
    "traceability_updated": true,
    "adr_written_if_needed": true
  }
}
```

### Logging via MCP_DOCKER

All logging MUST use MCP_DOCKER tools:

```javascript
// Example: Log AGENT_INVOKED
MCP_DOCKER_insert_data({
  table_name: "events",
  columns: "event_type, group_id, agent_id, status, metadata",
  values: "'AGENT_INVOKED', 'task-123', 'contextscout', 'pending', '{\"duration_ms\": 0}'"
})
```

### Querying Performance Log

All queries MUST use MCP_DOCKER tools:

```javascript
// Example: Query success rate for ContextScout
MCP_DOCKER_execute_sql({
  sql_query: `
    SELECT 
      COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*) as success_rate
    FROM events
    WHERE agent_id = 'contextscout'
      AND event_type = 'AGENT_COMPLETED'
      AND created_at > NOW() - INTERVAL '7 days'
  `
})
```

---

## Benchmark Metrics

### Reliability Benchmarks

| Metric | Threshold | Calculation |
|--------|-----------|-------------|
| Completion Rate | ≥ 80% | `(TASK_COMPLETE / TASK_START) * 100` |
| Stuck Rate | ≤ 10% | `(TASK_FAILED without BLOCKER_HIT / TASK_START) * 100` |
| Retry Success Rate | ≥ 70% | `(FALLBACK_TRIGGERED → TASK_COMPLETE / FALLBACK_TRIGGERED) * 100` |

### Speed Benchmarks

| Metric | Threshold | Calculation |
|--------|-----------|-------------|
| Time-to-First-Plan (TTFP) | ≤ 10 min | `TASK_START` → first `AGENT_INVOKED` |
| Time-to-First-Validated-Change (TTFVC) | ≤ 30 min | `TASK_START` → first `AGENT_COMPLETED` with validation |
| Total Time-to-DoD (TTDOD) | ≤ 4 hours | `TASK_START` → `TASK_COMPLETE` |

### Quality Benchmarks

| Metric | Threshold | Calculation |
|--------|-----------|-------------|
| Regression Rate | ≤ 5% | `(failed tests after change / total tests) * 100` |
| Interface Growth | Must justify | Net-new interfaces per feature (manual review) |
| Debt Delta | ≤ 0 | `(lint warnings added + type errors added) - (warnings fixed)` |

---

## Use Cases

### LOGGING-UC1: Log Agent Invocation

**Scenario:** ContextScout is invoked for a discovery task.

**Steps:**
1. Routing Policy Engine selects ContextScout
2. Routing Policy Engine logs `AGENT_INVOKED`:
   ```json
   {
     "event_type": "AGENT_INVOKED",
     "group_id": "task-123",
     "agent_id": "contextscout",
     "status": "pending",
     "metadata": {"duration_ms": 0}
   }
   ```
3. ContextScout executes
4. ContextScout logs `AGENT_COMPLETED`:
   ```json
   {
     "event_type": "AGENT_COMPLETED",
     "group_id": "task-123",
     "agent_id": "contextscout",
     "status": "success",
     "metadata": {"duration_ms": 5000}
   }
   ```

**Result:** Events persisted to Postgres, queryable for metrics.

---

### LOGGING-UC2: Calculate Success Rate

**Scenario:** Analytics dashboard queries success rate for CoderAgent.

**Steps:**
1. Dashboard sends `GET /v1/metrics?agent_id=coderagent&event_type=AGENT_COMPLETED`
2. API queries Postgres:
   ```sql
   SELECT 
     COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*) as success_rate
   FROM events
   WHERE agent_id = 'coderagent'
     AND event_type IN ('AGENT_INVOKED', 'AGENT_COMPLETED')
     AND created_at > NOW() - INTERVAL '7 days'
   ```
3. API returns:
   ```json
   {
     "metrics": [{
       "agent_id": "coderagent",
       "success_rate": 85.5
     }]
   }
   ```

**Result:** Success rate calculated and returned to dashboard.

---

### LOGGING-UC3: Log Fallback Triggered

**Scenario:** CoderAgent fails, OpenCoder is invoked as fallback.

**Steps:**
1. CoderAgent logs `AGENT_FAILED`:
   ```json
   {
     "event_type": "AGENT_FAILED",
     "group_id": "task-456",
     "agent_id": "coderagent",
     "status": "failed",
     "metadata": {"error": "Validation failed: interface added without review"}
   }
   ```
2. Routing Policy Engine logs `FALLBACK_TRIGGERED`:
   ```json
   {
     "event_type": "FALLBACK_TRIGGERED",
     "group_id": "task-456",
     "agent_id": "routing_policy_engine",
     "status": "pending",
     "metadata": {"from": "coderagent", "to": "opencoder"}
   }
   ```
3. OpenCoder logs `AGENT_INVOKED` + `AGENT_COMPLETED`

**Result:** Fallback tracked, metrics updated.

---

## Important Constraints

### Logging Constraints

1. **MUST use MCP_DOCKER tools** — No direct database access
2. **MUST log all events** — No silent execution
3. **MUST include metadata** — Duration, error message, etc.
4. **MUST use UTC timestamps** — No local time

### Query Constraints

1. **MUST support filtering by agent** — `agent_id` parameter
2. **MUST support filtering by event type** — `event_type` parameter
3. **MUST support date range** — `start_date`, `end_date` parameters
4. **MUST return JSON** — No raw SQL results

### Retention Constraints

1. **MUST retain events for 90 days** — No premature deletion
2. **MUST archive events older than 90 days** — No data loss
3. **MUST support point-in-time queries** — No overwriting

---

## References

- [BLUEPRINT.md](BLUEPRINT.md) — Single source of design intent
- [SOLUTION-ARCHITECTURE.md](SOLUTION-ARCHITECTURE.md) — Topological view
- [DESIGN-ROUTING.md](DESIGN-ROUTING.md) — Routing policy design
- [DATA-DICTIONARY.md](DATA-DICTIONARY.md) — Field-level reference