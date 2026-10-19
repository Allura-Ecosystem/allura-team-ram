#!/usr/bin/env node
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENERATED_MARKER,
  MAX_PUBLIC_DESCRIPTION_CHARS,
  syncCodexSkills,
} from "./sync-codex-skills.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CANONICAL_AGENTS = [
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
];
export const APPROVED_PUBLIC_SKILLS = [
  "team-ram-cowork",
  "allura-memory-skill",
  "multi-search",
  "roundtable",
  "party-mode",
  "allura-menu",
  "systematic-debugging-memory",
  "code-review",
  "team-ram-setup",
  "team-ram-doctor",
];
export const EXPECTED_CLAUDE_AGENT_MANIFEST = CANONICAL_AGENTS.map(
  (agent) => `./agents/${agent}.md`,
);
export const EXPECTED_AGENT_PACKAGE_FILES = [
  ...CANONICAL_AGENTS.map((agent) => `agents/${agent}.md`),
  ...CANONICAL_AGENTS.map((agent) => `.opencode/agent/core/${agent}.md`),
  ...CANONICAL_AGENTS.map((agent) => `.claude/agents/${agent}.md`),
  ...CANONICAL_AGENTS.map((agent) => `.claude-plugin/agents/${agent}.md`),
  ...CANONICAL_AGENTS.map((agent) => `.codex/agents/${agent}.toml`),
];
export const EXPECTED_SKILL_PACKAGE_FILES = ["skills/**"];
export const FORBIDDEN_SKILL_CATALOGS = [
  ".opencode/skills",
  ".agents/skills",
  ".claude/skills",
  ".claude-plugin/skills",
  "bmad-module/skills",
];
export const FORBIDDEN_ACTIVATION_SURFACES = [
  "bmad-module/.claude-plugin",
  ".opencode/config/agent-skills.json",
  ".opencode/config/agent-metadata.json",
];
export const FORBIDDEN_COMMAND_SURFACES = [
  ".opencode/command",
  ".claude/commands",
  ".claude-plugin/commands",
];

const AGENT_SURFACES = [
  { root: "agents", expected: CANONICAL_AGENTS.map((agent) => `${agent}.md`) },
  {
    root: ".opencode/agent",
    expected: CANONICAL_AGENTS.map((agent) => `core/${agent}.md`),
  },
  { root: ".claude/agents", expected: CANONICAL_AGENTS.map((agent) => `${agent}.md`) },
  {
    root: ".claude-plugin/agents",
    expected: CANONICAL_AGENTS.map((agent) => `${agent}.md`),
  },
  { root: ".codex/agents", expected: CANONICAL_AGENTS.map((agent) => `${agent}.toml`) },
];

function readJson(path, errors, label) {
  if (!existsSync(path)) {
    errors.push(`missing ${label}: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`invalid ${label}: ${error.message}`);
    return null;
  }
}

function metadata(path) {
  const source = readFileSync(path, "utf8");
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!block) return null;
  const field = (key) => {
    const value = block.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1];
    return value?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2") ?? null;
  };
  return { name: field("name"), description: field("description") };
}

function findSymlink(directory) {
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return path;
    if (stat.isDirectory()) {
      const nested = findSymlink(path);
      if (nested) return nested;
    }
  }
  return null;
}

function listDefinitions(root, extension) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      const stat = lstatSync(path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile() && name.endsWith(extension)) files.push(relative(root, path));
    }
  };
  visit(root);
  return files.sort();
}

function validateAgentContract(pkg, publicExport, claude, errors) {
  const packageAgents = (pkg?.files ?? []).filter((entry) =>
    [
      "agents/",
      ".opencode/agent/",
      ".claude/agents/",
      ".claude-plugin/agents/",
      ".codex/agents/",
    ].some((prefix) => entry.startsWith(prefix)),
  );
  if (JSON.stringify(packageAgents) !== JSON.stringify(EXPECTED_AGENT_PACKAGE_FILES)) {
    errors.push("package files must explicitly allowlist the canonical ten agents only");
  }
  if (
    JSON.stringify(publicExport?.categories?.agents ?? []) !==
    JSON.stringify(EXPECTED_AGENT_PACKAGE_FILES)
  ) {
    errors.push("PUBLIC_EXPORT agent category must explicitly allowlist the canonical ten agents");
  }
  if (JSON.stringify(publicExport?.packageFiles ?? []) !== JSON.stringify(pkg?.files ?? [])) {
    errors.push("PUBLIC_EXPORT packageFiles differ from package.json files");
  }
  if (JSON.stringify(claude?.agents ?? []) !== JSON.stringify(EXPECTED_CLAUDE_AGENT_MANIFEST)) {
    errors.push("Claude manifest agents must match the canonical ten in approved order");
  }
}

function validateSkillContract(pkg, publicExport, claude, errors) {
  const packageSkills = (pkg?.files ?? []).filter((entry) => /(?:^|\/)skills(?:\/|$)/.test(entry));
  if (JSON.stringify(packageSkills) !== JSON.stringify(EXPECTED_SKILL_PACKAGE_FILES)) {
    errors.push("package files must ship only the materialized root skills catalog");
  }
  if (
    JSON.stringify(publicExport?.categories?.skills ?? []) !==
    JSON.stringify(EXPECTED_SKILL_PACKAGE_FILES)
  ) {
    errors.push("PUBLIC_EXPORT skill category must contain only skills/**");
  }
  if (JSON.stringify(publicExport?.publicRoots?.skills ?? []) !== JSON.stringify(["skills/"])) {
    errors.push("PUBLIC_EXPORT skill root must contain only skills/");
  }
  if (claude?.skills !== "./skills/") {
    errors.push("Claude manifest must advertise only ./skills/");
  }
}

function validateCommandContract(pkg, publicExport, claude, errors) {
  const packageCommands = (pkg?.files ?? []).filter((entry) =>
    FORBIDDEN_COMMAND_SURFACES.some(
      (surface) => entry === surface || entry.startsWith(`${surface}/`),
    ),
  );
  if (packageCommands.length > 0) errors.push("package files must not ship legacy commands");
  if (Object.hasOwn(publicExport?.categories ?? {}, "commands")) {
    errors.push("PUBLIC_EXPORT categories must not declare legacy commands");
  }
  if (Object.hasOwn(publicExport?.publicRoots ?? {}, "commands")) {
    errors.push("PUBLIC_EXPORT roots must not declare legacy commands");
  }
  if (Object.hasOwn(claude ?? {}, "commands")) {
    errors.push("Claude manifest must not declare commands");
  }
}

function validateStrictAgentArtifact(root, errors) {
  for (const surface of AGENT_SURFACES) {
    const actual = listDefinitions(
      resolve(root, surface.root),
      surface.root === ".codex/agents" ? ".toml" : ".md",
    );
    const expected = [...surface.expected].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(
        `artifact agent surface ${surface.root} must contain exactly the canonical ten definitions`,
      );
    }
  }
}

function validateStrictSkillArtifact(root, errors) {
  for (const catalog of FORBIDDEN_SKILL_CATALOGS) {
    if (existsSync(resolve(root, catalog))) {
      errors.push(`artifact contains forbidden secondary skill catalog: ${catalog}`);
    }
  }
  for (const surface of FORBIDDEN_ACTIVATION_SURFACES) {
    if (existsSync(resolve(root, surface))) {
      errors.push(`artifact contains forbidden secondary activation surface: ${surface}`);
    }
  }
  if (existsSync(resolve(root, "skills/agent-bahari"))) {
    errors.push("artifact contains forbidden agent-bahari skill");
  }
}

function validateStrictCommandArtifact(root, errors) {
  for (const surface of FORBIDDEN_COMMAND_SURFACES) {
    if (existsSync(resolve(root, surface))) {
      errors.push(`artifact contains forbidden legacy command surface: ${surface}`);
    }
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this focused validator reports every skill-contract defect in one pass.
function validatePublicSkills(root, errors) {
  const publicRoot = resolve(root, "skills");
  if (!existsSync(publicRoot) || !lstatSync(publicRoot).isDirectory()) {
    errors.push("missing packed skills directory");
    return;
  }
  const entries = readdirSync(publicRoot)
    .filter((name) => name !== GENERATED_MARKER)
    .sort();
  if (JSON.stringify(entries) !== JSON.stringify([...APPROVED_PUBLIC_SKILLS].sort())) {
    errors.push("packed skills directory does not contain exactly the approved ten skills");
  }
  const symlink = findSymlink(publicRoot);
  if (symlink) errors.push(`packed skill content must not contain symlinks: ${symlink}`);
  for (const name of APPROVED_PUBLIC_SKILLS) {
    const skill = resolve(publicRoot, name, "SKILL.md");
    if (!existsSync(skill)) {
      errors.push(`packed skill is missing SKILL.md: ${name}`);
      continue;
    }
    const frontmatter = metadata(skill);
    if (!frontmatter) errors.push(`packed skill has invalid frontmatter: ${name}`);
    else {
      if (frontmatter.name !== name)
        errors.push(`packed skill name differs from directory: ${name}`);
      if (!frontmatter.description) errors.push(`packed skill has no description: ${name}`);
      else if (frontmatter.description.length > MAX_PUBLIC_DESCRIPTION_CHARS) {
        errors.push(`packed skill description exceeds token budget: ${name}`);
      }
    }
    if (name === "systematic-debugging-memory" && existsSync(skill)) {
      const source = readFileSync(skill, "utf8");
      const stalePatterns = [
        /MCP_DOCKER_(?:query_database|insert_data)/,
        /memory_promote/,
        /\buser_id\s*:/,
        /\bagent_id\s*:/,
      ];
      if (stalePatterns.some((pattern) => pattern.test(source))) {
        errors.push("systematic-debugging-memory contains stale mutation or identity guidance");
      }
    }
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the release gate aggregates independent package and artifact contracts.
export function validatePackedPlugin(root = ROOT, options = {}) {
  const errors = [];
  const pkg = readJson(resolve(root, "package.json"), errors, "package manifest");
  const publicExport = readJson(
    resolve(root, "PUBLIC_EXPORT.json"),
    errors,
    "public export contract",
  );
  const portable = readJson(resolve(root, "plugin.json"), errors, "portable plugin manifest");
  const compatibility = readJson(
    resolve(root, ".codex-plugin/plugin.json"),
    errors,
    "Codex compatibility manifest",
  );
  const claude = readJson(
    resolve(root, ".claude-plugin/plugin.json"),
    errors,
    "Claude plugin manifest",
  );
  const contract = readJson(
    resolve(root, "codex-public-skills.json"),
    errors,
    "public skill contract",
  );

  if (portable && compatibility) {
    for (const field of ["name", "version", "skills", "mcpServers"]) {
      if (portable[field] !== compatibility[field]) {
        errors.push(`portable and compatibility manifests differ on ${field}`);
      }
    }
    if (portable.skills !== "./skills") errors.push("portable manifest must advertise ./skills");
    if (portable.mcpServers !== "./.mcp.json") {
      errors.push("portable manifest must advertise ./.mcp.json");
    }
  }
  if (pkg && portable && compatibility && claude) {
    for (const [label, version] of [
      ["portable", portable.version],
      ["compatibility", compatibility.version],
      ["Claude", claude.version],
    ]) {
      if (version !== pkg.version) errors.push(`${label} version differs from package version`);
    }
  }

  validateAgentContract(pkg, publicExport, claude, errors);
  validateSkillContract(pkg, publicExport, claude, errors);
  validateCommandContract(pkg, publicExport, claude, errors);
  if (options.artifact === true) {
    validateStrictAgentArtifact(root, errors);
    validateStrictSkillArtifact(root, errors);
    validateStrictCommandArtifact(root, errors);
  }

  const contractedSkills = contract?.skills ?? [];
  if (JSON.stringify(contractedSkills) !== JSON.stringify(APPROVED_PUBLIC_SKILLS)) {
    errors.push("public skill contract differs from the approved ten-skill allowlist");
  }
  if (options.artifact !== true) errors.push(...syncCodexSkills(root, true).errors);
  validatePublicSkills(root, errors);

  for (const agent of CANONICAL_AGENTS) {
    for (const path of [
      `.opencode/agent/core/${agent}.md`,
      `agents/${agent}.md`,
      `.claude/agents/${agent}.md`,
      `.claude-plugin/agents/${agent}.md`,
      `.codex/agents/${agent}.toml`,
    ]) {
      if (!existsSync(resolve(root, path))) errors.push(`missing canonical agent mirror: ${path}`);
    }
  }

  const roster = existsSync(resolve(root, "AGENTS.md"))
    ? readFileSync(resolve(root, "AGENTS.md"), "utf8")
    : "";
  for (const mode of ["DAY_BUILD", "NIGHT_BUILD", "AUTO"]) {
    if (!roster.includes(mode)) errors.push(`missing execution mode: ${mode}`);
  }
  if (!existsSync(resolve(root, portable?.mcpServers ?? ".mcp.json"))) {
    errors.push("portable manifest advertises missing MCP configuration");
  }

  return { ok: errors.length === 0, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootIndex = process.argv.indexOf("--root");
  const root = rootIndex >= 0 ? resolve(process.argv[rootIndex + 1]) : ROOT;
  const result = validatePackedPlugin(root, { artifact: process.argv.includes("--artifact") });
  if (result.ok) {
    const scope = process.argv.includes("--artifact") ? "artifact" : "source";
    console.log(`packed plugin ${scope} valid: 10 skills, 10 canonical agents, no symlinks`);
  } else {
    console.error(`packed plugin validation failed (${result.errors.length} errors):`);
    for (const error of result.errors) console.error(`- ${error}`);
  }
  process.exitCode = result.ok ? 0 : 1;
}
