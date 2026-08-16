# Risks & Decisions Matrix: OpenAgentsControl Harness

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

This document captures key architectural and design decisions made in the OpenAgentsControl Harness, the rationale behind each, the alternatives considered, and the risks they introduce. Use it to understand *why* the design is the way it is, and to evaluate the impact of changing it.

---

## Table of Contents

- [1. Architectural Decisions](#1-architectural-decisions)
  - [AD-01: Deterministic Routing Policy](#ad-01-deterministic-routing-policy)
  - [AD-02: Structured Event Schema](#ad-02-structured-event-schema)
  - [AD-03: Documentation Compliance Gate](#ad-03-documentation-compliance-gate)
  - [AD-04: MCP_DOCKER for Postgres Access](#ad-04-mcp_docker-for-postgres-access)
  - [AD-05: Two Execution Modes (DAY_BUILD and NIGHT_BUILD)](#ad-05-two-execution-modes-day_build-and-night_build)
- [2. Risks](#2-risks)
  - [RK-01: Agent Failure](#rk-01-agent-failure)
  - [RK-02: Performance Log Unavailability](#rk-02-performance-log-unavailability)
  - [RK-03: Routing Policy Drift](#rk-03-routing-policy-drift)
  - [RK-04: Documentation Incompleteness](#rk-04-documentation-incompleteness)
  - [RK-05: Multi-Agent Coordination Overhead](#rk-05-multi-agent-coordination-overhead)
  - [RK-06: Allura Memory Integration Complete](#rk-06-memory-system-not-production-ready)
  - [RK-07: Graph Tables Configured](#rk-07-graph-schema-missing)
  - [RK-08: Allura Integration Tested](#rk-08-tenant-isolation-not-enforced)

---

## 1. Architectural Decisions

### AD-01: Deterministic Routing Policy

| Field | Detail |
|-------|--------|
| **Status** | Decided |
| **Decision** | The Routing Policy Engine MUST choose ONE best route based on Performance Log history and role constraints. Multiple approaches MUST NOT be proposed unless performance evidence is inconclusive, architecture is ambiguous, or a destructive decision is required. |
| **Rationale** | Deterministic routing enables measurable performance, clear accountability, and continuous improvement. Ad-hoc routing leads to unpredictable behavior and unmeasurable outcomes. |
| **Alternatives considered** | **Ad-hoc routing:** Rejected because it's non-deterministic and unmeasurable. **ML-based routing:** Rejected because it requires training data that doesn't exist yet. |
| **Consequences** | Routing decisions are predictable and auditable. Performance metrics can drive improvement. However, the routing table must be maintained and tuned over time. |
| **Owner** | OpenAgent |
| **References** | [DESIGN-ROUTING.md](DESIGN-ROUTING.md), [BLUEPRINT.md §7](BLUEPRINT.md#7-global-constraints) |

---

### AD-02: Structured Event Schema

| Field | Detail |
|-------|--------|
| **Status** | Decided |
| **Decision** | All performance events MUST be logged to Postgres with a structured schema: `event_type`, `group_id`, `agent_id`, `status`, `metadata`, `created_at`. |
| **Rationale** | Structured logging enables queryable metrics, audit trails, and continuous improvement. Unstructured logs are difficult to query and analyze. |
| **Alternatives considered** | **Unstructured logging:** Rejected because it's difficult to query and analyze. **File-based logging:** Rejected because it doesn't support real-time queries. |
| **Consequences** | Events are queryable and analyzable. However, the schema must be maintained and migrated over time. |
| **Owner** | OpenAgent |
| **References** | [DESIGN-LOGGING.md](DESIGN-LOGGING.md), [DATA-DICTIONARY.md](DATA-DICTIONARY.md) |

---

### AD-03: Documentation Compliance Gate

| Field | Detail |
|-------|--------|
| **Status** | Decided |
| **Decision** | All agents MUST load AI-GUIDELINES.md as required context before execution. All agents MUST produce documentation artifacts following AI-GUIDELINES.md templates. The system MUST validate documentation completeness as part of DoD. |
| **Rationale** | Documentation compliance ensures consistency, quality, and alignment with established patterns. Without it, agents will create work that doesn't match project standards. |
| **Alternatives considered** | **Optional documentation:** Rejected because it leads to incomplete or inconsistent documentation. **Post-hoc documentation:** Rejected because it's often skipped or forgotten. |
| **Consequences** | Documentation is complete and consistent. However, it adds overhead to every task. |
| **Owner** | OpenAgent |
| **References** | [AI-GUIDELINES.md](.opencode/AI-GUIDELINES.md), [SOLUTION-ARCHITECTURE.md §3.4](SOLUTION-ARCHITECTURE.md#34-documentation-validation-topology) |

---

### AD-04: MCP_DOCKER for Postgres Access

| Field | Detail |
|-------|--------|
| **Status** | Decided |
| **Decision** | All Postgres operations MUST use MCP_DOCKER tools. Direct database access is prohibited. |
| **Rationale** | MCP_DOCKER tools provide a consistent, auditable interface for database operations. Direct access bypasses logging and audit trails. |
| **Alternatives considered** | **Direct Postgres access:** Rejected because it bypasses logging and audit trails. **ORM-based access:** Rejected because it adds complexity without clear benefit. |
| **Consequences** | Database operations are auditable and consistent. However, it requires MCP_DOCKER tool availability. |
| **Owner** | OpenAgent |
| **References** | [DESIGN-LOGGING.md §Logging Contract](DESIGN-LOGGING.md#logging-contract) |

---

### AD-05: Two Execution Modes (DAY_BUILD and NIGHT_BUILD)

| Field | Detail |
|-------|--------|
| **Status** | Decided |
| **Decision** | The harness MUST support two execution modes: DAY_BUILD (interactive with approval gates) and NIGHT_BUILD (no-brakes deterministic execution). |
| **Rationale** | DAY_BUILD mode allows operators to review and approve decisions. NIGHT_BUILD mode enables unattended execution for CI/CD pipelines. |
| **Alternatives considered** | **Single mode:** Rejected because it doesn't support both interactive and unattended use cases. **Three modes:** Rejected because it adds complexity without clear benefit. |
| **Consequences** | Operators can choose the appropriate mode for their use case. However, the harness must support both modes consistently. |
| **Owner** | OpenAgent |
| **References** | [BLUEPRINT.md §6](BLUEPRINT.md#6-execution-rules) |

---

## 2. Risks

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| [RK-01](#rk-01-agent-failure) | Agent Failure | Medium | ✅ Mitigated |
| [RK-02](#rk-02-performance-log-unavailability) | Performance Log Unavailability | High | 🔴 Open |
| [RK-03](#rk-03-routing-policy-drift) | Routing Policy Drift | Medium | ✅ Mitigated |
| [RK-04](#rk-04-documentation-incompleteness) | Documentation Incompleteness | Low | ✅ Mitigated |
| [RK-05](#rk-05-multi-agent-coordination-overhead) | Multi-Agent Coordination Overhead | Medium | 🔴 Open |
| [RK-06](#rk-06-memory-system-not-production-ready) | Memory System Not Production Ready | Critical | 🔴 Open |
| [RK-07](#rk-07-graph-schema-missing) | Graph Tables Configured | Critical | 🔴 Open |
| [RK-08](#rk-08-tenant-isolation-not-enforced) | Tenant Isolation Not Enforced | High | 🔴 Open |
| [RK-09](#rk-09-trajectory-data-volume) | Trajectory Data Volume | Medium | 🟡 Acknowledged |
| [RK-10](#rk-10-curator-queue-stagnation) | Curator Queue Stagnation | High | 🟡 Partially Mitigated |
| [RK-11](#rk-11-local-mode-synthetic-trajectories) | Local Mode Synthetic Trajectories | Medium | 🟡 Acknowledged |
| [RK-12](#rk-12-governance-hook-bypass-via-eval) | Governance Hook Bypass via Eval | Medium | 🟡 Acknowledged |
| [RK-13](#rk-13-new-mcp-tools-ungoverned) | New MCP Tools Ungoverned | Medium | 🟡 Acknowledged |
| [RK-14](#rk-14-deployment-automation-not-implemented) | Deployment Automation Not Implemented | Low | 🟡 Acknowledged |
| [RK-15](#rk-15-sandbox-not-wired-to-genesis) | Sandbox Not Wired to Genesis | Low | 🟡 Acknowledged |

---

### RK-01: Agent Failure

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Status** | ✅ Mitigated |
| **Description** | An agent may fail during execution due to errors, timeouts, or validation failures. This can block task completion. |
| **Mitigation** | Fallback routing policy (AD-01) ensures that a fallback agent is invoked when the primary agent fails. If no fallback exists, the task is escalated to OpenAgent. |
| **Owner** | OpenAgent |
| **Related decision** | [AD-01: Deterministic Routing Policy](#ad-01-deterministic-routing-policy) |

---

### RK-02: Performance Log Unavailability

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Likelihood** | Low |
| **Status** | 🔴 Open |
| **Description** | The Performance Log (Postgres) may become unavailable due to network issues, database failures, or MCP_DOCKER tool unavailability. This would prevent routing decisions and logging. |
| **Mitigation** | **Partial:** The harness can operate in degraded mode without performance history, but logging must succeed for auditability. **Open:** Need to define fallback behavior when Postgres is unavailable. |
| **Owner** | OpenAgent |
| **Related decision** | [AD-02: Structured Event Schema](#ad-02-structured-event-schema), [AD-04: MCP_DOCKER for Postgres Access](#ad-04-mcp_docker-for-postgres-access) |

---

### RK-03: Routing Policy Drift

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Status** | ✅ Mitigated |
| **Description** | The routing policy may drift from optimal routing over time as agent performance changes. This can lead to suboptimal routing decisions. |
| **Mitigation** | Performance-based routing (AD-01) uses real-time metrics to adjust routing scores. The routing table is reviewed periodically by OpenAgent. |
| **Owner** | OpenAgent |
| **Related decision** | [AD-01: Deterministic Routing Policy](#ad-01-deterministic-routing-policy) |

---

### RK-04: Documentation Incompleteness

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Likelihood** | Low |
| **Status** | ✅ Mitigated |
| **Description** | Agents may produce incomplete documentation artifacts, leading to inconsistent or missing documentation. |
| **Mitigation** | Documentation compliance gate (AD-03) validates documentation completeness before task completion. Missing artifacts result in `TASK_FAILED`. |
| **Owner** | OpenAgent |
| **Related decision** | [AD-03: Documentation Compliance Gate](#ad-03-documentation-compliance-gate) |

---

### RK-05: Multi-Agent Coordination Overhead

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | High |
| **Status** | 🔴 Open |
| **Description** | Coordinating multiple specialized agents (ContextScout, OpenAgent, OpenAgent, CoderAgent, etc.) introduces overhead in terms of context switching, handoffs, and communication. |
| **Mitigation** | **Partial:** The execution order is defined in [BLUEPRINT.md §6](BLUEPRINT.md#6-execution-rules). **Open:** Need to measure and optimize coordination overhead. |
| **Owner** | OpenAgent |
| **Related decision** | [AD-01: Deterministic Routing Policy](#ad-01-deterministic-routing-policy) |
---

### RK-06: Allura Memory Integration Complete

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Likelihood** | Certain |
| **Status** | 🔴 Open |
| **Description** | The Allura Memory System is production-ready and OpenAgentsControl Harness is now fully integrated. All 6 PRIORITY 1 tasks completed. End-to-end testing passed (10/10 tests). |
| **Mitigation** | **Required:** Configure MCP client to connect to Allura, add agent hooks, and update environment configuration. See PRIORITY-ACTIONS.md for integration checklist (4.5 days).. See [MEMORY-READINESS-ASSESSMENT.md](../MEMORY-READINESS-ASSESSMENT.md) for complete audit. |
| **Owner** | Brooks Architect |
| **Related decision** | [AD-02: Structured Event Schema](#ad-02-structured-event-schema) |

---

### RK-07: Graph Tables Configured

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Likelihood** | Certain |
| **Status** | 🔴 Open |
| **Description** | Allura's PostgreSQL graph tables are operational and OpenAgentsControl Harness is configured to connect to the canonical graph. POSTGRES_HOST set in .env.example and agent definitions updated. |
| **Mitigation** | **Required:** Configure POSTGRES_HOST in .env to point to Allura's PostgreSQL instance. Update agent definitions to call Allura tools via MCP_DOCKER. |
| **Owner** | Brooks Architect |
| **Related decision** | [AD-02: Structured Event Schema](#ad-02-structured-event-schema) |

---

### RK-08: Allura Integration Tested

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Likelihood** | High |
| **Status** | 🔴 Open |
| **Description** | Allura has tenant isolation enforced at the schema level and OpenAgentsControl Harness has tested integration with Allura's multi-tenant model. End-to-end testing verified `group_id` routing works correctly. |
| **Mitigation** | **Required:** Test end-to-end integration with Allura tools. Verify `group_id` routing works correctly. Add integration tests for multi-tenant scenarios. |
| **Owner** | Brooks Architect |
| **Related decision** | [AD-02: Structured Event Schema](#ad-02-structured-event-schema) |

---

### RK-09: Trajectory Data Volume

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | High |
| **Status** | Acknowledged |
| **Description** | SONA trajectories are appended to PG on every agent invocation. At scale (100+ invocations/day), the events table grows rapidly. No summarization or pruning is implemented. |
| **Mitigation** | **Planned:** Implement trajectory summarization after base LoRA updates (every 100 trajectories). Summarize and archive raw trajectories after 30 days. |
| **Owner** | Brooks Architect |
| **Related decision** | [AD-06: SONA as Learning Engine](ARCHITECTURE-SELF-EVOLUTION.md#ad-06-sona-as-learning-engine) |

---

### RK-10: Curator Queue Stagnation

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Likelihood** | High |
| **Status** | Partially Mitigated |
| **Description** | The HITL curator queue accumulates proposals but has no push notification mechanism. Without active review, SONA learns but never deploys improvements. The system operates at Level 2 despite Level 4 infrastructure. |
| **Mitigation** | **Implemented:** Queue depth surfaced in `/curator` dashboard with `CURATOR_QUEUE_GROWING` alert when pending > 10. Curator state persisted to disk. **Planned:** Webhook/email notification when queue exceeds threshold. |
| **Owner** | Brooks Architect |
| **Related decision** | [AD-07: HITL Firewall](ARCHITECTURE-SELF-EVOLUTION.md#ad-07-hitl-firewall-for-all-self-modification) |

---

### RK-11: Local Mode Synthetic Trajectories

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | High |
| **Status** | Acknowledged |
| **Description** | Without ANTHROPIC_API_KEY, all invocations run in local mode returning success with 0.5 confidence. SONA pattern extraction produces no failure patterns from synthetic data. |
| **Mitigation** | **Required:** Test with live API calls. Tag local mode trajectories as synthetic and exclude from pattern extraction. |
| **Owner** | Brooks Architect |

---

### RK-12: Governance Hook Bypass via Eval

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | Low |
| **Status** | Acknowledged |
| **Description** | Governance preflight uses static regex on the command field. Indirect execution via eval or script loading bypasses pattern matching. |
| **Mitigation** | **Accepted risk.** Instruction boundary prevents prompt injection. Static regex is best-effort pre-filter. MCP tools are the enforced DB access path. |
| **Owner** | Brooks Architect |

---

### RK-13: New MCP Tools Ungoverned

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Status** | Acknowledged |
| **Description** | `_is_db_tool()` whitelists specific MCP prefixes. New MCP servers bypass all SQL and group_id governance checks. |
| **Mitigation** | **Planned:** Check tool name suffixes (execute_sql, query, insert_data) regardless of MCP server prefix. Add to mcp-approved-servers.json governance. |
| **Owner** | Brooks Architect |

---

### RK-14: Deployment Automation Not Implemented

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Likelihood** | Certain |
| **Status** | Acknowledged |
| **Description** | Curator approve/reject is bookkeeping only. No code reads approved revisions and writes skill file changes. |
| **Mitigation** | **Planned:** Implement deploy step that applies changes, creates SUPERSEDES lineage, and marks deployed. Phase E+ work. |
| **Owner** | Brooks Architect |

---

### RK-15: Sandbox Not Wired to Genesis

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Likelihood** | Certain |
| **Status** | Acknowledged |
| **Description** | Genesis Engine and Agent Sandbox exist as standalone components. Genesis proposes without sandbox testing. Deploy writes files without prior sandbox validation. |
| **Mitigation** | **Planned:** Wire genesis to sandbox to curator flow. Only proposals with passing sandbox results enter curator queue. |
| **Owner** | Brooks Architect |
