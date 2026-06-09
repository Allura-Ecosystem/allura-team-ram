# Harness Services Registry

This document lists all HTTP services and integrations provided by the OpenAgentsControl harness for external systems (e.g., Allura orchestrator).

---

## HTTP Service: Agent Invocation

**Purpose:** Accept process invocations from Allura, route to appropriate Team RAM agent, return typed result.

**Entry Point:** `src/http-server.ts`  
**Test Suite:** `test-http-service.ts` (14 tests, all passing)  
**Contract Spec:** `.opencode/contracts/allura-harness-invocation.md`

### Service Start

```bash
bun src/http-server.ts
# Output: 🚀 Harness service listening on http://0.0.0.0:7654
```

Or via npm script:
```bash
bun run service
```

### Endpoints

#### `GET /health`
Returns system health status.

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "postgres": "healthy|degraded|unhealthy",
  "neo4j": "healthy|degraded|unhealthy",
  "uptime_ms": 12345
}
```

#### `POST /invoke`
Invoke a named harness process.

**Headers:**
```
Authorization: Bearer <HARNESS_API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "processName": "harness.speckit.implement",
  "payload": { "spec": "...", "plan": "..." },
  "group_id": "allura-system",
  "metadata": {
    "agent_preference": "woz-builder",
    "mode": "day",
    "priority": "normal",
    "correlation_id": "req-abc123"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "agent": "woz-builder",
  "output": "implementation code here",
  "metrics": {
    "duration_ms": 2847,
    "tokens_in": 15000,
    "tokens_out": 8500
  },
  "confidence": 0.92
}
```

**Response (Error):**
```json
{
  "success": false,
  "errors": ["agent timeout", "invalid group_id"],
  "confidence": 0.0
}
```

### Configuration

**Environment Variables:**

```bash
HARNESS_PORT=7654                    # Port to listen on (default: 7654)
HARNESS_API_KEY=dev-key-insecure     # Bearer token for auth (default: dev-key-insecure)
ANTHROPIC_API_KEY=sk-...             # API key for agent execution (required for production)
POSTGRES_HOST=localhost               # Database connection
POSTGRES_PORT=5432
POSTGRES_USER=ronin4life
POSTGRES_PASSWORD=...
POSTGRES_DB=memory
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
AGENT_TIMEOUT_MS=30000               # Max time per agent execution (default: 30s)
```

See `.env.example` for template.

### Process-to-Agent Mapping

See `.opencode/contracts/allura-harness-invocation.md` Section 4 for the full mapping table.

| Process Name | Primary Agent |
|---|---|
| `harness.speckit.implement` | `woz-builder` |
| `harness.speckit.validate` | `brooks-architect` |
| `harness.discovery.recon` | `scout-recon` |
| `harness.refactor.safe` | `fowler-refactor-gate` |
| `harness.perf.diagnose` | `bellard-diagnostics-perf` |
| `harness.interface.review` | `pike-interface-review` |
| `harness.intent.scope` | `jobs-intent-gate` |

### Implementation Details

**Agent Executor:** `src/agent-executor.ts`
- Loads agent definitions from `.opencode/agent/<name>.md`
- Invokes agents via Anthropic API (or local fallback mode)
- Parses result envelopes (JSON or markdown)
- Returns typed `AgentResult`

**Health Check:** `src/http-server.ts`
- Probes Postgres and Neo4j with 2-second timeouts
- Caches result for 5 seconds
- Always returns overall "healthy" (harness can serve via static routing)

### Error Handling

**401 Unauthorized:**
- Missing `Authorization` header
- Invalid Bearer token

**400 Bad Request:**
- Malformed JSON payload
- Missing required fields (`processName`, `payload`, `group_id`)
- Invalid `group_id` format (must match `^allura-[a-z0-9-]+$`)
- Unknown `processName`

**500 Internal Server Error:**
- Agent execution failure
- Result parsing error
- Database connectivity issues

### Tracing & Observability

Every invocation includes:
- `correlation_id` (from request metadata or auto-generated)
- Agent execution logs (stdout/stderr)
- Metrics (duration, token counts)
- Confidence score for routing feedback

All events are appended to PostgreSQL `events` table with `group_id` for multi-tenant isolation.

---

## Testing

Run the full integration test suite:

```bash
# Start service in background
bun src/http-server.ts &
sleep 2

# Run tests
bun test ./test-http-service.ts

# Stop service
pkill -f http-server.ts
```

Expected output:
```
 14 pass
 0 fail
 32 expect() calls
Ran 14 tests across 1 file. [14.00ms]
```

---

## Versioning

**Contract Version:** v1 (Process Invocation Shape A)  
**Service Version:** v1 (HTTP REST)  
**Last Updated:** 2026-06-07

Breaking changes to the contract require a new version (v2, etc.) and a new endpoint (`/invoke/v2`).

---

## Related Documentation

- **Allura-Harness Process Invocation Contract:** `.opencode/contracts/allura-harness-invocation.md` — Full specification of ProcessInvocation and AgentResult types
- **Harness Runtime:** `.opencode/contracts/harness-v1.md` — DAY_BUILD and NIGHT_BUILD command specs
- **Agent Definitions:** `.opencode/agent/*.md` — Individual Team RAM agent specs
- **Skill Definitions:** `.opencode/skills/*/SKILL.md` — Reusable methodologies

---

## Contact & Support

For issues with the HTTP service or contract, check:
1. `.opencode/hooks/` — Lifecycle logging (session-start, task-complete)
2. `src/agent-executor.ts` — Agent invocation pipeline
3. PostgreSQL `events` table — Audit trail of all invocations
4. Neo4j `PROCESS_RESULT` nodes — Semantic memory of successful executions
