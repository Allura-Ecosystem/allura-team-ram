/**
 * Harness HTTP Service Wrapper
 *
 * Exposes the Team RAM harness over HTTP so Allura can POST ProcessInvocation
 * requests and receive typed AgentResult responses.
 *
 * Transport & auth live here. Agent execution logic delegated to agent-executor.ts.
 */

import { spawnAgentProcess, mapProcessToAgent } from "./agent-executor";
import { getTrajectoryStats } from "./sona-trajectory";
import { onInvocationComplete, getPatternStats, runExtraction } from "./sona-patterns";
import { recordInvocation, recordDelegation, getCoherenceStatus, isDeploymentAllowed } from "./coherence-monitor";
import {
  submitRevision, getPendingRevisions, approveRevision, rejectRevision,
  submitAgentProposal, getPendingAgentProposals, approveAgentProposal, rejectAgentProposal,
  getCuratorDashboard,
} from "./curator";
import { proposeNewAgent } from "./genesis-engine";
import { executeAutoMode } from "./auto-mode";
import {
  initializeRegistry, recordAgentInvocation, getLifecycleDashboard,
  promoteAgent, retireAgent, getAllAgents,
} from "./agent-lifecycle";

// ---------------------------------------------------------------------------
// Types (mirroring Knuth's contract: docs/allura-harness-contract.md)
// ---------------------------------------------------------------------------

interface ProcessInvocation {
  processName: string;
  payload: Record<string, unknown>;
  group_id: string;
  metadata?: {
    agent_preference?: string;
    mode?: "day" | "night";
    priority?: "low" | "normal" | "high";
    correlation_id?: string;
  };
}

interface AgentResult {
  success: boolean;
  agent?: string;
  output?: string | Record<string, unknown>;
  metrics?: {
    duration_ms: number;
    tokens_in?: number;
    tokens_out?: number;
  };
  errors?: string[];
  confidence?: number;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  postgres: "healthy" | "degraded" | "unhealthy";
  graph: "healthy" | "degraded" | "unhealthy";
  sona: { active: boolean; trajectories?: number; agents?: number; taskTypes?: number };
  coherence: { score: number; level: string };
  uptime_ms: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = Number(process.env.HARNESS_PORT) || 7654;
const API_KEY = process.env.HARNESS_API_KEY || (() => {
  console.warn(
    "⚠️  HARNESS_API_KEY not set — using insecure dev key. " +
    "Set a strong key for production (openssl rand -hex 32)."
  );
  return "dev-key-insecure";
})();

const GROUP_ID_PATTERN = /^allura-[a-z0-9-]+$/;
const startTime = Date.now();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(errors: string[], status: number): Response {
  return jsonResponse({ success: false, errors }, status);
}

function checkAuth(req: Request): string | null {
  const header = req.headers.get("Authorization");
  if (!header) return "Missing Authorization header";
  if (header !== `Bearer ${API_KEY}`) return "Invalid API key";
  return null;
}

function validateInvocation(body: unknown): string[] {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return ["Request body must be a JSON object"];
  }

  const inv = body as Partial<ProcessInvocation>;

  if (!inv.processName || typeof inv.processName !== "string") {
    errors.push("processName is required and must be a string");
  }
  if (!inv.payload || typeof inv.payload !== "object") {
    errors.push("payload is required and must be an object");
  }
  if (!inv.group_id || typeof inv.group_id !== "string") {
    errors.push("group_id is required and must be a string");
  } else if (!GROUP_ID_PATTERN.test(inv.group_id)) {
    errors.push(
      `group_id must match pattern ${GROUP_ID_PATTERN} — got "${inv.group_id}"`
    );
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Executor — wires HTTP requests to the harness agent pipeline
//
// Flow: HTTP POST -> mapProcessToAgent -> selectAgent (performance router)
//       -> spawnAgentProcess -> AgentResult
//
// The performance router (selectAgent) and lifecycle hooks (onSessionStart,
// onTaskComplete) depend on MCP imports that are only available inside the
// harness runtime. We attempt a dynamic import and degrade gracefully when
// running outside that context (e.g., standalone HTTP mode).
// ---------------------------------------------------------------------------

/** Dynamic imports for MCP-dependent modules (best-effort). */
let _selectAgent: ((taskType: string, opts?: any) => Promise<string>) | null = null;
let _onSessionStart: ((params: any) => Promise<any>) | null = null;
let _onTaskComplete: ((params: any) => Promise<void>) | null = null;

async function loadHarnessModules(): Promise<void> {
  try {
    const router = await import("../.opencode/routing/performance-router");
    _selectAgent = router.selectAgent;
  } catch {
    console.warn("[Executor] Performance router unavailable — using static routing");
  }
  try {
    const sessionHook = await import("../.opencode/hooks/session-start");
    _onSessionStart = sessionHook.onSessionStart;
  } catch {
    console.warn("[Executor] Session-start hook unavailable — skipping lifecycle logging");
  }
  try {
    const taskHook = await import("../.opencode/hooks/task-complete");
    _onTaskComplete = taskHook.onTaskComplete;
  } catch {
    console.warn("[Executor] Task-complete hook unavailable — skipping lifecycle logging");
  }
}

// Attempt to load harness modules at startup (non-blocking)
loadHarnessModules();
// Initialize agent lifecycle registry from .opencode/agent/ definitions
initializeRegistry().catch(() => {});

async function executeInvocation(
  invocation: ProcessInvocation
): Promise<AgentResult> {
  const correlationId =
    invocation.metadata?.correlation_id ?? crypto.randomUUID();

  // 1. Static mapping: processName -> agent ID
  const staticAgent = mapProcessToAgent(invocation.processName);

  // 2. Dynamic routing via performance router (best-effort)
  let selectedAgent = staticAgent;
  if (_selectAgent) {
    try {
      selectedAgent = await _selectAgent(invocation.processName, {
        agent_preference: invocation.metadata?.agent_preference,
      });
    } catch (err) {
      console.warn(
        `[Executor] Performance router failed, using static agent: ${staticAgent}`,
        err,
      );
      selectedAgent = staticAgent;
    }
  }

  console.log(
    `[Executor] Invoking agent=${selectedAgent} for process=${invocation.processName} ` +
      `(correlation=${correlationId})`,
  );

  // 3. Log session start (best-effort)
  if (_onSessionStart) {
    try {
      await _onSessionStart({
        agentId: selectedAgent,
        task: invocation.processName,
        group_id: invocation.group_id,
      });
    } catch {
      // Non-fatal — continue execution
    }
  }

  // 4. Spawn agent process
  const result = await spawnAgentProcess(
    selectedAgent,
    invocation.payload as Record<string, any>,
    invocation.group_id,
  );

  // 5. Log task complete (best-effort)
  if (_onTaskComplete) {
    try {
      await _onTaskComplete({
        agentId: selectedAgent,
        task: invocation.processName,
        result: result.output,
        group_id: invocation.group_id,
        confidence: result.confidence,
        model: result.model,
        outcome: result.outcome,
        task_class: result.task_class,
        latency_ms: result.duration_ms,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
      });
    } catch {
      // Non-fatal
    }
  }

  console.log(
    `[Executor] Agent=${selectedAgent} finished: success=${result.success} ` +
      `duration=${result.duration_ms}ms (correlation=${correlationId})`,
  );

  // 6. Record to coherence monitor + lifecycle tracker
  recordInvocation(selectedAgent, invocation.processName, result.success, result.duration_ms);
  recordAgentInvocation(selectedAgent, result.success);

  // Record delegation edge: router → agent (for coherence graph)
  if (staticAgent !== selectedAgent) {
    recordDelegation(staticAgent, selectedAgent, invocation.processName, result.success);
  }
  // Always record the process→agent routing as a delegation from "router"
  recordDelegation("router", selectedAgent, invocation.processName, result.success);

  // 7. SONA pattern extraction trigger — auto-submit proposals to curator
  //    and trigger genesis engine for coverage gaps
  onInvocationComplete().then((extraction) => {
    if (extraction) {
      for (const proposal of extraction.proposals) {
        submitRevision(proposal);
      }
      // Genesis: propose new agents for coverage gaps
      for (const pattern of extraction.patterns) {
        if (pattern.type === "coverage_gap" && pattern.taskType) {
          proposeNewAgent(pattern.taskType, extraction.patterns);
        }
      }
    }
  }).catch(() => {});

  // 7. Return typed AgentResult
  return {
    success: result.success,
    agent: selectedAgent,
    output: result.output,
    metrics: {
      duration_ms: result.duration_ms,
      tokens_in: result.tokens_in,
      tokens_out: result.tokens_out,
    },
    errors: result.errors.length > 0 ? result.errors : undefined,
    confidence: result.confidence,
  };
}

// ---------------------------------------------------------------------------
// Health check — real connectivity probes with 5-second cache
// ---------------------------------------------------------------------------

let _healthCache: { result: HealthStatus; timestamp: number } | null = null;
const HEALTH_CACHE_TTL_MS = 5_000;

async function getHealth(): Promise<HealthStatus> {
  const now = Date.now();

  // Return cached result if fresh
  if (_healthCache && now - _healthCache.timestamp < HEALTH_CACHE_TTL_MS) {
    return { ..._healthCache.result, uptime_ms: now - startTime };
  }

  const pgStatus = await checkPostgres();
  const graphStatus = await checkGraph();

  // Overall status reflects harness ability to serve requests.
  // The harness can always operate via static routing fallback even when DBs
  // are down, so overall status is "healthy" as long as the server is running.
  // Subsystem status (postgres, graph) is reported separately for diagnostics.
  const status: HealthStatus["status"] = "healthy";

  const coherence = getCoherenceStatus();

  const health: HealthStatus = {
    status,
    postgres: pgStatus,
    graph: graphStatus,
    sona: getTrajectoryStats(),
    coherence: { score: coherence.score, level: coherence.level },
    uptime_ms: now - startTime,
  };

  _healthCache = { result: health, timestamp: now };
  return health;
}

const HEALTH_PROBE_TIMEOUT_MS = 2_000;

/**
 * Probe a TCP port with a timeout. Returns true if the connection succeeds.
 */
async function probeTcp(host: string, port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), HEALTH_PROBE_TIMEOUT_MS);

    try {
      Bun.connect({
        hostname: host,
        port,
        socket: {
          open(socket) {
            clearTimeout(timer);
            socket.end();
            resolve(true);
          },
          data() {},
          error() {
            clearTimeout(timer);
            resolve(false);
          },
          close() {},
          connectError() {
            clearTimeout(timer);
            resolve(false);
          },
        },
      }).catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Probe PostgreSQL by TCP-connecting to its port.
 */
async function checkPostgres(): Promise<"healthy" | "unhealthy"> {
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = Number(process.env.POSTGRES_PORT) || 5432;
  return (await probeTcp(host, port)) ? "healthy" : "unhealthy";
}

/**
 * Probe the canonical graph (PostgreSQL graph tables) by checking the
 * same PostgreSQL instance — graph_memories and graph_supersedes tables
 * live alongside episodic data in the single PostgreSQL engine.
 * Returns "graph_unavailable" as "unhealthy" when the PG probe fails.
 */
async function checkGraph(): Promise<"healthy" | "unhealthy"> {
  // Graph tables reside in the same PostgreSQL instance as episodic data.
  // Reuse the PostgreSQL TCP probe — if PG is reachable, graph tables are
  // available. A dedicated probe is unnecessary after the Neo4j sunset (AD-50).
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = Number(process.env.POSTGRES_PORT) || 5432;
  return (await probeTcp(host, port)) ? "healthy" : "unhealthy";
}

// ---------------------------------------------------------------------------
// Request router
// ---------------------------------------------------------------------------

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // --- Health endpoint (no auth required) ---------------------------------
  if (req.method === "GET" && url.pathname === "/health") {
    const health = await getHealth();
    return jsonResponse(health);
  }

  // --- Patterns endpoint (auth required) ------------------------------------
  if (req.method === "GET" && url.pathname === "/patterns") {
    const authError = checkAuth(req);
    if (authError) return errorResponse([authError], 401);
    const stats = getPatternStats();
    const sona = getTrajectoryStats();
    return jsonResponse({ ...stats, sona });
  }

  // --- Coherence endpoint (auth required) -----------------------------------
  if (req.method === "GET" && url.pathname === "/coherence") {
    const authError = checkAuth(req);
    if (authError) return errorResponse([authError], 401);
    return jsonResponse(getCoherenceStatus());
  }

  if (req.method === "POST" && url.pathname === "/patterns/extract") {
    const authError = checkAuth(req);
    if (authError) return errorResponse([authError], 401);
    const result = await runExtraction();
    return jsonResponse(result);
  }

  // --- Lifecycle endpoints (auth required) -----------------------------------
  if (url.pathname.startsWith("/lifecycle")) {
    const authError = checkAuth(req);
    if (authError) return errorResponse([authError], 401);

    if (req.method === "GET" && url.pathname === "/lifecycle") {
      return jsonResponse(getLifecycleDashboard());
    }

    if (req.method === "GET" && url.pathname === "/lifecycle/agents") {
      return jsonResponse(getAllAgents());
    }

    if (req.method === "POST" && url.pathname === "/lifecycle/promote") {
      const body = await req.json().catch(() => null) as any;
      if (!body?.agentId) return errorResponse(["agentId is required"], 400);
      const result = promoteAgent(body.agentId);
      return jsonResponse(result, result.success ? 200 : 400);
    }

    if (req.method === "POST" && url.pathname === "/lifecycle/retire") {
      const body = await req.json().catch(() => null) as any;
      if (!body?.agentId) return errorResponse(["agentId is required"], 400);
      const result = retireAgent(body.agentId, body.reason);
      return jsonResponse(result, result.success ? 200 : 400);
    }

    return errorResponse([`Not found: ${req.method} ${url.pathname}`], 404);
  }

  // --- Curator endpoints (auth required) ------------------------------------
  if (url.pathname.startsWith("/curator")) {
    const authError = checkAuth(req);
    if (authError) return errorResponse([authError], 401);

    if (req.method === "GET" && url.pathname === "/curator") {
      return jsonResponse(getCuratorDashboard());
    }

    if (req.method === "GET" && url.pathname === "/curator/revisions") {
      return jsonResponse(getPendingRevisions());
    }

    if (req.method === "POST" && url.pathname === "/curator/revisions/approve") {
      const body = await req.json().catch(() => null) as any;
      if (!body?.id) return errorResponse(["id is required"], 400);
      const result = approveRevision(body.id, body.notes);
      return result ? jsonResponse(result) : errorResponse(["Revision not found or not eligible"], 404);
    }

    if (req.method === "POST" && url.pathname === "/curator/revisions/reject") {
      const body = await req.json().catch(() => null) as any;
      if (!body?.id) return errorResponse(["id is required"], 400);
      const result = rejectRevision(body.id, body.notes);
      return result ? jsonResponse(result) : errorResponse(["Revision not found"], 404);
    }

    if (req.method === "GET" && url.pathname === "/curator/agents") {
      return jsonResponse(getPendingAgentProposals());
    }

    if (req.method === "POST" && url.pathname === "/curator/agents/approve") {
      const body = await req.json().catch(() => null) as any;
      if (!body?.id) return errorResponse(["id is required"], 400);
      const result = approveAgentProposal(body.id, body.notes);
      return result ? jsonResponse(result) : errorResponse(["Proposal not found or not eligible"], 404);
    }

    if (req.method === "POST" && url.pathname === "/curator/agents/reject") {
      const body = await req.json().catch(() => null) as any;
      if (!body?.id) return errorResponse(["id is required"], 400);
      const result = rejectAgentProposal(body.id, body.notes);
      return result ? jsonResponse(result) : errorResponse(["Proposal not found"], 404);
    }

    return errorResponse([`Not found: ${req.method} ${url.pathname}`], 404);
  }

  // --- Auto mode endpoint (auth required) -----------------------------------
  if (req.method === "POST" && url.pathname === "/auto") {
    const authError = checkAuth(req);
    if (authError) return errorResponse([authError], 401);

    let body: any;
    try { body = await req.json(); } catch { return errorResponse(["Invalid JSON"], 400); }

    if (!body?.task) return errorResponse(["task is required"], 400);
    if (!body?.group_id || !GROUP_ID_PATTERN.test(body.group_id)) {
      return errorResponse(["group_id is required and must match allura-* pattern"], 400);
    }

    try {
      const result = await executeAutoMode({
        task: body.task,
        group_id: body.group_id,
        max_iterations: body.max_iterations,
        mode: body.mode,
      });
      return jsonResponse(result, result.success ? 200 : 500);
    } catch (err: any) {
      return errorResponse([`Auto mode error: ${err.message}`], 500);
    }
  }

  // --- Invoke endpoint ----------------------------------------------------
  if (req.method === "POST" && url.pathname === "/invoke") {
    const authError = checkAuth(req);
    if (authError) {
      return errorResponse([authError], 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse(["Invalid JSON in request body"], 400);
    }

    const validationErrors = validateInvocation(body);
    if (validationErrors.length > 0) {
      return errorResponse(validationErrors, 400);
    }

    try {
      const result = await executeInvocation(body as ProcessInvocation);
      return jsonResponse(result, result.success ? 200 : 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse([`Internal error: ${message}`], 500);
    }
  }

  // --- Fallback -----------------------------------------------------------
  return errorResponse([`Not found: ${req.method} ${url.pathname}`], 404);
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch: handleRequest,
});

console.log(`\u{1F680} Harness service listening on http://0.0.0.0:${server.port}`);
