/**
 * SONA Pattern Extraction Service — Phase B
 *
 * Runs pattern extraction every N agent completions. Detected patterns
 * are written to Allura Brain as PATTERN_DETECTED events and, if confidence
 * is high enough, generate skill revision proposals.
 *
 * This module is imported by http-server.ts and called after each invocation.
 */

import { extractAllPatterns, forceLearn, type SonaPattern } from "./sona-trajectory";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const EXTRACTION_INTERVAL = Number(process.env.SONA_EXTRACTION_INTERVAL) || 20;
let _invocationCount = 0;
let _lastExtractionAt = 0;

// ---------------------------------------------------------------------------
// Skill Revision Proposal
// ---------------------------------------------------------------------------

export interface SkillRevisionProposal {
  skill_name: string;
  agent_id: string;
  revision_type: "content_update" | "new_section" | "remove_section" | "reorder";
  pattern_type: string;
  pattern_description: string;
  proposed_change: string;
  evidence: Record<string, unknown>;
  sona_confidence: number;
  group_id: string;
}

/**
 * Convert a SONA pattern into a skill revision proposal.
 * Only patterns with confidence >= 0.7 generate proposals.
 */
function patternToProposal(pattern: SonaPattern): SkillRevisionProposal | null {
  if (pattern.confidence < 0.7) return null;

  const agentId = pattern.agentId;

  switch (pattern.type) {
    case "repeated_failure":
      return {
        skill_name: `${agentId}-agent-skill`,
        agent_id: agentId,
        revision_type: "new_section",
        pattern_type: pattern.type,
        pattern_description: pattern.description,
        proposed_change: `Add error-handling guidance for failure pattern: ${pattern.description}`,
        evidence: pattern.evidence,
        sona_confidence: pattern.confidence,
        group_id: "allura-system",
      };

    case "success_cluster":
      return {
        skill_name: `${agentId}-agent-skill`,
        agent_id: agentId,
        revision_type: "content_update",
        pattern_type: pattern.type,
        pattern_description: pattern.description,
        proposed_change: `Reinforce successful pattern: ${pattern.description}`,
        evidence: pattern.evidence,
        sona_confidence: pattern.confidence,
        group_id: "allura-system",
      };

    case "duration_outlier":
      return {
        skill_name: `${agentId}-agent-skill`,
        agent_id: agentId,
        revision_type: "new_section",
        pattern_type: pattern.type,
        pattern_description: pattern.description,
        proposed_change: `Add performance optimization guidance: ${pattern.description}`,
        evidence: pattern.evidence,
        sona_confidence: pattern.confidence,
        group_id: "allura-system",
      };

    case "coverage_gap":
      return {
        skill_name: "harness-routing",
        agent_id: "none",
        revision_type: "new_section",
        pattern_type: pattern.type,
        pattern_description: pattern.description,
        proposed_change: `Coverage gap detected — consider creating a specialist agent for: ${pattern.taskType}`,
        evidence: pattern.evidence,
        sona_confidence: pattern.confidence,
        group_id: "allura-system",
      };

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Extraction Trigger
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  patterns: SonaPattern[];
  proposals: SkillRevisionProposal[];
  invocationCount: number;
}

/**
 * Called after each agent invocation. Runs pattern extraction every
 * EXTRACTION_INTERVAL invocations (default: 20).
 *
 * Returns extraction results if extraction ran, null otherwise.
 */
export async function onInvocationComplete(): Promise<ExtractionResult | null> {
  _invocationCount++;

  if (_invocationCount % EXTRACTION_INTERVAL !== 0) {
    return null;
  }

  return runExtraction();
}

/**
 * Force pattern extraction regardless of interval.
 */
export async function runExtraction(): Promise<ExtractionResult> {
  console.log(`[SONA-Patterns] Running extraction (invocation #${_invocationCount})`);
  _lastExtractionAt = Date.now();

  // Force native engine learning
  forceLearn();

  // Extract all patterns
  const patterns = extractAllPatterns();
  console.log(`[SONA-Patterns] Found ${patterns.length} patterns`);

  // Generate proposals for high-confidence patterns
  const proposals: SkillRevisionProposal[] = [];
  for (const pattern of patterns) {
    const proposal = patternToProposal(pattern);
    if (proposal) proposals.push(proposal);
  }

  console.log(`[SONA-Patterns] Generated ${proposals.length} skill revision proposals`);

  // Log patterns to console (Brain logging will be added when MCP is available in HTTP context)
  for (const p of patterns) {
    console.log(
      `[SONA-Patterns]   ${p.type}: ${p.agentId}` +
      (p.taskType ? ` (${p.taskType})` : "") +
      ` confidence=${p.confidence.toFixed(2)} — ${p.description}`,
    );
  }

  return { patterns, proposals, invocationCount: _invocationCount };
}

/**
 * Get pattern extraction stats for monitoring.
 */
export function getPatternStats() {
  return {
    invocationCount: _invocationCount,
    extractionInterval: EXTRACTION_INTERVAL,
    lastExtractionAt: _lastExtractionAt ? new Date(_lastExtractionAt).toISOString() : null,
    nextExtractionIn: EXTRACTION_INTERVAL - (_invocationCount % EXTRACTION_INTERVAL),
  };
}
