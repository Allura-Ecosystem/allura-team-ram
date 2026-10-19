import { describe, expect, mock, test } from "bun:test";
import type { AgentExecutionResult } from "./agent-executor";
import { executeAutoMode } from "./auto-mode";

function result(success = true, output: string = "verified result"): AgentExecutionResult {
  return {
    success,
    output,
    confidence: 0.95,
    duration_ms: 1,
    errors: success ? [] : ["backend unavailable"],
    model: "test-model",
    outcome: success ? "success" : "failure",
    task_class: "test",
  };
}

describe("auto-mode execution routing", () => {
  test.each([
    ["refactor the routing module", "fowler"],
    ["architect the public contract", "brooks"],
    ["implement docker infrastructure", "hightower"],
    ["implement database migration", "knuth"],
  ])("preserves domain owner on the first iteration: %s", async (task, owner) => {
    const execute = mock(async (_agent: string) => result());
    await executeAutoMode({ task, group_id: "allura-system", max_iterations: 1 }, execute);
    expect(execute.mock.calls.map(([agent]) => agent)).toEqual(["scout", owner]);
  });

  test("long Scout context keeps a typo fix on the single-pass path", async () => {
    const execute = mock(async (_agent: string) => result(true, "context ".repeat(150)));
    const outcome = await executeAutoMode(
      { task: "correct typo in readme", group_id: "allura-system" },
      execute,
    );
    expect(outcome.strategy).toBe("simple");
    expect(execute.mock.calls).toHaveLength(2);
  });

  test("failed Scout cannot start an implementation", async () => {
    const execute = mock(async (_agent: string) => result(false));
    const outcome = await executeAutoMode(
      { task: "implement feature", group_id: "allura-system" },
      execute,
    );
    expect(outcome.terminal_state).toBe("blocked");
    expect(outcome.success).toBe(false);
    expect(execute.mock.calls.map(([agent]) => agent)).toEqual(["scout"]);
  });
});
