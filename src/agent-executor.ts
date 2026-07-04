/**
 * Agent Executor — Invokes harness agents via the Anthropic Messages API
 *
 * This module bridges the HTTP service to the harness agent pipeline.
 * It loads agent definitions from .opencode/agent/<name>.md, constructs
 * a prompt with the agent persona + task payload, and calls the Anthropic
 * API directly. No CLI spawning, no Bun.spawn().
 */

import { resolve } from "path";
import { beginTrajectory, type TrajectoryRecord } from "./sona-trajectory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentExecutionResult {
  success: boolean;
  output: string | Record<string, unknown>;
  confidence: number;
  duration_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  errors: string[];
  trajectory?: TrajectoryRecord;
  /** The model that actually served this task (MODEL_EVAL v1 telemetry). */
  model: string;
  /** Objective outcome — never conflate a fallback rescue with primary success. */
  outcome: "success" | "failure" | "timeout";
  /** Task classification for stratified per-model reporting. */
  task_class: string;
}

// ---------------------------------------------------------------------------
// Process-to-Agent Mapping
// Agent IDs are bare names matching filenames in .opencode/agent/<name>.md
// ---------------------------------------------------------------------------

const PROCESS_AGENT_MAP: Record<string, string> = {
  "harness.speckit.implement": "woz",
  "harness.speckit.validate": "brooks",
  "harness.discovery.recon": "scout",
  "harness.refactor.safe": "fowler",
  "harness.perf.diagnose": "bellard",
  "harness.interface.review": "pike",
  "harness.intent.scope": "jobs",
};

/**
 * Map a dot-namespaced process name to the harness agent ID.
 * Falls back to brooks (chief architect) for unknown processes.
 */
export function mapProcessToAgent(processName: string): string {
  return PROCESS_AGENT_MAP[processName] || "brooks";
}

// ---------------------------------------------------------------------------
// Agent model mapping (from agent definition frontmatter)
// ---------------------------------------------------------------------------

// Tier assignments come from the machine authority (tooling/agent-sync/models.map.json);
// this executor only translates the claude tier alias to a concrete Anthropic model ID.
// Do NOT hand-maintain per-agent model IDs here — that recreates a fifth model authority.
const CLAUDE_TIER_IDS: Record<string, string> = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5",
};

interface ModelsMap {
  tiers: Record<string, { claude: string }>;
  agents: Record<string, { tier: string }>;
}

let _modelsMap: ModelsMap | null = null;
async function loadModelsMap(): Promise<ModelsMap | null> {
  if (_modelsMap) return _modelsMap;
  try {
    const path = resolve(import.meta.dir, "../tooling/agent-sync/models.map.json");
    _modelsMap = JSON.parse(await Bun.file(path).text()) as ModelsMap;
    return _modelsMap;
  } catch (err) {
    console.warn(`[Executor] Could not load models.map.json: ${err}`);
    return null;
  }
}

async function getModelForAgent(agentId: string): Promise<string> {
  const map = await loadModelsMap();
  const tierName = map?.agents[agentId]?.tier;
  const alias = tierName ? map?.tiers[tierName]?.claude : undefined;
  return CLAUDE_TIER_IDS[alias ?? "sonnet"] ?? CLAUDE_TIER_IDS.sonnet;
}

// Task classification for stratified per-model reporting. Bellard's rule:
// never compare success rates across classes — that measures routing, not models.
const PROCESS_TASK_CLASS: Record<string, string> = {
  "harness.speckit.implement": "codegen",
  "harness.speckit.validate": "review",
  "harness.discovery.recon": "recon",
  "harness.refactor.safe": "refactor",
  "harness.perf.diagnose": "diagnostics",
  "harness.interface.review": "review",
  "harness.intent.scope": "scoping",
};

export function classifyTask(processName: string): string {
  return PROCESS_TASK_CLASS[processName] || "general";
}

// ---------------------------------------------------------------------------
// Agent Definition Loader
// ---------------------------------------------------------------------------

const AGENT_DIR = resolve(import.meta.dir, "../.opencode/agent");

/**
 * Load agent definition from .opencode/agent/<name>.md
 * Extracts the markdown body (skips YAML frontmatter).
 */
async function loadAgentDefinition(agentId: string): Promise<string> {
  const path = resolve(AGENT_DIR, `${agentId}.md`);

  try {
    const content = await Bun.file(path).text();
    const lines = content.split("\n");

    // Skip YAML frontmatter (between --- markers)
    if (lines[0]?.trim() === "---") {
      const endIdx = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
      if (endIdx > 0) {
        return lines.slice(endIdx + 1).join("\n").trim();
      }
    }

    return content.trim();
  } catch (err) {
    console.warn(`[Executor] Could not load agent definition for "${agentId}": ${err}`);
    return `You are the "${agentId}" agent. Execute the task below.`;
  }
}

// ---------------------------------------------------------------------------
// Anthropic API Invocation
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TIMEOUT_MS = Number(process.env.AGENT_TIMEOUT_MS) || 30_000;

/**
 * Call the Anthropic Messages API directly via fetch.
 */
async function callAnthropicAPI(
  model: string,
  systemPrompt: string,
  userMessage: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<{ text: string; tokens_in: number; tokens_out: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data.content
      ?.filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n") || "";

    return {
      text,
      tokens_in: data.usage?.input_tokens || 0,
      tokens_out: data.usage?.output_tokens || 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Agent Spawner (public API)
// ---------------------------------------------------------------------------

/**
 * Invoke an agent by loading its definition, constructing a prompt,
 * and calling the Anthropic Messages API.
 *
 * Returns a typed AgentExecutionResult with duration and token info.
 */
export async function spawnAgentProcess(
  agentId: string,
  payload: Record<string, unknown>,
  group_id: string,
  modelOverride?: string,
): Promise<AgentExecutionResult> {
  const startTime = performance.now();

  // SONA trajectory wrapping (AD-06)
  const taskType = (payload.process_name as string) || "unknown";
  const task_class = classifyTask(taskType);
  const trajectory = beginTrajectory({
    agentId,
    taskType,
    taskId: (payload.task_id as string) || undefined,
    processName: taskType,
    group_id,
  });

  try {
    // 1. Load agent definition (markdown body, no frontmatter)
    const agentDef = await loadAgentDefinition(agentId);

    // 2. Build system prompt from agent definition
    const systemPrompt = agentDef;

    // 3. Build user message with task payload
    const userMessage = `**Incoming ProcessInvocation from Allura:**

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

**Your task:** Execute the above task and return your result as a JSON envelope:

\`\`\`json
{
  "success": true,
  "output": "your result here (string or object)",
  "errors": [],
  "confidence": 0.95
}
\`\`\`

Group ID for this invocation: ${group_id}`;

    // 4. Invoke agent — API mode or local mode
    const model = modelOverride ?? (await getModelForAgent(agentId));

    if (ANTHROPIC_API_KEY) {
      // ---- API mode: call Anthropic Messages API directly ----
      console.log(`[Executor] Calling Anthropic API: model=${model} agent=${agentId}`);

      const apiResult = await callAnthropicAPI(
        model,
        systemPrompt,
        userMessage,
        DEFAULT_TIMEOUT_MS,
      );

      const duration_ms = Math.round(performance.now() - startTime);
      const parsed = parseAgentOutput(apiResult.text);

      const result: AgentExecutionResult = {
        success: parsed.success ?? true,
        output: parsed.output,
        confidence: parsed.confidence ?? 0.75,
        duration_ms,
        tokens_in: apiResult.tokens_in,
        tokens_out: apiResult.tokens_out,
        errors: parsed.errors || [],
        model,
        outcome: (parsed.success ?? true) ? "success" : "failure",
        task_class,
      };

      // Record SONA trajectory
      result.trajectory = trajectory.complete({
        success: result.success,
        confidence: result.confidence,
        duration_ms,
        tokens_in: apiResult.tokens_in,
        tokens_out: apiResult.tokens_out,
        errors: result.errors,
      });

      return result;
    } else {
      // ---- Local mode: agent definition loaded, return structured result ----
      // This mode is used when running without an API key (dev/test).
      // The agent definition was loaded successfully, proving the pipeline works.
      console.log(
        `[Executor] Local mode (no ANTHROPIC_API_KEY): agent=${agentId} definition loaded (${agentDef.length} chars)`,
      );

      const duration_ms = Math.round(performance.now() - startTime);

      const result: AgentExecutionResult = {
        success: true,
        output: {
          mode: "local",
          agent: agentId,
          model,
          payload_received: payload,
          agent_definition_loaded: true,
          agent_definition_length: agentDef.length,
          message: `Agent "${agentId}" invoked in local mode. Set ANTHROPIC_API_KEY for live API calls.`,
        },
        confidence: 0.5,
        duration_ms,
        tokens_in: 0,
        tokens_out: 0,
        errors: [],
        model,
        outcome: "success",
        task_class,
      };

      // Record SONA trajectory (local mode)
      result.trajectory = trajectory.complete({
        success: true,
        confidence: 0.5,
        duration_ms,
        tokens_in: 0,
        tokens_out: 0,
        errors: [],
      });

      return result;
    }
  } catch (error: any) {
    const duration_ms = Math.round(performance.now() - startTime);
    const message = error?.message || String(error);

    console.error(`[Executor] Agent ${agentId} failed: ${message}`);

    // Record SONA trajectory (failure)
    const trajectoryRecord = trajectory.complete({
      success: false,
      confidence: 0,
      duration_ms,
      tokens_in: 0,
      tokens_out: 0,
      errorType: error?.name || "UnknownError",
      errors: [message],
    });

    return {
      success: false,
      output: "",
      confidence: 0,
      duration_ms,
      tokens_in: 0,
      tokens_out: 0,
      errors: [message],
      trajectory: trajectoryRecord,
      model: modelOverride ?? (await getModelForAgent(agentId).catch(() => "unknown")),
      outcome: error?.name === "AbortError" ? "timeout" : "failure",
      task_class,
    };
  }
}

// ---------------------------------------------------------------------------
// Output Parser
// ---------------------------------------------------------------------------

interface ParsedOutput {
  success?: boolean;
  output: string | Record<string, unknown>;
  confidence?: number;
  errors?: string[];
}

/**
 * Parse agent response text. Expects a JSON envelope either as raw JSON
 * or wrapped in a ```json code block.
 *
 * Falls back to treating the entire text as output if JSON parsing fails.
 */
function parseAgentOutput(raw: string): ParsedOutput {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { output: "" };
  }

  // Try to extract JSON from a code block first
  const jsonBlockMatch = trimmed.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      return {
        success: parsed.success,
        output: parsed.output ?? parsed,
        confidence: parsed.confidence,
        errors: parsed.errors,
      };
    } catch {
      // Fall through to raw JSON parse
    }
  }

  // Try raw JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    return {
      success: parsed.success,
      output: parsed.output ?? parsed,
      confidence: parsed.confidence,
      errors: parsed.errors,
    };
  } catch {
    // Not JSON — return raw text as the output
    return { success: true, output: trimmed, confidence: 0.75 };
  }
}
