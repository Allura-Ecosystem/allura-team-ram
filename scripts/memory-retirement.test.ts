import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { guidancePairs, ROOT, syncMemoryGuidance } from "./sync-memory-guidance.mjs";

// Dated evidence and rejection fixtures are not active operational instructions.
const historical = (path: string) =>
  /(^|\/)(archive|decisions)\//.test(path) ||
  /(^|\/)CHANGELOG\.md$/.test(path) ||
  /\/(V1-BLOCKERS-AND-FIXES|v1-blockers|decisions-log)\.md$/.test(path) ||
  path.startsWith("docs/superpowers/");

function staleLines(text: string) {
  return text.split("\n").filter((line) => {
    if (!/neo4j|cypher|GRAPH_DUAL_READ/i.test(line)) return false;
    // Exact authorized retirement sentences, not a broad negative-word bypass.
    return ![
      "Allura uses PostgreSQL and RuVector. Neo4j is permanently retired, not an",
      "Current architecture is PostgreSQL and RuVector. Neo4j is permanently retired;",
    ].includes(line);
  });
}

describe("memory backend retirement", () => {
  test("rejects fallback, credentials, direct recipes, and optimistic health", () => {
    for (const line of [
      "GRAPH_BACKEND=neo4j is fallback only",
      "NEO4J_PASSWORD=...",
      "MCP_DOCKER__read_neo4j_cypher",
      "health.neo4j = 'healthy'",
      "Neo4j is not primary but remains fallback",
      "GRAPH_DUAL_READ=true",
    ])
      expect(staleLines(line)).toEqual([line]);
  });

  test("classifies only explicit historical paths as evidence exclusions", () => {
    expect(historical("docs/decisions/AD-49.md")).toBe(true);
    expect(historical(".opencode/context/project-intelligence/v1-blockers.md")).toBe(true);
    expect(historical(".opencode/agent/core/woz.md")).toBe(false);
    expect(historical(".opencode/skills/allura-memory-skill/SKILL.md")).toBe(false);
  });

  test("canonical roles, memory guidance, lifecycle hooks and generated consumers have no active retired recipes", () => {
    const tracked = execFileSync("git", ["-C", ROOT, "ls-files"], { encoding: "utf8" })
      .trim()
      .split("\n");
    const paths = new Set<string>(guidancePairs().flat());
    for (const path of tracked) {
      if (
        /^(\.opencode\/(agent|skills|context|command|rules|contracts|hooks)\/|\.claude\/(agents|skills|context|commands|rules|contracts)\/|\.agents\/skills\/|\.claude-plugin\/(agents|skills|hooks|commands)\/|\.codex\/agents\/|agents\/|skills\/)/.test(
          path,
        )
      )
        paths.add(path);
    }
    paths.add("src/http-server.ts");
    const failures = [...paths]
      .filter((path) => !historical(path))
      .flatMap((path) =>
        staleLines(readFileSync(resolve(ROOT, path), "utf8")).map((line) => `${path}: ${line}`),
      );
    expect(failures).toEqual([]);
  });

  test("private memory mirrors match canonical sources", () => {
    expect(syncMemoryGuidance(ROOT, true)).toEqual([]);
  });

  test("shared contract preserves governance and transport identity", () => {
    const text = readFileSync(
      resolve(ROOT, ".opencode/skills/allura-memory-skill/SKILL.md"),
      "utf8",
    );
    for (const term of [
      "PostgreSQL",
      "RuVector",
      "append-only",
      "SUPERSEDES",
      "human-governed",
      "authenticated transport",
      "group_id",
      "metadata.source",
    ])
      expect(text).toContain(term);
    expect(text).not.toMatch(/user_id:\s*["'](?:woz|scout|system)/);
  });

  test("public allowlists still exclude private Bahari sources", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.files.some((path: string) => path.includes("bahari"))).toBe(false);
    const contract = JSON.parse(readFileSync(resolve(ROOT, "codex-public-skills.json"), "utf8"));
    expect(contract.skills).toHaveLength(10);
    expect(contract.skills).not.toContain("agent-bahari");
  });

  test("shell helpers fail explicitly without credentials or database probes", () => {
    for (const name of ["smoke-test-memory", "validate-env"]) {
      const path = resolve(ROOT, `.opencode/skills/allura-memory-skill/scripts/${name}.sh`);
      const result = spawnSync("/bin/bash", [path], { env: {}, encoding: "utf8" });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("UNVERIFIED");
      expect(result.stdout).toBe("");
    }
  });

  test("all canonical Team RAM roles defer user identity to transport", () => {
    for (const name of [
      "brooks",
      "jobs",
      "woz",
      "scout",
      "pike",
      "fowler",
      "bellard",
      "carmack",
      "knuth",
      "hightower",
    ]) {
      const text = readFileSync(resolve(ROOT, `.opencode/agent/core/${name}.md`), "utf8");
      expect(text).toContain("authenticated transport supplies the principal");
      expect(text).not.toMatch(/user_id:\s*["']/);
    }
  });
});
