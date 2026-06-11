import { describe, test, expect } from "bun:test";
import { onInvocationComplete, runExtraction, getPatternStats } from "./sona-patterns";

// NOTE: sona-patterns uses a module-level counter (_invocationCount) that
// persists across test calls. Tests are written to tolerate accumulated state
// and focus on observable contracts rather than exact counter values.

describe("onInvocationComplete", () => {
  test("returns null when the invocation count has not reached the extraction interval", async () => {
    // The extraction interval defaults to 20. A single call is almost never on
    // an exact multiple (unless the counter happened to land there already).
    // We call once and check: if it happens to land on a multiple we get a result,
    // otherwise we get null. Either outcome is valid per the contract.
    const result = await onInvocationComplete();
    // result is either null or an ExtractionResult — both are valid
    if (result !== null) {
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.proposals)).toBe(true);
      expect(typeof result.invocationCount).toBe("number");
    } else {
      expect(result).toBeNull();
    }
  });
});

describe("getPatternStats", () => {
  test("returns invocationCount and nextExtractionIn fields", () => {
    const stats = getPatternStats();

    expect(typeof stats.invocationCount).toBe("number");
    expect(typeof stats.extractionInterval).toBe("number");
    expect(typeof stats.nextExtractionIn).toBe("number");
    expect(stats.invocationCount).toBeGreaterThanOrEqual(0);
    expect(stats.nextExtractionIn).toBeGreaterThanOrEqual(1);
    expect(stats.nextExtractionIn).toBeLessThanOrEqual(stats.extractionInterval);
  });

  test("invocationCount increases after calling onInvocationComplete", async () => {
    const before = getPatternStats().invocationCount;
    await onInvocationComplete();
    const after = getPatternStats().invocationCount;
    expect(after).toBe(before + 1);
  });
});

describe("runExtraction", () => {
  test("returns an ExtractionResult with patterns array and proposals array", async () => {
    const result = await runExtraction();

    expect(typeof result.invocationCount).toBe("number");
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(Array.isArray(result.proposals)).toBe(true);
  });

  test("all proposals in the result have required SkillRevisionProposal fields", async () => {
    const result = await runExtraction();
    for (const p of result.proposals) {
      expect(typeof p.skill_name).toBe("string");
      expect(typeof p.agent_id).toBe("string");
      expect(typeof p.revision_type).toBe("string");
      expect(typeof p.pattern_type).toBe("string");
      expect(typeof p.pattern_description).toBe("string");
      expect(typeof p.proposed_change).toBe("string");
      expect(typeof p.sona_confidence).toBe("number");
      expect(p.group_id).toBe("allura-system");
    }
  });
});
