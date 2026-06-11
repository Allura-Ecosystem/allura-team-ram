import { describe, test, expect } from "bun:test";
import { cognitumGate } from "./agent-sandbox";

describe("agent-sandbox — cognitumGate", () => {
  const baseEvidence = { trajectoryCount: 15, confidence: 0.85, metric: 0.85 };
  const existingAgents = ["brooks", "woz", "scout", "jobs", "pike", "fowler"];

  test("permits new agent with sufficient evidence and no conflicts", () => {
    const decision = cognitumGate("new_agent", "test-specialist", baseEvidence, existingAgents);

    expect(decision.token).toBe("permit");
    expect(decision.structural.passed).toBe(true);
    expect(decision.shift.passed).toBe(true);
    expect(decision.evidence.passed).toBe(true);
  });

  test("denies new agent if name already exists in existing agents", () => {
    const decision = cognitumGate("new_agent", "brooks", baseEvidence, existingAgents);

    expect(decision.token).toBe("deny");
    expect(decision.structural.passed).toBe(false);
    expect(decision.structural.reason).toContain("already exists");
  });

  test("defers if not enough trajectories (< 10)", () => {
    const weakEvidence = { trajectoryCount: 5, confidence: 0.85, metric: 0.85 };
    const decision = cognitumGate("new_agent", "test-specialist", weakEvidence, existingAgents);

    expect(decision.token).toBe("defer");
    expect(decision.evidence.passed).toBe(false);
    expect(decision.evidence.reason).toContain("need at least 10");
  });

  test("defers if confidence below 0.7", () => {
    const lowConfidence = { trajectoryCount: 15, confidence: 0.5, metric: 0.5 };
    const decision = cognitumGate("new_agent", "test-specialist", lowConfidence, existingAgents);

    expect(decision.token).toBe("defer");
    expect(decision.evidence.passed).toBe(false);
    expect(decision.evidence.reason).toContain("below threshold");
  });

  test("denies if more than 15 existing agents (Brooks Law)", () => {
    const manyAgents = Array.from({ length: 16 }, (_, i) => "agent-" + i);
    const decision = cognitumGate("new_agent", "test-specialist", baseEvidence, manyAgents);

    expect(decision.token).toBe("deny");
    expect(decision.shift.passed).toBe(false);
    expect(decision.shift.reason).toContain("Maximum 15");
  });
});
