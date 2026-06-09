# Team RAM - The Surgical Team

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Charitablebusinessronin/team_durham/ci.yml?branch=main&label=CI)](https://github.com/Charitablebusinessronin/team_durham/actions)
[![Bun](https://img.shields.io/badge/runtime-Bun%20≥1.1-f9f1e1?logo=bun)](https://bun.sh)
[![Agents](https://img.shields.io/badge/agents-11%20specialists-purple)](./.opencode/agent/)
[![Skills](https://img.shields.io/badge/skills-35+-green)](./.opencode/skills/)
[![Self-Evolving](https://img.shields.io/badge/evolution-Level%204-orange)](./docs/agents.md#self-evolving-architecture)
[![Allura Brain](https://img.shields.io/badge/Allura%20Brain-integrated-blue)](https://github.com/Charitablebusinessronin/Allura_Memory)

**11 AI agents modeled after computing pioneers. Instead of 10 generalists, you get one architect and ten specialists who own their domains completely.**

> *"The purpose of organization is to reduce the amount of communication and coordination necessary."* — Frederick Brooks

[Quick Start](#quick-start) ·
[Agent Roster](#meet-the-team) ·
[Installation](docs/installation.md) ·
[Configuration](docs/configuration.md) ·
[Dual-Runtime](docs/dual-runtime.md) ·
[Presets](docs/presets.md) ·
[Quick Reference](docs/quick-reference.md)

---

## What Makes Team RAM Different

**Most agent orchestration tools give you one jack-of-all-trades.** Team RAM gives you a [surgical team](https://en.wikipedia.org/wiki/Fred_Brooks#The_Surgical_Team):

| Other Tools | Team RAM |
|-------------|----------|
| 1-3 general-purpose agents | ✅ **11 domain specialists** with distinct roles |
| Static routing | ✅ **Self-evolving** — agents improve from execution history |
| No memory | ✅ **Allura Brain** — dual-store memory (PostgreSQL + Neo4j) |
| No governance | ✅ **HITL curator** — no autonomous deployment |
| Single runtime | ✅ **Dual-runtime** — Claude Code + OpenCode |
| Manual model switching | ✅ **One-command presets** — `/preset openai` at runtime |

---

## Meet the Team

| Agent | Role | Model | When to Invoke |
|-------|------|-------|----------------|
| 🔴 **Brooks** | Chief Architect | `ollama/glm-5.1:cloud` | Planning, decisions, conflicts |
| ⚫ **Jobs** | Intent Gate | `ollama/deepseek-v4-pro:cloud` | Vague requests, scope |
| 💎 **Bahari** | Memory Curator | `ollama/kimi-k2.6:cloud` | "Remember...", Brain queries |
| 🟣 **Scout** | Recon + Discovery | `ollama/nemotron-3-super:cloud` | Always first. Search codebase |
| 🟢 **Woz** | Primary Builder | `ollama/qwen3-coder-next:cloud` | Implementation |
| 🔵 **Pike** | Interface Gate | `ollama/deepseek-v4-pro:cloud` | API review, complexity |
| 🟡 **Fowler** | Maintainability | `ollama/glm-5.1:cloud` | Pre-commit, refactoring |
| 🟠 **Bellard** | Diagnostics | `ollama/glm-5.1:cloud` | Debugging, profiling |
| ⚡ **Carmack** | Optimization | `ollama/qwen3-coder-next:cloud` | Hot paths, latency |
| 📐 **Knuth** | Data Architect | `ollama/qwen3-coder-next:cloud` | Schema, migrations |
| ☁️ **Hightower** | Infrastructure | `ollama/deepseek-v4-pro:cloud` | CI/CD, Docker |

[Full Agent Roster →](docs/agents.md)

---

## Architecture

```
            ┌─────────────┐
            │   Brooks 🔴 │
            │  Architect  │
            └──────┬──────┘
                   │ delegates
     ┌─────────────┼─────────────┬──────┐
     ▼             ▼             ▼      ▼
   ┌────┐    ┌──────────┐  ┌─────┐  ┌───►
   │Jobs│    │  Bahari  │  │Scout│  │ ...
   │⚫  │    │  💎      │  │🟣  │  │
   └────┘    └──────────┘  └─────┘  └─────
     ▲intent   │memory     │recon   │specialists
     │gate     │curator   │& discover│review
     └─────────┴──────────┴─────┴─────┘
```

**Task flows through a Brooksian pipeline:**

```
Jobs gates → Brooks plans → Scout recons →
Specialist executes → Pike/Fowler reviews
```

[Full Architecture →](docs/agents.md#routing-rules)

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) ≥1.1
- Ollama running locally (for default preset)

### Install

```bash
git clone https://github.com/Charitablebusinessronin/team_durham.git
cd team_durham
bun install

cp .env.example .env
# Edit .env with your API keys (optional for ollama preset)
```

### Activate Preset

```bash
# Default: ollama (free, zero API costs)
./scripts/apply-preset.sh

# Switch to OpenAI (when credits available)
./scripts/apply-preset.sh openai

# Switch to Anthropic (Claude Code users)
./scripts/apply-preset.sh anthropic
```

### Verify Setup

```bash
# Check all surfaces are consistent
./scripts/lint-agents.sh

# Check harness health
bun run harness-status
```

### Start Working

```bash
# Start a session (loads context, checks memory)
bun run start-session

# Or jump straight to work
bun run brooks -- "Plan a new login feature"
bun run woz -- "Implement the login page"
```

[Installation Guide →](docs/installation.md)

---

## Preset Switching

Switch providers instantly without editing 11 agent files.

```bash
./scripts/apply-preset.sh ollama       # Free, self-hosted
./scripts/apply-preset.sh openai      # Best quality
./scripts/apply-preset.sh anthropic   # Claude Code users
./scripts/apply-preset.sh mixed       # Optimized costs
```

| Preset | Cost | Best For |
|--------|------|----------|
| **ollama** (default) | Free | Zero API costs, self-hosted |
| **openai** | ~$30-50/mo | Best reasoning quality |
| **anthropic** | ~$30-50/mo | Claude Code native |
| **mixed** | ~$15-30/mo | Cost/quality optimization |

[Preset Guide →](docs/presets.md)

---

## Key Features

### 🤖 11 Specialist Agents
Each agent is modeled after a computing pioneer with a distinct role, model assignment, and tool permissions. No generalists.

### 🔄 Preset Switching
One command switches all 11 agents between providers. Models change, roles stay constant.

### 💾 Allura Brain
Optional dual-store memory (PostgreSQL episodic + Neo4j semantic). Agents recall past decisions, bugs, and blockers.

### 🧬 Self-Evolving (Level 4)
SONA trajectories track agent execution history. Pattern extraction identifies recurring successes and failures. Coherence monitor detects conceptual drift. Genesis engine proposes new agents for uncovered task types.

### 👩‍⚖️ HITL Governance
No autonomous deployment. All self-modifications route through the curator approval queue. Coherence gate + curator review before any agent promotion.

### 🎮 Dual-Runtime
Works on both Claude Code (`.claude/agents/`) and OpenCode (`.opencode/agent/`). Single source of truth keeps both in sync.

[Full Documentation →](docs/)

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Configuration](docs/configuration.md) | Full config reference for opencode.json, presets, agents, permissions |
| [Agents](docs/agents.md) | Complete agent roster with personas, routing rules, model assignments |
| [Presets](docs/presets.md) | Preset switching, custom presets, when to use each |
| [Dual-Runtime](docs/dual-runtime.md) | Claude Code vs OpenCode guide, sync strategy |
| [Quick Reference](docs/quick-reference.md) | One-page cheat sheet: commands, routing, troubleshooting |
| [CLAUDE.md](CLAUDE.md) | AI agent guidance for this repo |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## Self-Evolving Architecture

The harness operates at **Level 4: Self-Evolving**:

```
Task → Router → Agent → SONA Trajectory → Pattern Extraction
         ↑                                        ↓
    SONA-informed                         Skill Revision Proposal
    exploration                                   ↓
         ↑                                Coherence Gate
    Performance                                   ↓
    history                              HITL Curator Review
                                                   ↓
                                           Deploy if approved
```

| Level | Name | Status |
|-------|------|--------|
| 1 | Static — fixed routing | ✅ Complete |
| 2 | Adaptive — performance-based routing | ✅ Complete |
| 3 | Learning — agents improve their own skills | ✅ Complete |
| 4 | Evolving — system creates new agents | ✅ **Current** |

[Full Architecture →](docs/agents.md#self-evolving-architecture)

---

### Comparison: Team RAM vs oh-my-opencode-slim

| Feature | Team RAM | oh-my-opencode-slim |
|---------|----------|---------------------|
| Agent count | 11 | 6-8 |
| Preset switching | ✅ CLI + config | ✅ `/preset` command |
| Self-evolution | ✅ Level 4 | ❌ |
| HITL Governance | ✅ Curator | ❌ |
| Dual memory store | ✅ PostgreSQL + Neo4j | ❌ |
| Dual runtime | ✅ Claude + OpenCode | OpenCode only |
| Fallback chains | ✅ Per-agent | ✅ Per-agent |
| Council mode | ✅ Party mode | ✅ Council |
| Tmux multiplexer | ❌ | ✅ |
| Dedicated website | ❌ | ✅ |
| Interactive installer | ❌ | ✅ bunx |

---

## License

[MIT](LICENSE) — Free for commercial and personal use. Built by Team RAM Contributors / Sabir Asheed.

---

*For questions: run `./scripts/apply-preset.sh --help` or check `.opencode/team-ram-presets.jsonc`.*
