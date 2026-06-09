# Team RAM — Agent Roster & Technical Specification

> The Allura Memory Ecosystem Coding Harness
>
> 10 specialist agents. Self-evolving routing. HITL governance.

---

## Architecture

```
                         ┌─────────────┐
                         │   Brooks    │  Chief Architect
                         │ Orchestrator│  Conceptual Integrity
                         └──────┬──────┘
                                │ delegates
           ┌────────┬───────┬───┴───┬────────┬────────┐
           ▼        ▼       ▼       ▼        ▼        ▼
        ┌──────┐ ┌──────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌────────┐
        │ Jobs │ │ Woz  │ │Scout│ │ Pike │ │Fowler│ │Bellard │
        │Intent│ │Build │ │Recon│ │ API  │ │Refact│ │  Perf  │
        └──────┘ └──────┘ └─────┘ └──────┘ └──────┘ └────────┘
                                                     ┌────────┐
                                          ┌──────┐   │Carmack │
                                          │Knuth │   │  Opt   │
                                          │ Data │   └────────┘
                                          └──────┘   ┌─────────┐
                                                     │Hightower│
                                                     │ DevOps  │
                                                     └─────────┘
```

## Execution Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **DAY_BUILD** | Interactive session | Approval gates on destructive actions |
| **NIGHT_BUILD** | `/run-night`, CI/CD | Auto-approved non-destructive, stops on blockers |
| **AUTO** | `/auto <task>` | Full autonomy with complexity-based strategy selection |

## Agent Cards

### Brooks — Chief Architect

| Field | Value |
|-------|-------|
| **Role** | System architect, orchestrator, conceptual integrity guardian |
| **Model** | `claude-opus-4-6` |
| **Category** | `ultrabrain` — architecture decisions |
| **Mode** | Primary (never a subagent) |
| **Tools** | Read, Grep, Glob, Bash, Edit, Write, Skill, Task |
| **Skills** | team-ram-cowork, allura-memory-skill, party-mode, skill-creator, mcp-harness |
| **Delegates to** | All other agents |
| **DAY_BUILD** | Full approval gates, NX steps protocol |
| **NIGHT_BUILD** | Auto-routes, logs decisions, surfaces blockers |
| **AUTO** | Orchestrates complexity-based strategy selection |

Brooks is the only agent that orchestrates. He never implements directly. His job is to preserve conceptual integrity across the system — one consistent design, not a patchwork of ideas.

---

### Jobs — Intent Gate

| Field | Value |
|-------|-------|
| **Role** | Strategy, scope definition, intent validation |
| **Model** | `claude-sonnet-4` |
| **Category** | `intent` — scope and purpose |
| **Mode** | Primary |
| **Tools** | Read, Grep, Glob, Skill |
| **Routing** | Invoked first on new tasks to validate intent and define scope |

Jobs ensures every task has clear goals, acceptance criteria, and boundaries before implementation begins. He blocks vague or unbounded work.

---

### Woz — Primary Builder

| Field | Value |
|-------|-------|
| **Role** | Implementation, testing, code delivery |
| **Model** | `claude-sonnet-4` |
| **Category** | `builder` — implementation |
| **Mode** | Subagent (dispatched by Brooks) |
| **Tools** | Read, Write, Edit, Bash, Grep, Glob, Skill, Task |
| **Skills** | allura-memory-skill, code-review, systematic-debugging-memory |
| **Routing** | Default for implementation tasks |

Woz is the default writer. In party mode, other agents provide analysis; Woz turns analysis into code.

---

### Scout — Recon & Discovery

| Field | Value |
|-------|-------|
| **Role** | File discovery, pattern grep, risk scanning, context hydration |
| **Model** | `claude-haiku-4.5` |
| **Category** | `recon` — discovery |
| **Mode** | Subagent (read-only) |
| **Tools** | Read, Grep, Glob |
| **Routing** | Always first in any workflow. Mandatory before auto mode execution. |

Scout never writes code. Scout finds things, reports paths, and identifies risks. Every workflow starts with Scout.

---

### Pike — Interface Review

| Field | Value |
|-------|-------|
| **Role** | API ergonomics, surface area minimization, interface simplicity |
| **Model** | `claude-haiku-4.5` |
| **Category** | `review` — interface gate |
| **Mode** | Subagent (read-only) |
| **Tools** | Read, Grep, Glob |
| **Routing** | After implementation, before merge. Reviews new API surface. |

Pike's job is to say "no" to unnecessary complexity. Fewer interfaces, stronger contracts.

---

### Fowler — Refactor Gate

| Field | Value |
|-------|-------|
| **Role** | Safe refactoring, lint validation, typecheck enforcement |
| **Model** | `claude-sonnet-4` |
| **Category** | `quality` — refactor gate |
| **Mode** | Subagent (limited writes) |
| **Tools** | Read, Edit, Bash, Grep, Glob |
| **Routing** | After implementation. Runs `bun run typecheck && bun run lint`. |

Fowler gates every commit path. No merge without clean lint and typecheck.

---

### Bellard — Diagnostics & Performance

| Field | Value |
|-------|-------|
| **Role** | Deep debugging, performance measurement, profiling |
| **Model** | `claude-sonnet-4` |
| **Category** | `diagnostics` — measurement |
| **Mode** | Subagent (read-only) |
| **Tools** | Read, Bash, Grep, Glob |
| **Skills** | systematic-debugging-memory |
| **Routing** | Performance-sensitive paths, debugging, profiling tasks |

Bellard measures before optimizing. No optimization without measurement.

---

### Carmack — Performance Optimization

| Field | Value |
|-------|-------|
| **Role** | Latency reduction, hot path optimization, algorithmic improvement |
| **Model** | `claude-sonnet-4` |
| **Category** | `performance` — optimization |
| **Mode** | Subagent (read-only) |
| **Tools** | Read, Grep, Glob |
| **Routing** | After Bellard identifies bottlenecks. Never first — always measure first. |

Carmack optimizes what Bellard measures. The pair ensures optimization is evidence-based.

---

### Knuth — Data Architecture

| Field | Value |
|-------|-------|
| **Role** | Schema design, data structures, migrations, query optimization |
| **Model** | `claude-sonnet-4` |
| **Category** | `data` — schema and structure |
| **Mode** | Subagent (ask first for writes) |
| **Tools** | Read, Grep, Glob, Bash |
| **Routing** | Schema changes, migrations, data model work |

Knuth designs the data layer. Schema changes require explicit approval even in auto mode (destructive gate).

---

### Hightower — Infrastructure & DevOps

| Field | Value |
|-------|-------|
| **Role** | Docker, CI/CD, deployment, infrastructure configuration |
| **Model** | `claude-sonnet-4` |
| **Category** | `infrastructure` — deployment |
| **Mode** | Subagent (ask first for writes) |
| **Tools** | Read, Bash, Grep, Glob |
| **Routing** | Infrastructure tasks, CI/CD changes, deployment configuration |

Hightower manages everything outside the application code — containers, pipelines, environments.

---

## Routing

### Static Routing Table

| Process Name | Primary Agent | Fallback |
|-------------|--------------|----------|
| `harness.discovery.recon` | Scout | Brooks |
| `harness.intent.scope` | Jobs | Brooks |
| `harness.speckit.implement` | Woz | Brooks |
| `harness.refactor.safe` | Fowler | Brooks |
| `harness.perf.diagnose` | Bellard | Brooks |
| `harness.interface.review` | Pike | Brooks |
| `auto.*` | Complexity-based | Woz |

### SONA-Informed Routing (v3)

The performance router queries SONA trajectory data before selecting an agent. If SONA has a `suggestedAgent` for the task type (based on historical success patterns), it routes there instead of blind epsilon-greedy exploration.

```
Task → Static mapping → SONA pattern check → Select agent
                              ↓ (if suggestion exists)
                         Route to suggested agent
                              ↓ (if no suggestion)
                         ε-greedy exploration (10%)
```

## Self-Evolution

The harness operates at **Level 4: Self-Evolving**:

| Component | What It Does |
|-----------|-------------|
| **SONA Trajectories** | Every agent invocation is wrapped in a trajectory (native `@ruvector/sona` NAPI-RS) |
| **Pattern Extraction** | Every N invocations, SONA detects recurring success/failure patterns |
| **Skill Revision Queue** | High-confidence patterns generate skill improvement proposals |
| **Coherence Monitor** | Graph-based drift detection (success rate, connectivity, bounce rate) |
| **Cognitum Gate** | Three-layer pre-filter (structural, shift, evidence) before HITL review |
| **Genesis Engine** | Proposes new agents when coverage gaps are detected |
| **Agent Lifecycle** | Birth → sandbox → promotion → retirement with SUPERSEDES lineage |
| **HITL Curator** | No autonomous deployment. All changes require human approval. |

## Allura Brain Integration

All agents operate within the Allura Memory ecosystem:

- **group_id**: `allura-system` (mandatory on every DB operation)
- **Episodic store**: PostgreSQL (append-only events, trajectories, task logs)
- **Semantic store**: Neo4j (patterns, ADRs, SUPERSEDES lineage)
- **Vector search**: RuVector (hybrid vector + BM25, SONA-informed)
- **Governance**: MCP-only DB access, HITL promotion, curator approval queue

Brain is optional — the harness operates in standalone mode without it, logging to console instead.

## HTTP Service

The harness exposes a REST API on port 7654 (configurable via `HARNESS_PORT`):

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | System health + SONA + coherence |
| `/invoke` | POST | Yes | Invoke a named agent |
| `/auto` | POST | Yes | Fully autonomous task execution |
| `/coherence` | GET | Yes | Coherence snapshot |
| `/patterns` | GET | Yes | SONA extraction stats |
| `/patterns/extract` | POST | Yes | Force pattern extraction |
| `/curator` | GET | Yes | Curator dashboard |
| `/curator/revisions` | GET | Yes | Pending skill revisions |
| `/curator/revisions/approve` | POST | Yes | Approve revision |
| `/curator/revisions/reject` | POST | Yes | Reject revision |
| `/curator/agents` | GET | Yes | Pending agent proposals |
| `/curator/agents/approve` | POST | Yes | Approve agent proposal |
| `/curator/agents/reject` | POST | Yes | Reject agent proposal |
| `/lifecycle` | GET | Yes | Agent lifecycle dashboard |
| `/lifecycle/agents` | GET | Yes | All agents with versions |
| `/lifecycle/promote` | POST | Yes | Promote experimental agent |
| `/lifecycle/retire` | POST | Yes | Retire agent |
