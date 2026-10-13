#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncCodexSkills } from "./sync-codex-skills.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = resolve(ROOT, "PUBLIC_EXPORT.json");
const SOURCE_PATH = resolve(ROOT, "SOURCE.json");
const PACKAGE_PATH = resolve(ROOT, "package.json");

export function globRegex(pattern) {
  const marker = "__DOUBLE_STAR__";
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", marker)
    .replaceAll("*", "[^/]*")
    .replaceAll(marker, ".*")
    .replaceAll("?", "[^/]");
  return new RegExp(`^${escaped}$`);
}

export function matches(path, pattern) {
  return globRegex(pattern).test(path);
}

export function validateRuntimeIdentities(source, pkg, claude, codex) {
  const identity = source.runtimeIdentities ?? {};
  const errors = [];
  for (const [field, actual] of [
    ["packageName", pkg.name],
    ["claudeManifestName", claude.name],
    ["codexManifestName", codex.name],
  ]) {
    if (!identity[field] || identity[field] !== actual) {
      errors.push(`${field} must match SOURCE.json runtimeIdentities`);
    }
  }
  if (!identity.codexMarketplaceAlias || codex.name !== identity.codexMarketplaceAlias) {
    errors.push("Codex manifest name must match the public marketplace alias");
  }
  if (!pkg.version || claude.version !== pkg.version || codex.version !== pkg.version) {
    errors.push("package and runtime manifest versions must match");
  }
  return errors;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function trackedFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || "git ls-files failed");
  return result.stdout.split("\0").filter(Boolean).sort();
}

export function validatePublicExport() {
  const manifest = readJson(MANIFEST_PATH);
  const source = readJson(SOURCE_PATH);
  const pkg = readJson(PACKAGE_PATH);
  const tracked = trackedFiles();
  const errors = [
    ...syncCodexSkills(ROOT, true).errors,
    ...validateRuntimeIdentities(
      source,
      pkg,
      readJson(resolve(ROOT, ".claude-plugin/plugin.json")),
      readJson(resolve(ROOT, ".codex-plugin/plugin.json")),
    ),
  ];

  if (manifest.canonicalRepository !== source.repository) {
    errors.push("PUBLIC_EXPORT.json canonicalRepository differs from SOURCE.json repository");
  }
  if (source.canonical !== true || source.authority?.manifest !== "PUBLIC_EXPORT.json") {
    errors.push(
      "SOURCE.json must declare canonical=true and authority.manifest=PUBLIC_EXPORT.json",
    );
  }
  if (source.downstream?.consumer !== manifest.consumer) {
    errors.push("PUBLIC_EXPORT.json consumer differs from SOURCE.json downstream.consumer");
  }

  const categoryEntries = Object.entries(manifest.categories ?? {});
  if (categoryEntries.length === 0) errors.push("manifest has no categories");

  const categoryFiles = new Map();
  for (const [category, patterns] of categoryEntries) {
    if (!Array.isArray(patterns) || patterns.length === 0) {
      errors.push(`category ${category} has no patterns`);
      continue;
    }
    const files = new Set();
    for (const pattern of patterns) {
      if (typeof pattern !== "string" || pattern.startsWith("/") || pattern.includes("..")) {
        errors.push(`category ${category} has unsafe pattern: ${String(pattern)}`);
        continue;
      }
      const hits = tracked.filter((file) => matches(file, pattern));
      if (hits.length === 0)
        errors.push(`category ${category} pattern matches no tracked file: ${pattern}`);
      for (const hit of hits) files.add(hit);
    }
    categoryFiles.set(category, files);
  }

  for (const [category, roots] of Object.entries(manifest.publicRoots ?? {})) {
    const allowed = categoryFiles.get(category) ?? new Set();
    for (const root of roots) {
      const rooted = tracked.filter((file) => file.startsWith(root));
      if (rooted.length === 0) errors.push(`public root has no tracked files: ${category}:${root}`);
      for (const file of rooted) {
        if (!allowed.has(file)) errors.push(`unclassified ${category} source: ${file}`);
      }
    }
  }

  if (JSON.stringify(pkg.files) !== JSON.stringify(manifest.packageFiles)) {
    errors.push(
      "package.json files must exactly equal PUBLIC_EXPORT.json packageFiles (including order)",
    );
  }

  const packageSet = new Set();
  for (const pattern of manifest.packageFiles ?? []) {
    const hits = tracked.filter((file) => matches(file, pattern));
    if (hits.length === 0) errors.push(`packageFiles pattern matches no tracked file: ${pattern}`);
    for (const hit of hits) packageSet.add(hit);
  }

  for (const [category, files] of categoryFiles) {
    for (const file of files) {
      if (!packageSet.has(file)) errors.push(`${category} file is not in packageFiles: ${file}`);
    }
  }

  if (errors.length) {
    console.error(
      `public export validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    return { ok: false, errors, files: [] };
  }

  console.log(
    `public export valid: ${packageSet.size} tracked files across ${categoryEntries.length} categories`,
  );
  return { ok: true, errors: [], files: [...packageSet].sort() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePublicExport();
  process.exitCode = result.ok ? 0 : 1;
}
