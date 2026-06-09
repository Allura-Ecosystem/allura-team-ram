<!-- Context: project-intelligence/nav | Priority: critical | Version: 1.1 | Updated: 2026-04-11 -->

# Project Intelligence Navigation

> This section is an Allura-specific project intelligence overlay. It documents the Allura memory system and related repo context; it is not the generic harness identity.

## Quick Routes

| What You Need | File | Key Content |
|---------------|------|-------------|
| **Start here** | `navigation.md` | This file - quick overview |
| **How to build** | `technical-domain.md` | Stack, patterns, conventions |
| **Why this exists** | `business-domain.md` | Positioning vs mem0 |
| **Architecture** | `business-tech-bridge.md` | Business → tech mapping |
| **Decisions** | `decisions-log.md` | Why decisions were made |
| **Current state** | `living-notes.md` | Active issues, debt |
| **Repo truth** | `informant.md` | Maintainer field manual |

## Tech Stack at a Glance
```
Next.js 16 + TypeScript 5.9 (strict) + Bun 1.3
PostgreSQL 16 (events) + Neo4j 5.26 (knowledge) + RuVector (vectors)
OpenCode 1.4.3 (agent runtime) + MCP (tool protocol)
```

## Key Invariants
- ✅ `group_id` on every database write (tenant isolation)
- ✅ PostgreSQL = append-only raw traces
- ✅ Neo4j = curated knowledge with SUPERSEDES
- ✅ No agent writes to Neo4j without human approval

## Quick Commands
```bash
bun install              # Install dependencies
npm run dev              # Start dev server
npm test                 # Run tests (85% passing)
npm run typecheck        # TypeScript check
docker compose up -d     # Start infrastructure
```

## Integration

Referenced from:
- `memory-bank/systemPatterns.md` - Architecture patterns
- `AGENTS.md` - Agent operating handbook
- `docs/allura/` - Human documentation canon

## Maintenance

- Update when tech stack changes
- Document decisions as made
- Review `living-notes.md` weekly
