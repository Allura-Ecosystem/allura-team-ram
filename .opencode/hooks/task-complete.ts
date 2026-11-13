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
  result: unknown;
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
function summarizeResult(result: unknown): string {
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
    // Canonical metadata accepts source/conversation_id/agent_id only. Preserve
    // material outcomes and MODEL_EVAL v1 telemetry as content, not stripped keys.
    // agent_role is descriptive content, never an authenticated-principal assertion.
    // MODEL_EVAL comparisons remain within a task_class; retries remain a raw field.
    const details = {
      event_type: 'TASK_COMPLETE',
      schema_version: TASK_EVENT_SCHEMA_VERSION,
      agent_role: agentId,
      result: summarizeResult(result),
      confidence,
      model: model ?? 'unknown',
      outcome: outcome ?? 'success',
      task_class: task_class ?? 'general',
      latency_ms,
      tokens_in,
      tokens_out,
      retries,
    };
    await memory_add({
      group_id: group_id,
      content: `Task completed: ${task}\n${JSON.stringify(details)}`,
      metadata: { source: 'conversation' },
    });

    console.log('[Task Hook] Task completion logged');
  } catch {
    console.error('[Task Hook] Task completion logging unavailable');
    // Don't throw - task completion should succeed even if logging fails
  }
}

/**
 * ADR Created Hook - Logs architectural decisions to Allura
 * High-confidence decisions are review candidates; canonical promotion requires human approval.
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
    const details = {
      event_type: 'ADR_CREATED',
      decision_id: decisionId,
      agent_role: agentId,
      rationale,
      confidence: 0.90,
      timestamp: new Date().toISOString(),
    };
    await memory_add({
      group_id: group_id,
      content: `ADR: ${title}\n${JSON.stringify(details)}`,
      metadata: { source: 'conversation' },
    });
    
    console.log('[ADR Hook] ADR logged');
  } catch {
    console.error('[ADR Hook] ADR logging unavailable');
  }
}
