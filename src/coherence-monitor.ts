/**
 * Coherence Monitor — Tracks agent interaction graph and detects drift
 *
 * Monitors conceptual integrity of the agent system by tracking:
 * - Which agents delegate to which other agents
 * - Success/failure rates per agent pair
 * - Bounce patterns (task routed A→B→A indicating misrouting)
 * - Overall graph connectivity (min-cut approximation)
 *
 * When coherence drops below threshold, blocks new deployments
 * and alerts Brooks for architectural review.
 *
 * AD-08: Coherence gate before deployment
 * Phase C of ARCHITECTURE-SELF-EVOLUTION.md
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EdgeStats {
  delegations: number;
  successes: number;
  failures: number;
  bounces: number; // task came back to source after delegation
  lastSeen: string;
}

interface NodeStats {
  invocations: number;
  successes: number;
  failures: number;
  avgDuration: number;
  totalDuration: number;
  taskTypes: Set<string>;
}

export interface CoherenceSnapshot {
  timestamp: string;
  score: number; // 0.0 to 1.0
  level: "green" | "yellow" | "red";
  nodeCount: number;
  edgeCount: number;
  bounceRate: number;
  isolatedNodes: string[];
  weakEdges: Array<{ from: string; to: string; failureRate: number }>;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Agent Interaction Graph
// ---------------------------------------------------------------------------

const nodes: Map<string, NodeStats> = new Map();
const edges: Map<string, EdgeStats> = new Map(); // key: "from->to"
const recentDelegations: Array<{ from: string; to: string; taskType: string; timestamp: number }> = [];
const MAX_RECENT = 500;

function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

function getOrCreateNode(agentId: string): NodeStats {
  if (!nodes.has(agentId)) {
    nodes.set(agentId, {
      invocations: 0, successes: 0, failures: 0,
      avgDuration: 0, totalDuration: 0, taskTypes: new Set(),
    });
  }
  return nodes.get(agentId)!;
}

function getOrCreateEdge(from: string, to: string): EdgeStats {
  const key = edgeKey(from, to);
  if (!edges.has(key)) {
    edges.set(key, {
      delegations: 0, successes: 0, failures: 0, bounces: 0, lastSeen: "",
    });
  }
  return edges.get(key)!;
}

// ---------------------------------------------------------------------------
// Event Recording
// ---------------------------------------------------------------------------

/**
 * Record an agent invocation. Called after every agent execution.
 */
export function recordInvocation(
  agentId: string,
  taskType: string,
  success: boolean,
  duration_ms: number,
) {
  const node = getOrCreateNode(agentId);
  node.invocations++;
  node.totalDuration += duration_ms;
  node.avgDuration = node.totalDuration / node.invocations;
  node.taskTypes.add(taskType);
  if (success) node.successes++; else node.failures++;
}

/**
 * Record a delegation from one agent to another.
 * Detects bounce patterns (A delegates to B, then B delegates back to A).
 */
export function recordDelegation(
  fromAgent: string,
  toAgent: string,
  taskType: string,
  success: boolean,
) {
  const edge = getOrCreateEdge(fromAgent, toAgent);
  edge.delegations++;
  edge.lastSeen = new Date().toISOString();
  if (success) edge.successes++; else edge.failures++;

  // Detect bounces: if recent history shows to->from delegation for same task type
  const now = Date.now();
  const recentBounce = recentDelegations.find(
    (d) => d.from === toAgent && d.to === fromAgent && d.taskType === taskType && now - d.timestamp < 60_000,
  );
  if (recentBounce) {
    edge.bounces++;
    console.log(`[Coherence] Bounce detected: ${fromAgent} → ${toAgent} → ${fromAgent} on ${taskType}`);
  }

  // Track recent delegations
  recentDelegations.push({ from: fromAgent, to: toAgent, taskType, timestamp: now });
  if (recentDelegations.length > MAX_RECENT) recentDelegations.shift();
}

// ---------------------------------------------------------------------------
// Coherence Calculation
// ---------------------------------------------------------------------------

// Thresholds
const GREEN_THRESHOLD = 0.8;
const YELLOW_THRESHOLD = 0.5;

/**
 * Calculate overall system coherence score.
 *
 * Components:
 * 1. Success rate (40%) — overall agent success rate
 * 2. Connectivity (30%) — fraction of agents actively connected
 * 3. Bounce rate penalty (20%) — bounces indicate misrouting
 * 4. Overlap penalty (10%) — agents covering same task types indicate role drift
 */
export function calculateCoherence(): CoherenceSnapshot {
  const timestamp = new Date().toISOString();

  if (nodes.size === 0) {
    return {
      timestamp, score: 1.0, level: "green",
      nodeCount: 0, edgeCount: 0, bounceRate: 0,
      isolatedNodes: [], weakEdges: [], recommendations: [],
    };
  }

  // 1. Success rate component (0-1)
  let totalInvocations = 0;
  let totalSuccesses = 0;
  for (const node of nodes.values()) {
    totalInvocations += node.invocations;
    totalSuccesses += node.successes;
  }
  const successRate = totalInvocations > 0 ? totalSuccesses / totalInvocations : 1.0;

  // 2. Connectivity component (0-1)
  // Agents that have been invoked but never delegate or receive delegation are "isolated"
  const connectedAgents = new Set<string>();
  for (const key of edges.keys()) {
    const [from, to] = key.split("->");
    connectedAgents.add(from);
    connectedAgents.add(to);
  }
  const isolatedNodes: string[] = [];
  for (const agentId of nodes.keys()) {
    if (!connectedAgents.has(agentId) && nodes.get(agentId)!.invocations >= 3) {
      isolatedNodes.push(agentId);
    }
  }
  const connectivity = nodes.size > 0 ? 1 - isolatedNodes.length / nodes.size : 1.0;

  // 3. Bounce rate (0-1, lower is better)
  let totalDelegations = 0;
  let totalBounces = 0;
  const weakEdges: CoherenceSnapshot["weakEdges"] = [];
  for (const [key, edge] of edges) {
    totalDelegations += edge.delegations;
    totalBounces += edge.bounces;
    if (edge.delegations >= 3) {
      const failureRate = edge.failures / edge.delegations;
      if (failureRate > 0.5) {
        const [from, to] = key.split("->");
        weakEdges.push({ from, to, failureRate });
      }
    }
  }
  const bounceRate = totalDelegations > 0 ? totalBounces / totalDelegations : 0;
  const bounceScore = 1 - Math.min(1, bounceRate * 5); // 20% bounce rate = 0 score

  // 4. Overlap penalty (0-1)
  // Check how many agents share the same task types
  const taskTypeAgents: Map<string, string[]> = new Map();
  for (const [agentId, node] of nodes) {
    for (const tt of node.taskTypes) {
      if (!taskTypeAgents.has(tt)) taskTypeAgents.set(tt, []);
      taskTypeAgents.get(tt)!.push(agentId);
    }
  }
  let overlapCount = 0;
  let totalTaskTypes = 0;
  for (const agents of taskTypeAgents.values()) {
    totalTaskTypes++;
    if (agents.length > 2) overlapCount++; // >2 agents on same task type = overlap
  }
  const overlapScore = totalTaskTypes > 0 ? 1 - overlapCount / totalTaskTypes : 1.0;

  // Weighted score
  const score = Math.max(0, Math.min(1,
    successRate * 0.4 +
    connectivity * 0.3 +
    bounceScore * 0.2 +
    overlapScore * 0.1,
  ));

  const level: CoherenceSnapshot["level"] =
    score >= GREEN_THRESHOLD ? "green" :
    score >= YELLOW_THRESHOLD ? "yellow" : "red";

  // Recommendations
  const recommendations: string[] = [];
  if (successRate < 0.7) recommendations.push(`Overall success rate is ${(successRate * 100).toFixed(0)}% — investigate failing agents`);
  if (isolatedNodes.length > 0) recommendations.push(`Isolated agents (no delegation edges): ${isolatedNodes.join(", ")}`);
  if (bounceRate > 0.1) recommendations.push(`Bounce rate ${(bounceRate * 100).toFixed(0)}% — routing may be misassigning tasks`);
  for (const weak of weakEdges) {
    recommendations.push(`Weak edge ${weak.from}→${weak.to}: ${(weak.failureRate * 100).toFixed(0)}% failure rate`);
  }
  if (overlapCount > 0) recommendations.push(`${overlapCount} task types have >2 agents — possible role drift`);

  return {
    timestamp, score, level,
    nodeCount: nodes.size, edgeCount: edges.size, bounceRate,
    isolatedNodes, weakEdges, recommendations,
  };
}

/**
 * Check if deployments should be blocked due to low coherence.
 */
export function isDeploymentAllowed(): { allowed: boolean; reason?: string; score: number } {
  const snapshot = calculateCoherence();
  if (snapshot.level === "red") {
    return {
      allowed: false,
      reason: `Coherence score ${snapshot.score.toFixed(2)} is below threshold (${YELLOW_THRESHOLD}). ${snapshot.recommendations[0] || ""}`,
      score: snapshot.score,
    };
  }
  return { allowed: true, score: snapshot.score };
}

/**
 * Get coherence history for monitoring. Returns the current snapshot.
 */
export function getCoherenceStatus(): CoherenceSnapshot {
  return calculateCoherence();
}
