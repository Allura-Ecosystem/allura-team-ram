# Routing Policy Design: OpenAgentsControl Harness

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

This document describes how the Routing Policy Engine selects agents for task execution, how fallback routing works, and how conflict resolution is handled. It maps routing behavior to the functional requirements defined in [BLUEPRINT.md](BLUEPRINT.md).

---

## Table of Contents

- [Overview](#overview)
- [Functional Requirements](#functional-requirements)
- [Routing Table](#routing-table)
- [Fallback Logic](#fallback-logic)
- [Conflict Resolution](#conflict-resolution)
- [Performance-Based Routing](#performance-based-routing)
- [Use Cases](#use-cases)
- [Important Constraints](#important-constraints)

---

## Overview

The Routing Policy Engine is the decision-making core of the OpenAgentsControl Harness. It selects the best agent for a given task type based on:

1. **Task type** — Category of work (Discovery, Architecture, Implementation, etc.)
2. **Performance history** — Success rate, average duration, fallback frequency
3. **Role constraints** — Agent authority, allowed tools, handoff rules

The routing policy is **deterministic** — given the same task type and performance history, it will always select the same agent. This enables measurable performance and continuous improvement.

---

## Functional Requirements

| # | Requirement | Satisfied by |
|---|-------------|--------------|
| [F2](BLUEPRINT.md#f2) | The system MUST route tasks to the appropriate agent based on task type and routing policy | Routing Table §[Routing Table](#routing-table) |
| [F5](BLUEPRINT.md#f5) | The system MUST invoke agents according to the routing policy | Routing Table §[Routing Table](#routing-table) |
| [F6](BLUEPRINT.md#f6) | The system MUST enforce agent authority boundaries (allowed tools, handoff rules) | Role Constraints §[Important Constraints](#important-constraints) |
| [F8](BLUEPRINT.md#f8) | The system MUST support fallback routing when primary agent fails | Fallback Logic §[Fallback Logic](#fallback-logic) |

---

## Routing Table

The routing table defines the primary agent, fallback agent, and condition for each task type.

| Task Type | Primary Agent | Fallback Agent | Condition |
|-----------|---------------|----------------|-----------|
| Discovery | ContextScout | None | Always |
| Intent/Scope | OpenAgent | None | Always |
| Architecture | OpenAgent | None | Always |
| Implementation | CoderAgent | OpenCoder (if interface added) | Always |
| Refactor | OpenCoder | None | Always |
| Performance | OpenCoder | None | Only if perf constraint |
| Validation | OpenCoder | OpenCoder | Always |

### Routing Rules

1. **Discovery tasks** — ALWAYS route to ContextScout first
2. **Intent/Scope tasks** — ALWAYS route to OpenAgent first
3. **Architecture tasks** — ALWAYS route to OpenAgent first
4. **Implementation tasks** — Route to CoderAgent, then OpenCoder if interface added
5. **Refactor tasks** — ALWAYS route to OpenCoder
6. **Performance tasks** — Route to OpenCoder only if performance constraint exists
7. **Validation tasks** — Route to OpenCoder, then OpenCoder if needed

---

## Fallback Logic

When the primary agent fails, the Routing Policy Engine checks for a fallback agent.

### Fallback Algorithm

```
function selectFallbackAgent(taskType, primaryAgent, error):
    fallbackAgent = routingTable[taskType].fallbackAgent
    
    if fallbackAgent is None:
        log BLOCKER_HIT (reason="No fallback agent for task type")
        return OpenAgent  // Escalate to architect
    
    if error is "Agent exceeded authority":
        log BLOCKER_HIT (reason="Authority violation")
        return OpenAgent  // Escalate to architect
    
    if error is "Agent failed validation":
        log FALLBACK_TRIGGERED (from=primaryAgent, to=fallbackAgent)
        return fallbackAgent
    
    return fallbackAgent
```

### Fallback Scenarios

| Scenario | Primary Agent | Error | Fallback Agent | Outcome |
|----------|---------------|-------|----------------|---------|
| Discovery fails | ContextScout | Timeout | None | Escalate to OpenAgent |
| Implementation fails | CoderAgent | Validation error | OpenCoder | Retry with interface review |
| Refactor fails | OpenCoder | Debt detected | None | Escalate to OpenAgent |
| Performance fails | OpenCoder | No perf constraint | None | Skip (not applicable) |

---

## Conflict Resolution

When multiple routing approaches are possible, the Routing Policy Engine resolves conflicts using the following hierarchy:

### Conflict Hierarchy

1. **Performance evidence** — If performance history shows one agent has higher success rate, choose that agent
2. **Role constraints** — If performance evidence is inconclusive, choose agent with appropriate authority
3. **Architect decision** — If role constraints are ambiguous, OpenAgent decides

### Conflict Scenarios

| Conflict | Resolution |
|----------|------------|
| Performance evidence inconclusive | OpenAgent decides based on architecture |
| Architecture ambiguous | OpenAgent decides based on principle |
| Destructive decision required | OpenAgent must approve before routing |

---

## Performance-Based Routing

The Routing Policy Engine queries the Performance Log to make data-driven routing decisions.

### Metrics Used

| Metric | Description | Weight |
|--------|-------------|--------|
| Success Rate | `(AGENT_COMPLETED / AGENT_INVOKED) * 100` | 40% |
| Average Duration | `avg(created_at - start_time)` | 30% |
| Fallback Frequency | `FALLBACK_TRIGGERED / AGENT_INVOKED` | 20% |
| Blocker Frequency | `BLOCKER_HIT / AGENT_INVOKED` | 10% |

### Routing Score Calculation

```
function calculateRoutingScore(agentId, taskType):
    successRate = getSuccessRate(agentId, taskType)
    avgDuration = getAverageDuration(agentId, taskType)
    fallbackFreq = getFallbackFrequency(agentId, taskType)
    blockerFreq = getBlockerFrequency(agentId, taskType)
    
    score = (successRate * 0.4) + 
            (1 - normalize(avgDuration) * 0.3) + 
            (1 - fallbackFreq * 0.2) + 
            (1 - blockerFreq * 0.1)
    
    return score
```

### Routing Decision

```
function selectAgent(taskType):
    primaryAgent = routingTable[taskType].primaryAgent
    fallbackAgent = routingTable[taskType].fallbackAgent
    
    primaryScore = calculateRoutingScore(primaryAgent, taskType)
    
    if fallbackAgent is not None:
        fallbackScore = calculateRoutingScore(fallbackAgent, taskType)
        
        if fallbackScore > primaryScore * 1.2:  // 20% threshold
            log FALLBACK_TRIGGERED (reason="Performance-based routing")
            return fallbackAgent
    
    return primaryAgent
```

---

## Use Cases

### ROUTING-UC1: Discovery Task Routing

**Scenario:** Developer submits a task to discover repository structure.

**Steps:**
1. Developer submits task with `task_type=Discovery`
2. Routing Policy Engine queries Performance Log for ContextScout success rate
3. Routing Policy Engine calculates routing score
4. Routing Policy Engine selects ContextScout (primary agent)
5. ContextScout executes and logs `AGENT_INVOKED` + `AGENT_COMPLETED`

**Result:** Scout Report generated, task marked complete.

---

### ROUTING-UC2: Implementation Task with Fallback

**Scenario:** Developer submits a task to implement a new feature.

**Steps:**
1. Developer submits task with `task_type=Implementation`
2. Routing Policy Engine selects CoderAgent (primary agent)
3. CoderAgent executes and logs `AGENT_INVOKED`
4. CoderAgent adds new interface, logs `AGENT_FAILED` (validation error)
5. Routing Policy Engine checks fallback table
6. Routing Policy Engine selects OpenCoder (fallback agent)
7. Routing Policy Engine logs `FALLBACK_TRIGGERED`
8. OpenCoder executes and logs `AGENT_COMPLETED`

**Result:** Feature implemented with interface review, task marked complete.

---

### ROUTING-UC3: Architecture Task with Conflict

**Scenario:** Developer submits a task to design a new system component.

**Steps:**
1. Developer submits task with `task_type=Architecture`
2. Routing Policy Engine selects OpenAgent (primary agent)
3. OpenAgent logs `AGENT_INVOKED`
4. OpenAgent encounters ambiguous architecture decision
5. OpenAgent requests clarification from OpenAgent
6. OpenAgent provides clarification
7. OpenAgent makes decision and logs `AGENT_COMPLETED`

**Result:** Architecture decision made, task marked complete.

---

## Important Constraints

### Role Constraints

| Agent | Authority | Allowed Tools | Handoff Rules |
|-------|-----------|---------------|---------------|
| ContextScout | Discovery only | Read, grep, find, semantic_search | Handoff to OpenAgent |
| OpenAgent | Intent and scope only | Read, ask_questions | Handoff to OpenAgent |
| OpenAgent | Architecture only | Read, write, create_file, replace_string_in_file | Handoff to CoderAgent |
| CoderAgent | Implementation only | Read, write, create_file, replace_string_in_file, run_in_terminal | Handoff to OpenCoder |
| OpenCoder | Interface validation only | Read, grep, semantic_search | Handoff to OpenCoder |
| OpenCoder | Refactor only | Read, write, create_file, replace_string_in_file | Handoff to OpenAgent |
| OpenCoder | Performance only | Read, run_in_terminal, get_terminal_output | Handoff to CoderAgent |

### Determinism Constraints

1. **MUST choose ONE best route** — No proposing multiple approaches
2. **MUST base decision on Performance Log** — No ad-hoc routing
3. **MUST log all routing decisions** — No silent routing changes

### Fallback Constraints

1. **MUST try fallback before escalating** — No skipping fallback
2. **MUST escalate to OpenAgent if no fallback** — No silent failures
3. **MUST log `FALLBACK_TRIGGERED` on fallback** — No untracked fallbacks

---

## References

- [BLUEPRINT.md](BLUEPRINT.md) — Single source of design intent
- [SOLUTION-ARCHITECTURE.md](SOLUTION-ARCHITECTURE.md) — Topological view
- [DESIGN-LOGGING.md](DESIGN-LOGGING.md) — Performance logging design
- [RISKS-AND-DECISIONS.md](RISKS-AND-DECISIONS.md) — AD-01: Deterministic Routing Policy