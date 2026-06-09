# Data Dictionary: [Service Name] Data Models

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

<!-- One or two sentences describing what this dictionary covers.
     Example: "This document describes every table and event in the [Service Name] data model.
     Each section includes field definitions, enum values, and links to the JSON Schema for that model." -->

---

## Table of Contents

- [[entity_a]](#entity_a)
- [[entity_b]](#entity_b)
- [[entity_c]](#entity_c)
- [Events (Event-Driven Architecture)](#events-event-driven-architecture)

---

## [entity_a]

<!-- Plain-language description of what this table/entity represents, who creates it, and its lifecycle. -->

Schema: [[entity_a].schema.json](../json-schema/[entity_a].schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Unique identifier |
| `name` | string | Yes | <!-- What this field identifies; uniqueness scope if applicable --> |
| `state` | enum | Yes | <!-- Current operational state; values defined below --> |
| `metadata` | jsonb | No | <!-- Optional key/value pairs; purpose and expected keys --> |
| `created_at` | datetime | Yes | Record creation timestamp (UTC) |
| `updated_at` | datetime | Yes | Last updated timestamp (UTC) |

<!-- Add or remove rows as needed. Every field in the JSON schema must appear here. -->

**`state` values**

| Value | Description |
|-------|-------------|
| `[value_1]` | <!-- What this state means operationally --> |
| `[value_2]` | <!-- What this state means operationally --> |

<!-- Add an enum table for every enum-typed field in this entity. -->

---

## [entity_b]

<!-- This entity belongs to [entity_a] and represents … -->

Schema: [[entity_b].schema.json](../json-schema/[entity_b].schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Unique identifier |
| `[entity_a]_id` | uuid | Yes | Foreign key → `[entity_a].id` |
| `name` | string | Yes | <!-- Unique per parent? globally? --> |
| `type` | enum | Yes | <!-- Technology or classification type; values below --> |
| `priority` | integer | Yes | <!-- How priority is used; lower = higher? --> |
| `state` | enum | Yes | |
| `[nested_object]` | jsonb | Yes | <!-- Shape described below or in JSON schema --> |
| `created_at` | datetime | Yes | |
| `updated_at` | datetime | Yes | |

**`type` values**

| Value | Description |
|-------|-------------|
| `[type_1]` | |
| `[type_2]` | |

**`state` values**

| Value | Description |
|-------|-------------|
| `online` | <!-- Entity is active and eligible for operations --> |
| `offline` | <!-- Entity is inactive; operations targeting it are skipped or rejected --> |
| `[other]` | |

**`[nested_object]` shape** — Schema: [[nested_object].schema.json](../json-schema/[nested_object].schema.json)

| Property | Type | Description |
|----------|------|-------------|
| `[property]` | string | |
| `[property]` | string | |

---

## [entity_c]

<!-- This entity is a runtime record produced during [operation]. It tracks … -->

Schema: [[entity_c].schema.json](../json-schema/[entity_c].schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | |
| `[parent]_id` | uuid | Yes | Foreign key → `[parent].id` |
| `status` | enum | Yes | |
| `triggered_by` | string | No | <!-- Who or what initiated this record; format --> |
| `started_at` | datetime | No | Populated when execution begins |
| `finished_at` | datetime | No | Populated when terminal state is reached |
| `created_at` | datetime | Yes | |
| `updated_at` | datetime | Yes | |

**`status` values**

| Value | Description |
|-------|-------------|
| `pending` | Created but not yet started |
| `running` | Currently executing |
| `succeeded` | Completed successfully (terminal) |
| `failed` | Completed with error (terminal) |
| `canceled` | Stopped by operator request (terminal) |
| `skipped` | Bypassed due to state condition (e.g., offline target) |

<!-- Copy this entity block pattern for every additional table/model in the system. -->

---

## [join_or_child_entity]

<!-- This table tracks per-[parent] instances of [entity_c]. One row per [entity] per [parent]. -->

Schema: [[join_entity].schema.json](../json-schema/[join_entity].schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | |
| `[entity_c]_id` | uuid | Yes | Foreign key → `[entity_c].id` |
| `[entity_a]_id` | uuid | Yes | Foreign key → `[entity_a].id` |
| `status` | enum | Yes | Mirrors parent status |
| `order` | integer | Yes | Execution ordering within the parent |
| `[definition_snapshot]` | jsonb | No | <!-- Resolved configuration at execution time; see [DESIGN-EXECUTE.md](../DESIGN-EXECUTE.md) --> |
| `error` | string | No | Error message if `status = failed` |
| `created_at` | datetime | Yes | |
| `updated_at` | datetime | Yes | |

---

## [lock_or_control_table]

<!-- Runtime-only records that enforce [constraint]. Created at [trigger event], released at [terminal event]. -->

Schema: [[lock_table].schema.json](../json-schema/[lock_table].schema.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | |
| `[resource]_id` | uuid | Yes | Foreign key → `[resource].id` — the locked resource |
| `[holder]_id` | uuid | Yes | Foreign key → the record holding this lock |
| `acquired_at` | datetime | Yes | When the lock was created |

> **Note:** These records do not have `updated_at` — they are insert/delete only. There is at most one active lock per `[resource]_id` at any time (enforced by unique constraint).

---

## Events (Event-Driven Architecture)

<!-- If the service uses an event bus, document each event type here. Omit this section if not applicable. -->

### [event.domain.occurred]

**Producer:** <!-- Which component emits this event -->  
**Consumer(s):** <!-- Which components subscribe -->  
**Trigger:** <!-- What system action causes this event to be published -->

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | uuid | Unique event identifier |
| `event_type` | string | `[event.domain.occurred]` |
| `timestamp` | datetime | When the event was emitted (UTC) |
| `[resource]_id` | uuid | The affected resource |
| `[field]` | [type] | <!-- Additional payload field --> |

---

### [event.domain.state_changed]

**Producer:**  
**Consumer(s):**  
**Trigger:**

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | uuid | |
| `event_type` | string | |
| `timestamp` | datetime | |
| `previous_state` | enum | State before the transition |
| `new_state` | enum | State after the transition |

---

<!-- === INSTRUCTIONS FOR USE ===

1. Copy this file to `docs/allura/DATA-DICTIONARY.md`.
2. Add one top-level section (##) per database table or entity in the system.
3. For every field in each JSON schema, add a row to that entity's field table.
4. For every enum field, add a sub-table listing each allowed value and its meaning.
5. For every foreign key, note the target table in the Description column.
6. Link each entity section to its corresponding `json-schema/*.schema.json` file.
7. If the service is event-driven, add one sub-section under "Events" per event type.
8. Keep field names, types, and enum values exactly in sync with the JSON schemas and code models.
9. Remove this instructions block before publishing.

=== CHECKLIST BEFORE MERGING ===
- [ ] One section per entity/table
- [ ] Every JSON schema field appears in the corresponding field table
- [ ] Every enum field has an enum value sub-table
- [ ] Every entity section links to its JSON schema file
- [ ] Field names match exactly between this document, JSON schemas, and code models
- [ ] All foreign key relationships are documented
- [ ] Event section is present (or explicitly marked N/A)
-->
