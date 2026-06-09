/**
 * Task Complete Hook - Logs agent task completion to Allura Memory
 * 
 * This hook is called when an agent completes a task.
 * It logs the task result to Allura for audit trail and potential promotion.
 */

import { memory_add } from 'mcp:allura-memory';

export interface TaskCompleteParams {
  agentId: string;
  task: string;
  result: any;
  group_id?: string;
  confidence?: number;
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
    confidence = 0.75
  } = params;
  
  try {
    await memory_add({
      group_id: group_id,
      user_id: agentId,
      content: `Task completed: ${task}`,
      metadata: {
        source: 'agent-hook',
        event_type: 'TASK_COMPLETE',
        agent_id: agentId,
        result: result,
        confidence: confidence,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`[Task Hook] Logged task completion for ${agentId}: ${task}`);
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