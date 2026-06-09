/**
 * Auto Mode — Fully autonomous task execution orchestrator
 *
 * Detects task complexity, selects execution strategy (single pass,
 * iterative loop, or epic dispatch), and runs without approval gates.
 * Destructive changes are the only pause point.
 *
 * Integrates with:
 * - SONA trajectories (every step is a learning signal)
 * - Coherence monitor (drift check between steps)
 * - Curator (proposals from pattern extraction)
 * - Agent lifecycle (track which agents are invoked)
 */

import { spawnAgentProcess, mapProcessToAgent, type AgentExecutionResult } from "./agent-executor";
import { beginTrajectory } from "./sona-trajectory";
import { calculateCoherence } from "./coherence-monitor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ComplexityLevel = "simple" | "multi" | "epic";
export type ExecutionMode = "api" | "auto" | "interactive";

export interface AutoModeRequest {
  task: string;
  group_id: string;
  max_iterations?: number;
  mode?: ExecutionMode;
}

export interface AutoModeResult {
  success: boolean;
  strategy: ComplexityLevel;
  mode: ExecutionMode;
  steps_executed: number;
  duration_ms: number;
  outputs: Array<{
    step: number;
    agent: string;
    success: boolean;
    summary: string;
  }>;
  coherence_score: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Complexity Assessment
// ---------------------------------------------------------------------------

const SIMPLE_KEYWORDS = /\b(fix|typo|update|rename|change|remove|delete|bump|correct)\b/i;
const MULTI_KEYWORDS = /\b(add|implement|refactor|migrate|convert|replace|upgrade|integrate)\b/i;
const EPIC_KEYWORDS = /\b(build|create\s+system|redesign|architect|overhaul|rewrite|scaffold)\b/i;

export function assessComplexity(task: string, scoutReportLength: number = 0): ComplexityLevel {
  // Epic signals
  if (EPIC_KEYWORDS.test(task) || scoutReportLength > 500) return "epic";

  // Multi-step signals
  if (MULTI_KEYWORDS.test(task) || scoutReportLength > 200) return "multi";

  // Default to simple
  return "simple";
}

// ---------------------------------------------------------------------------
// Destructive Change Detection
// ---------------------------------------------------------------------------

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bgit\s+push\s+--force\b/i,
  /\bgit\s+branch\s+-[dD]\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\btruncate\b/i,
];

export function isDestructive(action: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((p) => p.test(action));
}

// ---------------------------------------------------------------------------
// Auto Mode Executor
// ---------------------------------------------------------------------------

/**
 * Execute a task in fully autonomous mode.
 *
 * Flow:
 * 1. Scout recon (always)
 * 2. Assess complexity → select strategy
 * 3. Execute with chosen strategy
 * 4. Coherence check
 * 5. Return result
 */
export async function executeAutoMode(request: AutoModeRequest): Promise<AutoModeResult> {
  const startTime = performance.now();
  const mode = request.mode || detectExecutionMode();
  const outputs: AutoModeResult["outputs"] = [];
  const errors: string[] = [];

  console.log(`[AUTO] Starting: "${request.task}" (mode=${mode})`);

  // ---- Phase 1: Scout Recon ----
  const trajectory = beginTrajectory({
    agentId: "auto-mode",
    taskType: "auto-orchestration",
    group_id: request.group_id,
  });

  let scoutReport = "";
  try {
    const scoutResult = await spawnAgentProcess("scout", {
      task: `Recon for auto-mode: ${request.task}`,
      process_name: "auto.recon",
    }, request.group_id);

    scoutReport = typeof scoutResult.output === "string"
      ? scoutResult.output
      : JSON.stringify(scoutResult.output);

    outputs.push({
      step: 1,
      agent: "scout",
      success: scoutResult.success,
      summary: `Scout recon: ${scoutReport.length} chars`,
    });
  } catch (e: any) {
    errors.push(`Scout recon failed: ${e.message}`);
    outputs.push({ step: 1, agent: "scout", success: false, summary: e.message });
  }

  // ---- Phase 2: Complexity Assessment ----
  const strategy = assessComplexity(request.task, scoutReport.length);
  const maxIterations = request.max_iterations || (strategy === "epic" ? 5 : strategy === "multi" ? 10 : 1);

  console.log(`[AUTO] Strategy: ${strategy} (max ${maxIterations} iterations)`);

  // ---- Phase 3: Execute ----
  let stepsExecuted = 1; // Scout was step 1

  if (strategy === "simple") {
    // Single pass — route to appropriate agent and execute
    const agentId = mapProcessToAgent(`auto.${inferProcessType(request.task)}`);
    try {
      const result = await spawnAgentProcess(agentId, {
        task: request.task,
        scout_report: scoutReport,
        process_name: "auto.execute",
      }, request.group_id);

      stepsExecuted++;
      outputs.push({
        step: stepsExecuted,
        agent: agentId,
        success: result.success,
        summary: `${agentId} executed: ${result.success ? "success" : "failed"}`,
      });

      if (!result.success) {
        errors.push(...result.errors);
      }
    } catch (e: any) {
      errors.push(`Execution failed: ${e.message}`);
    }
  } else {
    // Multi-step or Epic — iterative execution
    for (let i = 0; i < maxIterations; i++) {
      const agentId = i === 0 ? "woz" : mapProcessToAgent(`auto.${inferProcessType(request.task)}`);

      try {
        const result = await spawnAgentProcess(agentId, {
          task: request.task,
          scout_report: scoutReport,
          iteration: i + 1,
          max_iterations: maxIterations,
          process_name: `auto.iterate.${i + 1}`,
        }, request.group_id);

        stepsExecuted++;
        outputs.push({
          step: stepsExecuted,
          agent: agentId,
          success: result.success,
          summary: `Iteration ${i + 1}: ${result.success ? "success" : "needs retry"}`,
        });

        // If task is complete, stop iterating
        if (result.success && result.confidence >= 0.8) {
          console.log(`[AUTO] Task complete at iteration ${i + 1} (confidence=${result.confidence})`);
          break;
        }

        if (!result.success) {
          errors.push(...result.errors);
        }
      } catch (e: any) {
        errors.push(`Iteration ${i + 1} failed: ${e.message}`);
        break;
      }
    }
  }

  // ---- Phase 4: Coherence Check ----
  const coherence = calculateCoherence();
  if (coherence.level === "red") {
    errors.push(`Coherence dropped to RED (${coherence.score.toFixed(2)}) — review required`);
  }

  // ---- Complete Trajectory ----
  const duration_ms = Math.round(performance.now() - startTime);
  const success = errors.length === 0;

  trajectory.complete({
    success,
    confidence: success ? 0.85 : 0.3,
    duration_ms,
    tokens_in: 0,
    tokens_out: 0,
    errors,
  });

  console.log(
    `[AUTO] Complete: strategy=${strategy} steps=${stepsExecuted} ` +
    `success=${success} coherence=${coherence.score.toFixed(2)} duration=${duration_ms}ms`,
  );

  return {
    success,
    strategy,
    mode,
    steps_executed: stepsExecuted,
    duration_ms,
    outputs,
    coherence_score: coherence.score,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectExecutionMode(): ExecutionMode {
  // API mode if no TTY (running as HTTP service)
  if (!process.stdin.isTTY) return "api";
  // Check for auto mode environment hint
  if (process.env.CLAUDE_AUTO_MODE === "true") return "auto";
  return "interactive";
}

function inferProcessType(task: string): string {
  if (/\b(debug|fix|bug|error|crash)\b/i.test(task)) return "debug";
  if (/\b(test|spec|coverage)\b/i.test(task)) return "test";
  if (/\b(refactor|clean|lint)\b/i.test(task)) return "refactor";
  if (/\b(architect|design|plan)\b/i.test(task)) return "architecture";
  if (/\b(deploy|infra|docker|ci)\b/i.test(task)) return "devops";
  return "implementation";
}
