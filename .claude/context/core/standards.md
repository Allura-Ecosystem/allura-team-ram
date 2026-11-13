<!-- Context: core/standards | Priority: critical | Version: 1.0 | Updated: 2026-05-03 -->

---
owner: scout
last_verified: 2026-05-03
source_files:
  - src/kernel/RuVixKernel.ts
  - .opencode/context/allura/ALLURA-BRAIN-PROMPT.md
  - .opencode/rules/AI-GUIDELINES.md
  - .opencode/skills/allura-memory-skill/SKILL.md
  - .opencode/rules/postgres-best-practices.md
  - .opencode/rules/mcp-integration.md
max_age_days: 30
---

# Allura Memory — Project Standards

## Code Standards
- TypeScript strict mode, no `any` without explicit justification
- Zod v4 for all API boundary validation
- PostgreSQL queries through `getPool()` singleton — no raw client creation
- Memory calls through supported governed interfaces with authorized tenant scope and transport-derived identity
- Embeddings: `qwen3-embedding:8b` with `dimensions=1024` via OpenAI-compatible endpoint
- Vector column: `embedding vector(1024)` with HNSW index `allura_mem_hnsw`

## API Standards
- All routes return typed Zod-validated responses
- Error handling: structured error objects, no naked throws
- Brain tools: `allura-brain__memory_add/search/list/get/promote/update/delete/export`
- MCP server: stdio transport, registered in `.opencode/config.json`

## Memory Governance (RuVix)
- **POL-001:** No direct canonical database writes from agents — use the human-governed promotion pipeline
- **POL-002:** Budget enforcement on memory_add — prevents unbounded storage
- **POL-003:** Content scoring threshold (0.85 default) for promotion to canonical
- **POL-004:** Rejects non-canonical agent IDs in trace calls — tracing gracefully degrades
- **POL-005:** 30-day soft-delete window with memory_restore capability
- **POL-006:** Systematic debugging integration — event types for investigation phases

## Testing Standards
- Unit tests in `__tests__/` adjacent to source
- E2E tests in `tests/` (29/29 passing)
- Integration tests validate Brain connectivity (test-brain-integration.sh)
- Benchmarks in `benchmark/` (retrieval P@5 = 0.867, UX benchmark = 0.881)

## Security Standards
- `CREDENTIALS_DIR` chmod 700 (was world-writable, fixed)
- RuVix blocks direct database access from agent surfaces
- Rate limiting on API routes (no credential leaks in test runs)
- Verify current active services from supported diagnostics; never infer health from a historical inventory

## Brain Integration
- `group_id`: `allura-system` for canonical memories
- `user_id`: maps to agent identity (e.g., `brooks`, `scout`, `woz`)
- Postgres FIRST — abort if write fails
- Canonical promotion ONLY after validation and explicit human approval
- Search before write — deduplicate before storing
