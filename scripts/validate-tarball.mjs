#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackedPlugin } from "./validate-packed-plugin.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this release gate reports every scaffold leak in one pass.
function validateScaffold(artifact, temporary) {
  const errors = [];
  const expected = JSON.parse(
    readFileSync(resolve(artifact, "codex-public-skills.json"), "utf8"),
  ).skills;
  for (const runtime of ["opencode", "claude"]) {
    const target = resolve(temporary, `scaffold-${runtime}`);
    const result = spawnSync(
      process.execPath,
      [resolve(artifact, "bin/team-ram.mjs"), "init", "--runtime", runtime, "--target", target],
      { cwd: artifact, encoding: "utf8" },
    );
    if (result.status !== 0) {
      errors.push(
        `packed CLI ${runtime} scaffold failed: ${(result.stderr || result.stdout).trim()}`,
      );
      continue;
    }
    const skillRoot = resolve(
      target,
      runtime === "opencode" ? ".opencode/skills" : ".claude/skills",
    );
    const actual = existsSync(skillRoot)
      ? readdirSync(skillRoot)
          .filter((name) => existsSync(resolve(skillRoot, name, "SKILL.md")))
          .sort()
      : [];
    if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
      errors.push(`packed CLI ${runtime} scaffold did not install the exact public skill set`);
    }
    for (const forbidden of [
      ".opencode/command",
      ".claude/commands",
      ".claude-plugin",
      ".agents/skills",
      "skills",
      "bmad-module",
    ]) {
      if (existsSync(resolve(target, forbidden))) {
        errors.push(`packed CLI ${runtime} scaffold leaked forbidden surface: ${forbidden}`);
      }
    }
    const bahari =
      runtime === "opencode" ? ".opencode/agent/core/bahari.md" : ".claude/agents/bahari.md";
    if (existsSync(resolve(target, bahari))) {
      errors.push(`packed CLI ${runtime} scaffold leaked Bahari`);
    }
  }
  return errors;
}

export function validateTarball(root = ROOT) {
  const temporary = mkdtempSync(join(tmpdir(), "team-ram-tarball-"));
  const source = resolve(temporary, "source");
  const destination = resolve(temporary, "pack");
  const extracted = resolve(temporary, "extracted");
  mkdirSync(destination);
  mkdirSync(extracted);
  try {
    const exported = spawnSync(
      process.execPath,
      [resolve(root, "scripts/export-public.mjs"), source],
      { cwd: root, encoding: "utf8" },
    );
    if (exported.status !== 0) {
      return {
        ok: false,
        errors: [
          `writable public export failed (${exported.status}): ${(exported.stderr || exported.stdout).trim()}`,
        ],
      };
    }
    const packed = spawnSync("bun", ["pm", "pack", "--quiet", "--destination", destination], {
      cwd: source,
      encoding: "utf8",
    });
    if (packed.status !== 0) {
      return {
        ok: false,
        errors: [
          `bun pm pack failed (${packed.status}): ${(packed.stderr || packed.stdout).trim()}`,
        ],
      };
    }
    const archives = readdirSync(destination).filter((name) => name.endsWith(".tgz"));
    if (archives.length !== 1) {
      return { ok: false, errors: [`bun pm pack produced ${archives.length} tarballs`] };
    }
    const unpacked = spawnSync(
      "tar",
      ["-xzf", resolve(destination, archives[0]), "-C", extracted],
      { encoding: "utf8" },
    );
    if (unpacked.status !== 0) {
      return {
        ok: false,
        errors: [`tar extraction failed (${unpacked.status}): ${unpacked.stderr.trim()}`],
      };
    }
    const artifact = resolve(extracted, "package");
    const validation = validatePackedPlugin(artifact, { artifact: true });
    const scaffoldErrors = validation.ok ? validateScaffold(artifact, temporary) : [];
    return {
      ok: validation.ok && scaffoldErrors.length === 0,
      errors: [...validation.errors, ...scaffoldErrors],
      archive: archives[0],
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateTarball(ROOT);
  if (result.ok) {
    console.log(
      `tarball valid: ${result.archive}; strict artifact checks and OpenCode/Claude scaffold smokes passed`,
    );
  } else {
    console.error(`tarball validation failed (${result.errors.length} errors):`);
    for (const error of result.errors) console.error(`- ${error}`);
  }
  process.exitCode = result.ok ? 0 : 1;
}
