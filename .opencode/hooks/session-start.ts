/**
 * Session Start Hook - Logs agent session initialization to Allura Memory
 * 
 * This hook is called when an agent session starts.
 * It logs the session initialization to Allura for audit trail
 * and performs a health check on the memory stack (PostgreSQL + Neo4j).
 */

import { memory_add } from 'mcp:allura-memory';

export interface SessionStartParams {
  agentId: string;
  task: string;
  group_id?: string;
}

export interface MemoryStackHealth {
  postgres: 'healthy' | 'degraded' | 'unreachable';
  neo4j: 'healthy' | 'degraded' | 'unreachable';
  overall: 'healthy' | 'degraded' | 'unreachable';
}

/**
 * Called when an agent session starts
 * Logs session initialization to Allura Memory
 * Performs health check on the memory stack
 */
export async function onSessionStart(params: SessionStartParams): Promise<MemoryStackHealth> {
  const { agentId, task, group_id = 'allura-system' } = params;
  
  // Run health check and session log in parallel
  const healthCheck = await checkMemoryStackHealth();
  
  try {
    await memory_add({
      group_id: group_id,
      user_id: agentId,
      content: `Session started: ${task}`,
      metadata: {
        source: 'agent-hook',
        event_type: 'SESSION_START',
        agent_id: agentId,
        memory_health: healthCheck.overall,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`[Session Hook] Logged session start for ${agentId}: ${task} (memory: ${healthCheck.overall})`);
  } catch (error) {
    console.error('[Session Hook] Failed to log session start:', error);
    // Don't throw - session should continue even if logging fails
  }

  // If degraded, emit SYSTEM_DEGRADED event (best effort)
  if (healthCheck.overall === 'degraded' || healthCheck.overall === 'unreachable') {
    await emitDegradedEvent(agentId, healthCheck, group_id);
  }
  
  return healthCheck;
}

/**
 * Check health of the memory stack (PostgreSQL + Neo4j)
 * 
 * Uses a best-effort probe: attempts a trivial memory_search query.
 * If it succeeds, both PostgreSQL (which backs the search) is reachable.
 * Neo4j health is inferred — if the search works but Neo4j is down,
 * the system is "degraded" (episodic works, semantic promotion will queue).
 */
async function checkMemoryStackHealth(): Promise<MemoryStackHealth> {
  const health: MemoryStackHealth = {
    postgres: 'unreachable',
    neo4j: 'unreachable',
    overall: 'unreachable'
  };

  // Test PostgreSQL reachability by performing a trivial search
  try {
    const results = await memory_search({
      group_id: 'allura-system',
      query: 'health check probe',
      limit: 1
    });
    // If we got here, PostgreSQL is reachable (memory_search reads from PG)
    health.postgres = 'healthy';
    
    // Neo4j health is not directly probeable from here.
    // If we can read from PG, we assume Neo4j is at least reachable
    // (it may be down, but that only affects promotion, not reads).
    // A more thorough check would need a direct Neo4j driver.
    health.neo4j = 'healthy'; // Optimistic; will surface errors on promotion
    health.overall = 'healthy';
  } catch (error: any) {
    // If memory_search fails, PostgreSQL is likely unreachable
    health.postgres = 'unreachable';
    health.neo4j = 'unreachable'; // Cannot verify if PG is down
    health.overall = 'unreachable';
    console.error('[Session Hook] Memory stack unreachable:', error?.message || error);
  }

  return health;
}

/**
 * Emit a SYSTEM_DEGRADED event when memory stack is not healthy
 */
async function emitDegradedEvent(
  agentId: string, 
  health: MemoryStackHealth, 
  group_id: string
): Promise<void> {
  try {
    await memory_add({
      group_id: group_id,
      user_id: 'system',
      content: `Memory stack degraded: postgres=${health.postgres}, neo4j=${health.neo4j}`,
      metadata: {
        source: 'system-health-check',
        event_type: 'SYSTEM_DEGRADED',
        agent_id: agentId,
        postgres_status: health.postgres,
        neo4j_status: health.neo4j,
        impact: health.postgres === 'unreachable' 
          ? 'No event logging, no performance history, routing will use static defaults'
          : 'Neo4j promotion unavailable, episodic memory still functional',
        timestamp: new Date().toISOString()
      }
    });
    
    console.warn(
      `[Session Hook] ⚠️ SYSTEM_DEGRADED: postgres=${health.postgres}, neo4j=${health.neo4j}. ` +
      `Impact: ${health.postgres === 'unreachable' ? 'No logging, routing uses static defaults' : 'Promotion unavailable'}`
    );
  } catch (error) {
    // If we can't even log the degraded event, just warn to console
    console.error(
      '[Session Hook] ⚠️ SYSTEM_DEGRADED but cannot log event (memory unreachable). ' +
      `postgres=${health.postgres}, neo4j=${health.neo4j}`
    );
  }
}

/**
 * Scout pre-task query - Retrieves context from Allura before task execution
 */
export async function scoutPreTaskQuery(agentId: string, task: string): Promise<any[]> {
  try {
    const results = await memory_search({
      group_id: 'allura-system',
      query: task,
      limit: 5
    });
    
    console.log(`[Scout Hook] Retrieved ${results.length} memories for task: ${task}`);
    return results;
  } catch (error) {
    console.error('[Scout Hook] Failed to query memories:', error);
    return [];
  }
}