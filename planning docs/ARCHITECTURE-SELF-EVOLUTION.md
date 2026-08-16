# Architecture: Self-Evolving Harness (Level 3 → Level 4)

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

This document defines the architecture for evolving the OpenAgentsControl Harness from **Level 2 (Adaptive Routing)** to **Level 4 (Self-Evolving Agents)**. The system currently selects the best agent for each task based on performance history. This spec adds the ability for agents to improve their own skills (L3) and for the system to create new agents and skills autonomously (L4), all under HITL governance.

---

## Table of Contents

- [1. Evolution Levels](#1-evolution-levels)
- [2. Architectural Decisions](#2-architectural-decisions)
- [3. Level 3: Self-Learning Architecture](#3-level-3-self-learning-architecture)
  - [3.1 SONA Trajectory Integration](#31-sona-trajectory-integration)
  - [3.2 Pattern Extraction Pipeline](#32-pattern-extraction-pipeline)
  - [3.3 Skill Revision Queue](#33-skill-revision-queue)
  - [3.4 Informed Exploration Router](#34-informed-exploration-router)
  - [3.5 Coherence Monitor](#35-coherence-monitor)
- [4. Level 4: Self-Evolving Architecture](#4-level-4-self-evolving-architecture)
  - [4.1 Genesis Engine](#41-genesis-engine)
  - [4.2 Agent Sandbox](#42-agent-sandbox)
  - [4.3 Cognitum Gate](#43-cognitum-gate)
  - [4.4 Agent Lifecycle (Birth → Promotion → Retirement)](#44-agent-lifecycle)
  - [4.5 Embedding Evolution](#45-embedding-evolution)
- [5. Data Model](#5-data-model)
- [6. Component Topology](#6-component-topology)
- [7. Integration Points](#7-integration-points)
- [8. Governance Invariants](#8-governance-invariants)
- [9. Phased Implementation](#9-phased-implementation)
- [10. Risks](#10-risks)
- [11. Requirements Traceability](#11-requirements-traceability)
- [12. References](#12-references)

---

## 1. Evolution Levels

| Level | Name | What Routes | What Improves | What Creates | Status |
|-------|------|-------------|---------------|-------------|--------|
| **1** | Static | Fixed routing table | Nothing | Nothing | Complete |
| **2** | Adaptive | Performance-based ε-greedy | Agent selection | Nothing | **Current** |
| **3** | Learning | SONA-informed routing | Agent skills & prompts | Nothing | **This spec** |
| **4** | Evolving | Coherence-gated routing | Everything | New agents & skills | **This spec** |

Each level is additive — Level 3 requires Level 2 infrastructure, Level 4 requires Level 3.

---

## 2. Architectural Decisions

### AD-06: SONA as Learning Engine

| Field | Detail |
|-------|--------|
| **Status** | Proposed |
| **Decision** | Adopt `@ruvector/sona` as the learning engine. Every agent invocation is wrapped in a SONA trajectory (`beginTrajectory()` / `endTrajectory()`). Trajectories feed pattern extraction, which drives skill revisions. |
| **Rationale** | SONA provides sub-1ms feedback loops, two-tier LoRA (micro for fast adaptation, base for stable learning), and EWC++ to prevent catastrophic forgetting. We already have SONA wired for evidence-gated feedback on RuVector queries (ADR from 2026-04-13). This extends that to agent execution. |
| **Alternatives** | **Custom learning loop:** Rejected — reinventing what SONA already provides. **No learning:** Status quo — agents never improve from their mistakes. **LLM-as-judge:** Too slow for sub-1ms feedback; useful as a secondary signal, not primary. |
| **Consequences** | Every agent call has ~1ms overhead. Trajectory data accumulates in PG (append-only). Pattern extraction runs async, not blocking execution. |
| **Owner** | Brooks |

### AD-07: HITL Firewall for All Self-Modification

| Field | Detail |
|-------|--------|
| **Status** | Proposed |
| **Decision** | No skill revision, agent creation, or agent retirement happens without HITL curator approval. The system proposes changes; humans approve them. This extends the existing memory promotion policy (confidence ≥ 0.85 → curator review) to skills and agents. |
| **Rationale** | Runaway self-modification is the tar pit of autonomous systems. A system that can rewrite its own instructions without oversight will eventually optimize for the wrong objective. The HITL firewall is the architectural equivalent of "plan to throw one away" — the system proposes many changes, humans select the good ones. |
| **Alternatives** | **Full autonomy:** Rejected — unsafe. **No self-modification:** Status quo — agents never improve. **Threshold-based auto-deploy:** Rejected — thresholds can be gamed by the learning signal. |
| **Consequences** | Human bottleneck on deployment speed. Mitigated by batching proposals and surfacing high-confidence ones first. |
| **Owner** | Brooks |

### AD-08: Coherence Gate Before Deployment

| Field | Detail |
|-------|--------|
| **Status** | Proposed |
| **Decision** | All proposed changes (skill revisions, new agents) pass through a coherence gate before reaching HITL review. The gate uses dynamic min-cut analysis to detect whether a change would break conceptual integrity of the agent system. |
| **Rationale** | HITL reviewers shouldn't waste time on proposals that obviously break the system. The coherence gate is a pre-filter: structural integrity check, drift detection, evidence validation. Only proposals that pass all three filters reach human reviewers. |
| **Alternatives** | **No pre-filter:** Floods curators with noise. **Static rules only:** Misses emergent drift patterns. **Full min-cut on every change:** Too expensive — use only for structural changes, use lighter checks for content-only revisions. |
| **Consequences** | Requires `ruvector-mincut` crate (Rust → WASM). Adds latency to the proposal pipeline, but the pipeline is async so this is acceptable. |
| **Owner** | Brooks |

---

## 3. Level 3: Self-Learning Architecture

### 3.1 SONA Trajectory Integration

**Package:** `@ruvector/sona`

Every agent invocation in `agent-executor.ts` gets wrapped in a SONA trajectory:

```typescript
import { SonaEngine } from '@ruvector/sona';

const sona = new SonaEngine({ 
  ewcLambda: 0.4,        // Memory retention strength
  microLoraRank: 4,       // Fast adaptation rank
  baseLoraInterval: 100   // Base LoRA update every 100 trajectories
});

async function executeAgent(agent, task) {
  const trajectory = sona.beginTrajectory({
    agentId: agent.id,
    taskType: task.type,
    taskId: task.id
  });

  try {
    const result = await callAnthropicAPI(agent, task);
    
    trajectory.record({
      outcome: result.success ? 'success' : 'failure',
      confidence: result.confidence,
      duration: result.duration_ms,
      toolsUsed: result.tools,
      errorType: result.error?.type
    });

    sona.endTrajectory(trajectory);
    return result;
  } catch (error) {
    trajectory.record({ outcome: 'crash', errorType: error.name });
    sona.endTrajectory(trajectory);
    throw error;
  }
}
```

**Data flow:**
```
Agent invocation → SONA trajectory → PG episodic store
                                         ↓
                              Pattern extraction (async)
                                         ↓
                              Skill revision proposal
```

**Key design choice:** Trajectories are logged to PG via Allura Brain (`memory_add`), not a separate store. This keeps the append-only invariant and group_id governance intact. The trajectory is a memory with `event_type: 'SONA_TRAJECTORY'`.

### 3.2 Pattern Extraction Pipeline

**Trigger:** Every N trajectories per agent (configurable, default N=20), or on explicit Brooks request.

**Process:**
1. `sona.findPatterns(agentId)` analyzes trajectories for the agent
2. Returns: recurring failure modes, success patterns, unused tool patterns, duration outliers
3. Each pattern becomes a **Skill Revision Proposal** if confidence ≥ 0.7

**Pattern types:**

| Pattern | Example | Skill Impact |
|---------|---------|-------------|
| **Repeated failure** | Woz fails on TypeScript strict mode 40% of the time | Add TS strict-mode checklist to Woz's skill |
| **Unused capability** | Scout never uses graph traversal for discovery | Remove or document why |
| **Duration outlier** | Bellard takes 3x longer on WASM tasks vs native | Add WASM-specific shortcuts to skill |
| **Success cluster** | Fowler succeeds 95% when starting with test-first | Encode test-first as mandatory in skill |
| **Cross-agent** | Tasks routed Woz→Pike→Woz (bounce) fail 60% | Add Pike pre-check to Woz's skill |

### 3.3 Skill Revision Queue

**New PG table** (append-only, governed by group_id):

```sql
CREATE TABLE skill_revisions (
  id              BIGSERIAL PRIMARY KEY,
  skill_name      TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  revision_type   TEXT NOT NULL,  -- 'content_update' | 'new_section' | 'remove_section' | 'reorder'
  pattern_id      TEXT NOT NULL,  -- Links to the SONA pattern that triggered this
  current_content TEXT,           -- Relevant section of current skill
  proposed_change TEXT NOT NULL,  -- What SONA proposes
  evidence        JSONB NOT NULL, -- Trajectory IDs, success rates, sample outputs
  sona_confidence REAL NOT NULL,  -- 0.0 → 1.0
  gate_status     TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'passed' | 'rejected'
  curator_status  TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  group_id        TEXT NOT NULL DEFAULT 'allura-system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Status flow:**
```
SONA proposes → gate_status: pending
Coherence gate → gate_status: passed | rejected
HITL curator   → curator_status: approved | rejected
Deploy         → skill file updated, graph SUPERSEDES link created
```

### 3.4 Informed Exploration Router

Replaces blind ε-greedy in `performance-router.ts`:

```typescript
async function selectBestAgentWithExploration(
  agentScores: Record<string, AgentPerformance>,
  taskType: string,
  config: RoutingConfig
): Promise<string> {
  // NEW: Ask SONA for informed exploration
  const patterns = await sona.findPatterns(taskType);
  
  if (patterns.suggestedAgent) {
    // SONA knows which agent handles this failure type best
    logExplorationStep(taskType, bestAgent, patterns.suggestedAgent, 'sona_informed');
    return patterns.suggestedAgent;
  }

  // Fallback: ε-greedy for truly unknown territory
  // ... existing logic
}
```

**Why this matters:** Instead of randomly trying agents, SONA routes based on failure type. "This task failed because of TypeScript strict mode" → route to the agent that handles TS strict mode best.

### 3.5 Coherence Monitor

**Package:** `ruvector-mincut` (Rust crate, compiled to WASM for Bun)

Monitors the agent interaction graph for conceptual integrity drift:

**Input:** Agent interaction graph (who delegates to whom, what succeeds, what bounces)

**Metric:** Dynamic min-cut value across the agent graph. A healthy system has high min-cut (strong connections, no single points of failure). A drifting system has declining min-cut (agents becoming disconnected, responsibilities overlapping).

**Thresholds:**
- **Green (≥ 0.8):** System is coherent. No action needed.
- **Yellow (0.5–0.8):** Drift detected. Flag to Brooks for review.
- **Red (< 0.5):** Critical drift. Block new deployments until resolved.

**Integration point:** Runs as a PostToolUse hook. After every agent completion, updates the interaction graph and recalculates min-cut. Lightweight — the dynamic algorithm updates incrementally, not from scratch.

---

## 4. Level 4: Self-Evolving Architecture

Level 4 builds on Level 3's trajectory data and pattern extraction. The key addition: when SONA detects a gap that no existing agent can fill, the system proposes a new agent.

### 4.1 Genesis Engine

**Trigger:** SONA pattern with type `coverage_gap` — a task type where all agents score below threshold (default 0.5 success rate) after minimum 10 attempts.

**Process:**
1. SONA identifies the gap: "No agent handles {task_type} well"
2. Genesis Engine analyzes the failure trajectories: what tools were needed, what skills were missing, what model would work
3. Invokes `plugin-builder` skill to scaffold a new agent definition
4. Invokes `skill-creator` skill to generate initial skills for the agent
5. Proposed agent enters the sandbox (4.2)

**Constraints:**
- Maximum 3 pending genesis proposals at any time (prevents agent proliferation)
- Genesis proposals require Brooks sign-off before entering sandbox
- New agents start with `status: experimental` and ε=1.0 (always explored, never primary)

### 4.2 Agent Sandbox

**Package:** `@ruvector/rvagent-wasm`

New agents run in a WASM sandbox before promotion to production:

```typescript
import { WasmAgent, WasmGallery } from '@ruvector/rvagent-wasm';

async function sandboxTest(agentDef, testTasks) {
  const sandbox = new WasmAgent({
    definition: agentDef,
    isolation: 'strict',  // No file system, no network
    tools: agentDef.allowed_tools
  });

  const results = [];
  for (const task of testTasks) {
    const result = await sandbox.execute(task);
    results.push({
      taskId: task.id,
      success: result.success,
      confidence: result.confidence,
      duration: result.duration_ms
    });
  }

  return {
    agent: agentDef.name,
    passRate: results.filter(r => r.success).length / results.length,
    avgConfidence: results.reduce((s, r) => s + r.confidence, 0) / results.length,
    results
  };
}
```

**Promotion criteria:**
- Pass rate ≥ 0.7 on sandbox test suite
- Outperforms existing agents on the target task type
- Coherence gate passes (min-cut doesn't degrade)
- HITL curator approves

### 4.3 Cognitum Gate

**Packages:** `cognitum-gate-kernel` + `cognitum-gate-tilezero` (Rust → WASM)

Three-layer pre-filter before any self-modification reaches HITL review:

| Filter | What It Checks | Blocks If |
|--------|---------------|-----------|
| **Structural** | Does this change break existing contracts? | Agent loses required tools, skill removes mandatory sections, command changes signature |
| **Shift** | Does this change drift from conceptual integrity? | New agent overlaps >70% with existing agent's role, skill contradicts Brooksian principles |
| **Evidence** | Is there enough data to justify this change? | Fewer than 10 trajectories supporting the pattern, confidence < 0.7, no failure examples |

**Output:** Signed token — `Permit` (proceed to HITL), `Defer` (needs more data), `Deny` (violates integrity).

Only `Permit` tokens reach the curator queue.

### 4.4 Agent Lifecycle

```
              Genesis Engine proposes
                       ↓
              Cognitum Gate filters
                       ↓
              HITL curator approves
                       ↓
         ┌─── Sandbox (experimental) ───┐
         │   ε=1.0, WASM isolation      │
         │   Measured against existing   │
         └────────────┬─────────────────┘
                      ↓ pass rate ≥ 0.7
              Promotion to production
              status: active, ε=0.3
                      ↓ accumulate data
              Exploration decay
              ε → 0.1 after 20 tasks
                      ↓
              Steady state
                      ↓ underperformance detected
              Retirement proposal
              (v2)-[:SUPERSEDES]->(v1) in PostgreSQL graph tables
                      ↓
              HITL curator approves
              status: retired
```

**Graph lineage:** Every agent version gets a node in PostgreSQL graph tables. Evolution is tracked:
```sql
(woz-v3:Agent {version: 3, status: 'active'})
  -[:SUPERSEDES]->
(woz-v2:Agent {version: 2, status: 'retired'})
  -[:SUPERSEDES]->
(woz-v1:Agent {version: 1, status: 'retired'})
```

### 4.5 Embedding Evolution

**Current state:** Static embeddings (nomic-embed-text, 768d) via Ollama.

**Level 4:** SONA's `applyMicroLora()` continuously adjusts embedding weights based on query-outcome pairs. When a search returns results that lead to successful task completion, the embedding space reinforces that path. When results lead to failure, the space adjusts.

**Constraint:** MicroLoRA updates are local and fast (<1ms). Base LoRA updates happen every 100 trajectories and are logged as `EMBEDDING_UPDATE` events. Base updates require evidence threshold (EWC++ prevents catastrophic forgetting of good embeddings).

---

## 5. Data Model

### New Tables (Append-Only)

```
skill_revisions     — Proposed skill changes from SONA patterns
agent_proposals     — Genesis Engine new agent proposals
sandbox_results     — Performance data from sandboxed agent tests
coherence_snapshots — Min-cut values over time
```

### New Event Types

```
SONA_TRAJECTORY          — Raw trajectory from agent invocation
PATTERN_DETECTED         — SONA extracted a recurring pattern
SKILL_REVISION_PROPOSED  — Pattern triggered a skill change proposal
SKILL_REVISION_DEPLOYED  — Curator approved, skill updated
AGENT_GENESIS_PROPOSED   — Genesis Engine proposed new agent
AGENT_PROMOTED           — Sandbox agent promoted to production
AGENT_RETIRED            — Agent retired, SUPERSEDES link created
COHERENCE_CHECK          — Min-cut value recorded
EMBEDDING_UPDATE         — Base LoRA applied to embedding space
```

All events carry `group_id: 'allura-system'`, `agent_id`, and `created_at`. Append-only — no UPDATE/DELETE.

### Graph Extensions (PostgreSQL graph tables)

```sql
// Agent evolution lineage
(agent_v2:Agent)-[:SUPERSEDES]->(agent_v1:Agent)

// Skill revision lineage
(skill_v2:Skill)-[:SUPERSEDES]->(skill_v1:Skill)

// Pattern → Revision traceability
(revision:SkillRevision)-[:TRIGGERED_BY]->(pattern:Pattern)
(pattern:Pattern)-[:OBSERVED_IN]->(trajectory:Trajectory)
```

---

## 6. Component Topology

```
┌─────────────────────────────────────────────────────────┐
│                    ALLURA (Outer Loop)                    │
│  Task dispatch │ Brain memory │ Governance │ HITL queue  │
└────────┬───────────────────────────────────┬─────────────┘
         │ POST /invoke                      │ curator:approve
         ▼                                   ▲
┌─────────────────────────────────────────────────────────┐
│              TEAM RAM HARNESS (Inner Loop)                │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │ Router   │───→│ Agent     │───→│ SONA Trajectory  │  │
│  │ (SONA-   │    │ Executor  │    │ Wrapper          │  │
│  │ informed)│    └───────────┘    └────────┬─────────┘  │
│  └──────────┘                              │             │
│       ↑                                    ▼             │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │ Pattern  │←───│ SONA      │←───│ PG Episodic      │  │
│  │ Extractor│    │ Engine    │    │ Store             │  │
│  └────┬─────┘    └───────────┘    └──────────────────┘  │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │ Skill    │───→│ Coherence │───→│ HITL Curator     │  │
│  │ Revision │    │ Gate      │    │ Queue             │  │
│  │ Queue    │    │ (min-cut) │    └──────────────────┘  │
│  └──────────┘    └───────────┘                           │
│       │                                                  │
│       ▼ (Level 4 only)                                   │
│  ┌──────────┐    ┌───────────┐                           │
│  │ Genesis  │───→│ Agent     │                           │
│  │ Engine   │    │ Sandbox   │                           │
│  └──────────┘    │ (WASM)    │                           │
│                  └───────────┘                           │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐    ┌──────────────────────────┐
│ RuVector        │    │ PostgreSQL Graph Tables    │
│ Vector + HNSW   │    │ SUPERSEDES lineage        │
│ SONA GNN layer  │    │ Pattern → Revision graph  │
└─────────────────┘    └──────────────────────────┘
```

---

## 7. Integration Points

### Existing (No Changes)

| Interface | Endpoint | Contract |
|-----------|----------|----------|
| Agent invocation | `POST /invoke` | `allura-harness-invocation.md` |
| Health check | `GET /health` | Returns PG/graph/uptime status |
| Brain memory | `memory_add` / `memory_search` | MCP allura-brain |
| Governance | PreToolUse hook | `governance-preflight.py` |

### New (Level 3)

| Interface | Type | Contract |
|-----------|------|----------|
| SONA trajectory logging | Internal | `memory_add` with `event_type: 'SONA_TRAJECTORY'` |
| Pattern extraction | Async job | `sona.findPatterns()` → `skill_revisions` table |
| Skill revision queue | PG table | `skill_revisions` (see §5) |
| Coherence monitor | PostToolUse hook | `ruvector-mincut` WASM via Bun |
| Curator queue | Allura Brain | `memory_add` with `event_type: 'SKILL_REVISION_PROPOSED'` |

### New (Level 4)

| Interface | Type | Contract |
|-----------|------|----------|
| Genesis Engine | Internal service | Reads coverage gaps, invokes `plugin-builder` |
| Agent Sandbox | WASM runtime | `@ruvector/rvagent-wasm` isolated execution |
| Cognitum Gate | Pre-HITL filter | Three-layer filter → signed permit/deny tokens |
| Agent lifecycle | PostgreSQL | `agent_proposals` table + SUPERSEDES lineage in graph tables |

---

## 8. Governance Invariants

All existing invariants remain. New additions:

| # | Invariant | Enforcement |
|---|-----------|-------------|
| G1 | `group_id = 'allura-system'` on all new tables | PG CHECK constraint + governance hook |
| G2 | `skill_revisions` and `agent_proposals` are append-only | No UPDATE/DELETE (existing invariant extended) |
| G3 | No skill/agent deployment without `curator_status = 'approved'` | Deploy script checks before writing files |
| G4 | All agent versions tracked in PostgreSQL graph tables with SUPERSEDES | Deploy script creates lineage link |
| G5 | Genesis Engine limited to 3 concurrent proposals | PG CHECK on `agent_proposals WHERE curator_status = 'pending'` |
| G6 | Coherence gate must pass before HITL queue | `gate_status = 'passed'` required for curator visibility |
| G7 | Sandbox agents cannot access filesystem or network | WASM isolation enforced by rvagent-wasm |
| G8 | SONA trajectories are immutable after `endTrajectory()` | Append-only event, no retroactive editing |

---

## 9. Phased Implementation

### Phase A: SONA Trajectory Wiring (Level 3 Foundation)

**Scope:** Install `@ruvector/sona`, wrap `agent-executor.ts`, log trajectories to Brain.

**Files modified:**
- `package.json` — add `@ruvector/sona`
- `src/agent-executor.ts` — wrap invocations in trajectories
- `.opencode/hooks/task-complete.ts` — log SONA trajectory data

**Deliverable:** Every agent invocation produces a trajectory in PG. No behavior change yet — pure instrumentation.

**Verification:** Run integration tests, confirm `SONA_TRAJECTORY` events appear in PG.

### Phase B: Pattern Extraction + Skill Revision Queue

**Scope:** Build pattern extractor, create `skill_revisions` table, surface proposals.

**Files modified:**
- `src/sona-patterns.ts` — new file, pattern extraction service
- PG migration — `skill_revisions` table
- `.opencode/hooks/task-complete.ts` — trigger pattern extraction every N completions

**Deliverable:** SONA detects recurring patterns and writes revision proposals to PG.

**Verification:** After 20+ agent invocations, verify at least one pattern is detected and a revision is proposed.

### Phase C: Coherence Monitor

**Scope:** Build WASM wrapper for `ruvector-mincut`, wire as PostToolUse hook.

**Files modified:**
- `src/coherence-monitor.ts` — new file, min-cut tracking
- `.opencode/hooks/` — new PostToolUse hook for coherence
- PG migration — `coherence_snapshots` table

**Deliverable:** Min-cut value tracked after every agent completion. Yellow/red alerts surface.

### Phase D: Informed Exploration Router

**Scope:** Replace blind ε-greedy with SONA-informed routing.

**Files modified:**
- `.opencode/routing/performance-router.ts` — integrate SONA patterns

**Deliverable:** Router uses failure-type analysis to guide exploration, not random selection.

### Phase E: HITL Curator Interface

**Scope:** Surface skill revisions for human review. Approve/reject workflow.

**Deliverable:** Curator can view pending revisions, see evidence, approve or reject. Approved revisions auto-deploy to skill files.

### Phase F: Genesis Engine (Level 4)

**Scope:** Build coverage gap detection, wire `plugin-builder` + `skill-creator` for agent creation.

**Files modified:**
- `src/genesis-engine.ts` — new file
- PG migration — `agent_proposals` table

### Phase G: Agent Sandbox + Cognitum Gate (Level 4)

**Scope:** WASM sandbox for experimental agents, three-layer coherence gate.

**Dependencies:** `@ruvector/rvagent-wasm`, `cognitum-gate-kernel` (WASM build)

### Phase H: Agent Lifecycle Management (Level 4)

**Scope:** Promotion, retirement, SUPERSEDES lineage in PostgreSQL graph tables.

---

## 10. Risks

### RK-09: SONA Trajectory Volume

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | High |
| **Risk** | Trajectory data accumulates rapidly (one per agent invocation). PG episodic store may grow large. |
| **Mitigation** | Implement trajectory summarization — after base LoRA update (every 100 trajectories), summarize and archive raw trajectories. Keep summaries, prune raw data after 30 days. Append-only invariant applies to summaries, not raw trajectories. |

### RK-10: Skill Revision Drift

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Likelihood** | Medium |
| **Risk** | Cumulative skill revisions could drift a skill away from its original intent. Each revision is small and reasonable, but 50 revisions later the skill is unrecognizable. |
| **Mitigation** | Coherence gate checks cumulative drift, not just individual changes. After every 10 revisions, force a full skill review (not just incremental). SUPERSEDES lineage in PostgreSQL graph tables enables rollback to any prior version. |

### RK-11: Genesis Engine Proliferation

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Likelihood** | Medium |
| **Risk** | Genesis Engine creates too many agents, fragmenting the team. Each new agent adds communication overhead (Brooks's Law). |
| **Mitigation** | Hard cap: 3 concurrent proposals, maximum 15 total agents. Genesis must justify why no existing agent can cover the task type. Retirement must keep pace with creation. |

### RK-12: WASM Sandbox Escape

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Likelihood** | Low |
| **Risk** | Sandboxed agent escapes WASM isolation and accesses filesystem or network. |
| **Mitigation** | rvagent-wasm enforces strict WASM isolation at the VM level. Sandbox runs in a separate Bun worker with no filesystem permissions. Defense in depth: even if WASM is breached, the worker has no access. |

### RK-13: Coherence Gate False Negatives

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Risk** | Coherence gate passes a change that actually degrades conceptual integrity. |
| **Mitigation** | HITL remains the final gate. Coherence gate is a pre-filter, not the decision maker. Log all gate decisions for retrospective analysis. Tune thresholds based on false negative rate. |

---

## 11. Requirements Traceability

| Requirement | How This Spec Satisfies It |
|-------------|---------------------------|
| **B3** — Harness learns from execution history | SONA trajectories + pattern extraction + skill revision pipeline = agents genuinely learn from their history |
| **F2** — Route tasks based on routing policy | Informed exploration router uses SONA patterns, not just performance scores |
| **F7** — Log all agent invocations | SONA trajectories are a superset of current event logging |
| **F8** — Fallback routing when primary fails | SONA-informed exploration replaces blind fallback with failure-type-aware routing |
| **F9** — Record performance events to PG | All new event types (SONA_TRAJECTORY, PATTERN_DETECTED, etc.) logged to PG via MCP_DOCKER |
| **F11** — Queryable metrics | Trajectory data + coherence snapshots provide richer metrics than current event log |
| **AD-01** — Deterministic routing | Maintained — SONA makes exploration smarter, not less deterministic |

---

## 12. References

- [BLUEPRINT.md](BLUEPRINT.md) — Business and functional requirements
- [SOLUTION-ARCHITECTURE.md](SOLUTION-ARCHITECTURE.md) — Current system topology
- [RISKS-AND-DECISIONS.md](RISKS-AND-DECISIONS.md) — Existing AD-01 through AD-05
- [DESIGN-ROUTING.md](DESIGN-ROUTING.md) — Current routing design
- `performance-router.ts` — Current ε-greedy implementation
- `agent-executor.ts` — Agent invocation entry point
- RuVector SONA — `@ruvector/sona` npm package
- RuVector Min-cut — `ruvector-mincut` Rust crate
- RuVector rvAgent — `@ruvector/rvagent-wasm` npm package
- Cognitum Gate — `cognitum-gate-kernel` Rust crate
