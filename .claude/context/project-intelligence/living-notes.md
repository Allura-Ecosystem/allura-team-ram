<!-- Context: project-intelligence/notes | Priority: high | Version: 2.0 | Updated: 2026-04-25 -->

# Living Notes — allura Memory

> Active issues, technical debt, open questions, and current sprint state.  
> **Update:** When status changes or at session start.  
> **Archive:** Move resolved items to bottom with resolution date.

---

## Current Sprint State (as of 2026-04-25)

**Epic:** 1 — Persistent Knowledge Capture  
**Active Story:** 1.2 — TraceMiddleware Integration `[IN PROGRESS]`  
**Last Completed:** Story 1.1 ✅ RuVix Security Hardening (28/28 tests)

**Agent Primitives:**
- 4/12 green
- 5/12 in-progress
- 3/12 red

---

## Technical Debt

| Item | Impact | Priority | Status |
|------|--------|----------|--------|
| `memory()` wrapper PENDING | Primary write-back blocker; agents can't log to Brain mid-task | High | Acknowledged |
| Historical retired graph dirty-data issue | Old graph retrieval was blocked by malformed entities | Historical | Backend retired; not a repair target |
| RuVector stubs | `ruvector_hybrid_search()` and other learning/agent functions are stubs; don't call them | Med | Deferred |

### Technical Debt Details

**`memory()` wrapper PENDING**  
*Priority:* High  
*Impact:* Agents cannot write back to Allura Brain during task execution — only at session end  
*Root Cause:* memory() wrapper not yet implemented as a first-class primitive  
*Proposed Solution:* Implement memory() wrapper in kernel layer, expose via MCP  
*Status:* Acknowledged — Story 1.2 dependency

**Historical Retired Graph — Dirty Entities**
*Priority:* High  
*Impact:* `mcp__MCP_DOCKER__read_graph` and `mcp__MCP_DOCKER__search_memories` both fail with Pydantic validation errors  
*Root Cause:* Entities `Spec-Driven System` and `Prompt System` have spaces in their `type` field (violates `^[A-Za-z_][A-Za-z0-9_]*$` pattern) and null `observations`  
*Current handling:* Use governed PostgreSQL/RuVector retrieval; no direct database fallback.
*Disposition:* Historical backend retired; no cleanup or repair operation is authorized by this note.
*Status:* Known — blocking session memory hydration

**RuVector Stubs**  
*Priority:* Med  
*Impact:* Calling stub functions causes silent failures  
*Root Cause:* Extension interface defined but learning/agent functions not implemented  
*Workaround:* Use `retrieveMemories()` in `src/lib/ruvector/bridge.ts` (hybrid search, BM25 RRF — this works)  
*Status:* Deferred — documented in `docs/RUVECTOR_INTEGRATION.md`

---

## Open Questions

| Question | Stakeholders | Status | Next Action |
|----------|--------------|--------|-------------|
| When does `memory()` wrapper land? | Brooks, Woz | Open | Scope into Story 1.2 or create Story 1.3 |
| Historical retired graph cleanup question | Brooks | Closed by retirement | Preserve evidence; no service or data repair |
| RuVector stubs — promote to real or remove? | Brooks, Bellard | Deferred | Post-Epic-1 decision |

---

## Known Issues

| Issue | Severity | Workaround | Status |
|-------|----------|------------|--------|
| Historical retired graph search blocked | Historical | Governed retrieval only | Backend retired |
| `test:mcp` needs live dev server | Med | Run `bun run dev` first; `USE_REAL_MCP_DOCKER=true` for full validation | Known (by design) |
| ADAS test runs not completing | Med | See V1-BLOCKERS-AND-FIXES.md | In Progress |

---

## Patterns Worth Preserving

- **`group_id` on every DB operation** — enforced at PostgreSQL CHECK constraint, not application layer. This is the invariant that keeps multi-tenancy safe.
- **Append-only traces** — never UPDATE/DELETE on `events` table. Everything is recoverable.
- **Human approval before canonical promotion** — use a supported governed curator capability and verify its receipt and canonical retrieval.
- **`retrieveMemories()` for hybrid search** — `src/lib/ruvector/bridge.ts` two-pass RRF fusion (vector ANN + BM25). This works; the extension stubs do not.

## Gotchas for Maintainers

- `test:mcp` requires a running Next.js dev server (`bun run dev`) — absence gives a precondition warning, not a protocol failure
- `USE_REAL_MCP_DOCKER=true` is required to test actual Docker MCP integration (off by default)
- Dashboard is at `src/app/(main)/dashboard` on port 3100 — NOT `apps/allura-dashboard` (that was removed)
- `allura-*` tenant prefix required everywhere; `roninclaw-*` is deprecated

---

## Active Projects

| Project | Goal | Owner | Status |
|---------|------|-------|--------|
| Story 1.2 TraceMiddleware | Full HTTP request tracing for agent operations | Woz | In Progress |
| Historical retired graph cleanup | Preserved as evidence, no active repair | Brooks | Closed by retirement |
| Brand docs alignment | Sync all planning/context docs to finalized brand | Brooks | In Progress |

---

## Archive (Resolved)

### Resolved: P0 MCP Validation Cleanup
- **Resolved:** 2026-04-25
- **Resolution:** `scripts/test-mcp-browser.ts` cleaned up. MCP Docker CLI check now opt-in via `USE_REAL_MCP_DOCKER=true`. Canonical Streamable HTTP test passes 12/12.

### Resolved: Dashboard Course Correction
- **Resolved:** 2026-04-25
- **Resolution:** Removed `apps/allura-dashboard` (mistaken Vercel boilerplate clone). Real dashboard confirmed at `src/app/(main)/dashboard`.

### Resolved: RuVix Security Hardening (Story 1.1)
- **Resolved:** 2026-04-xx
- **Resolution:** 28/28 tests passing. Proof-gated mutation layer complete.

---

## Related Files

- `decisions-log.md` — decisions that inform current state
- `business-domain.md` — business context for current priorities
- `technical-domain.md` — technical context for current state
- `business-tech-bridge.md` — why constraints exist
- `.opencode/context/allura/V1-BLOCKERS-AND-FIXES.md` — v1 ship gate issues
