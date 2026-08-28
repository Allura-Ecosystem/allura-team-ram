/**
 * SONA Trajectory Module — Wraps agent invocations in learning trajectories
 *
 * Uses the native @ruvector/sona NAPI-RS module for sub-1ms trajectory
 * capture with LoRA adaptation and EWC++ memory retention. Falls back to
 * a pure TypeScript engine if the native module is unavailable.
 *
 * Native API (discovered from @ruvector/sona-linux-x64-gnu 0.1.4):
 *   new SonaEngine(ewcLambda: u32, microLoraRank: u32, baseLoraInterval: u32)
 *   beginTrajectory(embedding: f64[]) → u32 (trajectoryId)
 *   addTrajectoryContext(trajId: u32, context: string)
 *   setTrajectoryRoute(trajId: u32, route: string)
 *   endTrajectory(trajId: u32, reward: f64)
 *   findPatterns(embedding: f64[], limit: u32) → Pattern[]
 *   applyMicroLora(embedding: f64[])
 *   forceLearn()
 *   tick()
 *   flush()
 *   getStats() → string (CoordinatorStats)
 *   isEnabled() → boolean
 *   setEnabled(enabled: boolean)
 *
 * AD-06: SONA as learning engine (ARCHITECTURE-SELF-EVOLUTION.md)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrajectoryContext {
  agentId: string;
  taskType: string;
  taskId?: string;
  processName?: string;
  group_id: string;
}

export interface TrajectoryOutcome {
  success: boolean;
  confidence: number;
  duration_ms: number;
  tokens_in: number;
  tokens_out: number;
  errorType?: string;
  errors: string[];
}

export interface TrajectoryRecord {
  trajectory_id: string;
  context: TrajectoryContext;
  outcome: TrajectoryOutcome;
  started_at: string;
  completed_at: string;
}

export interface SonaPattern {
  type: "repeated_failure" | "success_cluster" | "duration_outlier" | "coverage_gap";
  agentId: string;
  taskType?: string;
  description: string;
  confidence: number;
  suggestedAgent?: string;
  evidence: { trajectoryCount: number; metric: number };
}

// ---------------------------------------------------------------------------
// Agent Stats (TS-layer tracking — works with both native and fallback)
// ---------------------------------------------------------------------------

interface AgentStats {
  totalTasks: number;
  successes: number;
  failures: number;
  totalDuration: number;
  errorTypes: Map<string, number>;
}

const agentStats: Map<string, AgentStats> = new Map();
const taskTypeStats: Map<string, Map<string, AgentStats>> = new Map();

function getOrCreateStats(key: string, store: Map<string, AgentStats>): AgentStats {
  if (!store.has(key)) {
    store.set(key, {
      totalTasks: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0,
      errorTypes: new Map(),
    });
  }
  return store.get(key)!;
}

function recordStats(agentId: string, taskType: string, outcome: TrajectoryOutcome) {
  // Per-agent
  const as = getOrCreateStats(agentId, agentStats);
  as.totalTasks++;
  as.totalDuration += outcome.duration_ms;
  if (outcome.success) {
    as.successes++;
  } else {
    as.failures++;
    if (outcome.errorType)
      as.errorTypes.set(outcome.errorType, (as.errorTypes.get(outcome.errorType) || 0) + 1);
  }

  // Per-taskType per-agent
  if (!taskTypeStats.has(taskType)) taskTypeStats.set(taskType, new Map());
  const tm = taskTypeStats.get(taskType)!;
  const ts = getOrCreateStats(agentId, tm);
  ts.totalTasks++;
  ts.totalDuration += outcome.duration_ms;
  if (outcome.success) {
    ts.successes++;
  } else {
    ts.failures++;
    if (outcome.errorType)
      ts.errorTypes.set(outcome.errorType, (ts.errorTypes.get(outcome.errorType) || 0) + 1);
  }
}

// ---------------------------------------------------------------------------
// Native SONA Engine (NAPI-RS)
// ---------------------------------------------------------------------------

let _nativeEngine: any = null;
let _nativeAvailable: boolean | null = null; // null = not checked yet
let _trajectoryCount = 0;

/** Simple hash to generate a deterministic pseudo-embedding from a string */
function stringToEmbedding(s: string, dim = 4): number[] {
  const emb = new Array(dim).fill(0);
  for (let i = 0; i < s.length; i++) {
    emb[i % dim] = (emb[i % dim] + s.charCodeAt(i) * 0.001) % 1.0;
  }
  return emb;
}

function loadNativeEngine(): any {
  if (_nativeAvailable === false) return null;
  if (_nativeEngine) return _nativeEngine;

  try {
    const { SonaEngine } = require("@ruvector/sona");
    _nativeEngine = new SonaEngine(4, 4, 100); // ewcLambda=4, microLoraRank=4, baseLoraInterval=100
    _nativeAvailable = true;
    console.log("[SONA] Native engine loaded (@ruvector/sona NAPI-RS)");
    return _nativeEngine;
  } catch (e: any) {
    _nativeAvailable = false;
    console.log(`[SONA] Native engine unavailable (${e.message}), using TypeScript fallback`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trajectory Wrapper
// ---------------------------------------------------------------------------

/**
 * Begin a SONA trajectory for an agent invocation.
 * Uses native @ruvector/sona when available, falls back to TS stats tracking.
 */
export function beginTrajectory(ctx: TrajectoryContext) {
  const startedAt = new Date().toISOString();
  const trajectoryId = `traj-${ctx.agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Try native engine
  const native = loadNativeEngine();
  let nativeTrajId: number | null = null;

  if (native) {
    try {
      const embedding = stringToEmbedding(`${ctx.agentId}:${ctx.taskType}`);
      nativeTrajId = native.beginTrajectory(embedding);
      native.addTrajectoryContext(nativeTrajId, ctx.agentId);
      native.setTrajectoryRoute(nativeTrajId, ctx.taskType);
    } catch (e: any) {
      console.warn(`[SONA] Native beginTrajectory failed: ${e.message}`);
      nativeTrajId = null;
    }
  }

  return {
    id: trajectoryId,

    complete(outcome: TrajectoryOutcome): TrajectoryRecord {
      // Record to native engine
      if (native && nativeTrajId !== null) {
        try {
          native.endTrajectory(nativeTrajId, outcome.confidence);
          native.tick();
        } catch (e: any) {
          console.warn(`[SONA] Native endTrajectory failed: ${e.message}`);
        }
      }

      // Always record to TS stats (pattern extraction uses these)
      recordStats(ctx.agentId, ctx.taskType, outcome);
      _trajectoryCount++;

      const record: TrajectoryRecord = {
        trajectory_id: trajectoryId,
        context: ctx,
        outcome,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      };

      console.log(
        `[SONA] Trajectory ${trajectoryId}: agent=${ctx.agentId} ` +
          `task=${ctx.taskType} success=${outcome.success} ` +
          `confidence=${outcome.confidence} duration=${outcome.duration_ms}ms` +
          (native ? " [native]" : " [ts]"),
      );

      return record;
    },

    fail(error: Error | string): TrajectoryRecord {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.name : "UnknownError";
      return this.complete({
        success: false,
        confidence: 0,
        duration_ms: Math.round(performance.now()),
        tokens_in: 0,
        tokens_out: 0,
        errorType,
        errors: [errorMsg],
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Pattern Extraction (Phase B)
// ---------------------------------------------------------------------------

/**
 * Extract patterns from accumulated trajectory stats for a given agent or task type.
 * Returns actionable patterns that can drive skill revision proposals.
 */
export function extractPatterns(agentIdOrTaskType: string): SonaPattern[] {
  const patterns: SonaPattern[] = [];

  // Check as agentId
  const as = agentStats.get(agentIdOrTaskType);
  if (as && as.totalTasks >= 5) {
    const successRate = as.successes / as.totalTasks;
    const avgDuration = as.totalDuration / as.totalTasks;

    if (successRate < 0.5) {
      const topError = [...as.errorTypes.entries()].sort((a, b) => b[1] - a[1])[0];
      patterns.push({
        type: "repeated_failure",
        agentId: agentIdOrTaskType,
        description:
          `Agent ${agentIdOrTaskType} has ${(successRate * 100).toFixed(0)}% success rate over ${as.totalTasks} tasks` +
          (topError ? `. Top error: ${topError[0]} (${topError[1]}x)` : ""),
        confidence: Math.min(0.9, as.totalTasks / 20),
        evidence: { trajectoryCount: as.totalTasks, metric: successRate },
      });
    }

    if (successRate >= 0.9) {
      patterns.push({
        type: "success_cluster",
        agentId: agentIdOrTaskType,
        description: `Agent ${agentIdOrTaskType} has ${(successRate * 100).toFixed(0)}% success rate — high performer (avg ${avgDuration.toFixed(0)}ms)`,
        confidence: Math.min(0.95, as.totalTasks / 20),
        evidence: { trajectoryCount: as.totalTasks, metric: successRate },
      });
    }

    // Duration outlier: agent is 3x slower than average
    const allDurations: number[] = [];
    for (const stats of agentStats.values()) {
      if (stats.totalTasks >= 3) allDurations.push(stats.totalDuration / stats.totalTasks);
    }
    if (allDurations.length > 1) {
      const globalAvg = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
      if (avgDuration > globalAvg * 3) {
        patterns.push({
          type: "duration_outlier",
          agentId: agentIdOrTaskType,
          description: `Agent ${agentIdOrTaskType} avg ${avgDuration.toFixed(0)}ms — ${(avgDuration / globalAvg).toFixed(1)}x slower than average`,
          confidence: 0.7,
          evidence: { trajectoryCount: as.totalTasks, metric: avgDuration / globalAvg },
        });
      }
    }
  }

  // Check as taskType — find best agent for informed exploration
  const tm = taskTypeStats.get(agentIdOrTaskType);
  if (tm && tm.size >= 1) {
    let bestAgent = "";
    let bestRate = 0;
    let allBelowThreshold = true;

    for (const [agentId, stats] of tm) {
      if (stats.totalTasks >= 3) {
        const rate = stats.successes / stats.totalTasks;
        if (rate > 0.5) allBelowThreshold = false;
        if (rate > bestRate) {
          bestRate = rate;
          bestAgent = agentId;
        }
      }
    }

    if (bestAgent && bestRate > 0.5) {
      patterns.push({
        type: "success_cluster",
        agentId: bestAgent,
        taskType: agentIdOrTaskType,
        description: `Agent ${bestAgent} is best for ${agentIdOrTaskType} (${(bestRate * 100).toFixed(0)}% success)`,
        confidence: bestRate,
        suggestedAgent: bestAgent,
        evidence: { trajectoryCount: tm.get(bestAgent)!.totalTasks, metric: bestRate },
      });
    }

    // Coverage gap: no agent succeeds at this task type
    if (allBelowThreshold && tm.size >= 2) {
      const totalAttempts = [...tm.values()].reduce((s, v) => s + v.totalTasks, 0);
      if (totalAttempts >= 10) {
        patterns.push({
          type: "coverage_gap",
          agentId: "none",
          taskType: agentIdOrTaskType,
          description: `No agent handles ${agentIdOrTaskType} well — all below 50% success across ${totalAttempts} attempts`,
          confidence: 0.8,
          evidence: { trajectoryCount: totalAttempts, metric: bestRate },
        });
      }
    }
  }

  return patterns;
}

/**
 * Extract patterns for ALL agents and task types.
 * Used by the pattern extraction trigger to scan everything at once.
 */
export function extractAllPatterns(): SonaPattern[] {
  const allPatterns: SonaPattern[] = [];
  const seen = new Set<string>();

  for (const agentId of agentStats.keys()) {
    const patterns = extractPatterns(agentId);
    for (const p of patterns) {
      const key = `${p.type}:${p.agentId}:${p.taskType || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPatterns.push(p);
      }
    }
  }

  for (const taskType of taskTypeStats.keys()) {
    const patterns = extractPatterns(taskType);
    for (const p of patterns) {
      const key = `${p.type}:${p.agentId}:${p.taskType || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPatterns.push(p);
      }
    }
  }

  return allPatterns;
}

// ---------------------------------------------------------------------------
// Stats / Health
// ---------------------------------------------------------------------------

export function getTrajectoryStats() {
  const nativeStats = _nativeEngine ? String(_nativeEngine.getStats()) : null;
  return {
    active: _trajectoryCount > 0 || _nativeEngine !== null,
    native: _nativeAvailable === true,
    trajectories: _trajectoryCount,
    agents: agentStats.size,
    taskTypes: taskTypeStats.size,
    nativeStats,
  };
}

/**
 * Force the native engine to learn from accumulated trajectories.
 * No-op if native engine is unavailable.
 */
export function forceLearn(): boolean {
  if (_nativeEngine) {
    try {
      _nativeEngine.forceLearn();
      _nativeEngine.flush();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
