---
name: allura-health-observability
description: Check Allura retrieval health, current subsystem evidence, and governed queue observability.
---

# Allura Health & Observability

1. Confirm the authorized `group_id` and inspect the host's available tool schemas.
2. Use the exposed `memory_search` with `query`, `group_id`, and `limit: 1` as a
   read-only retrieval probe. Report success, failure, or capability unavailable.
3. PostgreSQL + RuVector are the current storage architecture. A successful
   search proves retrieval availability only, not individual subsystem health,
   graph completeness, semantic freshness, or promotion readiness.
4. Report subsystem status, queue depth, or latency only if a supported governed
   diagnostic capability returns that evidence for this tenant. Otherwise mark
   it **unverified**. A single request duration is not p50 latency.
5. Keep graph health, semantic retrieval freshness, and episodic freshness
   separate. Do not reinterpret legacy response keys as active-subsystem health.

Read-only: no writes, raw database queries, service repairs, credentials, internal
addresses, or cross-tenant proposal contents. Do not probe retired services.
Include evidence source, observation time, scope, and missing capabilities in
the report. No unavailable capability may be replaced with a database bypass.
