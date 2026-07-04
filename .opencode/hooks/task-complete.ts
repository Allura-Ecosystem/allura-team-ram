/**
 * Task Complete Hook - Logs agent task completion to Allura Memory
 * 
 * This hook is called when an agent completes a task.
 * It logs the task result to Allura for audit trail and potential promotion.
 */

import { memory_add } from 'mcp:allura-memory';

/**
 * MODEL_EVAL v1 outcome — an explicit enum, never a bare boolean.
 * `fallback_success` exists so a fallback-model rescue is never credited
 * to the primary model's statistics (Knuth's rule).
 */
export type TaskOutcome = 'success' | 'failure' | 'timeout' | 'fallback_success';

export interface TaskCompleteParams {
  agentId: string;
  task: string;
  result: any;
  group_id?: string;
  confidence?: number;
  /** MODEL_EVAL v1 telemetry — the model that actually served this task. */
  model?: string;
  outcome?: TaskOutcome;
  task_class?: string;
  latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  retries?: number;
}

/** Append-only stores evolve by addition only — bump when adding fields. */
const TASK_EVENT_SCHEMA_VERSION = 1;

/** Bound the result payload: summaries in events, not blobs (TOAST bloat). */
function summarizeResult(result: any): string {
  const s = typeof result === 'string' ? result : JSON.stringify(result);
  return s && s.length > 2000 ? `${s.slice(0, 2000)}…[truncated]` : (s ?? '');
}

/**
 * Called when an agent completes a task
 * Logs task completion to Allura Memory
 */
export async function onTaskComplete(params: TaskCompleteParams): Promise<void> {
  const {
    agentId,
    task,
    result,
    group_id = 'allura-system',
    confidence = 0.75,
    model,
    outcome,
    task_class,
    latency_ms,
    tokens_in,
    tokens_out,
    retries
  } = params;

  try {
    await memory_add({
      group_id: group_id,
      user_id: agentId,
      content: `Task completed: ${task}`,
      metadata: {
        source: 'agent-hook',
        event_type: 'TASK_COMPLETE',
        schema_version: TASK_EVENT_SCHEMA_VERSION,
        agent_id: agentId,
        result: summarizeResult(result),
        confidence: confidence,
        // MODEL_EVAL v1 — per-(agent, model, task_class) telemetry.
        // Aggregate ONLY within a task_class (cross-class rates measure routing,
        // not models). retries is a raw field: never aggregate it (it conflates
        // model failure, network flaps, and session-cap throttling).
        model: model ?? 'unknown',
        outcome: outcome ?? 'success',
        task_class: task_class ?? 'general',
        latency_ms: latency_ms,
        tokens_in: tokens_in,
        tokens_out: tokens_out,
        retries: retries
      }
    });

    console.log(`[Task Hook] Logged task completion for ${agentId}: ${task} (model=${model ?? 'unknown'}, outcome=${outcome ?? 'success'})`);
  } catch (error) {
    console.error('[Task Hook] Failed to log task completion:', error);
    // Don't throw - task completion should succeed even if logging fails
  }
}

/**
 * ADR Created Hook - Logs architectural decisions to Allura
 * High-confidence decisions (≥0.85) are candidates for promotion to Neo4j
 */
export async function onADRCreated(params: {
  agentId: string;
  decisionId: string;
  title: string;
  rationale: string;
  group_id?: string;
}): Promise<void> {
  const { agentId, decisionId, title, rationale, group_id = 'allura-system' } = params;
  
  try {
    await memory_add({
      group_id: group_id,
      user_id: agentId,
      content: `ADR: ${title}`,
      metadata: {
        source: 'architect',
        event_type: 'ADR_CREATED',
        decision_id: decisionId,
        rationale: rationale,
        confidence: 0.90,  // ADRs are high-confidence by default
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`[ADR Hook] Logged ADR ${decisionId}: ${title}`);
  } catch (error) {
    console.error('[ADR Hook] Failed to log ADR:', error);
  }
}