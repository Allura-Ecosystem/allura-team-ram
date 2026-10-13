import { describe, expect, test } from "bun:test";
import {
  loadAgentDefinition,
  mapProcessToAgent,
  resolveApiModel,
  spawnAgentProcess,
} from "./agent-executor";

describe("mapProcessToAgent", () => {
  test("maps harness.speckit.implement to woz", () => {
    expect(mapProcessToAgent("harness.speckit.implement")).toBe("woz");
  });

  test("maps harness.speckit.validate to brooks", () => {
    expect(mapProcessToAgent("harness.speckit.validate")).toBe("brooks");
  });

  test("maps harness.discovery.recon to scout", () => {
    expect(mapProcessToAgent("harness.discovery.recon")).toBe("scout");
  });

  test("maps harness.refactor.safe to fowler", () => {
    expect(mapProcessToAgent("harness.refactor.safe")).toBe("fowler");
  });

  test("maps harness.perf.diagnose to bellard", () => {
    expect(mapProcessToAgent("harness.perf.diagnose")).toBe("bellard");
  });

  test("maps harness.interface.review to pike", () => {
    expect(mapProcessToAgent("harness.interface.review")).toBe("pike");
  });

  test("maps harness.intent.scope to jobs", () => {
    expect(mapProcessToAgent("harness.intent.scope")).toBe("jobs");
  });

  test("falls back to brooks for unknown process names", () => {
    expect(mapProcessToAgent("unknown.process")).toBe("brooks");
    expect(mapProcessToAgent("")).toBe("brooks");
    expect(mapProcessToAgent("harness.nonexistent.task")).toBe("brooks");
  });
});

describe("loadAgentDefinition", () => {
  test("loads nested canonical Scout definition instead of fallback text", async () => {
    const definition = await loadAgentDefinition("scout");
    expect(definition).toContain("Scout — Recon and Context Hydration");
    expect(definition).toContain("ContextPacket");
    expect(definition).not.toContain('You are the "scout" agent. Execute the task below.');
  });
});

describe("model and execution boundaries", () => {
  test("API model resolution rejects CLI aliases and missing config", () => {
    for (const alias of [undefined, "inherit", "sonnet", "opus", "haiku"]) {
      expect(() => resolveApiModel(alias, undefined)).toThrow("TEAM_RAM_ANTHROPIC_MODEL");
    }
    expect(resolveApiModel("inherit", "configured-api-model")).toBe("configured-api-model");
    expect(resolveApiModel("explicit-api-model", undefined)).toBe("explicit-api-model");
  });

  test.skipIf(Boolean(process.env.ANTHROPIC_API_KEY))(
    "local definition load is not completed work",
    async () => {
      const result = await spawnAgentProcess("woz", { task: "implement feature" }, "allura-system");
      expect(result.success).toBe(false);
      expect(result.outcome).toBe("failure");
      expect(result.errors.join(" ")).toContain("No execution backend");
    },
  );
});

test("tool-less API mode blocks implementation before spending tokens", () => {
  const child = Bun.spawnSync({
    cmd: [
      process.execPath,
      "-e",
      `
      globalThis.fetch = async () => { throw new Error("unexpected network request"); };
      const { spawnAgentProcess } = await import("./src/agent-executor.ts");
      const result = await spawnAgentProcess("woz", { process_name: "harness.speckit.implement", task: "write code" }, "allura-system");
      console.log("RESULT:" + JSON.stringify(result));
    `,
    ],
    cwd: import.meta.dir + "/..",
    env: { ...process.env, ANTHROPIC_API_KEY: "test-only", TEAM_RAM_ANTHROPIC_MODEL: "test-model" },
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(child.exitCode).toBe(0);
  const line = child.stdout
    .toString()
    .split("\n")
    .find((value) => value.startsWith("RESULT:"));
  const result = JSON.parse(line!.slice(7));
  expect(result.success).toBe(false);
  expect(result.errors.join(" ")).toContain("no workspace tools");
  expect(result.tokens_in).toBe(0);
});
