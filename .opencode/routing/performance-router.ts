/**
 * Performance Router - Routes tasks based on agent performance history from Allura
 *
 * This router queries Allura Memory for agent performance metrics
 * and selects the best agent for the task type.
 *
 * v2: Added ε-greedy exploration for cold start and discovery.
 * v3: SONA-informed exploration — uses pattern data to guide exploration
 *     instead of random selection. When SONA detects which agent handles
 *     a failure type best, routes there instead of random ε-greedy.
 *     Phase D of ARCHITECTURE-SELF-EVOLUTION.md
 */

import { memory_add, memory_search } from 'mcp:allura-memory';

// SONA pattern integration (v3) — loaded dynamically since this file
// runs in harness runtime where relative imports may differ
let _extractPatterns: ((key: string) => any[]) | null = null;
try {
  const sona = require('../../src/sona-trajectory');
  _extractPatterns = sona.extractPatterns;
} catch {
  // SONA not available in this runtime context — use blind exploration
}

interface AgentPerformance {
  agentId: string;
  successRate: number;
  avgDuration: number;
  taskCount: number;
}

interface RoutingConfig {
  epsilon: number;           // Exploration probability (default 0.1)
  minTaskCount: number;      // Minimum tasks before reducing exploration
  explorationDecay: number; // How much to reduce ε after minTaskCount reached
}

const DEFAULT_CONFIG: RoutingConfig = {
  epsilon: 0.1,           // 10% chance of exploration
  minTaskCount: 20,       // After 20 tasks per type, start reducing exploration
  explorationDecay: 0.5   // Reduce ε by 50% after minimum reached
};

/**
 * Select the best agent for a task type based on performance history
 * Uses ε-greedy exploration to discover potentially better agents
 */
export async function selectAgent(
  taskType: string, 
  config: RoutingConfig = DEFAULT_CONFIG
): Promise<string> {
  try {
    // Query Allura for agent performance
    const results = await memory_search({
      group_id: 'allura-system',
      query: `agent performance ${taskType}`,
      limit: 10
    });
    
    // Analyze success rates
    const agentScores = analyzePerformance(results);
    
    // Select best agent (with ε-greedy exploration)
    const selectedAgent = selectBestAgentWithExploration(agentScores, taskType, config);
    
    console.log(`[Router] Selected ${selectedAgent} for ${taskType}`);
    return selectedAgent;
  } catch (error) {
    console.error('[Router] Failed to query performance history:', error);
    // Fallback to default routing
    return getDefaultAgent(taskType);
  }
}

/**
 * Analyze performance results from Allura
 */
function analyzePerformance(memories: any[]): Record<string, AgentPerformance> {
  const agentStats: Record<string, AgentPerformance> = {};
  
  for (const memory of memories) {
    const agentId = memory.metadata?.agent_id;
    if (!agentId) continue;
    
    if (!agentStats[agentId]) {
      agentStats[agentId] = {
        agentId,
        successRate: 0,
        avgDuration: 0,
        taskCount: 0
      };
    }
    
    const stats = agentStats[agentId];
    stats.taskCount++;
    
    // Calculate success rate from metadata
    if (memory.metadata?.event_type === 'TASK_COMPLETE') {
      const confidence = memory.metadata?.confidence || 0.5;
      stats.successRate = (stats.successRate * (stats.taskCount - 1) + confidence) / stats.taskCount;
    }
  }
  
  return agentStats;
}

/**
 * Select the best agent with ε-greedy exploration
 * 
 * With probability ε, randomly select a different qualified agent
 * instead of the historical best. This ensures the system discovers
 * potentially better agents and avoids getting stuck in local optima.
 * 
 * Exploration is highest for cold starts (no data) and decays
 * as more performance data accumulates.
 */
function selectBestAgentWithExploration(
  agentScores: Record<string, AgentPerformance>,
  taskType: string,
  config: RoutingConfig
): string {
  const agents = Object.values(agentScores);
  
  // Cold start: no performance data at all, use default
  if (agents.length === 0) {
    const defaultAgent = getDefaultAgent(taskType);
    console.log(`[Router] Cold start — using default: ${defaultAgent}`);
    return defaultAgent;
  }
  
  // Sort by success rate (descending)
  agents.sort((a, b) => b.successRate - a.successRate);
  const bestAgent = agents[0].agentId;
  
  // Calculate total task count for this type
  const totalTasks = agents.reduce((sum, a) => sum + a.taskCount, 0);
  
  // Adjust epsilon: reduce exploration as we gain confidence
  let adjustedEpsilon = config.epsilon;
  if (totalTasks >= config.minTaskCount) {
    adjustedEpsilon = config.epsilon * config.explorationDecay;
  }
  
  // v3: SONA-informed exploration — ask SONA which agent handles this task type best
  if (_extractPatterns && Math.random() < adjustedEpsilon) {
    try {
      const patterns = _extractPatterns(taskType);
      const suggestion = patterns.find((p: any) => p.suggestedAgent && p.suggestedAgent !== bestAgent);
      if (suggestion) {
        logExplorationStep(taskType, bestAgent, suggestion.suggestedAgent, adjustedEpsilon);
        console.log(
          `[Router] 🧠 SONA-informed (ε=${adjustedEpsilon.toFixed(3)}): ` +
          `chose ${suggestion.suggestedAgent} over ${bestAgent} for ${taskType} ` +
          `(${suggestion.description})`
        );
        return suggestion.suggestedAgent;
      }
    } catch {
      // SONA query failed — fall through to blind exploration
    }
  }

  // Fallback: blind ε-greedy exploration
  if (agents.length > 1 && Math.random() < adjustedEpsilon) {
    const candidates = agents.filter(a => a.agentId !== bestAgent);
    if (candidates.length > 0) {
      const exploredAgent = candidates[Math.floor(Math.random() * candidates.length)].agentId;
      logExplorationStep(taskType, bestAgent, exploredAgent, adjustedEpsilon);
      console.log(
        `[Router] 🎲 Blind exploration (ε=${adjustedEpsilon.toFixed(3)}): ` +
        `chose ${exploredAgent} over ${bestAgent} for ${taskType}`
      );
      return exploredAgent;
    }
  }
  
  // Exploit: pick the best agent
  return bestAgent;
}

/**
 * Log exploration step for audit trail
 * This builds the dataset that makes future routing better
 */
async function logExplorationStep(
  taskType: string,
  defaultAgent: string,
  exploredAgent: string,
  epsilon: number
): Promise<void> {
  try {
    await memory_add({
      group_id: 'allura-system',
      user_id: 'performance-router',
      content: `Exploration step: ${taskType}`,
      metadata: {
        source: 'performance-router',
        event_type: 'EXPLORATION_STEP',
        task_type: taskType,
        default_agent: defaultAgent,
        explored_agent: exploredAgent,
        epsilon: epsilon,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Best effort — don't block routing if logging fails
    console.error('[Router] Failed to log exploration step:', error);
  }
}

/**
 * Default agent routing table (fallback when Allura is unavailable)
 * 
 * Updated v2: Uses actual named-persona agent IDs matching the harness architecture.
 */
function getDefaultAgent(taskType: string): string {
  const routingTable: Record<string, string> = {
    'discovery': 'scout-recon',
    'intent': 'jobs-intent-gate',
    'architecture': 'brooks-architect',
    'implementation': 'woz-builder',
    'interface-review': 'pike-interface-review',
    'refactor': 'fowler-refactor-gate',
    'performance': 'bellard-diagnostics-perf',
    'validation': 'opencoder'
  };
  
  return routingTable[taskType] || 'openagent';
}

/**
 * Get the default routing table (for external consumers)
 */
export function getDefaultRoutingTable(): Record<string, string> {
  return {
    'discovery': 'scout-recon',
    'intent': 'jobs-intent-gate',
    'architecture': 'brooks-architect',
    'implementation': 'woz-builder',
    'interface-review': 'pike-interface-review',
    'refactor': 'fowler-refactor-gate',
    'performance': 'bellard-diagnostics-perf',
    'validation': 'opencoder'
  };
}