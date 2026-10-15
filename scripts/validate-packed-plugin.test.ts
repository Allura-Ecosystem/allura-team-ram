import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { GENERATED_MARKER } from "./sync-codex-skills.mjs";
import {
  APPROVED_PUBLIC_SKILLS,
  CANONICAL_AGENTS,
  EXPECTED_AGENT_PACKAGE_FILES,
  EXPECTED_CLAUDE_AGENT_MANIFEST,
  EXPECTED_SKILL_PACKAGE_FILES,
  FORBIDDEN_ACTIVATION_SURFACES,
  FORBIDDEN_COMMAND_SURFACES,
  FORBIDDEN_SKILL_CATALOGS,
  validatePackedPlugin,
} from "./validate-packed-plugin.mjs";

const roots: string[] = [];

function json(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture(options: { source?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "ram-packed-plugin-"));
  roots.push(root);
  for (const path of [
    ".codex-plugin",
    ".claude-plugin",
    ".opencode/agent/core",
    ".claude/agents",
    ".claude-plugin/agents",
    ".codex/agents",
    "agents",
    "skills",
  ]) {
    mkdirSync(join(root, path), { recursive: true });
  }

  const portable = {
    name: "team-ram-coding",
    version: "0.6.0",
    skills: "./skills",
    mcpServers: "./.mcp.json",
  };
  if (options.source) mkdirSync(join(root, ".opencode/skills"), { recursive: true });
  const packageFiles = [...EXPECTED_AGENT_PACKAGE_FILES, ...EXPECTED_SKILL_PACKAGE_FILES];
  json(join(root, "package.json"), {
    name: "@allura/team-ram-harness",
    version: "0.6.0",
    files: packageFiles,
  });
  json(join(root, "PUBLIC_EXPORT.json"), {
    categories: { agents: EXPECTED_AGENT_PACKAGE_FILES, skills: EXPECTED_SKILL_PACKAGE_FILES },
    publicRoots: { skills: ["skills/"] },
    packageFiles,
  });
  json(join(root, "plugin.json"), portable);
  json(join(root, ".codex-plugin/plugin.json"), portable);
  json(join(root, ".claude-plugin/plugin.json"), {
    name: "team-ram-harness",
    version: "0.6.0",
    skills: "./skills/",
    agents: EXPECTED_CLAUDE_AGENT_MANIFEST,
  });
  json(join(root, "codex-public-skills.json"), {
    schemaVersion: 1,
    skills: APPROVED_PUBLIC_SKILLS,
  });
  json(join(root, ".mcp.json"), { mcpServers: { "allura-brain": { url: "http://localhost" } } });
  writeFileSync(join(root, "AGENTS.md"), "DAY_BUILD NIGHT_BUILD AUTO\n");

  for (const name of APPROVED_PUBLIC_SKILLS) {
    const content = `---\nname: ${name}\ndescription: Focused ${name} workflow\n---\n# ${name}\n`;
    for (const base of options.source ? [".opencode/skills", "skills"] : ["skills"]) {
      mkdirSync(join(root, base, name), { recursive: true });
      writeFileSync(join(root, base, name, "SKILL.md"), content);
    }
  }
  json(join(root, "skills", GENERATED_MARKER), {
    schemaVersion: 1,
    generated: true,
    source: ".opencode/skills",
    skills: APPROVED_PUBLIC_SKILLS,
  });

  for (const agent of CANONICAL_AGENTS) {
    for (const path of [
      `.opencode/agent/core/${agent}.md`,
      `agents/${agent}.md`,
      `.claude/agents/${agent}.md`,
      `.claude-plugin/agents/${agent}.md`,
      `.codex/agents/${agent}.toml`,
    ]) {
      writeFileSync(join(root, path), `${agent}\n`);
    }
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("accepts an install-shaped plugin with exact materialized public content", () => {
  expect(validatePackedPlugin(fixture(), { artifact: true })).toEqual({ ok: true, errors: [] });
});

test("rejects a packed public skill symlink", () => {
  const root = fixture();
  rmSync(join(root, "skills/code-review"), { recursive: true });
  symlinkSync(join(root, "skills/team-ram-cowork"), join(root, "skills/code-review"), "dir");
  const result = validatePackedPlugin(root, { artifact: true });
  expect(result.ok).toBe(false);
  expect(result.errors.some((error) => error.includes("symlink"))).toBe(true);
});

test("strict artifact validation rejects a leaked Bahari definition", () => {
  const root = fixture();
  writeFileSync(join(root, ".codex/agents/bahari.toml"), 'name = "bahari"\n');
  const result = validatePackedPlugin(root, { artifact: true });
  expect(result.ok).toBe(false);
  expect(result.errors).toContain(
    "artifact agent surface .codex/agents must contain exactly the canonical ten definitions",
  );
});

test("source validation permits internal agents but package allowlisting remains exact", () => {
  const root = fixture({ source: true });
  writeFileSync(join(root, ".codex/agents/bahari.toml"), 'name = "bahari"\n');
  expect(validatePackedPlugin(root)).toEqual({ ok: true, errors: [] });
});

test("rejects Claude manifest agent drift", () => {
  const root = fixture({ source: true });
  json(join(root, ".claude-plugin/plugin.json"), {
    name: "team-ram-harness",
    version: "0.6.0",
    skills: "./skills/",
    agents: [...EXPECTED_CLAUDE_AGENT_MANIFEST, "./agents/bahari.md"],
  });
  const result = validatePackedPlugin(root);
  expect(result.errors).toContain(
    "Claude manifest agents must match the canonical ten in approved order",
  );
});

test("rejects broad agent package globs", () => {
  const root = fixture({ source: true });
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.files = ["agents/**", ...pkg.files];
  json(join(root, "package.json"), pkg);
  const result = validatePackedPlugin(root);
  expect(result.errors).toContain(
    "package files must explicitly allowlist the canonical ten agents only",
  );
});

test("strict artifact validation rejects every secondary skill catalog", () => {
  for (const catalog of FORBIDDEN_SKILL_CATALOGS) {
    const root = fixture();
    mkdirSync(join(root, catalog, "hidden-skill"), { recursive: true });
    writeFileSync(
      join(root, catalog, "hidden-skill", "SKILL.md"),
      "---\nname: hidden-skill\ndescription: Hidden\n---\n",
    );
    const result = validatePackedPlugin(root, { artifact: true });
    expect(result.errors).toContain(
      `artifact contains forbidden secondary skill catalog: ${catalog}`,
    );
  }
});

test("strict artifact validation rejects leaked agent-bahari skill", () => {
  const root = fixture();
  mkdirSync(join(root, "skills/agent-bahari"), { recursive: true });
  writeFileSync(
    join(root, "skills/agent-bahari/SKILL.md"),
    "---\nname: agent-bahari\ndescription: Hidden persona\n---\n",
  );
  const result = validatePackedPlugin(root, { artifact: true });
  expect(result.errors).toContain("artifact contains forbidden agent-bahari skill");
  expect(result.errors).toContain(
    "packed skills directory does not contain exactly the approved ten skills",
  );
});

test("strict artifact validation rejects secondary persona activation surfaces", () => {
  for (const surface of FORBIDDEN_ACTIVATION_SURFACES) {
    const root = fixture();
    if (surface.endsWith(".claude-plugin")) mkdirSync(join(root, surface), { recursive: true });
    else {
      mkdirSync(dirname(join(root, surface)), { recursive: true });
      writeFileSync(join(root, surface), "{}\n");
    }
    const result = validatePackedPlugin(root, { artifact: true });
    expect(result.errors).toContain(
      `artifact contains forbidden secondary activation surface: ${surface}`,
    );
  }
});

test("rejects stale systematic-debugging identity or promotion guidance", () => {
  const root = fixture();
  const skill = join(root, "skills/systematic-debugging-memory/SKILL.md");
  writeFileSync(skill, `${readFileSync(skill, "utf8")}\nmemory_promote({ id: "x" })\n`);
  const result = validatePackedPlugin(root, { artifact: true });
  expect(result.errors).toContain(
    "systematic-debugging-memory contains stale mutation or identity guidance",
  );
});

test("rejects hidden skill catalogs in package and public export contracts", () => {
  const root = fixture({ source: true });
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.files.push(".opencode/skills/**");
  json(join(root, "package.json"), pkg);
  const publicExport = JSON.parse(readFileSync(join(root, "PUBLIC_EXPORT.json"), "utf8"));
  publicExport.packageFiles.push(".opencode/skills/**");
  publicExport.categories.skills.push(".opencode/skills/**");
  json(join(root, "PUBLIC_EXPORT.json"), publicExport);
  const result = validatePackedPlugin(root);
  expect(result.errors).toContain(
    "package files must ship only the materialized root skills catalog",
  );
  expect(result.errors).toContain("PUBLIC_EXPORT skill category must contain only skills/**");
});

test("strict artifact validation rejects every legacy command surface", () => {
  for (const surface of FORBIDDEN_COMMAND_SURFACES) {
    const root = fixture();
    mkdirSync(join(root, surface), { recursive: true });
    writeFileSync(join(root, surface, "legacy.md"), "# Legacy command\n");
    const result = validatePackedPlugin(root, { artifact: true });
    expect(result.errors).toContain(
      `artifact contains forbidden legacy command surface: ${surface}`,
    );
  }
});

test("rejects command declarations in package, export, and Claude manifests", () => {
  const root = fixture({ source: true });
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.files.push(".opencode/command/**");
  json(join(root, "package.json"), pkg);
  const publicExport = JSON.parse(readFileSync(join(root, "PUBLIC_EXPORT.json"), "utf8"));
  publicExport.packageFiles.push(".opencode/command/**");
  publicExport.categories.commands = [".opencode/command/**"];
  publicExport.publicRoots.commands = [".opencode/command/"];
  json(join(root, "PUBLIC_EXPORT.json"), publicExport);
  const claude = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
  claude.commands = ["./.opencode/command/legacy.md"];
  json(join(root, ".claude-plugin/plugin.json"), claude);

  const result = validatePackedPlugin(root);
  expect(result.errors).toContain("package files must not ship legacy commands");
  expect(result.errors).toContain("PUBLIC_EXPORT categories must not declare legacy commands");
  expect(result.errors).toContain("PUBLIC_EXPORT roots must not declare legacy commands");
  expect(result.errors).toContain("Claude manifest must not declare commands");
});
