#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublicExport } from "./validate-public-export.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv[2];

if (!requested || requested === "--help" || requested === "-h") {
  console.log("Usage: bun run export:public -- <output-directory>");
  console.log("Validates PUBLIC_EXPORT.json, then creates a clean public source export.");
  process.exit(requested ? 0 : 2);
}

const output = resolve(process.cwd(), requested);
if (output === ROOT || ROOT.startsWith(`${output}/`)) {
  console.error("refusing to export over the repository or one of its parents");
  process.exit(2);
}

const validation = validatePublicExport();
if (!validation.ok) process.exit(1);

const shaResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
if (shaResult.status !== 0) throw new Error(shaResult.stderr || "git rev-parse failed");
const sourceCommit = shaResult.stdout.trim();

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of validation.files) {
  const source = resolve(ROOT, file);
  const target = resolve(output, file);
  mkdirSync(dirname(target), { recursive: true });
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) symlinkSync(readlinkSync(source), target);
  else copyFileSync(source, target);
}
copyFileSync(resolve(ROOT, "package.json"), resolve(output, "package.json"));

const provenance = {
  schemaVersion: 1,
  generated: true,
  sourceRepository: "https://github.com/Allura-Ecosystem/allura-team-ram.git",
  sourceCommit,
  manifest: "PUBLIC_EXPORT.json",
  fileCount: validation.files.length,
};
writeFileSync(
  resolve(output, "EXPORT_PROVENANCE.json"),
  `${JSON.stringify(provenance, null, 2)}\n`,
);

console.log(`public export written: ${output}`);
console.log(`source commit: ${sourceCommit}`);
console.log(`files: ${validation.files.length} + package.json + EXPORT_PROVENANCE.json`);
