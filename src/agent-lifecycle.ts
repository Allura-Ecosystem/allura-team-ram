/**
 * Agent Lifecycle Management — Birth → Promotion → Retirement
 *
 * Manages the full lifecycle of agents in the self-evolving harness:
 *
 *   Genesis → Sandbox (experimental) → Promotion (active) → Retirement
 *
 * Each transition is logged as an event and tracked in the canonical graph
 * (PostgreSQL graph tables) via SUPERSEDES lineage when available.
 *
 * Phase H of ARCHITECTURE-SELF-EVOLUTION.md
 */

import { resolve } from "path";
import { cognitumGate, type GateDecision } from "./agent-sandbox";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentVersion {
  agentId: string;
  version: number;
  status: "experimental" | "active" | "retired";
  epsilon: number; // exploration rate (1.0 for experimental, 0.1 for mature)
  createdAt: string;
  promotedAt?: string;
  retiredAt?: string;
  supersedes?: string; // agentId of the agent this replaced
  taskTypes: string[];
  totalInvocations: number;
  successRate: number;
}

export interface LifecycleEvent {
  type: "AGENT_CREATED" | "AGENT_PROMOTED" | "AGENT_RETIRED" | "AGENT_SUPERSEDED";
  agentId: string;
  version: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent Registry
// ---------------------------------------------------------------------------

const agents: Map<string, AgentVersion> = new Map();
const lifecycleEvents: LifecycleEvent[] = [];
const AGENT_DIR = resolve(import.meta.dir, "../.opencode/agent");

/**
 * Initialize the registry from existing agent definition files.
 */
export async function initializeRegistry(): Promise<void> {
  const glob = new Bun.Glob("*.md");

  try {
    for await (const file of glob.scan(AGENT_DIR)) {
      const name = file.replace(".md", "");
      const content = await Bun.file(resolve(AGENT_DIR, file)).text();

      // Extract status from frontmatter
      const statusMatch = content.match(/^status:\s*(\w+)/m);
      const status = (statusMatch?.[1] as AgentVersion["status"]) || "active";

      if (!agents.has(name)) {
        agents.set(name, {
          agentId: name,
          version: 1,
          status,
          epsilon: status === "experimental" ? 1.0 : 0.1,
          createdAt: new Date().toISOString(),
          taskTypes: [],
          totalInvocations: 0,
          successRate: 0,
        });
      }
    }
    console.log(`[Lifecycle] Registry initialized: ${agents.size} agents`);
  } catch (error: any) {
    console.warn(`[Lifecycle] Failed to scan agent directory: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Lifecycle Operations
// ---------------------------------------------------------------------------

/**
 * Register a new experimental agent (from Genesis Engine).
 */
export function registerAgent(
  agentId: string,
  taskTypes: string[],
  supersedes?: string,
): AgentVersion {
  const version = (agents.get(agentId)?.version || 0) + 1;

  const agent: AgentVersion = {
    agentId,
    version,
    status: "experimental",
    epsilon: 1.0, // Always explored initially
    createdAt: new Date().toISOString(),
    supersedes,
    taskTypes,
    totalInvocations: 0,
    successRate: 0,
  };

  agents.set(agentId, agent);
  logEvent("AGENT_CREATED", agentId, version, { taskTypes, supersedes });

  console.log(`[Lifecycle] Agent registered: ${agentId} v${version} (experimental, ε=1.0)`);
  return agent;
}

/**
 * Promote an experimental agent to active production status.
 * Requires curator approval + cognitum gate pass.
 */
export function promoteAgent(agentId: string): {
  success: boolean;
  agent?: AgentVersion;
  gate?: GateDecision;
  reason: string;
} {
  const agent = agents.get(agentId);
  if (!agent) return { success: false, reason: `Agent "${agentId}" not found` };
  if (agent.status !== "experimental")
    return { success: false, reason: `Agent is ${agent.status}, not experimental` };

  // Run cognitum gate
  const existingAgents = [...agents.keys()];
  const gate = cognitumGate(
    "new_agent",
    agentId,
    {
      trajectoryCount: agent.totalInvocations,
      confidence: agent.successRate,
      metric: agent.successRate,
    },
    existingAgents,
  );

  if (gate.token !== "permit") {
    return { success: false, gate, reason: `Cognitum gate: ${gate.token}` };
  }

  // Promote
  agent.status = "active";
  agent.epsilon = 0.3; // Higher initial exploration, decays over time
  agent.promotedAt = new Date().toISOString();

  logEvent("AGENT_PROMOTED", agentId, agent.version, { gate });

  // If this agent supersedes another, mark the old one
  if (agent.supersedes) {
    const old = agents.get(agent.supersedes);
    if (old && old.status === "active") {
      retireAgent(agent.supersedes, `Superseded by ${agentId} v${agent.version}`);
    }
  }

  console.log(`[Lifecycle] Agent promoted: ${agentId} v${agent.version} (active, ε=0.3)`);
  return { success: true, agent, gate, reason: "Promoted after Cognitum gate permit" };
}

/**
 * Retire an underperforming or superseded agent.
 */
export function retireAgent(
  agentId: string,
  reason?: string,
): {
  success: boolean;
  agent?: AgentVersion;
  reason: string;
} {
  const agent = agents.get(agentId);
  if (!agent) return { success: false, reason: `Agent "${agentId}" not found` };
  if (agent.status === "retired") return { success: false, reason: "Already retired" };

  // Don't retire core agents
  const coreAgents = ["brooks", "woz", "scout", "jobs"];
  if (coreAgents.includes(agentId)) {
    return { success: false, reason: `Cannot retire core agent "${agentId}"` };
  }

  agent.status = "retired";
  agent.retiredAt = new Date().toISOString();

  logEvent("AGENT_RETIRED", agentId, agent.version, { reason: reason || "underperformance" });

  console.log(
    `[Lifecycle] Agent retired: ${agentId} v${agent.version} — ${reason || "underperformance"}`,
  );
  return { success: true, agent, reason: reason || "underperformance" };
}

/**
 * Update agent stats after an invocation (called from executor).
 */
export function recordAgentInvocation(agentId: string, success: boolean) {
  const agent = agents.get(agentId);
  if (!agent) return;

  agent.totalInvocations++;
  const prevSuccesses = agent.successRate * (agent.totalInvocations - 1);
  agent.successRate = (prevSuccesses + (success ? 1 : 0)) / agent.totalInvocations;

  // Decay epsilon for active agents
  if (agent.status === "active" && agent.totalInvocations > 20 && agent.epsilon > 0.1) {
    agent.epsilon = Math.max(0.1, agent.epsilon * 0.95);
  }
}

/**
 * Check for agents that should be proposed for retirement.
 * Returns agents with >20 invocations and <30% success rate.
 */
export function findRetirementCandidates(): AgentVersion[] {
  return [...agents.values()].filter(
    (a) => a.status === "active" && a.totalInvocations >= 20 && a.successRate < 0.3,
  );
}

// ---------------------------------------------------------------------------
// Event Logging
// ---------------------------------------------------------------------------

function logEvent(
  type: LifecycleEvent["type"],
  agentId: string,
  version: number,
  metadata: Record<string, unknown>,
) {
  lifecycleEvents.push({
    type,
    agentId,
    version,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

// ---------------------------------------------------------------------------
// Query API
// ---------------------------------------------------------------------------

export function getAgent(agentId: string): AgentVersion | undefined {
  return agents.get(agentId);
}

export function getAllAgents(): AgentVersion[] {
  return [...agents.values()].sort((a, b) => a.agentId.localeCompare(b.agentId));
}

export function getActiveAgents(): AgentVersion[] {
  return [...agents.values()].filter((a) => a.status === "active");
}

export function getExperimentalAgents(): AgentVersion[] {
  return [...agents.values()].filter((a) => a.status === "experimental");
}

export function getLifecycleEvents(limit = 50): LifecycleEvent[] {
  return lifecycleEvents.slice(-limit).reverse();
}

export function getLifecycleDashboard() {
  const all = getAllAgents();
  return {
    total: all.length,
    active: all.filter((a) => a.status === "active").length,
    experimental: all.filter((a) => a.status === "experimental").length,
    retired: all.filter((a) => a.status === "retired").length,
    retirementCandidates: findRetirementCandidates().map((a) => ({
      agentId: a.agentId,
      successRate: a.successRate,
      invocations: a.totalInvocations,
    })),
    recentEvents: getLifecycleEvents(10),
    agents: all,
  };
}
