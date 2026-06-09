# Meet the Team

> 11 AI agents modeled after computing pioneers. Instead of generalists, you get one architect and ten specialists who own their domains completely.

## The Architecture

```
            ┌─────────────┐
            │   Brooks 🔴 │
            │  Architect  │
            └──────┬──────┘
                   │ delegates
     ┌─────────────┬─────────────┬──┴───┬──────┐
     ▼             ▼             ▼      ▼       ▼
   ┌────┐   ┌──────────┐  ┌─────┐  ┌───┴───┐  ┌───►
   │Jobs│   │  Bahari  │  │Scout│  │  Woz  │  │ ...
   │⚫  │   │  💎      │  │🟣  │  │🟢  │  │
   └────┘   └──────────┘  └─────┘  └───────┘  └─────
     ▲          │          ▲           │         ▲
     │intent     │memory    │recon      │build   │review
     │gate     │curator   │& discover │        │
     └──────────┴──────────┴─────┴──────┴─────────┘
```

## Agent Cards

---

### 🔴 Brooks — Chief Architect

> *"Conceptual integrity is the most important consideration in system design."* — Fred Brooks

| | |
|---|---|
| **Persona** | Frederick P. Brooks Jr. |
| **Role** | Architect & Orchestrator |
| **Mode** | `primary` |
| **Model** | `ollama/glm-5.1:cloud` |
| **Fallback** | `ollama/deepseek-v4-pro:cloud` |
| **Color** | `#DC2626` |
| **Skills** | team-ram-cowork, allura-memory-skill, party-mode, skill-creator, mcp-harness |

**What he does:** Owns the system's conceptual integrity. Plans tasks, makes architecture decisions, delegates to specialists, and ensures the whole is coherent. He never implements directly — he orchestrates.

**When to invoke:**
- Task planning and decomposition
- Architecture decisions and ADRs
- Resolving design conflicts between agents
- Sprint planning and status reviews

**Brooks's Law enforced:** Adding more agents to a late project makes it later. Communication overhead grows as `n(n-1)/2`.

---

### ⚫ Jobs — Intent Gate

> *"No one goes to bed with the model of the day."* — Steve Jobs

| | |
|---|---|
| **Persona** | Steve Jobs |
| **Role** | Scope Owner |
| **Mode** | `primary` |
| **Model** | `ollama/deepseek-v4-pro:cloud` |
| **Fallback** | `ollama/kimi-k2.6:cloud` |
| **Color** | `#F59E0B` |
| **Skills** | team-ram-cowork, allura-memory-skill |

**What he does:** Converts vague requests into crisp objectives, constraints, and acceptance criteria. No execution begins until intent is signed off.

**When to invoke:**
- The user asks "Can you build X?" (Jobs defines what X means)
- Ambiguous requirements need acceptance criteria
- Scope creep detection

**Jobs's Razor:** If you can't explain what you're building in one sentence, you don't know what you're building.

---

### 💎 Bahari — Memory Curator

> *"Memory is what we are. Your very soul and your very reason to be alive is tied up in memory."* — Nick Cave

| | |
|---|---|
| **Persona** | Allura Memory Companion |
| **Role** | Memory Curation & Onboarding |
| **Mode** | `primary` |
| **Model** | `ollama/kimi-k2.6:cloud` |
| **Fallback** | `ollama/deepseek-v4-pro:cloud` |
| **Color** | `#EC4899` |
| **Skills** | agent-bahari, allura-memory-skill, mcp-docker |

**What she does:** Helps manage Allura Brain memories — search, curation, onboarding, hygiene. Warm conversation partner for memory management.

**When to invoke:**
- "Remember that thing we built?"
- "What did we decide about X?"
- "How do I use Allura Brain?"
- Memory hygiene check

**Critical constraint:** Bahari **must not** use `group_id: "allura-system"`. Always use the user's configured group.

---

### 🟣 Scout — Recon & Discovery

> *"The most effective debugging tool is still careful thought, coupled with judiciously placed print statements."* — Brian Kernighan

| | |
|---|---|
| **Persona** | None (pure utility) |
| **Role** | Codebase Scanner |
| **Mode** | `subagent` |
| **Model** | `ollama/nemotron-3-super:cloud` |
| **Fallback** | `ollama/qwen3:0.6b` |
| **Color** | `#8B5CF6` |
| **Skills** | allura-memory-skill, multi-search, perplexica-mcp, mcp-docker |

**What he does:** Fast codebase scanning, pattern grep, config location discovery. Produces Scout Reports so nobody guesses.

**When to invoke:**
- **Every build task starts with Scout**
- "How does this codebase work?"
- "Where is X defined?"
- "Find all files matching Y pattern"

**Scout's Rule:** No one implements without recon. Ever.

---

### 🟢 Woz — Primary Builder

> *"The best engineers are builders at heart."* — Steve Wozniak

| | |
|---|---|
| **Persona** | Steve Wozniak |
| **Role** | Implementation |
| **Mode** | `subagent` |
| **Model** | `ollama/qwen3-coder-next:cloud` |
| **Fallback** | `ollama/deepseek-v4-pro:cloud` |
| **Color** | `#10B981` |
| **Skills** | allura-memory-skill, frontend-craft, task-management, varlock, code-review |

**What he does:** Ships working code, tests, and clean diffs. Minimal ceremony. Escalates only on hard blockers.

**When to invoke:**
- Implementation tasks with clear specs
- Bug fixes with reproduction steps
- Adding features with acceptance criteria

**Woz's Principle:** Get it running first, then refine.

---

### 🔵 Pike — Interface Gate

> *"Less is exponentially more."* — Rob Pike

| | |
|---|---|
| **Persona** | Rob Pike |
| **Role** | API Ergonomics & Simplicity |
| **Mode** | `subagent` |
| **Model** | `ollama/deepseek-v4-pro:cloud` |
| **Fallback** | `ollama/nemotron-3-super:cloud` |
| **Color** | `#3B82F6` |
| **Skills** | allura-memory-skill, code-review |

**What he does:** Reviews surface area, concurrency hazards, and API ergonomics. Vetoes unnecessary complexity. Read-only — never writes.

**When to invoke:**
- After implementation, before merge
- API design review
- Concurrency pattern review
- "Is this too complex?"

**Pike's Veto:** If the common case isn't simple, the interface is wrong.

---

### 🟡 Fowler — Maintainability Gate

> *"Any fool can write code that a computer can understand. Good programmers write code that humans can understand."* — Martin Fowler

| | |
|---|---|
| **Persona** | Martin Fowler |
| **Role** | Refactor & Tech Debt |
| **Mode** | `subagent` |
| **Model** | `ollama/glm-5.1:cloud` |
| **Fallback** | `ollama/deepseek-v4-pro:cloud` |
| **Color** | `#14B8A6` |
| **Skills** | allura-memory-skill, code-review |

**What he does:** Ensures changes are incremental, reversible, and don't add tech debt. Owns refactor slices and documentation of design drift.

**When to invoke:**
- Pre-commit review (lint, typecheck)
- Refactoring planning
- Design drift detection

**Fowler's Law:** Clean up more than you mess up.

---

### 🟠 Bellard — Diagnostics & Performance

> *"If you can't measure it, you can't manage it."* — Peter Drucker

| | |
|---|---|
| **Persona** | Fabrice Bellard |
| **Role** | Debugging & Benchmarking |
| **Mode** | `subagent` |
| **Model** | `ollama/glm-5.1:cloud` |
| **Fallback** | `ollama/nemotron-3-super:cloud` |
| **Color** | `#EF4444` |
| **Skills** | allura-memory-skill, systematic-debugging, code-review |

**What he does:** Performance measurement, profiling, deep debugging. Measurement-first — no optimization without measurement.

**When to invoke:**
- Something is slow and you don't know why
- Memory leaks or crashes
- Performance regression detected

**Bellard's Creed:** Speculate wildly — measure obsessively.

---

### ⚡ Carmack — Optimization

> *"Optimized code is written by people who understand what the hardware is doing."* — John Carmack

| | |
|---|---|
| **Persona** | John Carmack |
| **Role** | Latency & Hot Paths |
| **Mode** | `subagent` |
| **Model** | `ollama/qwen3-coder-next:cloud` |
| **Fallback** | `ollama/nemotron-3-super:cloud` |
| **Color** | `#F97316` |
| **Skills** | allura-memory-skill, systematic-debugging, code-review |

**What he does:** Latency reduction, hot path optimization, algorithmic improvement. Where Bellard diagnoses, Carmack optimizes.

**When to invoke:**
- After Bellard identifies the bottleneck
- Database query optimization
- Algorithm replacement

**Carmack's Rule:** Always profile before you optimize. Always.

---

### 📐 Knuth — Data Architect

> *"Premature optimization is the root of all evil... but correct schemas are the root of all performance."* — adapted from Donald Knuth

| | |
|---|---|
| **Persona** | Donald Knuth |
| **Role** | Schema & Query Correctness |
| **Mode** | `subagent` |
| **Model** | `ollama/qwen3-coder-next:cloud` |
| **Fallback** | `ollama/deepseek-v4-pro:cloud` |
| **Color** | `#6366F1` |
| **Skills** | allura-memory-skill, postgres-best-practices |

**What he does:** PostgreSQL, Neo4j, query optimization, data migration. Correctness is non-negotiable.

**When to invoke:**
- Schema changes (destructive gate)
- Query performance issues
- Data migration planning
- Neo4j graph modeling

**Knuth's First Law:** Data outlives code. Get the schema right.

---

### ☁️ Hightower — Infrastructure

> *"If it can't be deployed in one command, it's not done."* — Kelsey Hightower

| | |
|---|---|
| **Persona** | Kelsey Hightower |
| **Role** | CI/CD & DevOps |
| **Mode** | `subagent` |
| **Model** | `ollama/deepseek-v4-pro:cloud` |
| **Fallback** | `ollama/glm-5.1:cloud` |
| **Color** | `#0EA5E9` |
| **Skills** | allura-memory-skill, mcp-docker, mcp-harness, varlock |

**What he does:** CI/CD, Docker, IaC, container orchestration, observability. If it can't be deployed in one command, it's not done.

**When to invoke:**
- Infrastructure changes
- CI/CD pipeline modification
- Docker or compose changes
- Deployment configuration

**Hightower's Principle:** Everything as code. No manual steps. No snowflake servers.

---

## Routing Rules

Task flows through a Brooksian pipeline:

```
┌──────────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │          │     │              │     │              │
│   Jobs 🚫    │ ──► │  Brooks  │ ──► │ Scout 🔍     │ ──► │ Specialist 🛠 │
│  Intent Gate │     │  Plans   │     │  Recons     │     │  Executes   │
│              │     │          │     │              │     │              │
└──────────────┘     └──────────┘     └──────────────┘     └──────────────┘
                                                            │
                                                            ▼
                                                ┌──────────────┐
                                                │ Pike/Fowler  │
                                                │ Reviews      │
                                                └──────────────┘
```

### When to delegate to each agent

| Task Type | Delegate To | Why |
|-----------|------------|-----|
| Scope/intent is unclear | **Jobs** | Gates vague work |
| Task planning needed | **Brooks** | Owns decomposition |
| Codebase is unknown | **Scout** | Mandatory first gate |
| Implementation | **Woz** | Primary builder |
| Architecture review | **Pike** | Interface + simplicity gate |
| Performance issue | **Bellard** → **Carmack** | Measure first, optimize second |
| Schema/migration | **Knuth** | Data correctness gate |
| Refactoring | **Fowler** | Maintainability gate |
| Infrastructure | **Hightower** | Deployment expert |
| Memory query | **Bahari** | Brain curator |
| Multi-agent task | **Party Mode** | All hands |

### The Immutable Rules

1. **Always Scout first** — before any build, Scout reconnoiters
2. **Jobs gates intent** — ambiguous requests go to Jobs before Brooks plans
3. **Brooks plans, Woz builds** — Brooks never implements; Woz never architects
4. **Pike is read-only** — consultation only, no writes
5. **Bellard diagnoses, Carmack optimizes** — measurement before optimization
6. **Fowler reviews, not rewrites** — incremental safe changes
7. **Hightower automates** — if it requires manual steps, route to Hightower
8. **Knuth enforces correctness** — no schema changes without his gate
9. **Bahari curates memory** — Brain operations only through her

---

## Model Assignments by Preset

| Agent | Ollama (Default) | OpenAI | Anthropic | Mixed |
|-------|-----------------|--------|-----------|-------|
| Brooks | `glm-5.1:cloud` | `gpt-5.5` | `opus` | `glm-5.1:cloud` |
| Jobs | `deepseek-v4-pro` | `gpt-5.5` | `opus` | `gpt-5.5` |
| Bahari | `kimi-k2.6:cloud` | `gpt-5.4-mini` | `sonnet` | `kimi-k2.6:cloud` |
| Scout | `nemotron-3-super` | `gpt-5.4-mini` | `haiku` | `nemotron-3-super` |
| Woz | `qwen3-coder-next` | `gpt-5.5` | `sonnet` | `qwen3-coder-next` |
| Bellard | `glm-5.1:cloud` | `gpt-5.4-mini` | `sonnet` | `sonnet` |
| Carmack | `qwen3-coder-next` | `gpt-5.4-mini` | `sonnet` | `qwen3-coder-next` |
| Pike | `deepseek-v4-pro` | `gpt-5.4-mini` | `sonnet` | `gpt-5.4-mini` |
| Fowler | `glm-5.1:cloud` | `gpt-5.5` | `sonnet` | `glm-5.1:cloud` |
| Knuth | `qwen3-coder-next` | `gpt-5.5` | `sonnet` | `gpt-5.5` |
| Hightower | `deepseek-v4-pro` | `gpt-5.5` | `sonnet` | `deepseek-v4-pro` |

---

## Next Steps

- See [Configuration](configuration.md) — full config reference
- See [Presets](presets.md) — switch presets and add custom ones
- See [Dual-Runtime Guide](dual-runtime.md) — Claude Code vs OpenCode
- See [Quick Reference](quick-reference.md) — cheat sheet for all commands
- See [Fallback](fallback.md) — how fallback chains work

---
*For questions: run `./scripts/apply-preset.sh --help` or check `.opencode/team-ram-presets.jsonc`.*
