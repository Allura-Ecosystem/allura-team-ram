# Data Dictionary: OpenAgentsControl Harness Data Models

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

This document describes every table and event in the OpenAgentsControl Harness data model. Each section includes field definitions, enum values, and links to the JSON Schema for that model.

---

## Table of Contents

- [tasks](#tasks)
- [agents](#agents)
- [events](#events)
- [routing_policy](#routing_policy)
- [performance_metrics](#performance_metrics)

---

## tasks

The `tasks` table stores all tasks submitted to the harness. Each task has a goal, acceptance criteria, mode, and lifecycle state.

Schema: [tasks.schema.json](json-schema/tasks.schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | uuid | Yes | Unique identifier for the task |
| `goal` | text | Yes | Plain-language description of what must be achieved |
| `acceptance_criteria` | jsonb | Yes | Testable conditions for completion (array of strings) |
| `mode` | enum | Yes | Execution mode: `DAY_BUILD` or `NIGHT_BUILD` |
| `status` | enum | Yes | Current state: `pending`, `planning`, `executing`, `validating`, `completed`, `failed`, `blocked` |
| `assigned_agent` | uuid | No | Currently responsible agent (foreign key to `agents.agent_id`) |
| `created_at` | timestamp | Yes | Record creation timestamp (UTC) |
| `updated_at` | timestamp | Yes | Last updated timestamp (UTC) |

**`mode` values**

| Value | Description |
|-------|-------------|
| `DAY_BUILD` | Interactive execution with approval gates |
| `NIGHT_BUILD` | No-brakes deterministic execution |

**`status` values**

| Value | Description |
|-------|-------------|
| `pending` | Task submitted, not yet routed |
| `planning` | Task being planned by OpenAgent |
| `executing` | Task being executed by assigned agent |
| `validating` | Task being validated by OpenCoder or OpenCoder |
| `completed` | Task completed successfully |
| `failed` | Task failed (hard blocker or error) |
| `blocked` | Task blocked waiting for approval or clarification |

---

## agents

The `agents` table stores metadata about each specialized agent in the harness.

Schema: [agents.schema.json](json-schema/agents.schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Unique identifier (e.g., `contextscout`, `coderagent`) |
| `role` | string | Yes | Functional role (e.g., "Discovery", "Implementation", "Architecture") |
| `authority` | jsonb | Yes | Decision-making scope (what this agent can decide) |
| `allowed_tools` | jsonb | Yes | Tools this agent may invoke (array of tool names) |
| `handoff_rules` | jsonb | Yes | Conditions for delegating to other agents |
| `created_at` | timestamp | Yes | Record creation timestamp (UTC) |
| `updated_at` | timestamp | Yes | Last updated timestamp (UTC) |

**`authority` shape**

| Property | Type | Description |
|----------|------|-------------|
| `can_approve` | boolean | Can this agent approve changes? |
| `can_create_files` | boolean | Can this agent create new files? |
| `can_modify_files` | boolean | Can this agent modify existing files? |
| `can_run_commands` | boolean | Can this agent run shell commands? |
| `can_delegate` | boolean | Can this agent delegate to other agents? |

**`allowed_tools` shape**

Array of tool names (strings). Example:
```json
["read_file", "grep_search", "semantic_search", "create_file", "replace_string_in_file"]
```

**`handoff_rules` shape**

| Property | Type | Description |
|----------|------|-------------|
| `on_success` | string | Agent to hand off to on success |
| `on_failure` | string | Agent to hand off to on failure |
| `conditions` | array | Additional conditions for handoff |

---

## events

The `events` table stores all performance events logged by the harness.

Schema: [events.schema.json](json-schema/events.schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | serial | Yes | Auto-incrementing ID |
| `event_type` | varchar(100) | Yes | Type of event (see [Event Types](#event-types)) |
| `group_id` | varchar(100) | Yes | Grouping identifier (e.g., task ID) |
| `agent_id` | varchar(100) | Yes | Agent responsible (e.g., `contextscout`) |
| `status` | varchar(50) | Yes | Outcome: `success`, `failed`, `pending` |
| `metadata` | jsonb | No | Additional context (duration, error message, etc.) |
| `created_at` | timestamp | Yes | Event timestamp (UTC) |

**`event_type` values**

| Value | Description |
|-------|-------------|
| `TASK_START` | Task submitted to harness |
| `TASK_COMPLETE` | Task completed successfully |
| `TASK_FAILED` | Task failed (hard blocker or error) |
| `AGENT_INVOKED` | Agent invoked by routing policy |
| `AGENT_COMPLETED` | Agent completed successfully |
| `AGENT_FAILED` | Agent failed (error or validation failure) |
| `FALLBACK_TRIGGERED` | Fallback agent invoked after primary failure |
| `BLOCKER_HIT` | Hard blocker encountered (no fallback available) |
| `APPROVAL_REQUESTED` | Agent requested approval (DAY_BUILD mode) |
| `APPROVAL_GRANTED` | User granted approval |
| `APPROVAL_DENIED` | User denied approval |
| `DOC_COMPLIANCE_CHECK` | Documentation compliance gate check |

**`status` values**

| Value | Description |
|-------|-------------|
| `success` | Event completed successfully |
| `failed` | Event failed |
| `pending` | Event in progress |

**`metadata` shape**

| Property | Type | Description |
|----------|------|-------------|
| `duration_ms` | integer | Duration in milliseconds |
| `error_message` | string | Error message if failed |
| `from_agent` | string | Source agent for fallback events |
| `to_agent` | string | Target agent for fallback events |
| `reason` | string | Reason for blocker or approval |
| `doc_compliance` | object | Documentation adherence signals |

**`doc_compliance` shape**

| Property | Type | Description |
|----------|------|-------------|
| `guidelines_loaded` | boolean | AI-GUIDELINES.md loaded before execution |
| `required_artifacts_present` | boolean | All required artifacts exist |
| `missing_artifacts` | array | List of missing artifact paths |
| `traceability_updated` | boolean | Requirements Matrix updated |
| `adr_written_if_needed` | boolean | ADR written for significant decisions |

---

## routing_policy

The `routing_policy` table stores the deterministic routing rules.

Schema: [routing_policy.schema.json](json-schema/routing_policy.schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_type` | varchar(100) | Yes | Category of work (e.g., "Discovery", "Implementation") |
| `primary_agent` | varchar(100) | Yes | First-choice agent |
| `fallback_agent` | varchar(100) | No | Backup agent if primary fails |
| `condition` | text | No | When to apply this route |
| `created_at` | timestamp | Yes | Record creation timestamp (UTC) |
| `updated_at` | timestamp | Yes | Last updated timestamp (UTC) |

**`task_type` values**

| Value | Description |
|-------|-------------|
| `Discovery` | Repository structure discovery |
| `Intent/Scope` | Intent and scope definition |
| `Architecture` | Architecture design and ADRs |
| `Implementation` | Code implementation |
| `Refactor` | Code refactoring |
| `Performance` | Performance optimization |
| `Validation` | Interface and code validation |

---

## performance_metrics

The `performance_metrics` table stores pre-calculated metrics for routing decisions.

Schema: [performance_metrics.schema.json](json-schema/performance_metrics.schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | varchar(100) | Yes | Agent identifier |
| `task_type` | varchar(100) | Yes | Task type |
| `success_rate` | decimal | Yes | Success rate (0.0 to 1.0) |
| `avg_duration_ms` | integer | Yes | Average duration in milliseconds |
| `fallback_frequency` | decimal | Yes | Fallback frequency (0.0 to 1.0) |
| `blocker_frequency` | decimal | Yes | Blocker frequency (0.0 to 1.0) |
| `routing_score` | decimal | Yes | Calculated routing score (0.0 to 1.0) |
| `calculated_at` | timestamp | Yes | Calculation timestamp (UTC) |

**Metric calculations**

| Metric | Calculation |
|--------|-------------|
| `success_rate` | `(AGENT_COMPLETED / AGENT_INVOKED) * 100` |
| `avg_duration_ms` | `avg(created_at - start_time)` |
| `fallback_frequency` | `FALLBACK_TRIGGERED / AGENT_INVOKED` |
| `blocker_frequency` | `BLOCKER_HIT / AGENT_INVOKED` |
| `routing_score` | `(success_rate * 0.4) + (1 - normalize(avg_duration_ms) * 0.3) + (1 - fallback_frequency * 0.2) + (1 - blocker_frequency * 0.1)` |

---

## Indexes

The following indexes are created for performance:

```sql
-- events table
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_agent_id ON events(agent_id);
CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_created_at ON events(created_at);

-- tasks table
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- performance_metrics table
CREATE INDEX idx_performance_metrics_agent_id ON performance_metrics(agent_id);
CREATE INDEX idx_performance_metrics_task_type ON performance_metrics(task_type);
CREATE INDEX idx_performance_metrics_calculated_at ON performance_metrics(calculated_at);
```

---

## References

- [BLUEPRINT.md](BLUEPRINT.md) — Single source of design intent
- [DESIGN-LOGGING.md](DESIGN-LOGGING.md) — Performance logging design
- [DESIGN-ROUTING.md](DESIGN-ROUTING.md) — Routing policy design