import { describe, expect, test } from "bun:test";
import {
  CONTEXT_PACKET_MAX_FILES,
  CONTEXT_PACKET_OUTPUT_TOKEN_LIMIT,
  type ContextPacket,
  compactContextPacketWithReceipt,
  estimateTokens,
  parseContextPacket,
  validateContextPacket,
} from "./context-packet";

function validPacket(): ContextPacket {
  return {
    version: "1.0",
    goal: "Locate the model routing authority",
    summary: "The tier map is canonical and generated mirrors must not be edited directly.",
    files: [
      {
        path: "tooling/agent-sync/models.map.json",
        reason: "Canonical model tier mapping",
      },
    ],
    memories: [
      {
        id: "memory-1",
        summary: "Previous routing changes must update the source map first.",
        relevance: 0.95,
      },
    ],
    risks: ["Generated agent mirrors may drift"],
    recommended_route: "brooks",
    validation_commands: ["bun tooling/agent-sync/sync-agents.mjs --check"],
    token_usage: { input: 1_200, output: 300, budget: 4_000 },
  };
}

describe("ContextPacket", () => {
  test("accepts a compact valid packet", () => {
    expect(validateContextPacket(validPacket())).toEqual({ valid: true, errors: [] });
  });

  test("parses JSON packets and rejects ordinary prose", () => {
    expect(parseContextPacket(JSON.stringify(validPacket()))?.goal).toBe(
      "Locate the model routing authority",
    );
    expect(parseContextPacket("Scout found three files")).toBeNull();
  });

  test("rejects malformed unknown input without throwing", () => {
    const malformed = {
      version: "1.0",
      goal: "goal",
      summary: "summary",
      files: [{ path: 42, reason: null }],
      memories: [{ summary: [], relevance: "high" }],
      risks: [false],
      recommended_route: "scout",
      validation_commands: [3],
      token_usage: { input: "many", output: -1, budget: 0 },
    };
    expect(() => validateContextPacket(malformed)).not.toThrow();
    expect(validateContextPacket(malformed).valid).toBe(false);
    expect(parseContextPacket(malformed)).toBeNull();
  });

  test("rejects missing routing and over-budget usage", () => {
    const packet = validPacket();
    packet.recommended_route = "";
    packet.token_usage = { input: 3_800, output: 500, budget: 4_000 };
    const result = validateContextPacket(packet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("recommended_route is required");
  });

  test("compacts arrays, scalars, and emits a deterministic receipt", () => {
    const packet = validPacket();
    packet.goal = "g".repeat(2_000);
    packet.summary = "s".repeat(5_000);
    packet.files = Array.from({ length: 20 }, (_, index) => ({
      path: `src/${"p".repeat(400)}-${index}.ts`,
      reason: "r".repeat(500),
    }));
    packet.memories = Array.from({ length: 10 }, (_, index) => ({
      summary: `memory ${index} ${"m".repeat(400)}`,
      relevance: index / 10,
    }));
    const original = structuredClone(packet);

    const first = compactContextPacketWithReceipt(packet);
    const second = compactContextPacketWithReceipt(packet);
    expect(first).toEqual(second);
    expect(packet).toEqual(original);
    expect(first.status).toBe("compacted");
    if (first.status === "compacted") {
      expect(first.packet.files.length).toBeLessThanOrEqual(CONTEXT_PACKET_MAX_FILES);
      expect(estimateTokens(JSON.stringify(first.packet))).toBeLessThanOrEqual(
        CONTEXT_PACKET_OUTPUT_TOKEN_LIMIT,
      );
      expect(first.receipt.before_tokens).toBeGreaterThan(first.receipt.after_tokens);
      expect(first.receipt.truncated.length).toBeGreaterThan(0);
      expect(first.receipt.dropped.length).toBeGreaterThan(0);
    }
  });

  test("returns impossible when required fields cannot fit an extreme budget", () => {
    const result = compactContextPacketWithReceipt(validPacket(), 20);
    expect(result.status).toBe("impossible");
    if (result.status === "impossible") {
      expect(result.required_tokens).toBeGreaterThan(result.budget);
      expect(result.blockers).toContain("required ContextPacket fields exceed the token budget");
    }
  });

  test("retains the highest-relevance memories", () => {
    const packet = validPacket();
    packet.memories = Array.from({ length: 8 }, (_, index) => ({
      summary: `memory-${index}`,
      relevance: index / 10,
    }));
    const result = compactContextPacketWithReceipt(packet);
    expect(result.status).toBe("compacted");
    if (result.status === "compacted") {
      expect(result.packet.memories.map((memory) => memory.summary)).toEqual([
        "memory-7",
        "memory-6",
        "memory-5",
        "memory-4",
        "memory-3",
      ]);
    }
  });
});
