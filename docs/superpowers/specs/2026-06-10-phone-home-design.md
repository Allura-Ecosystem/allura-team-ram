# Phone-Home: Cross-Project Harness Evolution

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

**Status:** Proposed
**Owner:** Brooks
**Date:** 2026-06-10

---

## Summary

The Team RAM harness is installed across multiple projects. Each installation evolves independently — skills improve, routing learns, patterns emerge. But today these learnings die where they're born. No mechanism exists to propagate improvements back to the canonical harness repo.

This spec adds a three-layer phone-home system:

1. **Automatic telemetry** — outcome receipts written to Brain on every task completion
2. **On-demand aggregation** — a `/sync-upstream` command that queries Brain across projects for cross-cutting patterns
3. **HITL write-back** — approved patterns become skill/agent updates in this canonical repo

No new infrastructure. Brain is the bus. The existing `task-complete.ts` hook is the entry point.

---

## Architecture

### Data Flow

```
PROJECT A (group_id: allura-project-a)
┌─────────────────────────────────────┐
│  task-complete.ts hook              │
│  ↓                                  │
│  Outcome Receipt → memory_add()     │
│  { skill, agent, outcome,           │
│    token_count, project_name }      │
└───────────────┬─────────────────────┘
                │
PROJECT B (group_id: allura-project-b)
┌───────────────┼─────────────────────┐
│  Same hook    │                     │
│  Same schema  │                     │
└───────────────┼─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         ALLURA BRAIN                │
│  (shared PostgreSQL with governed graph tables)        │
│                                     │
│  Receipts accumulate silently.      │
│  Each project's group_id isolates   │
│  its data. No cross-contamination.  │
└───────────────┬─────────────────────┘
                │
                │ /sync-upstream (you trigger)
                ▼
┌─────────────────────────────────────┐
│  Cross-Project Aggregator           │
│                                     │
│  Queries Brain across group_ids.    │
│  Finds patterns in 2+ projects:    │
│  - Skills with high success rate    │
│  - Agent routing preferences        │
│  - Repeated failure modes           │
│  - New skills created locally       │
│                                     │
│  Outputs: Promotion Proposals       │
└───────────────┬─────────────────────┘
                │
                │ HITL review
                ▼
┌─────────────────────────────────────┐
│  Canonical Harness (this repo)      │
│                                     │
│  Approved proposals become:         │
│  - Skill file updates               │
│  - Agent definition changes         │
│  - Routing table entries            │
│  - Brain promotions (canonical)     │
└─────────────────────────────────────┘
```

### What Phones Home (Automatic)

Each project writes an **outcome receipt** on every task completion. This extends the existing `task-complete.ts` hook.

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `event_type` | string | Fixed: `OUTCOME_RECEIPT` | Distinguishes from other events |
| `group_id` | string | Project config | Tenant isolation |
| `project_name` | string | Project config | Human-readable project name |
| `agent_id` | string | Executor | Which agent handled the task |
| `skill_name` | string | Skill invocation | Which skill was used (if any) |
| `outcome` | enum | Executor | `success` / `failure` / `partial` |
| `token_count` | number | API response | Cost signal |
| `duration_ms` | number | Timer | Performance signal |
| `error_type` | string? | Error handler | Failure classification |
| `runtime` | string | Env detection | `claude-code` / `opencode` / `codex` |
| `harness_version` | string | package.json | Track which harness version produced this |

**What does NOT phone home:**
- Source code, file contents, or project-specific secrets
- Raw conversation context or prompts
- In-progress task state
- User identity beyond `group_id`

### What Stays Local

- Project-specific code, configurations, `.env` files
- Raw episodic traces (too noisy, too project-specific)
- In-progress work and session state
- Conversation history

---

## Layer 1: Outcome Receipt (Automatic)

### Changes to `task-complete.ts`

The existing `onTaskComplete` function gets an additional `memory_add` call with the outcome receipt schema. The receipt is fire-and-forget — if Brain is unreachable, the task still completes.

```typescript
export interface OutcomeReceipt {
  event_type: 'OUTCOME_RECEIPT';
  group_id: string;
  project_name: string;
  agent_id: string;
  skill_name: string | null;
  outcome: 'success' | 'failure' | 'partial';
  token_count: number;
  duration_ms: number;
  error_type: string | null;
  runtime: string;
  harness_version: string;
}
```

**Key design decisions:**
- Receipts use the **existing** `memory_add` MCP call — no new API surface
- Receipts carry a distinct `event_type: 'OUTCOME_RECEIPT'` for queryability
- The `group_id` comes from project configuration (new field in `opencode.json` or `.claude/settings.json`)
- If no `group_id` is configured, defaults to `allura-system` (single-project mode)

### Project Identity Configuration

Each project installation needs a `group_id` and `project_name`. Added to the harness config:

```jsonc
// In opencode.json or .claude/settings.json
{
  "harness": {
    "group_id": "allura-project-dreaming",
    "project_name": "Dreaming"
  }
}
```

If omitted, defaults to `{ group_id: "allura-system", project_name: "default" }`. This means single-project setups work unchanged.

---

## Layer 2: Cross-Project Aggregator (`/sync-upstream`)

### Command Interface

```
/sync-upstream                    — Show cross-project patterns (read-only)
/sync-upstream --apply <id>       — Apply an approved pattern to canonical
/sync-upstream --dismiss <id>     — Dismiss a pattern (prevents re-proposal)
```

### Query Logic

The aggregator runs three queries against Brain:

**Query 1: High-success skills across projects**
```sql
SELECT
  metadata->>'skill_name' AS skill,
  metadata->>'agent_id' AS agent,
  metadata->>'group_id' AS project,
  COUNT(*) AS uses,
  AVG(CASE WHEN metadata->>'outcome' = 'success' THEN 1.0 ELSE 0.0 END) AS success_rate
FROM memories
WHERE metadata->>'event_type' = 'OUTCOME_RECEIPT'
  AND group_id LIKE 'allura-%'
GROUP BY skill, agent, project
HAVING COUNT(*) >= 5
ORDER BY success_rate DESC;
```

**Query 2: Cross-project pattern detection**
```sql
-- Skills that succeed in 2+ projects with >80% success rate
SELECT skill, agent, COUNT(DISTINCT project) AS project_count, AVG(success_rate) AS avg_success
FROM (
  -- subquery from Query 1
) per_project
GROUP BY skill, agent
HAVING COUNT(DISTINCT project) >= 2 AND AVG(success_rate) >= 0.8;
```

**Query 3: Repeated failure modes**
```sql
SELECT
  metadata->>'error_type' AS error_type,
  metadata->>'skill_name' AS skill,
  COUNT(DISTINCT metadata->>'group_id') AS affected_projects,
  COUNT(*) AS occurrences
FROM memories
WHERE metadata->>'event_type' = 'OUTCOME_RECEIPT'
  AND metadata->>'outcome' = 'failure'
  AND metadata->>'error_type' IS NOT NULL
  AND group_id LIKE 'allura-%'
GROUP BY error_type, skill
HAVING COUNT(DISTINCT metadata->>'group_id') >= 2
ORDER BY occurrences DESC;
```

### Output Format

```markdown
## Cross-Project Patterns (2026-06-10)

### Strong Candidates (2+ projects, >80% success)
| # | Skill | Agent | Projects | Avg Success | Action |
|---|-------|-------|----------|-------------|--------|
| 1 | brainstorming | brooks | dreaming, mortgage, aion | 92% | Apply / Dismiss |
| 2 | systematic-debugging | bellard | dreaming, mortgage | 87% | Apply / Dismiss |

### Repeated Failures (2+ projects)
| # | Error Type | Skill | Projects | Count | Action |
|---|------------|-------|----------|-------|--------|
| 1 | TypeCheckError | quick-dev | dreaming, aion | 14 | Investigate |

### Local-Only Skills (created in one project, not in canonical)
| # | Skill | Project | Uses | Success | Action |
|---|-------|---------|------|---------|--------|
| 1 | react-patterns | aion | 23 | 91% | Import / Dismiss |
```

---

## Layer 3: HITL Write-Back

When you run `/sync-upstream --apply <id>`:

1. The aggregator reads the full pattern data from Brain
2. If it's a **skill update**: diffs the canonical skill against the project's version, presents the diff
3. If it's a **new skill**: imports the skill definition into `.claude/skills/` or `.opencode/skills/`
4. If it's a **routing change**: updates the routing table in `agent-routing.md`
5. Changes are staged but **not committed** — you review and commit manually

When you run `/sync-upstream --dismiss <id>`:

1. A `PATTERN_DISMISSED` event is written to Brain with the pattern ID and reason
2. The aggregator excludes dismissed patterns from future `/sync-upstream` runs
3. Dismissals are reversible — you can un-dismiss by searching Brain for the event

---

## Governance

### Invariants (extends existing)

| # | Invariant | Enforcement |
|---|-----------|-------------|
| PH-1 | Outcome receipts are append-only | Existing PG append-only invariant |
| PH-2 | `group_id` required on every receipt | Existing governance hook validates `^allura-[a-z0-9-]+$` |
| PH-3 | No source code or secrets in receipts | Receipt schema is fixed — only metadata fields, no freeform content |
| PH-4 | Cross-project queries are read-only | `/sync-upstream` uses `memory_search`, not `memory_add` |
| PH-5 | Write-back requires HITL | `--apply` stages changes, does not commit or push |
| PH-6 | Dismissed patterns stay dismissed | `PATTERN_DISMISSED` event prevents re-surfacing |
| PH-7 | Default `group_id` preserves single-project behavior | Unconfigured projects use `allura-system`, aggregator treats them as one project |

### Security

- Receipts contain **zero** project-specific code — only agent names, skill names, outcomes, and counts
- Cross-project queries run through Brain's MCP interface, not direct DB access
- No project can read another project's raw episodic memory — only aggregated outcome receipts
- The aggregator runs locally in the canonical harness, not as a shared service

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Brain unreachable during task completion | Receipt silently dropped. Task completes normally. Console warning logged. |
| Brain unreachable during `/sync-upstream` | Command fails with clear error. No partial state. |
| Project has no `group_id` configured | Uses `allura-system`. Aggregator treats as single-project data. |
| Receipt schema validation fails | Receipt dropped. Validation error logged. No task impact. |
| Pattern already dismissed | Excluded from aggregation results silently. |

---

## Testing Strategy

### Unit Tests
- Outcome receipt serialization and schema validation
- Aggregator query logic with mock Brain responses
- Dismissal filtering

### Integration Tests
- End-to-end: task-complete hook → Brain → `/sync-upstream` query
- Multi-group_id receipts aggregate correctly
- Dismissed patterns excluded from results

### Smoke Test
```bash
# Write a test receipt
bun run test-phone-home.ts --emit-receipt

# Query for it
bun run test-phone-home.ts --query-receipts

# Run aggregator
bun run test-phone-home.ts --aggregate
```

---

## Requirements Traceability

| F# | Requirement | How This Spec Satisfies It |
|----|-------------|---------------------------|
| B3 | Harness learns from execution history | Outcome receipts capture execution history across projects; aggregator surfaces cross-project learnings for canonical improvement |
| F7 | Log all agent invocations | Outcome receipts extend existing TASK_COMPLETE events with skill/outcome/performance data |
| F9 | Record performance events to PG | Receipts are PG events via `memory_add`, append-only, governed by `group_id` |
| F10 | Support defined event types | Adds `OUTCOME_RECEIPT` and `PATTERN_DISMISSED` to the event type vocabulary |
| F11 | Queryable metrics | Cross-project aggregation queries provide metrics across installations |

**New requirement needed in Blueprint:**
- **B7** (proposed): The harness MUST support propagating learnings from project installations back to the canonical harness under HITL governance
- **F17** (proposed): The system MUST emit outcome receipts on task completion with agent, skill, outcome, and performance metadata
- **F18** (proposed): The system MUST support cross-project pattern detection via Brain queries across `group_id` boundaries
- **F19** (proposed): The system MUST require HITL approval before applying cross-project patterns to canonical

---

## Implementation Pieces

| # | Piece | Files | Effort |
|---|-------|-------|--------|
| 1 | Outcome receipt in `task-complete.ts` | `.opencode/hooks/task-complete.ts` | Small (~20 lines) |
| 2 | Project identity config | `opencode.json` schema, `.claude/settings.json` schema | Small |
| 3 | Cross-project query functions | New: `src/phone-home/aggregator.ts` | Medium |
| 4 | `/sync-upstream` command | New: `.claude/commands/sync-upstream.md` or `.opencode/command/sync-upstream.md` | Medium |
| 5 | Pattern dismissal | Reuses `memory_add` with `PATTERN_DISMISSED` event type | Small |
| 6 | Integration tests | `test-phone-home.ts` | Medium |

**Total: 4 files modified, 3 files created. No new infrastructure.**

---

## Architectural Decision

### AD-09: Brain as Cross-Project Bus

| Field | Detail |
|-------|--------|
| **Status** | Proposed |
| **Decision** | Use Allura Brain (shared PostgreSQL with governed graph tables via MCP) as the cross-project communication channel. No new message bus, no GitHub Actions, no webhook service. |
| **Rationale** | Brain already exists, supports `group_id` isolation, is append-only, and has HITL governance built in. Adding a separate channel (webhooks, GitHub Actions, message queue) introduces infrastructure that needs maintaining. Brain is already maintained. |
| **Alternatives** | **GitHub Actions:** Adds CI complexity, requires repo access from each project, creates PR noise. **Webhook service:** New infrastructure to maintain, availability concerns. **Manual copy-paste:** No automation, learnings die. |
| **Consequences** | All projects must connect to the same Brain instance. Projects without Brain access cannot phone home (graceful degradation — they work fine, just don't contribute learnings). |
| **Owner** | Brooks |

### AD-10: On-Demand Aggregation Over Cron

| Field | Detail |
|-------|--------|
| **Status** | Proposed |
| **Decision** | Cross-project aggregation runs on-demand (`/sync-upstream`), not on a cron schedule. |
| **Rationale** | Solo operator. Cron-generated reports create notification fatigue. On-demand means you see patterns when you're ready to act on them. The data is always there in Brain — the aggregation is just a query. |
| **Alternatives** | **Cron + notification:** Creates noise for a solo operator. Better for teams. **Continuous aggregation:** Unnecessary — patterns don't change minute-by-minute. |
| **Consequences** | Patterns only surface when you ask. Mitigated by: session-start could show a one-line "N new cross-project patterns since last sync" hint if data exists. |
| **Owner** | Brooks |

---

## References

- [`planning docs/ARCHITECTURE-SELF-EVOLUTION.md`](../../../planning%20docs/ARCHITECTURE-SELF-EVOLUTION.md) — L3/L4 self-evolution (single-project)
- [`planning docs/BLUEPRINT.md`](../../../planning%20docs/BLUEPRINT.md) — B3, F7, F9-F11 requirements
- [`.opencode/hooks/task-complete.ts`](../../../.opencode/hooks/task-complete.ts) — Existing hook to extend
- [`.opencode/hooks/session-start.ts`](../../../.opencode/hooks/session-start.ts) — Health check pattern
- [`.claude/contracts/harness-v1.md`](../../../.claude/contracts/harness-v1.md) — Event schema
- [`.claude/rules/mcp-integration.md`](../../../.claude/rules/mcp-integration.md) — Brain tool inventory
