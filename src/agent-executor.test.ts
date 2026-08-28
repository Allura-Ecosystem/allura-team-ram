import { describe, expect, test } from "bun:test";
import { loadAgentDefinition, mapProcessToAgent } from "./agent-executor";

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
