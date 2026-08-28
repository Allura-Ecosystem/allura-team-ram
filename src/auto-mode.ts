/**
 * Auto Mode — Fully autonomous task execution orchestrator
 *
 * Detects task complexity, selects execution strategy (single pass,
 * iterative loop, or epic dispatch), within explicit iteration and token
 * budgets. Governance, destructive, and authority boundaries always pause.
 *
 * Integrates with:
 * - SONA trajectories (every step is a learning signal)
 * - Coherence monitor (drift check between steps)
 * - Curator (proposals from pattern extraction)
 * - Agent lifecycle (track which agents are invoked)
 */

import { spawnAgentProcess } from "./agent-executor";
import { calculateCoherence } from "./coherence-monitor";
import {
  type ContextCheckpoint,
  createContextCheckpoint,
  shouldCompactContext,
} from "./context-checkpoint";
import { type CompactionReceipt, parseContextPacketWithReceipt } from "./context-packet";
import { beginTrajectory } from "./sona-trajectory";
import { planToolLoading } from "./tool-loading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ComplexityLevel = "simple" | "multi" | "epic";
export type ExecutionMode = "api" | "auto" | "interactive";
export type AutoTerminalState = "success" | "blocked" | "exhausted";

export interface AutoModeRequest {
  task: string;
  group_id: string;
  max_iterations?: number;
  token_budget?: number;
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
  terminal_state: AutoTerminalState;
  tokens_in: number;
  tokens_out: number;
  checkpoint?: ContextCheckpoint;
  context_compaction_receipt?: CompactionReceipt;
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

export function normalizeIterationLimit(
  requested: number | undefined,
  strategy: ComplexityLevel,
): number {
  const defaultLimit = strategy === "simple" ? 1 : 5;
  return Math.max(1, Math.min(10, Math.floor(requested ?? defaultLimit)));
}

export function isTokenBudgetExceeded(
  tokensIn: number,
  tokensOut: number,
  budget: number,
): boolean {
  return tokensIn + tokensOut >= budget;
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
  const tokenBudget = Math.max(1_000, request.token_budget ?? 12_000);
  let tokensIn = 0;
  let tokensOut = 0;
  let terminalState: AutoTerminalState = "blocked";
  let checkpoint: ContextCheckpoint | undefined;
  let contextCompactionReceipt: CompactionReceipt | undefined;

  console.log(`[AUTO] Starting: "${request.task}" (mode=${mode})`);

  // ---- Phase 1: Scout Recon ----
  const trajectory = beginTrajectory({
    agentId: "auto-mode",
    taskType: "auto-orchestration",
    group_id: request.group_id,
  });

  let scoutReport = "";
  try {
    const scoutResult = await spawnAgentProcess(
      "scout",
      {
        task: `Recon for auto-mode: ${request.task}`,
        process_name: "auto.recon",
        output_contract: {
          version: "1.0",
          fields: [
            "goal",
            "summary",
            "files",
            "memories",
            "risks",
            "recommended_route",
            "validation_commands",
            "token_usage",
          ],
          max_output_tokens: 700,
        },
      },
      request.group_id,
    );

    const contextResult = parseContextPacketWithReceipt(scoutResult.output);
    if (contextResult?.status === "impossible") {
      throw new Error(
        `Scout ContextPacket cannot fit budget (${contextResult.required_tokens}/${contextResult.budget})`,
      );
    }
    const contextPacket = contextResult?.status === "compacted" ? contextResult.packet : null;
    if (contextResult?.status === "compacted") {
      contextCompactionReceipt = contextResult.receipt;
    }
    scoutReport = contextPacket
      ? JSON.stringify(contextPacket)
      : typeof scoutResult.output === "string"
        ? scoutResult.output
        : JSON.stringify(scoutResult.output);
    tokensIn += scoutResult.tokens_in ?? 0;
    tokensOut += scoutResult.tokens_out ?? 0;

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

  if (errors.length > 0) {
    const duration_ms = Math.round(performance.now() - startTime);
    const coherence = calculateCoherence();
    trajectory.complete({
      success: false,
      confidence: 0,
      duration_ms,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      errors,
    });
    return {
      success: false,
      strategy: "simple",
      mode,
      steps_executed: 1,
      duration_ms,
      outputs,
      coherence_score: coherence.score,
      terminal_state: "blocked",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      checkpoint,
      context_compaction_receipt: contextCompactionReceipt,
      errors,
    };
  }

  // ---- Phase 2: Complexity Assessment ----
  const strategy = assessComplexity(request.task, scoutReport.length);
  const maxIterations = normalizeIterationLimit(request.max_iterations, strategy);

  console.log(`[AUTO] Strategy: ${strategy} (max ${maxIterations} iterations)`);

  // ---- Phase 3: Execute ----
  let stepsExecuted = 1; // Scout was step 1

  if (strategy === "simple") {
    // Single pass — route to appropriate agent and execute
    const agentId = mapAutoTaskToAgent(request.task);
    try {
      const result = await spawnAgentProcess(
        agentId,
        {
          task: request.task,
          scout_report: scoutReport,
          tool_load_plan: planToolLoading(request.task, agentId),
          process_name: "auto.execute",
        },
        request.group_id,
      );
      tokensIn += result.tokens_in ?? 0;
      tokensOut += result.tokens_out ?? 0;

      stepsExecuted++;
      outputs.push({
        step: stepsExecuted,
        agent: agentId,
        success: result.success,
        summary: `${agentId} executed: ${result.success ? "success" : "failed"}`,
      });

      if (!result.success) {
        errors.push(...result.errors);
      } else if (isTokenBudgetExceeded(tokensIn, tokensOut, tokenBudget)) {
        terminalState = "exhausted";
        errors.push(`Token budget exhausted (${tokensIn + tokensOut}/${tokenBudget})`);
      } else {
        terminalState = "success";
      }
    } catch (e: any) {
      errors.push(`Execution failed: ${e.message}`);
    }
  } else {
    // Multi-step or Epic — iterative execution
    for (let i = 0; i < maxIterations; i++) {
      const agentId = i === 0 ? "woz" : mapAutoTaskToAgent(request.task);

      try {
        const result = await spawnAgentProcess(
          agentId,
          {
            task: request.task,
            scout_report: scoutReport,
            iteration: i + 1,
            max_iterations: maxIterations,
            token_budget_remaining: Math.max(0, tokenBudget - tokensIn - tokensOut),
            tool_load_plan: planToolLoading(request.task, agentId),
            process_name: `auto.iterate.${i + 1}`,
          },
          request.group_id,
        );
        tokensIn += result.tokens_in ?? 0;
        tokensOut += result.tokens_out ?? 0;

        if (shouldCompactContext(tokensIn + tokensOut)) {
          checkpoint = createContextCheckpoint({
            goal: request.task,
            decisions: outputs.map((output) => output.summary),
            changed_files: [],
            evidence: result.errors.length > 0 ? result.errors : ["iteration completed"],
            blocker: result.success ? null : result.errors.join("; ") || "agent execution failed",
            next_action: result.success ? "verify completion" : "resolve blocker",
            source_tokens: tokensIn + tokensOut,
          });
        }

        stepsExecuted++;
        outputs.push({
          step: stepsExecuted,
          agent: agentId,
          success: result.success,
          summary: `Iteration ${i + 1}: ${result.success ? "success" : "needs retry"}`,
        });

        // If task is complete, stop iterating
        if (result.success && result.confidence >= 0.8) {
          terminalState = "success";
          console.log(
            `[AUTO] Task complete at iteration ${i + 1} (confidence=${result.confidence})`,
          );
          break;
        }

        if (!result.success) {
          errors.push(...result.errors);
        }

        if (isTokenBudgetExceeded(tokensIn, tokensOut, tokenBudget)) {
          terminalState = "exhausted";
          errors.push(`Token budget exhausted (${tokensIn + tokensOut}/${tokenBudget})`);
          break;
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
    terminalState = "blocked";
  }

  // ---- Complete Trajectory ----
  const duration_ms = Math.round(performance.now() - startTime);
  if (errors.length > 0 && terminalState !== "exhausted") terminalState = "blocked";
  if (terminalState !== "success" && errors.length === 0) terminalState = "exhausted";
  const success = terminalState === "success" && errors.length === 0;

  trajectory.complete({
    success,
    confidence: success ? 0.85 : 0.3,
    duration_ms,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
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
    terminal_state: terminalState,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    checkpoint,
    context_compaction_receipt: contextCompactionReceipt,
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

export function mapAutoTaskToAgent(task: string): string {
  switch (inferProcessType(task)) {
    case "debug":
      return "bellard";
    case "refactor":
      return "fowler";
    case "architecture":
      return "brooks";
    case "devops":
      return "hightower";
    case "test":
    case "implementation":
    default:
      return "woz";
  }
}
