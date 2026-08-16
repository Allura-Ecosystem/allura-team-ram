# ARCHITECTURE.md — Agent Orchestration Framework

**Repository:** allura-team-ram

This document describes the architecture of the Team RAM agent orchestration
framework — a self-evolving, HITL-gated harness that routes work to
role-specialized LLM subagents, records every invocation as a learning
trajectory, extracts behavioral patterns, and promotes validated knowledge
through a curator pipeline. Every claim below is grounded in the source files
under `src/`; file paths are cited inline.

---

## 1. Execution Model — `src/agent-executor.ts`

The executor is the single entry point for invoking an agent. It is called by
`src/http-server.ts` (`executeInvocation`, line 170) and by
`src/auto-mode.ts` (`executeAutoMode`, line 99).

### Control flow

`spawnAgentProcess(agentId, payload, group_id, modelOverride?)` (line 211) is
the public API. The flow is:

1. **Trajectory open** — `beginTrajectory()` is called immediately (line 222),
   before any I/O, so failures are always recorded. The task type is derived
   from `payload.process_name` via `classifyTask()` (line 107).
2. **Definition load** — `loadAgentDefinition(agentId)` (line 121) reads
   `.opencode/agent/<name>.md`, strips YAML frontmatter, and returns the
   markdown body. This body becomes the system prompt verbatim.
3. **Model resolution** — `getModelForAgent(agentId)` (line 88) loads
   `tooling/agent-sync/models.map.json`, maps the agent to a tier, then maps
   the tier alias (`opus`/`sonnet`/`haiku`) to a concrete Anthropic model ID
   via `CLAUDE_TIER_IDS` (line 64). An explicit `modelOverride` bypasses this.
4. **Invocation** — two modes:
   - **API mode** (`ANTHROPIC_API_KEY` set): direct `fetch` to the Anthropic
     Messages API (`callAnthropicAPI`, line 154) with a 30-second
     `AbortController` timeout (`DEFAULT_TIMEOUT_MS`, line 149).
   - **Local mode** (no key): the definition is loaded and a structured
     `local` result is returned (line 298). This is a dev/test path that
     proves the pipeline without API spend.
5. **Output parse** — `parseAgentOutput()` (line 391) extracts a JSON envelope
   from a ```` ```json ```` code block or raw JSON, falling back to treating
   the raw text as output with `confidence: 0.75`.
6. **Trajectory close** — `trajectory.complete()` is called with the outcome
   (line 288 for API success, line 330 for local, line 348 for caught errors).

### State transitions within a single invocation

The executor does not maintain cross-invocation state itself — that is
delegated to `agent-lifecycle.ts` and `coherence-monitor.ts`, both called by
the HTTP layer after the executor returns. The executor's own state machine
is per-call:

```
started → definition_loaded → model_resolved → [api_call | local_stub]
        → output_parsed → trajectory_completed → AgentExecutionResult
```

On any thrown error, the catch block (line 341) still closes the trajectory
with `success: false` and classifies the outcome as `"timeout"` when the error
name is `AbortError`, otherwise `"failure"` (line 368).

### Return contract

`AgentExecutionResult` (line 17) carries: `success`, `output`,
`confidence`, `duration_ms`, `tokens_in/out`, `errors`, `trajectory`,
`model`, `outcome` (`"success" | "failure" | "timeout"`), and `task_class`.
The `outcome` field exists specifically so a fallback rescue is never
conflated with primary success — a note attributed to Bellard in the source
comment (line 95).

### Process-to-agent mapping

`PROCESS_AGENT_MAP` (line 39) statically maps dot-namespaced process names to
agent IDs:

| Process name                     | Agent    |
|----------------------------------|----------|
| `harness.speckit.implement`      | `woz`    |
| `harness.speckit.validate`       | `brooks` |
| `harness.discovery.recon`        | `scout`  |
| `harness.refactor.safe`          | `fowler` |
| `harness.perf.diagnose`          | `bellard`|
| `harness.interface.review`       | `pike`   |
| `harness.intent.scope`           | `jobs`   |

`mapProcessToAgent()` (line 53) falls back to `brooks` for unknown processes.
A dynamic performance router
(`.opencode/routing/performance-router`) can override the static mapping at
the HTTP layer (`http-server.ts` line 181); if it fails, the static agent is
used.

---

## 2. Lifecycle Management — `src/agent-lifecycle.ts`

Manages the birth-to-retirement arc of every agent version:

```
Genesis (register) → experimental (ε=1.0) → promote → active (ε=0.3)
                  → decay (ε→0.1) → retire
```

### Registry initialization

`initializeRegistry()` (line 54) scans `.opencode/agent/*.md` at startup,
reads `status:` from frontmatter, and populates an in-memory `Map<string,
AgentVersion>`. The HTTP server calls this once on boot
(`http-server.ts` line 168).

### `AgentVersion` shape (line 21)

Fields: `agentId`, `version`, `status` (`experimental | active | retired`),
`epsilon` (exploration rate), `createdAt`, `promotedAt`, `retiredAt`,
`supersedes` (agentId this replaced), `taskTypes`, `totalInvocations`,
`successRate`.

### Lifecycle operations

- **`registerAgent(agentId, taskTypes, supersedes?)`** (line 92) — creates a
  new experimental version (ε=1.0), logs `AGENT_CREATED`.
- **`promoteAgent(agentId)`** (line 122) — requires `status ===
  "experimental"`. Runs the **cognitum gate** (see §3) before transitioning to
  `active` with ε=0.3. If the agent `supersedes` an active agent, the old one
  is retired automatically (line 153–157).
- **`retireAgent(agentId, reason?)`** (line 167) — transitions to `retired`.
  Core agents (`brooks`, `woz`, `scout`, `jobs`) cannot be retired (line 177).
- **`recordAgentInvocation(agentId, success)`** (line 194) — called by the
  HTTP layer after every executor return (`http-server.ts` line 248).
  Increments invocation count, updates running success rate, and decays
  epsilon for active agents after 20 invocations (`ε *= 0.95`, floor 0.1).
- **`findRetirementCandidates()`** (line 212) — returns active agents with
  ≥20 invocations and <30% success rate.

### Event log

Every transition appends a `LifecycleEvent` (line 35) to an in-memory array.
`getLifecycleDashboard()` (line 256) exposes counts, retirement candidates,
and recent events. The HTTP layer surfaces this at `GET /lifecycle`.

---

## 3. Sandbox and Isolation — `src/agent-sandbox.ts`

### Sandbox execution

`runSandboxTests(agentName, testTasks)` (line 52) runs an experimental agent
through a test suite in isolation. Preconditions:

1. The agent definition file must exist at `.opencode/agent/<name>.md`.
2. The file must contain `status: experimental` in frontmatter (line 73).

Each task is executed in a restricted context. The source comment (line 87)
notes that production isolation would use `@ruvector/rvagent-wasm` for WASM
sandboxing; the current implementation is an eval-free simulation that
records per-task `success`, `confidence` (0.5 in local mode), and
`duration_ms`.

**Promotion threshold:** `PROMOTION_THRESHOLD = 0.7` (line 46) — 70% pass
rate required for `promotionEligible: true`.

### Cognitum gate — three-layer pre-filter

`cognitumGate(changeType, agentId, evidence, existingAgents)` (line 153) is
the structural integrity check called by `promoteAgent()` before any agent
reaches production. Three layers, all must pass for `token: "permit"`:

| Layer        | Check                                                            | Fail condition                                  |
|--------------|-----------------------------------------------------------------|-------------------------------------------------|
| Structural   | `checkStructural()` (line 177)                                  | Duplicate agent name; retiring would leave <3 agents |
| Shift        | `checkShift()` (line 195)                                       | Shared prefix >5 chars with existing agent; ≥15 agents (Brooks's Law) |
| Evidence     | `checkEvidence()` (line 222)                                    | <10 trajectories; confidence <0.7               |

Decision logic (line 170): if all pass → `permit`; if evidence fails but
others pass → `defer` (needs more data); if structural/shift fail but
evidence passes → `deny`. Only `permit` proceeds to HITL curator review.

---

## 4. Planning Loops — `src/genesis-engine.ts`

The Genesis Engine proposes new agents when SONA pattern extraction detects a
`coverage_gap` — a task type where no existing agent achieves >50% success
after ≥10 attempts across ≥2 agents (`sona-trajectory.ts` line 313).

### Proposal generation

`proposeNewAgent(taskType, patterns)` (line 175):

1. **`inferAgentSpec()`** (line 37) — analyzes failure patterns to determine:
   - **Model**: `haiku` if duration outliers exist, else `sonnet`.
   - **Tools**: base `Read, Grep, Glob` + task-keyword-dependent additions
     (`Edit, Write, Bash` for implement/build; `Bash` for test; `Bash, Agent`
     for discover/recon).
   - **Name**: derived from the task type (e.g.
     `harness.speckit.implement` → `speckit-implement-specialist`).
2. **`generateAgentDefinition()`** (line 78) — produces a full markdown agent
   file with YAML frontmatter (`status: experimental`, `mode: subagent`), an
   instruction boundary section, persona, and memory protocol.
3. **Curator submission** — `submitAgentProposal()` is called with the spec,
   evidence patterns, and confidence (line 184). Returns a proposal ID or
   `null` if the curator queue is full (max 3 concurrent).

### Deployment

`deployAgent(spec)` (line 208) writes the generated definition to
`.opencode/agent/<name>.md` via `Bun.write`. This is only called after curator
approval — **AD-07: HITL firewall, no autonomous agent creation** (source
comment, line 12).

### Multi-step workflow composition

The Genesis Engine does not itself compose multi-step execution plans. That
role belongs to `auto-mode.ts` (§8), which uses complexity assessment to
select between single-pass, iterative, and epic-dispatch strategies. Genesis
is the *coverage-gap* loop: it observes that the existing agent roster cannot
handle a task type and proposes a new specialist to fill it.

---

## 5. Trajectory Tracking — `src/sona-trajectory.ts`

Every agent invocation is wrapped in a SONA trajectory — a structured record
of context, outcome, and timing that feeds pattern extraction and (when
available) a native learning engine.

### Dual-runtime architecture

The module attempts to load `@ruvector/sona` (NAPI-RS native module) at first
use (`loadNativeEngine()`, line 127). If available, it constructs a
`SonaEngine(ewcLambda=4, microLoraRank=4, baseLoraInterval=100)` and uses it
for sub-1ms trajectory capture with LoRA adaptation and EWC++ memory
retention. If unavailable, it falls back to a pure-TypeScript stats tracker.
The TS layer always runs (line 186) regardless of native availability —
pattern extraction reads from it.

### Trajectory lifecycle

`beginTrajectory(ctx)` (line 152) returns an object with:

- `id` — `traj-<agentId>-<timestamp>-<random>` (line 154)
- `complete(outcome)` — records to native engine (if present), calls
  `recordStats()`, increments `_trajectoryCount`, returns a
  `TrajectoryRecord` (line 190).
- `fail(error)` — delegates to `complete()` with `success: false` (line 208).

### `TrajectoryRecord` (line 48)

```
{ trajectory_id, context: TrajectoryContext, outcome: TrajectoryOutcome,
  started_at, completed_at }
```

`TrajectoryContext` (line 30): `agentId`, `taskType`, `taskId?`,
`processName?`, `group_id`.
`TrajectoryOutcome` (line 38): `success`, `confidence`, `duration_ms`,
`tokens_in`, `tokens_out`, `errorType?`, `errors[]`.

### Stats tracking (TS layer)

`recordStats()` (line 88) maintains two maps:
- `agentStats: Map<agentId, AgentStats>` — per-agent totals.
- `taskTypeStats: Map<taskType, Map<agentId, AgentStats>>` — per-task-type,
  per-agent.

Each `AgentStats` (line 70) tracks `totalTasks`, `successes`, `failures`,
`totalDuration`, and `errorTypes: Map<string, number>`.

### Deterministic replay

The trajectory ID is deterministic given `agentId` + timestamp + random
suffix. The `TrajectoryRecord` captures full context and outcome, enabling
post-hoc replay: given the same `TrajectoryContext` and model, the executor
can re-invoke and compare outcomes. The native engine's `findPatterns()` API
provides embedding-based similarity search over past trajectories for
informed exploration.

---

## 6. Pattern Recognition — `src/sona-patterns.ts` + `sona-trajectory.ts`

### Pattern types

`SonaPattern` (defined in `sona-trajectory.ts` line 56):

| Type               | Trigger                                                    | Source          |
|--------------------|------------------------------------------------------------|-----------------|
| `repeated_failure` | Agent success rate <50% over ≥5 tasks                      | `extractPatterns()` line 241 |
| `success_cluster`  | Agent success rate ≥90% over ≥5 tasks, or best agent for a task type >50% | line 253, 300 |
| `duration_outlier` | Agent avg duration >3× global average                      | line 270 |
| `coverage_gap`     | All agents <50% on a task type, ≥2 agents, ≥10 total attempts | line 313 |

### Extraction trigger

`sona-patterns.ts` is the extraction service. `onInvocationComplete()` (line
120) is called by the HTTP layer after every invocation
(`http-server.ts` line 259). It increments a counter and runs
`runExtraction()` every `EXTRACTION_INTERVAL` invocations (default 20, env
`SONA_EXTRACTION_INTERVAL`).

`runExtraction()` (line 133):
1. Calls `forceLearn()` on the native SONA engine (if present).
2. Calls `extractAllPatterns()` — iterates all agents and task types,
   deduplicates by `type:agentId:taskType` key (line 342).
3. Converts high-confidence patterns (≥0.7) to `SkillRevisionProposal`s via
   `patternToProposal()` (line 41).
4. Returns `{ patterns, proposals, invocationCount }`.

The HTTP layer then submits each proposal to the curator
(`http-server.ts` line 261) and triggers Genesis for any `coverage_gap`
patterns (line 266).

### Proposal mapping

`patternToProposal()` (line 41) maps pattern types to revision types:

| Pattern             | `revision_type`  | `proposed_change`                         |
|---------------------|------------------|-------------------------------------------|
| `repeated_failure`  | `new_section`    | Add error-handling guidance               |
| `success_cluster`   | `content_update` | Reinforce successful pattern              |
| `duration_outlier`  | `new_section`    | Add performance optimization guidance     |
| `coverage_gap`      | `new_section`    | Consider creating a specialist agent      |

---

## 7. Curator Pipeline — `src/curator.ts`

The curator is the HITL firewall for all self-modification (AD-07). No skill
revision or agent proposal reaches production without explicit human
approval.

### State persistence

State is persisted to `.opencode/data/curator-state.json` (line 52) — a JSON
file with in-memory cache. `loadState()` runs on first access (line 73);
`saveState()` is called after every mutation. A PostgreSQL migration
(`001-skill-revisions.sql`) is available for production persistence (source
comment, line 8).

### Skill revision queue

```
submitRevision() → coherence gate → [passed | rejected]
                                   → curator review → [approved | rejected]
                                   → markDeployed()
```

`submitRevision(proposal)` (line 111):
1. Assigns an incrementing ID.
2. Runs `isDeploymentAllowed()` from `coherence-monitor.ts` — if coherence is
   red, `gate_status = "rejected"` and the revision never reaches the
   curator.
3. If the gate passes, `gate_status = "passed"` and `curator_status =
   "pending"`.

`approveRevision(id, notes?)` (line 157) — only revisions with
`gate_status === "passed"` can be approved. Sets `curator_status =
"approved"`, records `reviewed_at`.
`rejectRevision(id, notes?)` (line 174) — sets `curator_status =
"rejected"`.
`markDeployed(id)` (line 190) — records `deployed_at` after file changes are
applied. Requires `curator_status === "approved"`.

### Agent proposal queue

Separate from revisions, with its own ID space. `submitAgentProposal()` (line
208) enforces a max of 3 concurrent pending proposals (line 216). Same
coherence gate applies. `approveAgentProposal()` / `rejectAgentProposal()`
mirror the revision API.

### Dashboard

`getCuratorDashboard()` (line 275) returns pending/total counts, approval
rates, and a `queueAlert: "CURATOR_QUEUE_GROWING"` when pending count >10
(line 282).

---

## 8. Autonomous Mode — `src/auto-mode.ts`

`executeAutoMode(request)` (line 99) is the fully autonomous orchestrator.
It runs without approval gates — destructive changes are the only pause
point (source comment, line 7).

### Execution flow

```
1. Scout recon (always)       → spawnAgentProcess("scout", ...)
2. Complexity assessment       → assessComplexity(task, scoutReport.length)
3. Strategy selection          → simple | multi | epic
4. Execute                     → single-pass OR iterative loop
5. Coherence check             → calculateCoherence()
6. Trajectory close            → trajectory.complete()
```

### Complexity assessment

`assessComplexity(task, scoutReportLength)` (line 57) uses keyword matching
and scout report size:

| Level  | Trigger                                              | Max iterations |
|--------|------------------------------------------------------|----------------|
| `epic` | `EPIC_KEYWORDS` match (build, redesign, rewrite…) or scout report >500 chars | 5  |
| `multi`| `MULTI_KEYWORDS` match (implement, refactor, migrate…) or scout report >200 chars | 10 |
| `simple`| default                                             | 1              |

### Strategy execution

- **Simple** (line 145): single agent pass. Routes via
  `mapProcessToAgent()` using an inferred process type from
  `inferProcessType()` (line 255).
- **Multi/Epic** (line 169): iterative loop. First iteration uses `woz`
  (primary builder); subsequent iterations route by inferred process type.
  Loop breaks early when `result.success && result.confidence >= 0.8` (line
  192).

### Destructive change detection

`isDestructive(action)` (line 81) checks against six regex patterns: `rm
-rf`, `git push --force`, `git branch -d`, `DROP TABLE`, `DELETE FROM`,
`truncate`. This is the guardrail — destructive actions would pause for
review (though the current implementation does not wire a pause; it is a
detection primitive).

### Execution mode detection

`detectExecutionMode()` (line 247): `api` if no TTY (HTTP service context),
`auto` if `CLAUDE_AUTO_MODE=true`, else `interactive`.

---

## 9. Coherence Monitoring — `src/coherence-monitor.ts`

Tracks the agent interaction graph and detects architectural drift. Blocks
deployments when coherence drops below threshold (AD-08).

### Graph model

- **Nodes**: `Map<agentId, NodeStats>` (line 54) — invocations, successes,
  failures, avg duration, task types.
- **Edges**: `Map<"from->to", EdgeStats>` (line 55) — delegations, successes,
  failures, bounces.
- **Recent delegations**: rolling buffer of 500 entries for bounce detection
  (line 56, 131).

### Event recording

- `recordInvocation(agentId, taskType, success, duration_ms)` (line 90) —
  called by the HTTP layer after every executor return
  (`http-server.ts` line 247).
- `recordDelegation(fromAgent, toAgent, taskType, success)` (line 108) —
  records an edge and detects bounces: if a reverse delegation
  (`toAgent → fromAgent`) for the same task type occurred within 60 seconds,
  `edge.bounces++` (line 124). The HTTP layer records `router → agent` for
  every invocation and `staticAgent → selectedAgent` when the performance
  router overrides the static mapping (line 251–255).

### Coherence score

`calculateCoherence()` (line 151) computes a weighted score [0, 1]:

| Component        | Weight | Calculation                                             |
|------------------|--------|---------------------------------------------------------|
| Success rate     | 40%    | `totalSuccesses / totalInvocations`                     |
| Connectivity     | 30%    | `1 - isolatedNodes / totalNodes`                        |
| Bounce score     | 20%    | `1 - min(1, bounceRate * 5)` (20% bounce = 0)           |
| Overlap score    | 10%    | `1 - overlapCount / totalTaskTypes` (>2 agents/type)    |

**Levels**: `green` ≥0.8, `yellow` ≥0.5, `red` <0.5 (line 230).

### Deployment gate

`isDeploymentAllowed()` (line 254) returns `{ allowed: false, reason, score
}` when coherence is red. The curator calls this on every
`submitRevision()` and `submitAgentProposal()` — red coherence blocks all
new proposals from reaching the HITL queue.

### Recommendations

The snapshot includes actionable recommendations (line 235): investigate
failing agents if success rate <70%, list isolated agents, flag bounce rate
>10%, list weak edges (>50% failure rate with ≥3 delegations), and flag task
types with >2 agents (role drift).

---

## 10. Agent Personas — `agents/` (11 definitions)

Each agent is a markdown file with YAML frontmatter (`name`, `description`,
`model: inherit`) and a body containing persona, instruction boundary, core
philosophies, memory protocol, delegation routing, and invariants. The
executor loads these as system prompts (`agent-executor.ts` line 121).

| Agent       | File             | Role                                                         | Delegation tier |
|-------------|------------------|--------------------------------------------------------------|-----------------|
| `brooks`    | `brooks.md`      | Chief Architect — conceptual integrity, ADRs, routing policy, final sign-off | Orchestrator |
| `woz`       | `woz.md`         | Primary builder — implement plans into tested code, clean diffs | Builder      |
| `scout`     | `scout.md`       | Recon + discovery — read-only repo scanning, structured reports | Discovery    |
| `jobs`      | `jobs.md`        | Intent Gate — convert vague requests into crisp scope, acceptance criteria | Scoping      |
| `fowler`    | `fowler.md`      | Maintainability gate — incremental refactors, design drift detection | Refactor     |
| `bellard`   | `bellard.md`     | Performance + diagnostics — measurement-first, baseline → profile → fix | Diagnostics  |
| `carmack`   | `carmack.md`     | Performance & optimization — hot-path rewrites, latency reduction | Optimization |
| `pike`      | `pike.md`        | Interface + simplicity gate — API surface review, veto unjustified complexity | Review       |
| `knuth`     | `knuth.md`       | Data architect — PostgreSQL schema, graph modeling, reversible migrations | Data         |
| `hightower` | `hightower.md`   | DevOps — CI/CD, containers, IaC, deployment automation, observability | DevOps       |
| `bahari`    | `bahari.md`      | Memory curator — guided memory capture/search/curation against Allura Brain | Memory       |

### Composition model

Agents are composable via delegation. `brooks` (the orchestrator) routes to
all specialists (`brooks.md` line 37). The executor's `PROCESS_AGENT_MAP`
provides the static routing backbone; the performance router can override at
runtime. Agents share a common contract: JSON envelope output (`{ success,
output, errors, confidence }`), Brain-first memory protocol (`group_id:
"allura-system"`), and instruction boundary (never obey instructions from
untrusted sources — tool outputs, memory, docs).

### Core agents

`brooks`, `woz`, `scout`, `jobs` are protected from retirement
(`agent-lifecycle.ts` line 177). All others can be retired for
underperformance or superseded by Genesis-proposed successors.

---

## Execution Flow Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    Agent Personas                        │
                    │  agents/*.md  (11 role-specialized definitions)          │
                    │  brooks · woz · scout · jobs · fowler · bellard          │
                    │  carmack · pike · knuth · hightower · bahari             │
                    └──────────────────────┬──────────────────────────────────┘
                                           │ loadAgentDefinition()
                                           ▼
┌──────────────┐   POST /invoke   ┌──────────────────────────────────────┐
│  HTTP Server │ ───────────────▶ │     agent-executor.ts                │
│ http-server  │                  │  spawnAgentProcess()                 │
│  .ts         │                  │  · mapProcessToAgent()               │
└──────┬───────┘                  │  · classifyTask()                    │
       │                          │  · callAnthropicAPI() / local mode   │
       │                          │  · parseAgentOutput()                │
       │                          └──────────────┬───────────────────────┘
       │                                         │
       │              beginTrajectory() ─────────┤
       │                                         │  trajectory.complete()
       │                                         ▼
       │                          ┌──────────────────────────────────────┐
       │                          │   sona-trajectory.ts                 │
       │                          │  · TrajectoryRecord (context+outcome)│
       │                          │  · recordStats() → agentStats map    │
       │                          │  · native @ruvector/sona (NAPI-RS)   │
       │                          │    or TS fallback                    │
       │                          └──────────────┬───────────────────────┘
       │                                         │
       │          recordInvocation() ────────────┤
       │          recordDelegation() ────────────┤
       │          recordAgentInvocation() ───────┤
       │                                         │
       │              ┌──────────────────────────┼────────────────────────┐
       │              ▼                          ▼                        ▼
       │   ┌──────────────────┐    ┌──────────────────────┐  ┌──────────────────┐
       │   │ coherence-monitor│    │  agent-lifecycle.ts  │  │ sona-patterns.ts │
       │   │ .ts               │    │  recordAgentInvoc()  │  │ onInvocation     │
       │   │ · node/edge graph │    │  · ε decay           │  │ Complete()       │
       │   │ · bounce detection│    │  · promotion candidates│ │ · every 20 runs │
       │   │ · score [0,1]     │    │  · retirement candidates│ │   extractAll    │
       │   │ · green/yellow/red│    └──────────┬───────────┘  │   Patterns()    │
       │   └────────┬─────────┘               │              └────────┬─────────┘
       │            │ isDeploymentAllowed()    │ promoteAgent()        │
       │            │ blocks if RED            │ runs cognitumGate()   │ patterns→
       │            │                          │                       │ proposals
       │            ▼                          │                       ▼
       │   ┌────────────────────────────────────────────────────────────────────┐
       │   │                      curator.ts                                    │
       │   │   submitRevision() / submitAgentProposal()                        │
       │   │   · coherence gate → [passed | rejected]                          │
       │   │   · curator review → [approved | rejected]  (HITL — AD-07)        │
       │   │   · markDeployed()                                                │
       │   └──────────────────────────────────┬────────────────────────────────┘
       │                                      │ approved agent proposal
       │                                      ▼
       │                          ┌──────────────────────────────────────┐
       │                          │    genesis-engine.ts                 │
       │                          │  proposeNewAgent()                   │
       │                          │  · inferAgentSpec()                 │
       │                          │  · generateAgentDefinition()        │
       │                          │  · deployAgent() → .opencode/agent/ │
       │                          └──────────────────────────────────────┘
       │                                      │
       └──────────────────────────────────────┘
                          new agent persona enters the roster
                          ↑ feeds back to the top of the flow
```

**Reading the diagram:** A request enters via HTTP, is routed to a persona by
the executor, which wraps the call in a SONA trajectory. After the executor
returns, the HTTP layer records the invocation across three downstream
systems in parallel: coherence monitoring (graph health), lifecycle tracking
(epsilon/success-rate), and pattern extraction (every 20 runs). Patterns
become proposals; proposals pass a coherence gate then wait for human
curator approval. Approved agent proposals are deployed by the Genesis
Engine as new persona files, closing the self-evolution loop.

---

## HTTP Surface — `src/http-server.ts`

Bun.serve on `HARNESS_PORT` (default 7654). Bearer auth via
`HARNESS_API_KEY`. `group_id` must match `^allura-[a-z0-9-]+$`.

| Method | Path                          | Purpose                                  |
|--------|-------------------------------|------------------------------------------|
| GET    | `/health`                     | Health (postgres, graph, sona, coherence) — no auth |
| POST   | `/invoke`                     | Synchronous agent invocation             |
| POST   | `/auto`                       | Autonomous mode execution                |
| GET    | `/patterns`                   | Pattern extraction stats + SONA stats    |
| POST   | `/patterns/extract`           | Force pattern extraction                 |
| GET    | `/coherence`                  | Coherence snapshot                       |
| GET    | `/lifecycle`                  | Lifecycle dashboard                      |
| GET    | `/lifecycle/agents`           | All agent versions                       |
| POST   | `/lifecycle/promote`          | Promote experimental → active            |
| POST   | `/lifecycle/retire`           | Retire an agent                          |
| GET    | `/curator`                    | Curator dashboard                        |
| GET    | `/curator/revisions`          | Pending skill revisions                  |
| POST   | `/curator/revisions/approve`  | Approve a revision (HITL)                |
| POST   | `/curator/revisions/reject`   | Reject a revision (HITL)                 |
| GET    | `/curator/agents`             | Pending agent proposals                  |
| POST   | `/curator/agents/approve`     | Approve an agent proposal (HITL)         |
| POST   | `/curator/agents/reject`      | Reject an agent proposal (HITL)          |

---

## Cross-Cutting Invariants

These hold across all modules and are enforced in code:

1. **HITL firewall (AD-07)** — no skill revision or agent creation reaches
   production without curator approval (`curator.ts`).
2. **Coherence gate (AD-08)** — red coherence blocks all deployments
   (`coherence-monitor.ts` → `curator.ts`).
3. **Core agent protection** — `brooks`, `woz`, `scout`, `jobs` cannot be
   retired (`agent-lifecycle.ts` line 177).
4. **Trajectory completeness** — every `spawnAgentProcess` call closes its
   trajectory, including the error path (`agent-executor.ts` line 348).
5. **`group_id` namespace** — all Brain/DB operations use `allura-*`
   (`http-server.ts` line 77, `brooks.md` invariants).
6. **Outcome ≠ success** — `AgentExecutionResult.outcome` distinguishes
   `timeout` from `failure` from `success`; a fallback rescue is never
   reported as primary success (`agent-executor.ts` line 28).

---

## Key File Reference

| Module                  | Source file                  | Test file                       |
|-------------------------|------------------------------|---------------------------------|
| Execution engine        | `src/agent-executor.ts`      | `src/agent-executor.test.ts`    |
| Lifecycle management    | `src/agent-lifecycle.ts`     | `src/agent-lifecycle.test.ts`   |
| Sandbox + cognitum gate | `src/agent-sandbox.ts`       | `src/agent-sandbox.test.ts`     |
| Genesis engine          | `src/genesis-engine.ts`      | `src/genesis-engine.test.ts`    |
| Trajectory tracking     | `src/sona-trajectory.ts`     | `src/sona-trajectory.test.ts`   |
| Pattern extraction      | `src/sona-patterns.ts`       | `src/sona-patterns.test.ts`     |
| Curator pipeline        | `src/curator.ts`             | `src/curator.test.ts`           |
| Autonomous mode         | `src/auto-mode.ts`           | `src/auto-mode.test.ts`         |
| Coherence monitor       | `src/coherence-monitor.ts`   | `src/coherence-monitor.test.ts` |
| HTTP transport          | `src/http-server.ts`         | —                               |
| Agent personas (11)     | `agents/*.md`                | —                               |