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
import { normalizeMemorySearch } from '../../src/memory-search-response';

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
    const agentScores = analyzePerformance(normalizeMemorySearch(results));
    
    // Select best agent (with ε-greedy exploration)
    const selectedAgent = selectBestAgentWithExploration(agentScores, taskType, config);
    
    console.log('[Router] Agent selected');
    return selectedAgent;
  } catch {
    console.error('[Router] Performance history unavailable; using default routing');
    // Fallback to default routing
    return getDefaultAgent(taskType);
  }
}

/**
 * Analyze performance results from Allura
 */
function analyzePerformance(memories: unknown[]): Record<string, AgentPerformance> {
  const agentStats: Record<string, AgentPerformance> = {};
  
  for (const memory of memories) {
    const metadata = performanceMetadata(memory);
    if (!metadata) continue;
    const agentId = metadata.agent_id;
    
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
    
    // Preserve the existing confidence heuristic; this is not measured success.
    if (metadata.event_type === 'TASK_COMPLETE') {
      const confidence = metadata.confidence || 0.5;
      stats.successRate = (stats.successRate * (stats.taskCount - 1) + confidence) / stats.taskCount;
    }
  }
  
  return agentStats;
}

interface PerformanceMetadata {
  agent_id: string;
  event_type: string;
  confidence?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Decode stored evidence only; never derive a measured success rate from an outcome label. */
function performanceMetadata(memory: unknown): PerformanceMetadata | null {
  if (!isRecord(memory)) return null;
  const metadata = memory.metadata;
  // Legacy telemetry has an event_type. Plain canonical metadata.agent_id is
  // authenticated attribution, not evidence of a routing role or task outcome.
  if (
    isRecord(metadata) && typeof metadata.agent_id === 'string' && metadata.agent_id &&
    typeof metadata.event_type === 'string' && metadata.event_type &&
    (metadata.confidence === undefined || isConfidence(metadata.confidence))
  ) {
    return {
      agent_id: metadata.agent_id,
      event_type: metadata.event_type,
      confidence: metadata.confidence,
    };
  }
  if (typeof memory.content !== 'string' || !memory.content.startsWith('Task completed: ')) return null;
  try {
    // Hook JSON is one line even when the task description contains newlines.
    const details: unknown = JSON.parse(memory.content.slice(memory.content.lastIndexOf('\n') + 1));
    if (
      !isRecord(details) || details.schema_version !== 1 || details.event_type !== 'TASK_COMPLETE' ||
      typeof details.agent_role !== 'string' || !details.agent_role || !isConfidence(details.confidence)
    ) return null;
    return {
      agent_id: details.agent_role,
      event_type: details.event_type,
      confidence: details.confidence,
    };
  } catch {
    return null;
  }
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
    console.log('[Router] Cold start — using default routing');
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
        console.log('[Router] SONA-informed exploration selected');
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
      console.log('[Router] Blind exploration selected');
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
    const details = {
      event_type: 'EXPLORATION_STEP',
      task_type: taskType,
      default_agent: defaultAgent,
      explored_agent: exploredAgent,
      epsilon,
      timestamp: new Date().toISOString(),
    };
    await memory_add({
      group_id: 'allura-system',
      content: `Exploration step: ${taskType}\n${JSON.stringify(details)}`,
      metadata: { source: 'conversation' },
    });
  } catch {
    // Best effort — don't block routing if logging fails
    console.error('[Router] Exploration logging unavailable');
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
