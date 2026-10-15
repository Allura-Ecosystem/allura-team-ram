#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackedPlugin } from "./validate-packed-plugin.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function argumentValues(flag) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1])
      values.push(process.argv[index + 1]);
  }
  return values;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function skillNames(root) {
  if (!existsSync(root)) return [];
  const names = [];
  for (const directory of readdirSync(root)) {
    const skill = resolve(root, directory, "SKILL.md");
    if (!existsSync(skill)) continue;
    const name = readFileSync(skill, "utf8").match(/^name:\s*(.+?)\s*$/m)?.[1];
    if (name) names.push({ name: name.replace(/^['"]|['"]$/g, ""), path: skill });
  }
  return names;
}

function code(error) {
  if (/version|installed/i.test(error)) return "VERSION_DRIFT";
  if (/symlink/i.test(error)) return "SKILL_SYMLINK";
  if (/description/i.test(error)) return "DESCRIPTION_LARGE";
  if (/agent/i.test(error)) return "AGENT_DRIFT";
  if (/mode/i.test(error)) return "MODE_MISSING";
  return "SKILL_MISSING";
}

export function verifyAgentMirrors(root = ROOT) {
  const sync = resolve(root, "tooling/agent-sync/sync-agents.mjs");
  const canonical = resolve(root, ".opencode/agent/core");
  if (!existsSync(sync) || !existsSync(canonical)) {
    return {
      level: "presence-only",
      ok: true,
      detail: "source sync tooling unavailable; exact roster and file presence validated",
    };
  }
  const result = spawnSync(process.execPath, [sync, "--check"], {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    level: "content-parity",
    ok: result.status === 0,
    detail: result.status === 0 ? "agent-sync --check passed" : output || "agent-sync failed",
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: doctor aggregates independent read-only findings in one receipt.
export function diagnose(root = ROOT, installedRoot = null, catalogRoots = []) {
  const validation = validatePackedPlugin(root);
  const findings = validation.errors.map((message) => ({ code: code(message), message }));
  const sourceVersion = readJson(resolve(root, "plugin.json")).version;
  const agentMirrors = verifyAgentMirrors(root);
  if (!agentMirrors.ok) {
    findings.push({
      code: "AGENT_DRIFT",
      message: `agent mirror content drift: ${agentMirrors.detail}`,
    });
  }

  if (installedRoot) {
    const installedManifest = resolve(installedRoot, "plugin.json");
    if (!existsSync(installedManifest)) {
      findings.push({ code: "VERSION_DRIFT", message: "installed root has no plugin.json" });
    } else if (readJson(installedManifest).version !== sourceVersion) {
      findings.push({
        code: "VERSION_DRIFT",
        message: `installed version differs from canonical ${sourceVersion}`,
      });
    }
    const installedValidation = validatePackedPlugin(installedRoot, { artifact: true });
    for (const message of installedValidation.errors) {
      findings.push({ code: code(message), message: `installed: ${message}` });
    }
  }

  const catalogs = [resolve(root, "skills"), ...catalogRoots.map((path) => resolve(path))];
  const declared = new Map();
  for (const catalog of catalogs) {
    for (const skill of skillNames(catalog)) {
      const prior = declared.get(skill.name);
      if (prior) {
        findings.push({
          code: "SKILL_DUPLICATE",
          message: `${skill.name} is declared by ${prior} and ${skill.path}`,
        });
      } else declared.set(skill.name, skill.path);
    }
  }

  const mcp = readJson(resolve(root, ".mcp.json"));
  const brain = mcp.mcpServers?.["allura-brain"]
    ? "configured; live MCP search required for reachability and auth"
    : "not configured";
  return {
    ok: findings.length === 0,
    version: sourceVersion,
    publicSkills: declared.size,
    canonicalAgents: 10,
    agentMirrors,
    modes: ["DAY_BUILD", "NIGHT_BUILD", "AUTO"],
    brain,
    findings,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const installedRoot = argumentValues("--installed-root")[0] ?? null;
  const catalogRoots = argumentValues("--catalog-root");
  const result = diagnose(ROOT, installedRoot, catalogRoots);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
