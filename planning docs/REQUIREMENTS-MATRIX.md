# Requirements Traceability Matrix: OpenAgentsControl Harness

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

This matrix traces every Business Requirement, Functional Requirement, and Use Case across the OpenAgentsControl Harness design documentation. Use it to verify coverage, locate specifications, and assess the impact of changes.

---

## Table of Contents

- [1. Business Requirements → Functional Requirements](#1-business-requirements--functional-requirements)
- [2. Functional Requirements Detail](#2-functional-requirements-detail)
  - [Task Management (F1–F4)](#task-management-f1f4)
  - [Agent Orchestration (F5–F8)](#agent-orchestration-f5f8)
  - [Performance Logging (F9–F11)](#performance-logging-f9f11)
  - [Documentation Compliance (F12–F14)](#documentation-compliance-f12f14)
- [3. Use Case Index](#3-use-case-index)
  - [Routing Use Cases](#routing-use-cases)
  - [Logging Use Cases](#logging-use-cases)

---

## 1. Business Requirements → Functional Requirements

| ID | Business Requirement | Functional Requirements | Use Cases |
|----|----------------------|------------------------|-----------|
| B1 | Operators can submit tasks to the harness and receive deterministic execution without manual intervention in NIGHT_BUILD mode | [F1](#f1), [F2](#f2), [F5](#f5), [F8](#f8) | [ROUTING-UC1](#routing-uc1-discovery-task-routing), [ROUTING-UC2](#routing-uc2-implementation-task-with-fallback) |
| B2 | Operators can run tasks interactively with approval gates in DAY_BUILD mode | [F1](#f1), [F4](#f4) | [LOGGING-UC1](#logging-uc1-log-agent-invocation) |
| B3 | The harness learns from execution history to improve routing decisions over time | [F9](#f9), [F10](#f10), [F11](#f11) | [LOGGING-UC2](#logging-uc2-calculate-success-rate) |
| B4 | All agent actions are logged for audit and performance analysis | [F7](#f7), [F9](#f9), [F10](#f10) | [LOGGING-UC1](#logging-uc1-log-agent-invocation), [LOGGING-UC3](#logging-uc3-log-fallback-triggered) |
| B5 | The harness enforces role boundaries and prevents unauthorized tool usage | [F6](#f6) | [ROUTING-UC3](#routing-uc3-architecture-task-with-conflict) |
| B6 | The harness stops on hard blockers or destructive changes requiring approval | [F8](#f8) | [ROUTING-UC2](#routing-uc2-implementation-task-with-fallback) |

---

## 2. Functional Requirements Detail

### Task Management (F1–F4)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f1"></a>F1 | The system MUST accept task submissions with goal, acceptance criteria, and mode | `POST /v1/tasks` · [BLUEPRINT.md §8](BLUEPRINT.md#8-api-surface) |
| <a name="f2"></a>F2 | The system MUST route tasks to the appropriate agent based on task type and routing policy | Routing Table · [DESIGN-ROUTING.md §Routing Table](DESIGN-ROUTING.md#routing-table) |
| <a name="f3"></a>F3 | The system MUST track task lifecycle from pending to completed/failed | Task States · [BLUEPRINT.md §1](BLUEPRINT.md#1-core-concepts) |
| <a name="f4"></a>F4 | The system MUST support both DAY_BUILD and NIGHT_BUILD execution modes | Execution Rules · [BLUEPRINT.md §6](BLUEPRINT.md#6-execution-rules) |

---

### Agent Orchestration (F5–F8)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f5"></a>F5 | The system MUST invoke agents according to the routing policy | Routing Table · [DESIGN-ROUTING.md §Routing Table](DESIGN-ROUTING.md#routing-table) |
| <a name="f6"></a>F6 | The system MUST enforce agent authority boundaries (allowed tools, handoff rules) | Role Constraints · [DESIGN-ROUTING.md §Important Constraints](DESIGN-ROUTING.md#important-constraints) |
| <a name="f7"></a>F7 | The system MUST log all agent invocations with event type, agent ID, status, and metadata | Event Schema · [DESIGN-LOGGING.md §Event Schema](DESIGN-LOGGING.md#event-schema) |
| <a name="f8"></a>F8 | The system MUST support fallback routing when primary agent fails | Fallback Logic · [DESIGN-ROUTING.md §Fallback Logic](DESIGN-ROUTING.md#fallback-logic) |

---

### Performance Logging (F9–F11)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f9"></a>F9 | The system MUST record all performance events to Postgres via MCP_DOCKER tools | Logging Contract · [DESIGN-LOGGING.md §Logging Contract](DESIGN-LOGGING.md#logging-contract) |
| <a name="f10"></a>F10 | The system MUST support event types: TASK_START, TASK_COMPLETE, TASK_FAILED, AGENT_INVOKED, AGENT_COMPLETED, AGENT_FAILED, FALLBACK_TRIGGERED, BLOCKER_HIT, APPROVAL_REQUESTED, APPROVAL_GRANTED, APPROVAL_DENIED | Event Types · [DESIGN-LOGGING.md §Event Types](DESIGN-LOGGING.md#event-types) |
| <a name="f11"></a>F11 | The system MUST provide queryable metrics for reliability, speed, and quality benchmarks | Benchmark Metrics · [DESIGN-LOGGING.md §Benchmark Metrics](DESIGN-LOGGING.md#benchmark-metrics) |

---

### Documentation Compliance (F12–F16)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f12"></a>F12 | All agents MUST load `.opencode/AI-GUIDELINES.md` as required context before execution | Documentation Validation Topology · [SOLUTION-ARCHITECTURE.md §3.4](SOLUTION-ARCHITECTURE.md#34-documentation-validation-topology) |
| <a name="f13"></a>F13 | All agents MUST produce documentation artifacts following AI-GUIDELINES.md templates | Documentation Artifacts · [AI-GUIDELINES.md §2](.opencode/AI-GUIDELINES.md#2-required-documentation-artifacts) |
| <a name="f14"></a>F14 | The system MUST validate documentation completeness as part of DoD | Documentation Validation Topology · [SOLUTION-ARCHITECTURE.md §3.4](SOLUTION-ARCHITECTURE.md#34-documentation-validation-topology) |
| <a name="f15"></a>F15 | The system MUST log documentation adherence signals in performance log | Event Types · [DESIGN-LOGGING.md §Event Types](DESIGN-LOGGING.md#event-types) |
| <a name="f16"></a>F16 | Any work that creates/changes behavior MUST update traceability artifacts (requirements + risks/decisions) per AI-GUIDELINES | Documentation Artifacts · [AI-GUIDELINES.md §2](.opencode/AI-GUIDELINES.md#2-required-documentation-artifacts) |

---

## 3. Use Case Index

### Routing Use Cases

| ID | Name | Design Doc | Requirements |
|----|------|------------|--------------|
| ROUTING-UC1 | Discovery Task Routing | [DESIGN-ROUTING.md#routing-uc1-discovery-task-routing](DESIGN-ROUTING.md#routing-uc1-discovery-task-routing) | F2, F5 |
| ROUTING-UC2 | Implementation Task with Fallback | [DESIGN-ROUTING.md#routing-uc2-implementation-task-with-fallback](DESIGN-ROUTING.md#routing-uc2-implementation-task-with-fallback) | F2, F5, F8 |
| ROUTING-UC3 | Architecture Task with Conflict | [DESIGN-ROUTING.md#routing-uc3-architecture-task-with-conflict](DESIGN-ROUTING.md#routing-uc3-architecture-task-with-conflict) | F2, F5, F6 |

---

### Logging Use Cases

| ID | Name | Design Doc | Requirements |
|----|------|------------|--------------|
| LOGGING-UC1 | Log Agent Invocation | [DESIGN-LOGGING.md#logging-uc1-log-agent-invocation](DESIGN-LOGGING.md#logging-uc1-log-agent-invocation) | F7, F9, F10 |
| LOGGING-UC2 | Calculate Success Rate | [DESIGN-LOGGING.md#logging-uc2-calculate-success-rate](DESIGN-LOGGING.md#logging-uc2-calculate-success-rate) | F11 |
| LOGGING-UC3 | Log Fallback Triggered | [DESIGN-LOGGING.md#logging-uc3-log-fallback-triggered](DESIGN-LOGGING.md#logging-uc3-log-fallback-triggered) | F8, F9, F10 |

---

<!-- === INSTRUCTIONS FOR USE ===

1. This matrix is the coverage map for the entire project.
2. Every F# ID must appear in exactly one design document section.
3. Every B# must map to at least one F#.
4. Every use case label must be findable in a Design document's "Use Cases" section.
5. Update this matrix whenever requirements change — never fall out of sync.
-->
---

### Memory System Requirements (F17–F26)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f17"></a>F17 | The system MUST implement 5 memory tools: `memory_add`, `memory_search`, `memory_get`, `memory_list`, `memory_delete` | Memory Tool Suite · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-2-memory-read--write-api-critical) |
| <a name="f18"></a>F18 | The system MUST expose all memory tools via MCP stdio transport | MCP Server · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-2-memory-read--write-api-critical) |
| <a name="f19"></a>F19 | The system MUST create Neo4j Memory schema with nodes, SUPERSEDES relationships, and deprecated flags | Neo4j Schema · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-1-persistent-storage-critical) |
| <a name="f20"></a>F20 | The system MUST implement federated search across PostgreSQL and Neo4j | Retrieval Pipeline · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-3-retrieval-pipeline-critical) |
| <a name="f21"></a>F21 | The system MUST enforce `group_id` CHECK constraint with `^allura-` prefix | Tenant Isolation · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-6-namespace--tenant-isolation-critical) |
| <a name="f22"></a>F22 | The system MUST create `proposals` table for SOC2 curator queue | Governance Layer · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-5-promotion--governance-critical) |
| <a name="f23"></a>F23 | The system MUST implement agent hooks for session-start read and session-end write | Agent Integration · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-4-agent-access--orchestration-hooks-critical) |
| <a name="f24"></a>F24 | The system MUST provide one-command startup: `npm run start` with auto-migration | Runtime Reliability · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-9-runtime--install-reliability-critical) |
| <a name="f25"></a>F25 | The system MUST create `.env.example` documenting all DB credentials | Configuration · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-9-runtime--install-reliability-critical) |
| <a name="f26"></a>F26 | The system MUST implement CI pipeline with smoke tests for memory tools | CI/CD · [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-9-runtime--install-reliability-critical) |

---

### Memory System Use Cases

| ID | Name | Design Doc | Requirements |
|----|------|------------|--------------|
| MEMORY-UC1 | Agent Reads Memory Before Task | [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-4-agent-access--orchestration-hooks-critical) | F17, F20, F23 |
| MEMORY-UC2 | Agent Writes Memory After Decision | [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-4-agent-access--orchestration-hooks-critical) | F17, F23 |
| MEMORY-UC3 | Federated Search Across PostgreSQL and Neo4j | [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-3-retrieval-pipeline-critical) | F18, F20 |
| MEMORY-UC4 | Insight Promotion to Knowledge Graph | [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-5-promotion--governance-critical) | F19, F22 |
| MEMORY-UC5 | Tenant Isolation Enforcement | [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md#layer-6-namespace--tenant-isolation-critical) | F21 |
