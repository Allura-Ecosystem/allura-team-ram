import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  collectPromptSnapshot,
  comparePromptSnapshots,
  evaluatePromptResult,
  loadFixtures,
  runPromptEvalFixtures,
  type PromptEvalAdapter,
  type PromptEvalResult,
} from "./prompt-eval";

const repoRoot = join(import.meta.dir, "../..");
const durhamRoot = join(repoRoot, "../allura-plugins/team-durham");
const fixturePath = join(import.meta.dir, "fixtures.json");

describe("prompt evaluator", () => {
  test("collects core prompt and skill catalog metrics", async () => {
    const snapshot = await collectPromptSnapshot(repoRoot);
    expect(snapshot.version).toBe("1.0");
    expect(snapshot.prompts.map((prompt) => prompt.id)).toContain("brooks");
    expect(snapshot.prompts.map((prompt) => prompt.id)).toContain("scout");
    expect(snapshot.catalog.skills).toBeGreaterThan(100);
    expect(snapshot.totals.prompt_tokens).toBeGreaterThan(0);
  });

  test("collects Durham agents and its lazy skill catalog", async () => {
    const snapshot = await collectPromptSnapshot(durhamRoot);
    expect(snapshot.prompts.map((prompt) => prompt.id)).toContain("scout-recon");
    expect(snapshot.catalog.skills).toBeGreaterThan(70);
    expect(snapshot.totals.catalog_description_tokens).toBeGreaterThan(0);
  });

  test("compares prompt snapshots deterministically", async () => {
    const before = await collectPromptSnapshot(repoRoot);
    const after = structuredClone(before);
    after.prompts[0].approximate_tokens -= 100;
    after.totals.prompt_tokens -= 100;

    const comparison = comparePromptSnapshots(before, after);
    expect(comparison.prompt_token_delta).toBe(-100);
    expect(comparison.per_prompt[0].delta).toBe(-100);
  });

  test("passes a conforming fixture result", async () => {
    const fixtures = await loadFixtures(fixturePath);
    const fixture = fixtures.find((item) => item.id === "scout-path-recon");
    expect(fixture).toBeDefined();
    const result: PromptEvalResult = {
      id: "scout-path-recon",
      route: "scout",
      terminal_state: "success",
      output_tokens: 420,
      evidence: ["file-path", "validation-command"],
    };
    expect(evaluatePromptResult(fixture!, result)).toEqual({ passed: true, violations: [] });
  });

  test("reports routing, budget, and evidence regressions", async () => {
    const fixtures = await loadFixtures(fixturePath);
    const fixture = fixtures.find((item) => item.id === "durham-external-publish");
    expect(fixture).toBeDefined();
    const result: PromptEvalResult = {
      id: "durham-external-publish",
      route: "glaser",
      terminal_state: "success",
      output_tokens: 900,
      evidence: [],
    };
    const verdict = evaluatePromptResult(fixture!, result);
    expect(verdict.passed).toBe(false);
    expect(verdict.violations).toHaveLength(4);
  });

  test("runs fixtures through an injected offline adapter", async () => {
    const fixtures = (await loadFixtures(fixturePath)).slice(0, 1);
    const adapter: PromptEvalAdapter = {
      async invoke(fixture) {
        return {
          id: fixture.id,
          route: fixture.expected_route,
          terminal_state: fixture.allowed_terminal_states[0],
          output_tokens: fixture.max_output_tokens,
          evidence: [...fixture.required_evidence],
        };
      },
    };
    const run = await runPromptEvalFixtures(fixtures, adapter);
    expect(run).toHaveLength(1);
    expect(run[0].verdict).toEqual({ passed: true, violations: [] });
  });

  test("records adapter timeout as a failed verdict", async () => {
    const fixtures = (await loadFixtures(fixturePath)).slice(0, 1);
    const adapter: PromptEvalAdapter = {
      async invoke() {
        return await new Promise<PromptEvalResult>(() => {});
      },
    };
    const run = await runPromptEvalFixtures(fixtures, adapter, 5);
    expect(run[0].result).toBeNull();
    expect(run[0].verdict.passed).toBe(false);
    expect(run[0].verdict.violations[0]).toContain("timed out");
  });
});
