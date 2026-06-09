# Allura-Harness Process Invocation Contract (v1)

## 1. Overview

This contract defines the interface between Allura (the orchestration layer that owns process definitions, event journaling, and memory governance) and the Team RAM Harness (the execution layer that owns agent definitions, routing, and task execution). The contract follows **Shape A: Process Invocation** -- Allura invokes named processes; the harness resolves each process to a specialist agent, executes the work, and returns a typed result. Allura then records the outcome as a journal event. This shape was chosen because it preserves a clean separation of concerns: Allura never needs to know which agent runs, and the harness never needs to know why a process was requested.

---

## 2. Process Invocation Format

Allura sends a `ProcessInvocation` to the harness entry point. The harness is the sole consumer of this type.

```typescript
interface ProcessInvocation {
  /** Dot-namespaced process identifier. Allura owns the namespace. */
  processName: string;            // e.g. "harness.speckit.implement"

  /** Process-specific input. Schema varies per processName. */
  payload: Record<string, unknown>;

  /** Tenant isolation key. Pattern: ^allura-[a-z0-9-]+$
   *  Defaults to "allura-system". Mandatory on all DB reads/writes. */
  group_id: string;

  /** Optional hints for the harness. Not binding. */
  metadata?: {
    agent_preference?: string;    // Suggest a specific agent
    mode?: "day" | "night";       // DAY_BUILD (approval gates) or NIGHT_BUILD (no-brake)
    priority?: "low" | "normal" | "high";
    correlation_id?: string;      // For tracing across Allura + harness boundaries
  };
}
```

**Invariant:** `group_id` must match `^allura-[a-z0-9-]+$`. The harness rejects any invocation where `group_id` is missing or malformed. The only currently approved tenant is `allura-system`.

---

## 3. Agent Result Format

The harness returns an `AgentResult` for every invocation. Allura consumes this type.

```typescript
interface AgentResult {
  /** Whether the agent completed the process successfully. */
  success: boolean;

  /** The agent that executed the work. Matches harness agent IDs. */
  agent: string;                  // "brooks-architect" | "woz-builder" | ...

  /** The substantive output: code, analysis, design document, etc. */
  output: string | Record<string, unknown>;

  /** Execution telemetry. Always populated on success. */
  metrics?: {
    duration_ms: number;
    tokens_in?: number;
    tokens_out?: number;
  };

  /** Non-empty only when success is false. */
  errors?: string[];

  /** Confidence score (0.0-1.0) for routing feedback and promotion gating. */
  confidence?: number;
}
```

---

## 4. Process-to-Agent Mapping

Each `processName` maps to a primary agent and a methodology. The harness may override this mapping via dynamic routing (see Section 5).

| Process Name | Primary Agent | Methodology |
|---|---|---|
| `harness.speckit.implement` | `woz-builder` | Spec + plan as input, produces code implementation |
| `harness.speckit.validate` | `brooks-architect` | Spec as input, produces architecture review + ADR |
| `harness.discovery.recon` | `scout-recon` | Natural-language query as input, produces file map + context report |
| `harness.refactor.safe` | `fowler-refactor-gate` | Code region + intent as input, produces behavior-preserving refactor |
| `harness.perf.diagnose` | `bellard-diagnostics-perf` | Symptom description as input, produces root-cause analysis + fix |
| `harness.interface.review` | `pike-interface-review` | API surface as input, produces simplicity audit |
| `harness.intent.scope` | `jobs-intent-gate` | Raw task description as input, produces intent brief + acceptance criteria |

---

## 5. Routing Rules

### 5.1 Resolution Order

When the harness receives a `ProcessInvocation`, it resolves the executing agent in this order:

1. **Static map** -- Look up `processName` in the table above (Section 4).
2. **Performance router** -- Query Allura Memory for agent success history on this process type. If an agent has a statistically better success rate (with sufficient sample size), prefer it. The router uses epsilon-greedy exploration (default epsilon = 0.1) to avoid local optima.
3. **Agent preference hint** -- If `metadata.agent_preference` is set and the preferred agent is qualified for the process type, use it. This is advisory, not mandatory.

### 5.2 Fallback Chain

If the resolved agent fails or is unavailable:

1. Check the static routing table for the process's task category.
2. If no fallback is defined, escalate to `brooks-architect` (the chief architect acts as the universal fallback for routing decisions).
3. Log a `FALLBACK_TRIGGERED` event with `from_agent` and `to_agent`.

### 5.3 Mode Effects

- **DAY_BUILD** (`metadata.mode = "day"`): The harness inserts approval gates before destructive steps. Allura should expect asynchronous completion.
- **NIGHT_BUILD** (`metadata.mode = "night"`): No approval gates. The harness executes end-to-end and returns the result synchronously.

---

## 6. Journal Events

Allura records journal events at each phase of a process invocation. All events are append-only in PostgreSQL. The `group_id` from the original invocation is propagated to every event row.

### 6.1 Event Types

| Event Type | Emitted By | When |
|---|---|---|
| `PROCESS_INVOKED` | Allura | Immediately upon receiving a valid `ProcessInvocation` |
| `AGENT_ROUTED` | Harness | After resolving the process to an agent (before execution) |
| `AGENT_COMPLETED` | Harness | Agent finished successfully |
| `AGENT_FAILED` | Harness | Agent finished with errors |
| `FALLBACK_TRIGGERED` | Harness | Primary agent failed; fallback agent selected |
| `EXPLORATION_STEP` | Harness | Performance router chose a non-default agent for exploration |
| `PROCESS_RESULT` | Allura | After receiving and validating the `AgentResult` |

### 6.2 Event Schema

```typescript
interface JournalEvent {
  event_type: string;             // One of the types above
  group_id: string;               // Inherited from ProcessInvocation
  agent_id: string;               // Agent that produced or is subject of the event
  status: "pending" | "success" | "failed" | "fallback";
  metadata: {
    process_name: string;         // The original processName
    correlation_id?: string;      // Links all events for one invocation
    confidence?: number;          // Agent-reported confidence (0.0-1.0)
    duration_ms?: number;
    from_agent?: string;          // For FALLBACK_TRIGGERED
    to_agent?: string;            // For FALLBACK_TRIGGERED
    error?: string;               // For AGENT_FAILED
    [key: string]: unknown;       // Process-specific metadata
  };
  created_at: string;             // ISO 8601 timestamp
}
```

### 6.3 Event Lifecycle for One Invocation

```
Allura                          Harness
  |                               |
  |-- ProcessInvocation --------->|
  |   log PROCESS_INVOKED         |
  |                               |-- resolve agent
  |                               |   log AGENT_ROUTED
  |                               |-- execute
  |                               |   (on failure: log AGENT_FAILED,
  |                               |    log FALLBACK_TRIGGERED, retry)
  |                               |   log AGENT_COMPLETED
  |<--------- AgentResult --------|
  |   log PROCESS_RESULT          |
  |                               |
```

### 6.4 Promotion Rule

Events with `confidence >= 0.85` are candidates for promotion from PostgreSQL (episodic) to Neo4j (semantic). Promotion requires HITL curator approval via `curator:approve` -- it is never autonomous.
