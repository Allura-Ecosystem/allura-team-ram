<!-- Context: core/security | Priority: critical | Version: 1.0 | Updated: 2026-05-03 -->

---
owner: scout
last_verified: 2026-05-03
source_files:
  - src/kernel/RuVixKernel.ts
  - docker/docker-compose.yml
  - .opencode/rules/AI-GUIDELINES.md
max_age_days: 30
---

# Allura Memory — Security Patterns

## Access Control
- **RuVix Kernel** (`src/kernel/`) enforces all database access policies
- No agent may write directly to canonical storage — use the human-governed promotion pipeline
- `POL-004`: Rejects non-canonical agent IDs in trace calls — graceful degradation
- `POL-001`: Direct canonical database writes must not bypass governance

## Credential Management
- `CREDENTIALS_DIR` must be chmod 700 (was world-writable — fixed 2026-04-28)
- Docker secrets via environment variables, never hardcoded
- `.env` files excluded from git (`.gitignore` enforced)

## API Security
- Rate limiting on all API routes (implemented, no leaks in test runs)
- Zod v4 validation at all API boundaries — no unvalidated input reaches the database
- Structured error responses — no stack traces or internal details in production

## Container Security
- Use current supported diagnostic evidence for active PostgreSQL/RuVector capacity; historical limits are not deployment instructions
- All 6 containers healthy as of 2026-05-03
- `EMBEDDING_BASE_URL=http://host.docker.internal:11434` for container → host Ollama

## Memory Security
- `POL-002`: Budget enforcement prevents unbounded memory storage
- `POL-005`: 30-day soft-delete window with `memory_restore` capability
- `POL-006`: Systematic debugging event types for investigation phases
- Content scoring threshold (0.85 default) for canonical promotion

## MCP Integration
- `allura-memory-mcp` container: stdio transport
- Only registered MCP tools can access Brain — no raw SQL from agent surfaces
- `.opencode/rules/mcp-integration.md` defines routing rules

## Anti-Patterns (DO NOT)
- ❌ Direct canonical database writes from agent code
- ❌ Hardcoded secrets or credentials
- ❌ Raw SQL from agent surfaces (use MCP tools)
- ❌ `web_fetch` on Notion URLs (use Notion API)
- ❌ Shell `curl` when MCP tool exists
