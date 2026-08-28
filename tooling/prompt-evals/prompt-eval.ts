#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export interface PromptMetric {
  id: string;
  path: string;
  chars: number;
  lines: number;
  approximate_tokens: number;
}

export interface CatalogMetric {
  skills: number;
  full_chars: number;
  approximate_full_tokens: number;
  description_chars: number;
  approximate_description_tokens: number;
  descriptions_over_120_chars: number;
}

export interface PromptSnapshot {
  version: "1.0";
  generated_from: string;
  prompts: PromptMetric[];
  catalog: CatalogMetric;
  totals: {
    prompt_tokens: number;
    catalog_description_tokens: number;
  };
}

export interface PromptSnapshotComparison {
  prompt_token_delta: number;
  catalog_description_token_delta: number;
  per_prompt: Array<{
    id: string;
    before: number;
    after: number;
    delta: number;
  }>;
}

export interface PromptEvalFixture {
  id: string;
  team: "ram" | "durham";
  task: string;
  expected_route: string;
  allowed_terminal_states: string[];
  max_output_tokens: number;
  required_evidence: string[];
}

export interface PromptEvalResult {
  id: string;
  route: string;
  terminal_state: string;
  output_tokens: number;
  evidence: string[];
}

export interface PromptEvalVerdict {
  passed: boolean;
  violations: string[];
}

export interface PromptEvalAdapter {
  invoke(fixture: PromptEvalFixture): Promise<PromptEvalResult>;
}

export interface PromptEvalRunItem {
  fixture: PromptEvalFixture;
  result: PromptEvalResult | null;
  verdict: PromptEvalVerdict;
}

export async function collectPromptSnapshot(repoRoot: string): Promise<PromptSnapshot> {
  const prompts: PromptMetric[] = [];
  const agentPaths = await resolveAgentPaths(repoRoot);
  for (const relativePath of agentPaths) {
    const path = join(repoRoot, relativePath);
    const text = await readFile(path, "utf8");
    prompts.push({
      id: relativePath.split("/").at(-1)?.replace(/\.md$/, "") ?? relativePath,
      path: relativePath,
      chars: text.length,
      lines: text.split("\n").length,
      approximate_tokens: estimateTokens(text),
    });
  }

  const ramSkillRoot = join(repoRoot, ".opencode/skills");
  const skillRoot = (await Bun.file(join(ramSkillRoot, "auto-mode/SKILL.md")).exists())
    ? ramSkillRoot
    : join(repoRoot, "skills");
  const skillPaths = await findSkillFiles(skillRoot);
  let fullChars = 0;
  let descriptionChars = 0;
  let descriptionsOver120 = 0;
  for (const path of skillPaths) {
    const text = await readFile(path, "utf8");
    const description = extractFrontmatterDescription(text);
    fullChars += text.length;
    descriptionChars += description.length;
    if (description.length > 120) descriptionsOver120++;
  }

  const catalog: CatalogMetric = {
    skills: skillPaths.length,
    full_chars: fullChars,
    approximate_full_tokens: estimateTokensFromChars(fullChars),
    description_chars: descriptionChars,
    approximate_description_tokens: estimateTokensFromChars(descriptionChars),
    descriptions_over_120_chars: descriptionsOver120,
  };

  return {
    version: "1.0",
    generated_from: relative(process.cwd(), repoRoot) || ".",
    prompts,
    catalog,
    totals: {
      prompt_tokens: prompts.reduce((sum, prompt) => sum + prompt.approximate_tokens, 0),
      catalog_description_tokens: catalog.approximate_description_tokens,
    },
  };
}

export function comparePromptSnapshots(
  before: PromptSnapshot,
  after: PromptSnapshot,
): PromptSnapshotComparison {
  const beforeById = new Map(before.prompts.map((prompt) => [prompt.id, prompt]));
  return {
    prompt_token_delta: after.totals.prompt_tokens - before.totals.prompt_tokens,
    catalog_description_token_delta:
      after.totals.catalog_description_tokens - before.totals.catalog_description_tokens,
    per_prompt: after.prompts.map((prompt) => {
      const previous = beforeById.get(prompt.id)?.approximate_tokens ?? 0;
      return {
        id: prompt.id,
        before: previous,
        after: prompt.approximate_tokens,
        delta: prompt.approximate_tokens - previous,
      };
    }),
  };
}

export function evaluatePromptResult(
  fixture: PromptEvalFixture,
  result: PromptEvalResult,
): PromptEvalVerdict {
  const violations: string[] = [];
  if (result.id !== fixture.id) violations.push("fixture id mismatch");
  if (result.route !== fixture.expected_route) {
    violations.push(`route ${result.route} != ${fixture.expected_route}`);
  }
  if (!fixture.allowed_terminal_states.includes(result.terminal_state)) {
    violations.push(`terminal state ${result.terminal_state} is not allowed`);
  }
  if (result.output_tokens > fixture.max_output_tokens) {
    violations.push(`output tokens ${result.output_tokens} exceed ${fixture.max_output_tokens}`);
  }
  for (const evidence of fixture.required_evidence) {
    if (!result.evidence.includes(evidence)) violations.push(`missing evidence: ${evidence}`);
  }
  return { passed: violations.length === 0, violations };
}

export async function runPromptEvalFixtures(
  fixtures: PromptEvalFixture[],
  adapter: PromptEvalAdapter,
  timeoutMs: number = 30_000,
): Promise<PromptEvalRunItem[]> {
  const items: PromptEvalRunItem[] = [];
  for (const fixture of fixtures) {
    try {
      const result = await withTimeout(adapter.invoke(fixture), timeoutMs);
      items.push({ fixture, result, verdict: evaluatePromptResult(fixture, result) });
    } catch (error) {
      items.push({
        fixture,
        result: null,
        verdict: {
          passed: false,
          violations: [error instanceof Error ? error.message : String(error)],
        },
      });
    }
  }
  return items;
}

export async function loadFixtures(path: string): Promise<PromptEvalFixture[]> {
  return JSON.parse(await readFile(path, "utf8")) as PromptEvalFixture[];
}

function extractFrontmatterDescription(text: string): string {
  if (!text.startsWith("---")) return "";
  const end = text.indexOf("\n---", 3);
  if (end < 0) return "";
  const frontmatter = text.slice(3, end);
  const lines = frontmatter.split("\n");
  const index = lines.findIndex((line) => /^description:\s*/.test(line));
  if (index < 0) return "";
  const first = lines[index].replace(/^description:\s*/, "").trim();
  if (first === ">" || first === "|") {
    const folded: string[] = [];
    for (const line of lines.slice(index + 1)) {
      if (!/^\s+/.test(line)) break;
      folded.push(line.trim());
    }
    return folded.join(" ");
  }
  return first.replace(/^['"]|['"]$/g, "");
}

async function resolveAgentPaths(repoRoot: string): Promise<string[]> {
  const ramAgentRoot = join(repoRoot, ".opencode/agent/core");
  if (await Bun.file(join(ramAgentRoot, "brooks.md")).exists()) {
    const glob = new Bun.Glob("*.md");
    const paths: string[] = [];
    for await (const path of glob.scan({ cwd: ramAgentRoot, onlyFiles: true })) {
      paths.push(`.opencode/agent/core/${path}`);
    }
    return paths.sort();
  }

  const glob = new Bun.Glob("agents/*.md");
  const paths: string[] = [];
  for await (const path of glob.scan({ cwd: repoRoot, onlyFiles: true })) paths.push(path);
  return paths.sort();
}

async function findSkillFiles(root: string): Promise<string[]> {
  const glob = new Bun.Glob("**/SKILL.md");
  const files: string[] = [];
  for await (const path of glob.scan({ cwd: root, absolute: true, onlyFiles: true })) {
    files.push(path);
  }
  return files.sort();
}

function estimateTokens(text: string): number {
  return estimateTokensFromChars(text.length);
}

function estimateTokensFromChars(chars: number): number {
  return Math.ceil(chars / 4);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`prompt eval timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const repoRoot = resolve(args[0] ?? join(import.meta.dir, "../.."));
  const outputFlag = args.indexOf("--write");
  const snapshot = await collectPromptSnapshot(repoRoot);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (outputFlag >= 0) {
    const outputPath = resolve(args[outputFlag + 1]);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized);
    console.log(outputPath);
    return;
  }
  process.stdout.write(serialized);
}

if (import.meta.main) {
  await main();
}
