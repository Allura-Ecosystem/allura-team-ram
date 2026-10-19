#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC_SKILL_CONTRACT = "codex-public-skills.json";
export const GENERATED_MARKER = ".team-ram-generated-skills.json";
export const MAX_PUBLIC_DESCRIPTION_CHARS = 180;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const value = (key) => {
    const field = match[1].match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
    if (!field) return null;
    return field[1].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  };
  return { raw: match[1], name: value("name"), description: value("description") };
}

function snapshot(directory) {
  const entries = [];
  const visit = (current) => {
    for (const name of readdirSync(current).sort()) {
      const path = resolve(current, name);
      const rel = relative(directory, path);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) entries.push([rel, "symlink", ""]);
      else if (stat.isDirectory()) {
        entries.push([rel, "directory", ""]);
        visit(path);
      } else if (stat.isFile()) {
        entries.push([rel, "file", readFileSync(path).toString("base64")]);
      } else entries.push([rel, "unsupported", ""]);
    }
  };
  visit(directory);
  return JSON.stringify(entries);
}

function readContract(root, errors) {
  const path = resolve(root, PUBLIC_SKILL_CONTRACT);
  if (!existsSync(path)) {
    errors.push(`missing public skill contract: ${PUBLIC_SKILL_CONTRACT}`);
    return [];
  }
  let contract;
  try {
    contract = readJson(path);
  } catch (error) {
    errors.push(`invalid public skill contract: ${error.message}`);
    return [];
  }
  const skills = contract.skills;
  if (contract.schemaVersion !== 1 || !Array.isArray(skills)) {
    errors.push("public skill contract must declare schemaVersion 1 and a skills array");
    return [];
  }
  if (skills.length !== 10) errors.push("public skill contract must contain exactly 10 skills");
  if (new Set(skills).size !== skills.length) errors.push("public skill contract has duplicates");
  for (const name of skills) {
    if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      errors.push(`invalid public skill name: ${String(name)}`);
    }
  }
  return skills;
}

function readMarker(output) {
  const path = resolve(output, GENERATED_MARKER);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink()) return null;
  try {
    const marker = readJson(path);
    return marker.schemaVersion === 1 && Array.isArray(marker.skills) ? marker : null;
  } catch {
    return null;
  }
}

function materialize(directory, source, skills) {
  for (const name of skills) {
    cpSync(resolve(source, name), resolve(directory, name), {
      recursive: true,
      dereference: true,
      errorOnExist: true,
    });
  }
  writeFileSync(
    resolve(directory, GENERATED_MARKER),
    `${JSON.stringify(
      { schemaVersion: 1, generated: true, source: ".opencode/skills", skills },
      null,
      2,
    )}\n`,
  );
}

function stagedErrors(directory, source, skills) {
  const errors = [];
  const expectedEntries = [...skills, GENERATED_MARKER].sort();
  if (JSON.stringify(readdirSync(directory).sort()) !== JSON.stringify(expectedEntries)) {
    errors.push("staged skills differ from the public skill contract");
  }
  const marker = readMarker(directory);
  if (!marker || JSON.stringify(marker.skills) !== JSON.stringify(skills)) {
    errors.push("staged generated marker differs from the public skill contract");
  }
  for (const name of skills) {
    const staged = resolve(directory, name);
    if (snapshot(staged).includes('"symlink"'))
      errors.push(`staged skill contains a symlink: ${name}`);
    if (snapshot(staged) !== snapshot(resolve(source, name))) {
      errors.push(`staged skill differs from canonical source: ${name}`);
    }
  }
  return errors;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: installed checks report every catalog defect in one pass.
function installedArtifactErrors(output, skills) {
  const errors = [];
  if (!existsSync(output) || !lstatSync(output).isDirectory()) {
    return ["missing materialized skills directory"];
  }
  const expectedEntries = [...skills, GENERATED_MARKER].sort();
  if (JSON.stringify(readdirSync(output).sort()) !== JSON.stringify(expectedEntries)) {
    errors.push("installed skills differ from the public skill contract");
  }
  const marker = readMarker(output);
  if (!marker || JSON.stringify(marker.skills) !== JSON.stringify(skills)) {
    errors.push("installed generated marker differs from the public skill contract");
  }
  for (const name of skills) {
    const directory = resolve(output, name);
    const skill = resolve(directory, "SKILL.md");
    if (!existsSync(directory) || !lstatSync(directory).isDirectory() || !existsSync(skill)) {
      errors.push(`missing materialized public skill: ${name}`);
      continue;
    }
    if (snapshot(directory).includes('"symlink"')) {
      errors.push(`materialized public skill contains a symlink: ${name}`);
    }
    const metadata = frontmatter(readFileSync(skill, "utf8"));
    if (!metadata || metadata.name !== name || !metadata.description) {
      errors.push(`invalid materialized public skill frontmatter: ${name}`);
    } else if (metadata.description.length > MAX_PUBLIC_DESCRIPTION_CHARS) {
      errors.push(
        `public skill description exceeds ${MAX_PUBLIC_DESCRIPTION_CHARS} characters: ${name}`,
      );
    }
  }
  return errors;
}

// Canonical prompts remain under .opencode/skills. The portable Codex surface is
// deliberately smaller and materialized so packed/install copies never depend
// on repository-relative symlinks.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one atomic preflight protects generated content before any mutation.
export function syncCodexSkills(root = ROOT, check = false, options = {}) {
  const source = resolve(root, ".opencode/skills");
  const output = resolve(root, "skills");
  const errors = [];
  const skills = readContract(root, errors);
  const allowed = new Set(skills);

  if (!existsSync(source) || !lstatSync(source).isDirectory()) {
    if (check) errors.push(...installedArtifactErrors(output, skills));
    else {
      errors.push(
        "source-only regeneration unavailable: installed artifacts omit canonical .opencode/skills; use --check to validate materialized skills",
      );
    }
    return { errors, excluded: [], count: skills.length };
  }

  for (const name of skills) {
    const directory = resolve(source, name);
    const skill = resolve(directory, "SKILL.md");
    if (!existsSync(skill) || !lstatSync(directory).isDirectory()) {
      errors.push(`missing canonical public skill: ${name}`);
      continue;
    }
    const metadata = frontmatter(readFileSync(skill, "utf8"));
    if (!metadata) {
      errors.push(`missing frontmatter: ${name}`);
      continue;
    }
    if (metadata.name !== name) errors.push(`frontmatter name must match directory: ${name}`);
    if (!metadata.description) errors.push(`missing description: ${name}`);
    else if (metadata.description.length > MAX_PUBLIC_DESCRIPTION_CHARS) {
      errors.push(
        `public skill description exceeds ${MAX_PUBLIC_DESCRIPTION_CHARS} characters: ${name}`,
      );
    }
    if (/^disable-model-invocation:\s*true\s*$/m.test(metadata.raw)) {
      errors.push(`public skill disables model invocation: ${name}`);
    }
    if (snapshot(directory).includes('"symlink"')) {
      errors.push(`canonical public skill contains a symlink: ${name}`);
    }
  }

  if (
    existsSync(output) &&
    (!lstatSync(output).isDirectory() || lstatSync(output).isSymbolicLink())
  ) {
    errors.push("skills must be a real generated directory");
  }
  if (!existsSync(output)) {
    if (check) errors.push("missing generated skills directory");
  }

  const marker = existsSync(output) ? readMarker(output) : null;
  const markerOwns = new Set(marker?.skills ?? []);
  if (existsSync(output)) {
    for (const name of readdirSync(output)) {
      if (name === GENERATED_MARKER) continue;
      const path = resolve(output, name);
      const stat = lstatSync(path);
      if (!allowed.has(name)) {
        if (!stat.isSymbolicLink()) errors.push(`refusing unmanaged skill entry: ${name}`);
        else if (check) errors.push(`unallowlisted legacy skill link: ${name}`);
        continue;
      }
      const canonical = resolve(source, name);
      if (stat.isSymbolicLink()) {
        if (check) errors.push(`public skill must be materialized: ${name}`);
      } else if (!stat.isDirectory()) {
        errors.push(`refusing unmanaged skill entry: ${name}`);
      } else if (snapshot(path) !== snapshot(canonical)) {
        if (markerOwns.has(name)) {
          if (check) errors.push(`stale generated skill directory: ${name}`);
        } else errors.push(`refusing unmanaged skill entry: ${name}`);
      }
    }
  }

  if (check) {
    if (!marker) errors.push(`missing or invalid generated marker: ${GENERATED_MARKER}`);
    else if (JSON.stringify(marker.skills) !== JSON.stringify(skills)) {
      errors.push("generated marker differs from public skill contract");
    }
    for (const name of skills) {
      const path = resolve(output, name);
      if (!existsSync(path)) errors.push(`missing materialized public skill: ${name}`);
    }
    return { errors, excluded: [], count: skills.length };
  }

  if (errors.length) return { errors, excluded: [], count: skills.length };

  const staging = mkdtempSync(resolve(root, ".skills-staging-"));
  const backup = resolve(root, `.skills-backup-${process.pid}-${Date.now()}`);
  let originalMoved = false;
  let stagedInstalled = false;
  try {
    materialize(staging, source, skills);
    const verification = stagedErrors(staging, source, skills);
    if (verification.length) throw new Error(verification.join("; "));
    if (existsSync(output)) {
      renameSync(output, backup);
      originalMoved = true;
      options.afterBackup?.();
    }
    renameSync(staging, output);
    stagedInstalled = true;
    if (originalMoved) rmSync(backup, { recursive: true });
    return { errors: [], excluded: [], count: skills.length };
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    if (stagedInstalled && existsSync(output)) rmSync(output, { recursive: true, force: true });
    if (originalMoved && existsSync(backup)) renameSync(backup, output);
    return {
      errors: [`generated skill swap failed and was rolled back: ${error.message}`],
      excluded: [],
      count: skills.length,
    };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = syncCodexSkills(ROOT, process.argv.includes("--check"));
  for (const error of result.errors) console.error(error);
  console.log(`Codex public skills: ${result.count} materialized from explicit allowlist`);
  process.exitCode = result.errors.length ? 1 : 0;
}
