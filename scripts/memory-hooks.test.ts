import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { MemoryAddInput } from "mcp:allura-memory";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const search = mock(async (_input: unknown): Promise<unknown> => []);
const add = mock(async (_input: MemoryAddInput) => {});
mock.module("mcp:allura-memory", () => ({ memory_search: search, memory_add: add }));
const { onSessionStart, checkMemoryStackHealth, scoutPreTaskQuery } = await import(
  "../.opencode/hooks/session-start"
);
const { onTaskComplete, onADRCreated } = await import("../.opencode/hooks/task-complete");
const { selectAgent } = await import("../.opencode/routing/performance-router");

const memories = [{ id: "memory-1", content: "Verified outcome" }];
const envelope = { results: memories, count: 1, meta: { degraded: false } };
const textWrapper = (value: unknown) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

describe("router canonical memory consumer", () => {
  const exploit = { epsilon: 0, minTaskCount: 20, explorationDecay: 0.5 };
  const legacy = [
    {
      metadata: { agent_id: "pike-interface-review", event_type: "TASK_COMPLETE", confidence: 0.9 },
    },
    { metadata: { agent_id: "woz-builder", event_type: "TASK_COMPLETE", confidence: 0.6 } },
  ];
  const canonical = { results: legacy, count: legacy.length, meta: { degraded: false } };

  test.each([
    ["legacy adapter array", legacy],
    ["canonical envelope", canonical],
    ["MCP text wrapper", textWrapper(canonical)],
    ["MCP structured wrapper", { structuredContent: canonical }],
  ])("selects from legacy records inside %s", async (_name, response) => {
    search.mockResolvedValue(response);
    expect(await selectAgent("implementation", exploit)).toBe("pike-interface-review");
    expect(search).toHaveBeenCalledWith({
      group_id: "allura-system",
      query: "agent performance implementation",
      limit: 10,
    });
    expect(add).not.toHaveBeenCalled();
  });

  test("consumes actual new hook content without treating authenticated metadata identity as a role", async () => {
    await onTaskComplete({
      agentId: "fowler-refactor",
      task: "repair\nwith multiline description",
      result: "verified fix",
      confidence: 0.95,
      outcome: "success",
    });
    const content = add.mock.calls[0][0].content;
    add.mockReset();
    const rows = [
      ...legacy,
      { content, metadata: { source: "conversation", agent_id: "principal-123" } },
    ];
    search.mockResolvedValue({ results: rows, count: rows.length, meta: { degraded: false } });
    expect(await selectAgent("implementation", exploit)).toBe("fowler-refactor");
  });

  test("keeps the existing confidence aggregation for mixed old and new records", async () => {
    const rows = [
      {
        metadata: {
          agent_id: "pike-interface-review",
          event_type: "TASK_COMPLETE",
          confidence: 0.4,
        },
      },
      {
        content:
          'Task completed: review\n{"schema_version":1,"event_type":"TASK_COMPLETE","agent_role":"pike-interface-review","confidence":1}',
      },
      { metadata: { agent_id: "fowler-refactor", event_type: "TASK_COMPLETE", confidence: 0.65 } },
    ];
    search.mockResolvedValue(rows);
    expect(await selectAgent("implementation", exploit)).toBe("pike-interface-review");
  });

  test.each([
    ["MCP error", { isError: true, structuredContent: canonical }],
    ["malformed envelope", { results: legacy, count: 99, meta: { degraded: false } }],
    ["unparseable JSON", { content: [{ type: "text", text: "secret-token bad JSON" }] }],
    ["degraded retrieval", { ...canonical, meta: { degraded: true } }],
  ])("uses default routing for %s without leaking the response", async (_name, response) => {
    search.mockResolvedValue(response);
    const error = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await selectAgent("implementation", exploit)).toBe("woz-builder");
      expect(add).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]).toEqual([
        "[Router] Performance history unavailable; using default routing",
      ]);
    } finally {
      error.mockRestore();
    }
  });

  test("missing confidence or malformed task content does not invent a performance score", async () => {
    search.mockResolvedValue([
      null,
      { content: "Task completed: bad\nnot JSON", metadata: { agent_id: "principal-123" } },
      {
        content:
          'Task completed: unmeasured\n{"schema_version":1,"event_type":"TASK_COMPLETE","agent_role":"pike-interface-review","outcome":"success"}',
      },
    ]);
    expect(await selectAgent("implementation", exploit)).toBe("woz-builder");
    expect(add).not.toHaveBeenCalled();
  });

  test("exploration keeps telemetry in content with supported metadata and no impersonation", async () => {
    search.mockResolvedValue(legacy);
    const random = spyOn(Math, "random").mockReturnValue(0);
    try {
      expect(await selectAgent("implementation", { ...exploit, epsilon: 1 })).toBe("woz-builder");
      expect(add).toHaveBeenCalledTimes(1);
      const payload = add.mock.calls[0][0];
      expect(payload.group_id).toBe("allura-system");
      expect(payload.metadata).toEqual({ source: "conversation" });
      expect(payload).not.toHaveProperty("user_id");
      const details = JSON.parse(payload.content.slice(payload.content.lastIndexOf("\n") + 1));
      expect(details).toMatchObject({
        event_type: "EXPLORATION_STEP",
        task_type: "implementation",
        default_agent: "pike-interface-review",
        explored_agent: "woz-builder",
        epsilon: 1,
      });
      expect(typeof details.timestamp).toBe("string");
    } finally {
      random.mockRestore();
    }
  });

  test("retrieval and exploration-log failures are nonfatal and sanitized", async () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    const random = spyOn(Math, "random").mockReturnValue(0);
    try {
      search.mockRejectedValue(new Error("secret-token raw API response"));
      expect(await selectAgent("implementation", exploit)).toBe("woz-builder");
      search.mockResolvedValue(legacy);
      add.mockRejectedValue(new Error("secret-token raw API response"));
      expect(await selectAgent("implementation", { ...exploit, epsilon: 1 })).toBe("woz-builder");
      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls.every((args) => args.length === 1)).toBe(true);
      expect(JSON.stringify(error.mock.calls)).not.toContain("secret-token");
    } finally {
      random.mockRestore();
      error.mockRestore();
    }
  });
});

beforeEach(() => {
  search.mockReset();
  add.mockReset();
  search.mockResolvedValue([]);
  add.mockResolvedValue(undefined);
});

describe("governed lifecycle retrieval probe", () => {
  test("success proves retrieval only, never subsystem health", async () => {
    expect(await checkMemoryStackHealth("allura-test")).toEqual({
      retrieval: "healthy",
      postgres: "unverified",
      ruvector: "unverified",
      overall: "unverified",
    });
    expect(search).toHaveBeenCalledWith({
      group_id: "allura-test",
      query: "health check probe",
      limit: 1,
    });
  });
  test("failed retrieval does not claim a particular database failed", async () => {
    search.mockRejectedValue(new Error("offline"));
    const health = await checkMemoryStackHealth("allura-test");
    expect(health.retrieval).toBe("unreachable");
    expect(health.postgres).toBe("unverified");
    expect(health.ruvector).toBe("unverified");
  });
  test("malformed or MCP error envelopes do not become healthy", async () => {
    search.mockResolvedValue({ isError: true });
    expect((await checkMemoryStackHealth("allura-test")).retrieval).toBe("unreachable");
  });
  test("session propagates scope and omits caller identity assertions", async () => {
    await onSessionStart({ agentId: "woz", task: "build", group_id: "allura-test" });
    expect(add).toHaveBeenCalledTimes(1);
    const payload = add.mock.calls[0][0];
    expect(payload.group_id).toBe("allura-test");
    expect(payload).not.toHaveProperty("user_id");
    expect(payload.metadata).toEqual({ source: "conversation" });
    expect(payload.content).toContain("agent=woz");
  });
  test("logging failure does not abort the session or trigger database fallback", async () => {
    add.mockRejectedValue(new Error("offline"));
    expect((await onSessionStart({ agentId: "woz", task: "build" })).retrieval).toBe("healthy");
    expect(search).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
  });
  test("Scout query honors supplied scope", async () => {
    await scoutPreTaskQuery("scout", "task", "allura-test");
    expect(search).toHaveBeenCalledWith({ group_id: "allura-test", query: "task", limit: 5 });
  });

  test.each([
    ["legacy array", memories],
    ["canonical envelope", envelope],
    ["empty canonical success", { results: [], count: 0, meta: { degraded: false } }],
    ["MCP text", textWrapper(envelope)],
    ["MCP structured content", { structuredContent: envelope }],
    [
      "MCP structured content with human text",
      { structuredContent: envelope, content: [{ type: "text", text: "Search complete" }] },
    ],
  ])("normalizes %s for both retrieval health and Scout", async (_name, response) => {
    search.mockResolvedValue(response);
    const health = await checkMemoryStackHealth("allura-test");
    expect(health).toEqual({
      retrieval: "healthy",
      postgres: "unverified",
      ruvector: "unverified",
      overall: "unverified",
    });
    const rows = await scoutPreTaskQuery("scout", "task", "allura-test");
    expect(rows).toEqual(_name === "empty canonical success" ? [] : memories);
  });

  test.each([
    ["null", null],
    ["missing envelope", {}],
    ["missing count/meta", { results: [] }],
    ["malformed results", { ...envelope, results: "no" }],
    ["wrong count", { ...envelope, count: 0 }],
    ["missing metadata", { ...envelope, meta: null }],
    ["degraded retrieval", { ...envelope, meta: { degraded: true } }],
    ["MCP failure with plausible data", { isError: true, structuredContent: envelope }],
    ["nested failure", textWrapper({ ...envelope, error: "private failure details" })],
    ["bad JSON", { content: [{ type: "text", text: "not JSON" }] }],
    ["text encodes non-result", textWrapper({ status: "ok" })],
    [
      "ambiguous text blocks",
      { content: [...textWrapper(envelope).content, ...textWrapper(envelope).content] },
    ],
    ["malformed structured content", { structuredContent: {}, ...textWrapper(envelope) }],
  ])("rejects %s without exposing responses", async (_name, response) => {
    search.mockResolvedValue(response);
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await checkMemoryStackHealth("allura-test")).retrieval).toBe("unreachable");
      expect(await scoutPreTaskQuery("scout", "task", "allura-test")).toEqual([]);
      expect(warn.mock.calls.every((args) => args.length === 1)).toBe(true);
      expect(JSON.stringify(warn.mock.calls)).not.toContain("private failure details");
    } finally {
      warn.mockRestore();
    }
  });
});

describe("schema-compatible task and ADR outcomes", () => {
  test("Claude session protocol delivers the same schema and identity boundary", () => {
    const output = execFileSync(
      process.execPath,
      [resolve(import.meta.dir, "../.claude-plugin/hooks/session-start.ts")],
      { encoding: "utf8" },
    );
    const context = JSON.parse(output).hookSpecificOutput;
    expect(context.hookEventName).toBe("SessionStart");
    expect(context.additionalContext).toContain("metadata.source must be conversation or manual");
    expect(context.additionalContext).toContain(
      "never assert a persona as user_id or metadata.agent_id",
    );
    expect(context.additionalContext).toContain("structuredContent/text wrapper");
  });

  test("task keeps material result and telemetry in content, not stripped metadata", async () => {
    await onTaskComplete({
      agentId: "woz",
      task: "build",
      result: { summary: "fixed", tests: 4 },
      group_id: "allura-test",
      confidence: 0.8,
      model: "actual-model",
      outcome: "fallback_success",
      task_class: "repair",
      latency_ms: 12,
      tokens_in: 20,
      tokens_out: 30,
      retries: 2,
    });
    const payload = add.mock.calls[0][0];
    expect(payload.group_id).toBe("allura-test");
    expect(payload.metadata).toEqual({ source: "conversation" });
    expect(payload).not.toHaveProperty("user_id");
    const details = JSON.parse(payload.content.slice(payload.content.indexOf("\n") + 1));
    expect(details).toMatchObject({
      event_type: "TASK_COMPLETE",
      schema_version: 1,
      agent_role: "woz",
      result: JSON.stringify({ summary: "fixed", tests: 4 }),
      confidence: 0.8,
      model: "actual-model",
      outcome: "fallback_success",
      task_class: "repair",
      latency_ms: 12,
      tokens_in: 20,
      tokens_out: 30,
      retries: 2,
    });
  });

  test("ADR keeps decision and rationale in content with supported source", async () => {
    await onADRCreated({
      agentId: "brooks",
      decisionId: "AD-test",
      title: "Choice",
      rationale: "Evidence",
      group_id: "allura-test",
    });
    const payload = add.mock.calls[0][0];
    expect(payload.metadata).toEqual({ source: "conversation" });
    expect(payload).not.toHaveProperty("user_id");
    expect(payload.group_id).toBe("allura-test");
    const details = JSON.parse(payload.content.slice(payload.content.indexOf("\n") + 1));
    expect(details).toMatchObject({
      event_type: "ADR_CREATED",
      decision_id: "AD-test",
      rationale: "Evidence",
      agent_role: "brooks",
      confidence: 0.9,
    });
    expect(typeof details.timestamp).toBe("string");
  });

  test("task and ADR failures are nonfatal and sanitized", async () => {
    add.mockRejectedValue(new Error("secret-token raw API response"));
    const error = spyOn(console, "error").mockImplementation(() => {});
    try {
      await onTaskComplete({ agentId: "woz", task: "build", result: "result" });
      await onADRCreated({
        agentId: "brooks",
        decisionId: "AD-test",
        title: "Choice",
        rationale: "Evidence",
      });
      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls.every((args) => args.length === 1)).toBe(true);
      expect(JSON.stringify(error.mock.calls)).not.toContain("secret-token");
    } finally {
      error.mockRestore();
    }
  });
});
