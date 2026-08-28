/**
 * Curator — HITL interface for reviewing and approving skill revision proposals
 *
 * Manages the skill revision queue lifecycle:
 *   proposed → gate check → curator review → approved/rejected → deployed
 *
 * Proposals are persisted to .opencode/data/curator-state.json so they
 * survive server restarts. PG migration (001-skill-revisions.sql) is
 * available for production persistence when the database is configured.
 *
 * AD-07: HITL firewall for all self-modification
 * Phase E of ARCHITECTURE-SELF-EVOLUTION.md
 */

import { resolve } from "path";
import { isDeploymentAllowed } from "./coherence-monitor";
import type { SkillRevisionProposal } from "./sona-patterns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredRevision {
  id: number;
  proposal: SkillRevisionProposal;
  gate_status: "pending" | "passed" | "rejected";
  curator_status: "pending" | "approved" | "rejected";
  curator_notes?: string;
  reviewed_at?: string;
  deployed_at?: string;
  created_at: string;
}

export interface AgentProposal {
  id: number;
  agent_name: string;
  task_type: string;
  reason: string;
  evidence: Record<string, unknown>;
  sona_confidence: number;
  gate_status: "pending" | "passed" | "rejected";
  curator_status: "pending" | "approved" | "rejected";
  curator_notes?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Persistent Store (JSON file + in-memory cache)
// ---------------------------------------------------------------------------

const STATE_DIR = resolve(import.meta.dir, "../.opencode/data");
const STATE_FILE = resolve(STATE_DIR, "curator-state.json");

interface CuratorState {
  nextRevisionId: number;
  nextAgentProposalId: number;
  revisions: StoredRevision[];
  agentProposals: AgentProposal[];
}

let _nextRevisionId = 1;
let _nextAgentProposalId = 1;
const revisions: Map<number, StoredRevision> = new Map();
const agentProposals: Map<number, AgentProposal> = new Map();
let _loaded = false;

async function ensureStateDir(): Promise<void> {
  try {
    await Bun.write(resolve(STATE_DIR, ".keep"), "");
  } catch {
    /* dir may already exist */
  }
}

async function loadState(): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  try {
    const raw = await Bun.file(STATE_FILE).text();
    const state: CuratorState = JSON.parse(raw);
    _nextRevisionId = state.nextRevisionId || 1;
    _nextAgentProposalId = state.nextAgentProposalId || 1;
    for (const r of state.revisions || []) revisions.set(r.id, r);
    for (const p of state.agentProposals || []) agentProposals.set(p.id, p);
    console.log(
      `[Curator] Loaded state: ${revisions.size} revisions, ${agentProposals.size} agent proposals`,
    );
  } catch {
    console.log("[Curator] No existing state file — starting fresh");
  }
}

async function saveState(): Promise<void> {
  const state: CuratorState = {
    nextRevisionId: _nextRevisionId,
    nextAgentProposalId: _nextAgentProposalId,
    revisions: [...revisions.values()],
    agentProposals: [...agentProposals.values()],
  };
  await ensureStateDir();
  await Bun.write(STATE_FILE, JSON.stringify(state, null, 2));
}

// Load on first access
loadState().catch(() => {});

// ---------------------------------------------------------------------------
// Skill Revision Queue
// ---------------------------------------------------------------------------

/**
 * Submit a skill revision proposal from the pattern extraction pipeline.
 * Runs through the coherence gate before entering the curator queue.
 */
export function submitRevision(proposal: SkillRevisionProposal): StoredRevision {
  const id = _nextRevisionId++;
  const now = new Date().toISOString();

  // Coherence gate check
  const deployment = isDeploymentAllowed();
  const gate_status = deployment.allowed ? ("passed" as const) : ("rejected" as const);

  const revision: StoredRevision = {
    id,
    proposal,
    gate_status,
    curator_status: "pending",
    created_at: now,
  };

  if (!deployment.allowed) {
    console.log(`[Curator] Revision #${id} rejected by coherence gate: ${deployment.reason}`);
  } else {
    console.log(
      `[Curator] Revision #${id} passed coherence gate (score=${deployment.score.toFixed(2)}), awaiting curator review`,
    );
  }

  revisions.set(id, revision);
  saveState().catch(() => {});
  return revision;
}

/**
 * Get all pending revisions (passed gate, awaiting curator).
 */
export function getPendingRevisions(): StoredRevision[] {
  return [...revisions.values()].filter(
    (r) => r.gate_status === "passed" && r.curator_status === "pending",
  );
}

/**
 * Get all revisions (any status).
 */
export function getAllRevisions(): StoredRevision[] {
  return [...revisions.values()].sort((a, b) => b.id - a.id);
}

/**
 * Approve a revision. Only revisions that passed the gate can be approved.
 */
export function approveRevision(id: number, notes?: string): StoredRevision | null {
  const revision = revisions.get(id);
  if (!revision) return null;
  if (revision.gate_status !== "passed") return null;

  revision.curator_status = "approved";
  revision.curator_notes = notes;
  revision.reviewed_at = new Date().toISOString();

  console.log(`[Curator] Revision #${id} APPROVED: ${revision.proposal.pattern_description}`);
  saveState().catch(() => {});
  return revision;
}

/**
 * Reject a revision.
 */
export function rejectRevision(id: number, notes?: string): StoredRevision | null {
  const revision = revisions.get(id);
  if (!revision) return null;

  revision.curator_status = "rejected";
  revision.curator_notes = notes;
  revision.reviewed_at = new Date().toISOString();

  console.log(`[Curator] Revision #${id} REJECTED: ${revision.proposal.pattern_description}`);
  saveState().catch(() => {});
  return revision;
}

/**
 * Mark a revision as deployed (after file changes are applied).
 */
export function markDeployed(id: number): StoredRevision | null {
  const revision = revisions.get(id);
  if (!revision || revision.curator_status !== "approved") return null;

  revision.deployed_at = new Date().toISOString();
  console.log(`[Curator] Revision #${id} DEPLOYED`);
  saveState().catch(() => {});
  return revision;
}

// ---------------------------------------------------------------------------
// Agent Proposal Queue (Level 4 — Genesis Engine)
// ---------------------------------------------------------------------------

/**
 * Submit a new agent proposal from the Genesis Engine.
 * Limited to 3 concurrent pending proposals.
 */
export function submitAgentProposal(
  agentName: string,
  taskType: string,
  reason: string,
  evidence: Record<string, unknown>,
  confidence: number,
): AgentProposal | { error: string } {
  const pending = [...agentProposals.values()].filter((p) => p.curator_status === "pending");
  if (pending.length >= 3) {
    return { error: "Maximum 3 concurrent agent proposals — review existing proposals first" };
  }

  const id = _nextAgentProposalId++;
  const deployment = isDeploymentAllowed();

  const proposal: AgentProposal = {
    id,
    agent_name: agentName,
    task_type: taskType,
    reason,
    evidence,
    sona_confidence: confidence,
    gate_status: deployment.allowed ? "passed" : "rejected",
    curator_status: "pending",
    created_at: new Date().toISOString(),
  };

  agentProposals.set(id, proposal);
  saveState().catch(() => {});
  console.log(
    `[Curator] Agent proposal #${id}: ${agentName} for ${taskType} — gate=${proposal.gate_status}`,
  );
  return proposal;
}

export function getPendingAgentProposals(): AgentProposal[] {
  return [...agentProposals.values()].filter(
    (p) => p.gate_status === "passed" && p.curator_status === "pending",
  );
}

export function getAllAgentProposals(): AgentProposal[] {
  return [...agentProposals.values()].sort((a, b) => b.id - a.id);
}

export function approveAgentProposal(id: number, notes?: string): AgentProposal | null {
  const proposal = agentProposals.get(id);
  if (!proposal || proposal.gate_status !== "passed") return null;
  proposal.curator_status = "approved";
  proposal.curator_notes = notes;
  console.log(`[Curator] Agent proposal #${id} APPROVED: ${proposal.agent_name}`);
  saveState().catch(() => {});
  return proposal;
}

export function rejectAgentProposal(id: number, notes?: string): AgentProposal | null {
  const proposal = agentProposals.get(id);
  if (!proposal) return null;
  proposal.curator_status = "rejected";
  proposal.curator_notes = notes;
  console.log(`[Curator] Agent proposal #${id} REJECTED: ${proposal.agent_name}`);
  saveState().catch(() => {});
  return proposal;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function getCuratorDashboard() {
  const pendingRevisions = getPendingRevisions();
  const pendingAgents = getPendingAgentProposals();
  const allRevisions = getAllRevisions();
  const allAgents = getAllAgentProposals();

  const pendingCount = pendingRevisions.length + pendingAgents.length;
  const queueAlert = pendingCount > 10 ? "CURATOR_QUEUE_GROWING" : null;

  if (queueAlert) {
    console.warn(`[Curator] WARNING: ${pendingCount} pending proposals — curator review needed`);
  }

  return {
    pendingRevisions: pendingRevisions.length,
    pendingAgentProposals: pendingAgents.length,
    pendingTotal: pendingCount,
    queueAlert,
    totalRevisions: allRevisions.length,
    totalAgentProposals: allAgents.length,
    approvedRevisions: allRevisions.filter((r) => r.curator_status === "approved").length,
    rejectedRevisions: allRevisions.filter((r) => r.curator_status === "rejected").length,
    gateRejected: allRevisions.filter((r) => r.gate_status === "rejected").length,
    recentRevisions: allRevisions.slice(0, 10),
    recentAgentProposals: allAgents.slice(0, 5),
  };
}
