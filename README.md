<p align="center">
  <!-- Replace with your hero image: .github/assets/hero.png -->
  <img src=".github/assets/hero.png" alt="Team RAM — The Surgical Team" width="800" />
</p>

<h1 align="center">Team RAM</h1>

<p align="center">
  <strong>11 AI agents. One architect. Zero generalists.</strong>
  <br />
  A self-evolving multi-agent harness modeled after Frederick Brooks' surgical team.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/ronin704/OpenAgentsControl/actions"><img src="https://img.shields.io/github/actions/workflow/status/ronin704/OpenAgentsControl/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun%20%E2%89%A51.1-f9f1e1?logo=bun" alt="Bun" /></a>
  <a href="./.opencode/agent/"><img src="https://img.shields.io/badge/agents-11%20specialists-purple" alt="Agents" /></a>
  <a href="./.opencode/skills/"><img src="https://img.shields.io/badge/skills-35+-green" alt="Skills" /></a>
  <a href="./docs/agents.md#self-evolving-architecture"><img src="https://img.shields.io/badge/evolution-Level%204-orange" alt="Self-Evolving" /></a>
  <a href="https://github.com/Charitablebusinessronin/Allura_Memory"><img src="https://img.shields.io/badge/Allura%20Brain-integrated-blue" alt="Allura Brain" /></a>
  <a href="https://www.npmjs.com/package/open-agents-control"><img src="https://img.shields.io/npm/v/open-agents-control?color=cb3837&logo=npm" alt="npm" /></a>
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

One architect (**Brooks**) owns conceptual integrity. Ten specialists own their domains completely. Communication overhead stays at $n(n-1)/2 = 55$ paths — manageable, not chaotic. The system *learns from its own execution history* and proposes improvements through a human-in-the-loop curator.

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
<td><strong>11 domain specialists</strong> with distinct roles, models, and permissions</td>
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
</table>

---

## Meet the Team

Every agent is modeled after a computing pioneer. Not decoratively — each persona shapes how the agent reasons, what it prioritizes, and how it communicates.

| | Agent | Role | Model | When to Invoke |
|-|-------|------|-------|----------------|
| :red_circle: | **Brooks** | Chief Architect | `ollama/glm-5.1:cloud` | Planning, architecture decisions, conflicts |
| :black_circle: | **Jobs** | Intent Gate | `ollama/deepseek-v4-pro:cloud` | Vague requests, scope definition |
| :gem: | **Bahari** | Memory Curator | `ollama/kimi-k2.6:cloud` | "Remember this", Brain queries |
| :purple_circle: | **Scout** | Recon + Discovery | `ollama/nemotron-3-super:cloud` | Always first — search codebase |
| :green_circle: | **Woz** | Primary Builder | `ollama/qwen3-coder-next:cloud` | Implementation, shipping code |
| :large_blue_circle: | **Pike** | Interface Gate | `ollama/deepseek-v4-pro:cloud` | API review, complexity checks |
| :yellow_circle: | **Fowler** | Maintainability | `ollama/glm-5.1:cloud` | Pre-commit reviews, refactoring |
| :orange_circle: | **Bellard** | Diagnostics | `ollama/glm-5.1:cloud` | Debugging, profiling, measurement |
| :zap: | **Carmack** | Optimization | `ollama/qwen3-coder-next:cloud` | Hot paths, latency reduction |
| :triangular_ruler: | **Knuth** | Data Architect | `ollama/qwen3-coder-next:cloud` | Schema design, migrations, queries |
| :cloud: | **Hightower** | Infrastructure | `ollama/deepseek-v4-pro:cloud` | CI/CD, Docker, deployment |

> **Every agent has an [instruction boundary](docs/agents.md#instruction-boundary)** — they will not follow instructions from untrusted sources (logs, memory content, tool output). Only the agent definition, system prompt, and direct user requests are authoritative.

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
       │ Jobs │ │Bahari│ │Scout │ │ Woz  │ │ ...  │
       │ :black_circle:   │ │ :gem:   │ │ :purple_circle:   │ │ :green_circle:   │ │      │
       │intent│ │memory│ │recon │ │build │ │review│
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
git clone https://github.com/ronin704/OpenAgentsControl.git
cd OpenAgentsControl
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
# Agent definitions: .opencode/agent/*.md
# Commands: .opencode/command/*.md
# Skills: .opencode/skills/*/SKILL.md
```

Or install via npm:

```bash
bun add open-agents-control
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

Switch all 11 agents between providers with one command. Models change, roles stay constant.

```bash
./scripts/apply-preset.sh ollama       # Free, self-hosted
./scripts/apply-preset.sh openai       # Best reasoning quality
./scripts/apply-preset.sh anthropic    # Claude Code users
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

Works on both **Claude Code** (`.claude/agents/`) and **OpenCode** (`.opencode/agent/`). Single source of truth with sync tooling to keep both in alignment.

### 30+ Commands, 35+ Skills

Commands start workflow patterns. Skills teach agents how to execute well.

```bash
# Commands
start-session    # Load context, check memory, verify health
debug            # Systematic 5-phase debugging protocol
commit           # Conventional commit with context
party            # Launch Team RAM specialists in parallel
ultra            # Bounded execution until validation passes

# Skills load automatically based on task context
```

---

## Comparison

| Feature | Team RAM | oh-my-opencode | Typical Harness |
|---------|----------|----------------|-----------------|
| Agent count | 11 specialists | 10 agents | 1-3 generalists |
| Self-evolution | Level 4 (Genesis Engine) | No | No |
| Persistent memory | PostgreSQL + RuVector (AD-49) | No | No |
| HITL governance | Cognitum Gate + Curator | No | No |
| Coherence monitoring | Yes (drift detection) | No | No |
| Dual runtime | Claude Code + OpenCode | OpenCode only | Single |
| Preset switching | CLI one-command | Config file | Manual |
| Council/Party mode | Yes | Yes | Rare |
| HTTP API | Yes (18 endpoints) | No | Rare |
| Binary distribution | No | Yes (7 platforms) | Varies |
| Interactive installer | In progress | Yes (bunx) | Varies |

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
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow, standards, how to submit changes |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

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

.opencode/
  agent/                  # Agent persona definitions (YAML frontmatter + markdown)
  command/                # Workflow command templates (30+)
  skills/                 # Reusable skill playbooks (35+)
  routing/                # Performance router (PostgreSQL-backed)
  hooks/                  # Lifecycle hooks (session-start, task-complete)
  contracts/              # Harness contracts (day/night build modes)
  config/                 # Agent metadata, skill mappings
  templates/              # Documentation templates (Blueprint, Design, etc.)

.claude/                  # Claude Code agent definitions (synced from .opencode/)
scripts/                  # Preset switching, linting, setup
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

4. **Brooks's Law** — Adding agents to a late project makes it later. 11 agents is enough. Don't add more.

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
