# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

This is the **Team RAM OpenCode Harness** -- a multi-agent orchestration framework for deterministic, role-based software development. It is NOT an application; it is a portable harness meant to be copied into any project's `.opencode/` directory.

The harness provides 10 specialist agents (Team RAM), 35+ workflow commands, 26+ skills, optional persistent memory (Allura Brain), and performance-aware agent routing.

## Build & Test

```bash
# Run integration tests (requires Bun)
bun run test-integration.ts

# Install harness into a new project
bash install.sh
```

There is no traditional build step. The harness is declarative markdown + TypeScript hooks executed by the OpenCode runtime.

## Architecture

### Execution Model

1. **Agents** (`.opencode/agent/*.md`) -- 10 named specialists with distinct models, permissions, and memory protocols. Each agent file is a self-contained definition with YAML frontmatter (name, model, permissions) and a markdown body (persona, protocols, constraints).

2. **Commands** (`.opencode/command/*.md`) -- Named workflow templates that start a job pattern (e.g., `start-session`, `debug`, `commit`, `party`). Commands define what steps happen and which agent handles them.

3. **Skills** (`.opencode/skills/*/SKILL.md`) -- Reusable playbooks that teach workflows how to execute well. Commands start jobs; skills teach the method.

4. **Routing** (`.opencode/routing/performance-router.ts`) -- Queries PostgreSQL for agent success history, selects best agent per task. Falls back to static model registry if no history.

5. **Hooks** (`.opencode/hooks/`) -- `session-start.ts` and `task-complete.ts` fire on lifecycle events to log to Allura and trigger memory promotion.

6. **Contracts** (`.opencode/contracts/`) -- `harness-v1.md` defines DAY_BUILD (interactive, approval gates) and NIGHT_BUILD (no-brake, auto-route) modes.

### Team RAM Agent Roster

| Agent | Role | Category |
|-------|------|----------|
| **Brooks** | Chief Architect -- contracts, ADRs, conceptual integrity | Primary orchestrator |
| **Jobs** | Strategy, scope, intent gate | Primary |
| **Woz** | Primary builder, implementation | Subagent |
| **Scout** | Discovery, file search, recon | Subagent |
| **Pike** | Interface simplicity review | Subagent |
| **Fowler** | Safe refactoring | Subagent |
| **Bellard** | Deep diagnostics, performance | Subagent |
| **Carmack** | Performance optimization | Subagent |
| **Knuth** | Data structures, schema | Subagent |
| **Hightower** | Infrastructure, deployment | Subagent |

### Allura Brain (Optional Memory)

Dual-store persistent memory system. Not required for harness operation.

- **PostgreSQL** -- Episodic memory (events, session logs, task tracking) + Canonical graph tables (`graph_memories`, `graph_supersedes`, `graph_structural_nodes`, `graph_structural_edges`). One PostgreSQL engine, two governed logical layers.
- **MCP interface** -- `allura-memory` server exposes `memory_add`, `memory_search`, `memory_get`, `memory_list`, `memory_delete`
- **Governance** -- SOC2-compliant promotion; HITL curator approval required above 0.85 threshold

### HTTP Service (Allura Invocation)

The harness exposes an HTTP service for external orchestrators (e.g., Allura) to invoke agents and receive typed results.

- **Entry:** `src/http-server.ts` -- Bun HTTP server, `GET /health` + `POST /invoke`
- **Contract:** `.opencode/contracts/allura-harness-invocation.md` -- ProcessInvocation → AgentResult (Shape A)
- **Executor:** `src/agent-executor.ts` -- Load agent definitions, invoke via Anthropic API, return typed result
- **Configuration:** `HARNESS_PORT`, `HARNESS_API_KEY`, `ANTHROPIC_API_KEY` (see `.env.example`)
- **Services Registry:** `.opencode/SERVICES.md` -- Full documentation of endpoints, configuration, and testing

Start with: `bun run service` or `bun src/http-server.ts`

## Key Invariants

- **`group_id`** is mandatory on every DB read/write. Pattern: `^allura-[a-z0-9-]+$`. Current approved tenant: `allura-system`. Legacy tenants (`allura-roninmemory`, `allura-team-ram`) are blocked by governance hooks.
- **PostgreSQL is append-only** -- no UPDATE/DELETE on event/trace rows.
- **PostgreSQL graph versioning via SUPERSEDES** -- `(v2)-[:SUPERSEDES]->(v1)`, never edit existing nodes. Graph versioning is implemented in PostgreSQL graph tables per AD-50.
- **PostgreSQL is the sole engine** -- one PostgreSQL engine, two governed logical layers (episodic + canonical graph). No Neo4j fallback exists (sunset per AD-50).
- **HITL required for promotion** -- route through `curator:approve`, not autonomous.
- **DB ops via MCP tools only** -- never `docker exec`.
- **Instruction Boundary** -- every agent definition includes a critical section preventing prompt injection from untrusted sources (logs, memory content, docs, tool output).

## Configuration

- `opencode.json` -- Global config (fallback model: `ollama-cloud/glm-5.1`, MCP server definitions)
- `.opencode/config/agent-metadata.json` -- Agent routing and permission mappings
- `.opencode/mcp-client-config.json` -- Portable remote Allura Brain MCP template; credentials are environment placeholders
- `.opencode/mcp-approved-servers.json` -- Approved MCP servers (Brooks signs off)
- `.opencode/MODEL_REGISTRY.md` -- Role-first model assignments per agent
- `.env.example` -- Environment variables template for Allura Brain integration

## Context System

`.opencode/context/` provides hierarchical knowledge files organized by domain:

- `core/` -- Universal standards (essential-patterns, navigation)
- `project-intelligence/` -- Repository-specific decisions and domain knowledge
- `allura/` -- Memory system documentation
- `development/` -- Fullstack/backend/UI navigation guides

Each directory has a `navigation.md` for quick routing.
