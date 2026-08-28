import { describe, expect, test } from "bun:test";
import {
  CHECKPOINT_TOKEN_LIMIT,
  createContextCheckpoint,
  shouldCompactContext,
} from "./context-checkpoint";

describe("context checkpoints", () => {
  test("compacts only after the configured threshold", () => {
    expect(shouldCompactContext(7_999)).toBe(false);
    expect(shouldCompactContext(8_000)).toBe(true);
  });

  test("creates a bounded evidence checkpoint", () => {
    const checkpoint = createContextCheckpoint({
      goal: "Finish the bounded prompt optimization pass",
      decisions: Array.from({ length: 20 }, (_, index) => `decision-${index}-${"x".repeat(80)}`),
      changed_files: Array.from({ length: 30 }, (_, index) => `src/file-${index}.ts`),
      evidence: Array.from({ length: 30 }, (_, index) => `test-${index}-${"x".repeat(100)}`),
      blocker: null,
      next_action: "Run the prompt regression suite",
      source_tokens: 18_000,
    });

    expect(checkpoint.version).toBe("1.0");
    expect(checkpoint.checkpoint_tokens).toBeLessThanOrEqual(CHECKPOINT_TOKEN_LIMIT);
    expect(checkpoint.decisions.length).toBeLessThanOrEqual(8);
    expect(checkpoint.changed_files.length).toBeLessThanOrEqual(20);
    expect(checkpoint.evidence.length).toBeLessThanOrEqual(12);
  });
});
