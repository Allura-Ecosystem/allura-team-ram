import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectPromptSnapshot,
  comparePromptSnapshots,
  evaluatePromptResult,
  loadFixtures,
  type PromptEvalAdapter,
  type PromptEvalResult,
  runPromptEvalFixtures,
} from "./prompt-eval";

const repoRoot = join(import.meta.dir, "../..");
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

  test("collects a plugin-style agent layout without another checkout", async () => {
    const root = await mkdtemp(join(tmpdir(), "durham-prompt-eval-"));
    try {
      await mkdir(join(root, "agents"), { recursive: true });
      await mkdir(join(root, "skills", "brand-loop"), { recursive: true });
      await writeFile(join(root, "agents", "scout-recon.md"), "# Scout\n", "utf8");
      await writeFile(
        join(root, "skills", "brand-loop", "SKILL.md"),
        "---\nname: brand-loop\ndescription: Run bounded brand work.\n---\n# Brand\n",
        "utf8",
      );
      const snapshot = await collectPromptSnapshot(root);
      expect(snapshot.prompts.map((prompt) => prompt.id)).toContain("scout-recon");
      expect(snapshot.catalog.skills).toBe(1);
      expect(snapshot.totals.catalog_description_tokens).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
