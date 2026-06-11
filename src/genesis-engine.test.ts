import { describe, test, expect } from "bun:test";
import { proposeNewAgent, scanForCoverageGaps } from "./genesis-engine";
import type { SonaPattern } from "./sona-trajectory";

function makeCoverageGapPattern(taskType: string): SonaPattern {
  return {
    type: "coverage_gap",
    agentId: "none",
    taskType,
    description: `No agent handles ${taskType} well`,
    confidence: 0.82,
    evidence: { trajectoryCount: 15, metric: 0.3 },
  };
}

function makeFailurePattern(agentId: string): SonaPattern {
  return {
    type: "repeated_failure",
    agentId,
    description: `${agentId} fails repeatedly`,
    confidence: 0.75,
    evidence: { trajectoryCount: 12, metric: 0.2 },
  };
}

describe("proposeNewAgent", () => {
  test("returns a spec with a generated name derived from the task type", () => {
    const taskType = `harness.custom.workflow-${Date.now()}`;
    const patterns: SonaPattern[] = [makeCoverageGapPattern(taskType)];

    const result = proposeNewAgent(taskType, patterns);

    expect(result.spec).toBeDefined();
    expect(typeof result.spec.name).toBe("string");
    expect(result.spec.name.length).toBeGreaterThan(0);
    // Name is derived from taskType — harness. prefix is stripped and dots become dashes
    expect(result.spec.name).toContain("-specialist");
  });

  test("returns a definition string with YAML frontmatter", () => {
    const taskType = `harness.analytics.ingest-${Date.now()}`;
    const patterns: SonaPattern[] = [makeCoverageGapPattern(taskType)];

    const result = proposeNewAgent(taskType, patterns);

    expect(typeof result.definition).toBe("string");
    expect(result.definition.startsWith("---")).toBe(true);
    expect(result.definition).toContain("name:");
    expect(result.definition).toContain("status: experimental");
    expect(result.definition).toContain("mode: subagent");
  });

  test("spec tools include Edit, Write, Bash when task type contains 'implement'", () => {
    const taskType = "harness.speckit.implement-code";
    const patterns: SonaPattern[] = [makeCoverageGapPattern(taskType)];

    const result = proposeNewAgent(taskType, patterns);

    expect(result.spec.tools).toContain("Edit");
    expect(result.spec.tools).toContain("Write");
    expect(result.spec.tools).toContain("Bash");
  });

  test("spec tools include Edit, Write, Bash when task type contains 'build'", () => {
    const taskType = "harness.builder.build-service";
    const patterns: SonaPattern[] = [
      makeCoverageGapPattern(taskType),
      makeFailurePattern("woz"),
    ];

    const result = proposeNewAgent(taskType, patterns);

    expect(result.spec.tools).toContain("Edit");
    expect(result.spec.tools).toContain("Write");
    expect(result.spec.tools).toContain("Bash");
  });
});

describe("scanForCoverageGaps", () => {
  test("returns an empty array when no external patterns have been fed in", () => {
    const results = scanForCoverageGaps();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});
