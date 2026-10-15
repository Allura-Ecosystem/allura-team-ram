import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SOURCE_ROOT = resolve(import.meta.dir, "..");
const root = mkdtempSync(join(tmpdir(), "team-ram-cli-test-"));
const artifact = join(root, "artifact");
const expected = JSON.parse(readFileSync(join(SOURCE_ROOT, "codex-public-skills.json"), "utf8"))
  .skills as string[];

function runCli(runtime: "opencode" | "claude", target: string) {
  return spawnSync(
    process.execPath,
    [join(artifact, "bin/team-ram.mjs"), "init", "--runtime", runtime, "--target", target],
    { cwd: artifact, encoding: "utf8" },
  );
}

function installedSkills(target: string, runtime: "opencode" | "claude"): string[] {
  const directory = join(target, runtime === "opencode" ? ".opencode/skills" : ".claude/skills");
  return readdirSync(directory)
    .filter((name) => existsSync(join(directory, name, "SKILL.md")))
    .sort();
}

beforeAll(() => {
  const result = spawnSync(
    process.execPath,
    [join(SOURCE_ROOT, "scripts/export-public.mjs"), artifact],
    { cwd: SOURCE_ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

for (const runtime of ["opencode", "claude"] as const) {
  test(`packaged CLI scaffolds exactly ten public skills for ${runtime}`, () => {
    const target = join(root, runtime);
    const result = runCli(runtime, target);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("skills  10 copied from the public allowlist");
    expect(installedSkills(target, runtime)).toEqual([...expected].sort());
    expect(existsSync(join(target, ".opencode/command"))).toBe(false);
    expect(existsSync(join(target, ".claude/commands"))).toBe(false);
    expect(existsSync(join(target, ".claude-plugin"))).toBe(false);
    expect(existsSync(join(target, "skills"))).toBe(false);
    expect(existsSync(join(target, ".agents/skills"))).toBe(false);
    expect(existsSync(join(target, "bmad-module"))).toBe(false);
    const bahari =
      runtime === "opencode"
        ? join(target, ".opencode/agent/core/bahari.md")
        : join(target, ".claude/agents/bahari.md");
    expect(existsSync(bahari)).toBe(false);
  });
}

test("packaged CLI fails clearly when the required public skill catalog is missing", () => {
  const broken = join(root, "broken");
  mkdirSync(join(broken, "bin"), { recursive: true });
  copyFileSync(join(SOURCE_ROOT, "bin/team-ram.mjs"), join(broken, "bin/team-ram.mjs"));
  writeFileSync(
    join(broken, "package.json"),
    `${JSON.stringify({ name: "fixture", version: "0.0.0" })}\n`,
  );
  writeFileSync(
    join(broken, "codex-public-skills.json"),
    `${JSON.stringify({ schemaVersion: 1, skills: expected })}\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      join(broken, "bin/team-ram.mjs"),
      "init",
      "--runtime",
      "opencode",
      "--target",
      join(root, "missing"),
    ],
    { cwd: broken, encoding: "utf8" },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("required packaged source is missing: skills");
});
