#!/usr/bin/env node
// Private source mirrors only. Public packaging remains governed by its ten-skill allowlist.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MEMORY_SKILLS = [
  "agent-brooks",
  "agent-knuth",
  "allura-approve-promotion",
  "allura-architecture",
  "allura-code-review",
  "allura-design",
  "allura-dev-story",
  "allura-graph-debug",
  "allura-health-observability",
  "allura-memory-core",
  "allura-memory-skill",
  "allura-menu",
  "allura-product-intake",
  "allura-propose-promotion",
  "allura-retrospective",
  "allura-team-ram",
  "bmad-sprint-loop",
  "brain-reliability",
  "code-review",
  "mcp-docker",
  "memory-client",
  "memory-hygiene-auditor",
  "multi-search",
  "notion-dreaming-governance",
  "skill-advisor",
  "source-command-end-session",
  "source-command-start-session",
  "systematic-debugging-memory",
];
export const MEMORY_CONTEXT = [
  "core/architecture.md",
  "core/security.md",
  "core/standards.md",
  "core/testing.md",
  "allura/ALLURA-BRAIN-PROMPT.md",
  "project-intelligence/system-authority.md",
  "project-intelligence/informant.md",
  "project-intelligence/navigation.md",
  "project-intelligence/technical-domain.md",
];

function files(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error(`Refusing symlink: ${directory}/${entry.name}`);
    const name = `${prefix}${entry.name}`;
    return entry.isDirectory() ? files(resolve(directory, entry.name), `${name}/`) : [name];
  });
}

export function guidancePairs(root = ROOT) {
  const pairs = [];
  const add = (source, target) => {
    // Do not create new distribution surfaces or expand private role exports.
    if (existsSync(resolve(root, target))) pairs.push([source, target]);
  };
  for (const name of MEMORY_SKILLS) {
    const source = `.opencode/skills/${name}`;
    for (const file of files(resolve(root, source))) {
      for (const mirror of [".agents/skills", ".claude/skills", ".claude-plugin/skills"]) {
        add(`${source}/${file}`, `${mirror}/${name}/${file}`);
      }
    }
  }
  for (const file of MEMORY_CONTEXT) add(`.opencode/context/${file}`, `.claude/context/${file}`);
  for (const name of ["_bootstrap", "agent-routing", "mcp-integration"]) {
    add(`.opencode/rules/${name}.md`, `.claude/rules/${name}.md`);
  }
  for (const name of [
    "analyst",
    "architect",
    "curator-team-promote",
    "mcp-approve",
    "scout",
    "harness-status",
    "orchestrate",
    "start-session",
  ]) {
    add(`.opencode/command/${name}.md`, `.claude/commands/${name}.md`);
  }
  add(".opencode/README.md", ".claude/README.md");
  add(".opencode/contracts/ralph-integration.md", ".claude/contracts/ralph-integration.md");
  return pairs;
}

export function syncMemoryGuidance(root = ROOT, check = true) {
  const drift = [];
  for (const [source, target] of guidancePairs(root)) {
    const expected = readFileSync(resolve(root, source), "utf8");
    if (readFileSync(resolve(root, target), "utf8") === expected) continue;
    drift.push(target);
    if (!check) writeFileSync(resolve(root, target), expected);
  }
  return drift;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = !process.argv.includes("--apply");
  const drift = syncMemoryGuidance(ROOT, check);
  console.log(
    `${guidancePairs().length} private guidance pairs; ${drift.length} ${check ? "drifted" : "updated"}`,
  );
  for (const path of drift) console.log(path);
  process.exitCode = check && drift.length ? 1 : 0;
}
