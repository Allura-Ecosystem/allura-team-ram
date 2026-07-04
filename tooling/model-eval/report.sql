-- MODEL_EVAL v1 — monthly model-performance report
-- Run via the Brain's governed read surface (MCP_DOCKER execute_sql / query_database),
-- never docker exec. Read-only; the events store is append-only.
--
-- Guardrails (Bellard, party review 2026-07-04):
--   * Stratified by task_class — NEVER aggregate across classes; that measures
--     routing, not models.
--   * Wilson 95% interval printed next to every rate. If two models' intervals
--     overlap, the report REFUSES the "X beats Y" conclusion.
--   * n < 50 per cell => verdict column says 'insufficient-n'; do not conclude.
--   * fallback_success is counted separately — a fallback rescue is not a
--     primary-model success.
--   * retries is deliberately absent: raw field only, aggregation is misleading.

WITH task_events AS (
  SELECT
    metadata->>'agent_id'                              AS agent_id,
    COALESCE(metadata->>'model', 'unknown')            AS model,
    COALESCE(metadata->>'task_class', 'general')       AS task_class,
    COALESCE(metadata->>'outcome', 'success')          AS outcome,
    NULLIF(metadata->>'latency_ms', '')::numeric       AS latency_ms,
    created_at
  FROM events
  WHERE group_id = $1                    -- always 'allura-system'
    AND metadata->>'event_type' IN ('TASK_COMPLETE', 'MODEL_EVAL')
    AND (metadata->>'schema_version')::int >= 1
    AND created_at >= now() - interval '30 days'
),
cells AS (
  SELECT
    model,
    task_class,
    count(*)                                                    AS n,
    count(*) FILTER (WHERE outcome = 'success')                 AS successes,
    count(*) FILTER (WHERE outcome = 'fallback_success')        AS fallback_rescues,
    count(*) FILTER (WHERE outcome = 'timeout')                 AS timeouts,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms)    AS p50_latency_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)    AS p95_latency_ms
  FROM task_events
  GROUP BY model, task_class
)
SELECT
  task_class,
  model,
  n,
  round(successes::numeric / n, 3)                              AS success_rate,
  -- Wilson 95% score interval (z = 1.96)
  round(
    ( (successes::numeric / n) + (1.96^2)/(2*n)
      - 1.96 * sqrt( ((successes::numeric / n)*(1 - successes::numeric / n) + (1.96^2)/(4*n)) / n )
    ) / (1 + (1.96^2)/n), 3)                                    AS wilson_lo,
  round(
    ( (successes::numeric / n) + (1.96^2)/(2*n)
      + 1.96 * sqrt( ((successes::numeric / n)*(1 - successes::numeric / n) + (1.96^2)/(4*n)) / n )
    ) / (1 + (1.96^2)/n), 3)                                    AS wilson_hi,
  fallback_rescues,
  timeouts,
  round(p50_latency_ms)                                         AS p50_ms,
  round(p95_latency_ms)                                         AS p95_ms,
  CASE WHEN n < 50 THEN 'insufficient-n' ELSE 'ok' END          AS verdict
FROM cells
ORDER BY task_class, success_rate DESC;
