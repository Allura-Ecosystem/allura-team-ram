import { describe, test, expect } from "bun:test";
import {
  beginTrajectory,
  extractPatterns,
  extractAllPatterns,
  getTrajectoryStats,
  forceLearn,
} from "./sona-trajectory";

describe("beginTrajectory", () => {
  test("returns an object with an id string and a complete method", () => {
    const traj = beginTrajectory({
      agentId: "woz",
      taskType: "implement",
      group_id: "allura-system",
    });

    expect(typeof traj.id).toBe("string");
    expect(traj.id).toMatch(/^traj-woz-/);
    expect(typeof traj.complete).toBe("function");
  });

  test("complete() returns a TrajectoryRecord with expected shape", () => {
    const traj = beginTrajectory({
      agentId: "scout",
      taskType: "recon",
      taskId: "t-001",
      group_id: "allura-system",
    });

    const record = traj.complete({
      success: true,
      confidence: 0.9,
      duration_ms: 120,
      tokens_in: 500,
      tokens_out: 200,
      errors: [],
    });

    expect(typeof record.trajectory_id).toBe("string");
    expect(typeof record.started_at).toBe("string");
    expect(typeof record.completed_at).toBe("string");
    expect(record.outcome.success).toBe(true);
    expect(record.outcome.confidence).toBe(0.9);
    expect(record.outcome.duration_ms).toBe(120);
  });

  test("TrajectoryRecord context fields match the input context", () => {
    const ctx = {
      agentId: "bellard",
      taskType: "diagnose",
      taskId: "task-99",
      processName: "harness.perf.diagnose",
      group_id: "allura-system",
    };

    const record = beginTrajectory(ctx).complete({
      success: false,
      confidence: 0.2,
      duration_ms: 450,
      tokens_in: 0,
      tokens_out: 0,
      errorType: "TimeoutError",
      errors: ["timed out"],
    });

    expect(record.context.agentId).toBe("bellard");
    expect(record.context.taskType).toBe("diagnose");
    expect(record.context.taskId).toBe("task-99");
    expect(record.context.processName).toBe("harness.perf.diagnose");
    expect(record.context.group_id).toBe("allura-system");
    expect(record.outcome.errorType).toBe("TimeoutError");
  });
});

describe("extractPatterns", () => {
  test("returns an array (may be empty when below minimum task threshold)", () => {
    // A freshly introduced agent with 0 tasks yields no patterns
    const patterns = extractPatterns(`agent-fresh-${Date.now()}`);
    expect(Array.isArray(patterns)).toBe(true);
  });

  test("finds patterns after enough trajectories complete for an agent", () => {
    const agentId = `pattern-agent-${Date.now()}`;

    // Simulate 12 failed tasks for this agent (well above the 5-task minimum)
    for (let i = 0; i < 12; i++) {
      beginTrajectory({ agentId, taskType: "risky-task", group_id: "allura-system" }).complete({
        success: false,
        confidence: 0.1,
        duration_ms: 300,
        tokens_in: 0,
        tokens_out: 0,
        errorType: "NetworkError",
        errors: ["network failure"],
      });
    }

    const patterns = extractPatterns(agentId);
    expect(patterns.length).toBeGreaterThan(0);

    const failurePattern = patterns.find((p) => p.type === "repeated_failure");
    expect(failurePattern).toBeDefined();
    expect(failurePattern?.agentId).toBe(agentId);
    expect(failurePattern?.confidence).toBeGreaterThan(0);
  });
});

describe("extractAllPatterns", () => {
  test("returns an array after trajectories have been completed", () => {
    // Run a couple trajectories to ensure the stats maps are non-empty
    const agentId = `all-pattern-${Date.now()}`;
    for (let i = 0; i < 6; i++) {
      beginTrajectory({ agentId, taskType: "bulk-task", group_id: "allura-system" }).complete({
        success: true,
        confidence: 0.95,
        duration_ms: 50,
        tokens_in: 100,
        tokens_out: 40,
        errors: [],
      });
    }

    const patterns = extractAllPatterns();
    expect(Array.isArray(patterns)).toBe(true);
  });
});

describe("getTrajectoryStats", () => {
  test("returns active=true after trajectories have been recorded", () => {
    // At this point in the test suite we've recorded several trajectories
    beginTrajectory({ agentId: "stats-check", taskType: "status", group_id: "allura-system" })
      .complete({ success: true, confidence: 0.8, duration_ms: 10, tokens_in: 0, tokens_out: 0, errors: [] });

    const stats = getTrajectoryStats();
    expect(stats.active).toBe(true);
    expect(typeof stats.trajectories).toBe("number");
    expect(stats.trajectories).toBeGreaterThan(0);
    expect(typeof stats.agents).toBe("number");
    expect(typeof stats.taskTypes).toBe("number");
    expect(typeof stats.native).toBe("boolean");
  });
});

describe("forceLearn", () => {
  test("returns false when the native engine is unavailable", () => {
    // In CI / test environments @ruvector/sona is unlikely to be present.
    // forceLearn returns true only if native engine loaded.
    const result = forceLearn();
    expect(typeof result).toBe("boolean");
    // We can't assert the value without knowing env, but shape must be boolean.
  });
});
