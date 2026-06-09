# Contributing to OpenAgentsControl

Thank you for your interest in contributing to the Team RAM OpenCode Harness. This guide covers the development workflow, standards, and how to submit changes.

## Prerequisites

- [Bun](https://bun.sh) >= 1.1.0 (this is a Bun-only project — no npm/yarn)
- Git
- Docker (optional, for Allura Brain PostgreSQL + Neo4j)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/ronin704/OpenAgentsControl.git
cd OpenAgentsControl

# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Run the harness service
bun run service

# Run tests
bun test
```

## Development Workflow

### Branch Strategy

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes with clear, atomic commits
3. Push and open a Pull Request against `main`

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new agent routing pattern
fix: resolve group_id validation on edge case
docs: update SERVICES.md with new endpoints
test: add integration test for curator API
refactor: extract trajectory logic from executor
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`

### Code Quality

Before submitting a PR, run:

```bash
# Lint
bun run lint

# Format
bun run format

# Type check
bun run typecheck

# Tests
bun test
```

### Testing

- **Integration tests:** `bun run test:integration`
- **HTTP service tests:** `bun run test:http` (requires running server)
- Write tests for new features. Place test files alongside source or in root as `test-*.ts`.

## Project Structure

```
src/                    # Core TypeScript modules
  http-server.ts        # HTTP service (health, invoke, curator, lifecycle)
  agent-executor.ts     # Agent invocation pipeline
  sona-trajectory.ts    # SONA learning engine integration
  sona-patterns.ts      # Pattern extraction pipeline
  coherence-monitor.ts  # Agent interaction graph monitoring
  curator.ts            # HITL curator interface
  genesis-engine.ts     # New agent proposal engine
  agent-sandbox.ts      # Experimental agent sandbox + cognitum gate
  agent-lifecycle.ts    # Agent promotion/retirement lifecycle

.opencode/              # Harness definitions (agents, commands, skills)
  agent/                # Agent persona definitions
  command/              # Workflow command templates
  skills/               # Reusable skill playbooks
  routing/              # Performance router
  hooks/                # Lifecycle hooks
  contracts/            # Harness contracts

planning docs/          # Architecture documentation
migrations/             # SQL migrations
```

## Key Invariants

These are non-negotiable. PRs violating them will be rejected:

- `group_id = 'allura-system'` on every DB operation
- PostgreSQL events are append-only (no UPDATE/DELETE)
- Neo4j uses SUPERSEDES for versioning (never edit nodes)
- No skill/agent deployment without HITL curator approval
- All tools route through MCP (no `docker exec`)

## Adding a New Agent

1. Create `.opencode/agent/your-agent.md` with YAML frontmatter
2. Add the agent to the process mapping in `src/agent-executor.ts`
3. Register in `.opencode/config/agent-metadata.json`
4. Add tests verifying the agent loads and routes correctly
5. Update AGENTS.md

## Adding a New Skill

1. Create `.opencode/skills/your-skill/SKILL.md` with frontmatter
2. Document when the skill should trigger in the description field
3. Add to relevant agent definitions in the `skills` array

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

## Questions?

Open a [Discussion](https://github.com/ronin704/OpenAgentsControl/discussions) or file an [Issue](https://github.com/ronin704/OpenAgentsControl/issues).
