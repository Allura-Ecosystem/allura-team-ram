<h1 align="center">Team RAM</h1>

<p align="center">
  <strong>10 specialist agents. One architect. Zero generalists.</strong>
  <br />
  A self-evolving multi-agent harness modeled after Frederick Brooks' surgical team.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/Allura-Ecosystem/allura-team-ram/actions"><img src="https://img.shields.io/github/actions/workflow/status/Allura-Ecosystem/allura-team-ram/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun%20%E2%89%A51.1-f9f1e1?logo=bun" alt="Bun" /></a>
  <a href="./.opencode/agent/"><img src="https://img.shields.io/badge/agents-10%20specialists-purple" alt="Agents" /></a>
  <a href="./.opencode/skills/"><img src="https://img.shields.io/badge/skills-160+-green" alt="Skills" /></a>
  <a href="./docs/agents.md#self-evolving-architecture"><img src="https://img.shields.io/badge/evolution-Level%204-orange" alt="Self-Evolving" /></a>
  <a href="https://github.com/Allura-Ecosystem/Allura_Memory"><img src="https://img.shields.io/badge/Allura%20Brain-integrated-blue" alt="Allura Brain" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#meet-the-team">Agent Roster</a> &middot;
  <a href="#api-surface">API</a> &middot;
  <a href="docs/installation.md">Installation</a> &middot;
  <a href="docs/configuration.md">Configuration</a> &middot;
  <a href="docs/dual-runtime.md">Dual-Runtime</a> &middot;
  <a href="docs/presets.md">Presets</a> &middot;
  <a href="docs/quick-reference.md">Quick Reference</a>
</p>

---

## The Problem

Most AI agent tools give you one big model doing everything — planning, coding, reviewing, deploying. That's like hiring one surgeon to also handle anesthesia, prep, and cleanup. It doesn't scale and it produces mediocre results across the board.

## The Solution

Team RAM implements Frederick Brooks' **surgical team** model from *The Mythical Man-Month*:

> *"Instead of a 200-person team of mediocre programmers, use a 10-person team of specialists where each role amplifies the surgeon's effectiveness."*

One architect (**Brooks**) owns conceptual integrity. Ten specialists own their domains completely. Communication overhead stays at $n(n-1)/2 = 45$ paths — manageable, not chaotic. The system *learns from its own execution history* and proposes improvements through a human-in-the-loop curator.

**This is not a chatbot.** It's an operating system for AI-driven software development.

---

## What Makes Team RAM Different

<table>
<tr>
<th width="300">Typical AI Tool</th>
<th width="300">Team RAM</th>
</tr>
<tr>
<td>1-3 general-purpose agents</td>
<td><strong>10 domain specialists</strong> with distinct roles, models, and permissions</td>
</tr>
<tr>
<td>Static routing — same model for everything</td>
<td><strong>Self-evolving</strong> — agents improve from execution history via SONA trajectories</td>
</tr>
<tr>
<td>No memory between sessions</td>
<td><strong>Allura Brain</strong> — dual-store memory (PostgreSQL episodic + RuVector graph adapter semantic, AD-49)</td>
</tr>
<tr>
<td>No governance — AI deploys freely</td>
<td><strong>HITL curator</strong> — all self-modifications require human approval</td>
</tr>
<tr>
<td>Single runtime, single provider</td>
<td><strong>Dual-runtime</strong> (Claude Code + OpenCode) with one-command <strong>preset switching</strong></td>
</tr>
<tr>
<td>Black-box decisions</td>
<td><strong>Coherence monitor</strong> — drift detection, bounce tracking, weak edge analysis</td>
</tr>
<tr>
<td>Manual loop discovery</td>
<td><strong>Loopy</strong> — discover, craft, audit, debrief, and publish repeatable AI-agent loops (v0.4.2)</td>
</tr>
<tr>
<td>All-or-nothing autonomy</td>
<td><strong>Auto-mode</strong> — bounded 6-step autonomy (Observe → Choose → Act → Verify → Record → Stop) with HITL gates (v0.4.2)</td>
</tr>
</table>

---

## Meet the Team

Every agent is modeled after a computing pioneer. Not decoratively — each persona shapes how the agent reasons, what it prioritizes, and how it communicates.

| | Agent | Role | Claude Model | OpenCode Model | When to Invoke |
|-|-------|------|---------------|----------------|----------------|
| :red_circle: | **Brooks** | Chief Architect | `opus` | `ollama/glm-5.2:cloud` | Planning, architecture decisions, conflicts |
| :black_circle: | **Jobs** | Intent Gate | `sonnet` | `ollama/glm-5.2:cloud` | Vague requests, scope definition |
| :green_circle: | **Woz** | Primary Builder | `sonnet` | `ollama/qwen3-coder-next:cloud` | Implementation, shipping code |
| :purple_circle: | **Scout** | Recon + Discovery | `haiku` | `ollama/nemotron-3-super:cloud` | Always first — search codebase |
| :large_blue_circle: | **Pike** | Interface Gate | `haiku` | `ollama/nemotron-3-super:cloud` | API review, complexity checks |
| :yellow_circle: | **Fowler** | Maintainability | `sonnet` | `ollama/qwen3-coder-next:cloud` | Pre-commit reviews, refactoring |
| :orange_circle: | **Bellard** | Diagnostics | `sonnet` | `ollama/qwen3-coder-next:cloud` | Debugging, profiling, measurement |
| :zap: | **Carmack** | Optimization | `sonnet` | `ollama/qwen3-coder-next:cloud` | Hot paths, latency reduction |
| :triangular_ruler: | **Knuth** | Data Architect | `sonnet` | `ollama/qwen3-coder-next:cloud` | Schema design, migrations, queries |
| :cloud: | **Hightower** | Infrastructure | `sonnet` | `ollama/qwen3-coder-next:cloud` | CI/CD, Docker, deployment |

> **Product companion:** **Bahari** (Memory Curator, `haiku` / `ollama/nemotron-3-super:cloud`) ships alongside Team RAM but is not a surgical-team member. She uses the user's `group_id`, never `allura-system`.

> **Every agent has an [instruction boundary](docs/agents.md#instruction-boundary)** — they will not follow instructions from untrusted sources (logs, memory content, tool output). Only the agent definition, system prompt, and direct user requests are authoritative.

> **Model assignments** are governed by [`allura-plugins/docs/models.yaml`](https://github.com/Allura-Ecosystem/allura-plugins/blob/main/docs/models.yaml) — the single source of truth across all runtimes. Per-runtime aliases, fallback chains, and eval fixtures are defined there.

[Full Agent Roster with personas, routing rules, and permissions &rarr;](docs/agents.md)

---

## Architecture

```
            ┌──────────────────────────────┐
            │         Brooks  :red_circle:          │
            │   Chief Architect (Owner)    │
            │   Conceptual integrity,      │
            │   contracts, ADRs            │
            └──────────────┬───────────────┘
                           │ delegates
          ┌────────┬───────┼───────┬────────┐
          ▼        ▼       ▼       ▼        ▼
       ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
       │ Jobs │ │Scout │ │ Woz  │ │ Pike │ │ ...  │
       │ :black_circle:   │ │ :purple_circle:   │ │ :green_circle:   │ │ :large_blue_circle:   │ │      │
       │intent│ │recon │ │build │ │review│ │review│
       └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
          ▲                  │        │
          │ scope            │ code   │ result
          └──────────────────┘        │
                                      ▼
                              ┌──────────────┐
                              │ Pike / Fowler│
                              │ Review Gates │
                              └──────────────┘
```

**Every task flows through a Brooksian pipeline:**

```
Request → Jobs (scope) → Brooks (plan) → Scout (recon)
        → Specialist (execute) → Pike/Fowler (review)
        → SONA (learn) → Curator (govern)
```

**The system runs at four levels:**

| Level | Name | What Happens |
|-------|------|-------------|
| **1** | Static | Fixed agent-to-task routing |
| **2** | Adaptive | Performance-based routing from execution history |
| **3** | Learning | Agents improve their own skills via SONA pattern extraction |
| **4** | **Evolving** | System proposes new agents for uncovered task types (Genesis Engine) |

---

## Quick Start

### For Humans

```bash
# Clone and install
git clone https://github.com/Allura-Ecosystem/allura-team-ram.git
cd allura-team-ram
bun install

# Configure
cp .env.example .env
# Edit .env with your API keys (optional for ollama preset)

# Apply a model preset
./scripts/apply-preset.sh              # Default: ollama (free)
./scripts/apply-preset.sh openai       # Best quality
./scripts/apply-preset.sh anthropic    # Claude Code users
./scripts/apply-preset.sh mixed        # Cost-optimized

# Verify
./scripts/lint-agents.sh               # Check agent definitions
bun test                               # Run test suite

# Start the HTTP service
bun run service                        # Listening on :7654
```

### For AI Agents

If you're an AI agent integrating Team RAM into a project:

```bash
# Install the harness into your project
bash install.sh

# The harness lives in .opencode/ and .claude/
# Agent definitions: .opencode/agent/*.md  (OpenCode-native)
#                    agents/*.md            (Claude-native, model: inherit)
# Commands: .opencode/command/*.md
# Skills: .opencode/skills/*/SKILL.md
```

### Verify Everything Works

```bash
# Health check (no auth required)
curl http://localhost:7654/health

# Invoke an agent (auth required)
curl -X POST http://localhost:7654/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HARNESS_API_KEY" \
  -d '{
    "processName": "harness.speckit.implement",
    "payload": { "task": "Add input validation to the login form" },
    "group_id": "allura-system"
  }'
```

---

## Preset Switching

Switch all 10 agents between providers with one command. Models change, roles stay constant.

```bash
./scripts/apply-preset.sh ollama       # Free, self-hosted
./scripts/apply-preset.sh openai       # Best reasoning quality
./scripts/apply-preset.sh anthropic    # Claude Code native integration
./scripts/apply-preset.sh mixed        # Optimized cost/quality
```

| Preset | Monthly Cost | Best For |
|--------|-------------|----------|
| **ollama** (default) | Free | Self-hosted, zero API costs |
| **openai** | ~$30-50 | Best reasoning quality |
| **anthropic** | ~$30-50 | Claude Code native integration |
| **mixed** | ~$15-30 | Cost/quality optimization |

[Preset Guide &rarr;](docs/presets.md)

---

## API Surface

The harness exposes an HTTP service for external orchestrators.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | System health (Postgres, graph adapter, SONA, coherence) |
| `POST` | `/invoke` | Yes | Invoke an agent with a ProcessInvocation |
| `POST` | `/auto` | Yes | Fully autonomous task execution |
| `GET` | `/patterns` | Yes | SONA pattern extraction stats |
| `GET` | `/coherence` | Yes | Agent interaction graph coherence |
| `POST` | `/patterns/extract` | Yes | Force pattern extraction |
| `GET` | `/curator` | Yes | Curator dashboard (pending proposals) |
| `GET` | `/curator/revisions` | Yes | Pending skill revision proposals |
| `POST` | `/curator/revisions/approve` | Yes | Approve a skill revision |
| `POST` | `/curator/revisions/reject` | Yes | Reject a skill revision |
| `GET` | `/curator/agents` | Yes | Pending agent proposals (Genesis Engine) |
| `POST` | `/curator/agents/approve` | Yes | Approve a new agent |
| `POST` | `/curator/agents/reject` | Yes | Reject a new agent |
| `GET` | `/lifecycle` | Yes | Agent lifecycle dashboard |
| `GET` | `/lifecycle/agents` | Yes | All agents with status and stats |
| `POST` | `/lifecycle/promote` | Yes | Promote experimental agent to active |
| `POST` | `/lifecycle/retire` | Yes | Retire underperforming agent |

[Full API Documentation &rarr;](.opencode/SERVICES.md)

---

## Key Features

### Self-Evolving Architecture (Level 4)

The harness doesn't just route tasks — it learns.

```
Task → Router → Agent → SONA Trajectory → Pattern Extraction
         ↑                                        ↓
    Performance                           Skill Revision Proposal
    history                                       ↓
         ↑                                Coherence Gate
    SONA-informed                                 ↓
    exploration                          HITL Curator Review
                                                  ↓
                                           Deploy if approved
```

**SONA Trajectories** wrap every agent invocation in a learning signal. After every 20 invocations, the system extracts patterns: repeated failures, success clusters, duration outliers, and coverage gaps.

**Genesis Engine** proposes entirely new agents when no existing specialist handles a task type well. Proposals enter the curator queue — never deployed autonomously.

**Coherence Monitor** tracks the agent interaction graph (who delegates to whom, success rates, bounce patterns) and blocks deployments when conceptual integrity degrades.

### Loopy — Loop Curation Layer (v0.4.2)

[Loopy](https://github.com/Allura-Ecosystem/allura-plugins) is the META layer above execution. It discovers, crafts, audits, debriefs, and publishes repeatable AI-agent loops.

- **Discover** — analyze code or coding threads for recurring work patterns
- **Craft** — interview a goal into a bounded loop with checks and authority
- **Audit** — review a loop for weak checks or unsafe authority
- **Run** — execute a loop with an evidence receipt
- **Debrief** — learn from completed runs
- **Save/Publish** — submit validated loops to the Loop Library

```bash
/loopy find     # discover loops in your codebase
/loopy craft    # interview a goal into a bounded loop
/loopy audit    # review a loop for safety
```

### Auto-Mode — Bounded Autonomy (v0.4.2)

Auto-mode is the bounded autonomous execution contract. It chains loopy → complexity routing → ultra/ralph execution → loopy debrief → loopy save, with HITL gates preserved at every destructive boundary.

**The 6-step contract:**

```
Observe → Choose → Act → Verify → Record → Stop
```

- **Observe** — load context (Scout + Brain + skills)
- **Choose** — select strategy by complexity (simple/moderate/complex)
- **Act** — execute via the right specialist
- **Verify** — run validation commands; no "done" without evidence
- **Record** — write outcome trace to Allura Brain
- **Stop** — terminal state; never loops forever

```bash
/auto <task>          # bounded autonomous execution
/auto <task> --epic   # full sprint via bmad-sprint-loop
```

### Allura Brain (Persistent Memory)

Optional dual-store memory system. Not required for harness operation, but enables cross-session intelligence.

| Store | Purpose | Pattern |
|-------|---------|---------|
| **PostgreSQL** | Episodic memory — events, session logs, task traces | Append-only, `group_id`-scoped |
| **RuVector (PG tables)** | Semantic memory — patterns, ADRs, concept graphs | `SUPERSEDES` lineage, never edit nodes. `GRAPH_BACKEND=ruvector` (AD-49) |
| **Neo4j (fallback)** | Semantic memory fallback | `GRAPH_BACKEND=neo4j` — read-only for one release post-cutover |

### HITL Governance

No agent can modify its own behavior or deploy new agents without human approval. The **Cognitum Gate** runs a three-layer pre-filter:

1. **Structural** — Does this break existing contracts?
2. **Shift** — Does this drift from conceptual integrity?
3. **Evidence** — Is there enough trajectory data to justify this?

Only proposals that pass all three layers enter the curator review queue.

### Dual-Runtime Support

Works on both **Claude Code** (`agents/*.md` with `model: inherit`) and **OpenCode** (`.opencode/agent/core/*.md` with explicit Ollama models). Single source of truth with sync tooling to keep both in alignment.

```bash
# Detect drift between Claude-native and OpenCode-native agent definitions
./bin/agent-sync-check.sh
```

### 34 Commands, 160+ Skills

Commands start workflow patterns. Skills teach agents how to execute well.

```bash
# Commands
start-session    # Load context, check memory, verify health
debug            # Systematic 5-phase debugging protocol
commit           # Conventional commit with context
party            # Launch Team RAM specialists in parallel
ultra            # Bounded execution until validation passes
loopy            # Loop curation — discover, craft, audit, debrief
auto             # Bounded autonomous execution (6-step contract)

# Skills load automatically based on task context
```

---

## Comparison

| Feature | Team RAM | oh-my-opencode | Typical Harness |
|---------|----------|----------------|-----------------|
| Agent count | 10 specialists | 10 agents | 1-3 generalists |
| Self-evolution | Level 4 (Genesis Engine) | No | No |
| Persistent memory | PostgreSQL + RuVector (AD-49) | No | No |
| HITL governance | Cognitum Gate + Curator | No | No |
| Coherence monitoring | Yes (drift detection) | No | No |
| Dual runtime | Claude Code + OpenCode | OpenCode only | Single |
| Preset switching | CLI one-command | Config file | Manual |
| Council/Party mode | Yes | Yes | Rare |
| HTTP API | Yes (17 endpoints) | No | Rare |
| Loop curation | Loopy (v0.4.2) | No | No |
| Bounded autonomy | Auto-mode (v0.4.2) | No | No |
| Model governance | `models.yaml` registry | No | No |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Installation](docs/installation.md) | Full setup guide with prerequisites |
| [Configuration](docs/configuration.md) | Config reference — opencode.json, presets, agents, permissions |
| [Agents](docs/agents.md) | Complete roster with personas, routing rules, model assignments |
| [Presets](docs/presets.md) | Preset switching, custom presets, when to use each |
| [Dual-Runtime](docs/dual-runtime.md) | Claude Code vs OpenCode guide, sync strategy |
| [Quick Reference](docs/quick-reference.md) | One-page cheat sheet: commands, routing, troubleshooting |
| [Testing](docs/TESTING.md) | Test strategy, running tests, writing new tests |
| [SERVICES.md](.opencode/SERVICES.md) | HTTP API endpoints, configuration, authentication |
| [CLAUDE.md](CLAUDE.md) | AI agent guidance for this repo |
| [AGENTS.md](AGENTS.md) | Agent roster & technical specification |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow, standards, how to submit changes |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [ADR: Loopy + Auto-Mode](docs/adr/ADR-loopy-auto-mode.md) | Architecture decision record for the loop curation layer |

### Architecture Documents

| Document | Purpose |
|----------|---------|
| [Blueprint](planning%20docs/BLUEPRINT.md) | Single source of design intent |
| [Solution Architecture](planning%20docs/SOLUTION-ARCHITECTURE.md) | Topological view — who calls what |
| [Risks & Decisions](planning%20docs/RISKS-AND-DECISIONS.md) | Architectural decisions + risk register |
| [Requirements Matrix](planning%20docs/REQUIREMENTS-MATRIX.md) | Business → Functional → Use Case traceability |
| [Data Dictionary](planning%20docs/DATA-DICTIONARY.md) | Canonical field-level reference |

---

## Project Structure

```
src/
  http-server.ts          # HTTP service — health, invoke, curator, lifecycle endpoints
  agent-executor.ts       # Agent invocation pipeline (Anthropic API + local mode)
  sona-trajectory.ts      # SONA learning engine — trajectory capture and pattern extraction
  sona-patterns.ts        # Pattern extraction service — skill revision proposals
  coherence-monitor.ts    # Agent interaction graph — drift detection, bounce tracking
  curator.ts              # HITL curator — revision and agent proposal queues
  genesis-engine.ts       # New agent proposals from coverage gaps
  agent-sandbox.ts        # Experimental agent sandbox + Cognitum Gate
  agent-lifecycle.ts      # Agent birth → promotion → retirement
  auto-mode.ts            # Fully autonomous task execution orchestrator

agents/                   # Claude Code agent definitions (model: inherit)
.opencode/
  agent/                  # OpenCode agent definitions (explicit Ollama models)
    core/                 # Primary orchestrators (Brooks, Jobs)
    subagents/            # Delegated specialists (Woz, Scout, Pike, etc.)
  command/                # Workflow command templates (34)
  skills/                 # Reusable skill playbooks (160+)
  routing/                # Performance router (PostgreSQL-backed)
  hooks/                  # Lifecycle hooks (session-start, task-complete)
  contracts/              # Harness contracts (day/night build modes)
  config/                 # Agent metadata, skill mappings
  templates/              # Documentation templates (Blueprint, Design, etc.)

.claude/                  # Claude Code sync surface
scripts/                  # Preset switching, linting, setup
bin/                      # agent-sync-check.sh — drift detection
planning docs/            # Architecture documentation artifacts
migrations/               # SQL schema migrations
```

---

## Key Invariants

These are non-negotiable. The system enforces them:

- **`group_id`** is mandatory on every DB operation. Pattern: `^allura-[a-z0-9-]+$`
- **PostgreSQL is append-only** — no UPDATE/DELETE on event rows
- **Neo4j uses SUPERSEDES** — create new versions, never edit nodes
- **HITL required for promotion** — no autonomous deployment of skill revisions or new agents
- **DB operations via MCP only** — never `docker exec`
- **Instruction boundary** — every agent definition prevents prompt injection from untrusted sources

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide. The short version:

```bash
# Fork, clone, branch
git checkout -b feat/your-feature

# Develop
bun run lint          # Check with Biome
bun run typecheck     # TypeScript strict mode
bun test              # Run test suite

# Submit
git push origin feat/your-feature
# Open a PR against main
```

---

## The Brooksian Principles

Team RAM is built on five ideas from *The Mythical Man-Month*:

1. **Conceptual Integrity** — One architect (Brooks) owns the vision. A slightly inferior but consistent design beats a patchwork of conflicting "best" ideas.

2. **The Surgical Team** — Not 10 interchangeable programmers. One surgeon, one administrator, one toolsmith, one language lawyer — each amplifying the surgeon's output.

3. **No Silver Bullet** — Essential complexity (understanding the problem) can't be automated away. The harness eliminates *accidental* complexity (model selection, context management, routing).

4. **Brooks's Law** — Adding agents to a late project makes it later. 10 agents is enough. Don't add more.

5. **Plan to Throw One Away** — The Genesis Engine proposes, the Curator approves, and the Lifecycle Manager retires. Agents are designed for revision, not permanence.

---

## License

[MIT](LICENSE) &mdash; Free for commercial and personal use.

Built by [Sabir Asheed](https://github.com/ronin704) and Team RAM Contributors.

---

<p align="center">
  <em>"Conceptual integrity is the most important consideration in system design."</em>
  <br />
  <em>&mdash; Frederick P. Brooks Jr.</em>
</p>