#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Canonical prompts remain under .opencode/skills. Codex cannot import skills
// whose frontmatter disables model invocation; leave that restriction intact.
export function syncCodexSkills(root = ROOT, check = false) {
  const source = resolve(root, ".opencode/skills");
  const output = resolve(root, "skills");
  const expected = new Map();
  const excluded = [];
  const errors = [];
  for (const name of readdirSync(source).sort()) {
    const skill = resolve(source, name, "SKILL.md");
    if (!existsSync(skill)) continue;
    const target = resolve(source, name);
    if (!realpathSync(target).startsWith(`${realpathSync(source)}/`)) {
      errors.push(`canonical skill escapes source: ${name}`);
      continue;
    }
    const frontmatter = readFileSync(skill, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) {
      errors.push(`missing frontmatter: ${name}`);
      continue;
    }
    if (/^disable-model-invocation:\s*true\s*$/m.test(frontmatter[1])) {
      excluded.push(name);
      continue;
    }
    expected.set(name, relative(output, target));
  }
  if (
    existsSync(output) &&
    (!lstatSync(output).isDirectory() || lstatSync(output).isSymbolicLink())
  ) {
    return {
      errors: ["skills must be a real generated directory"],
      excluded,
      count: expected.size,
    };
  }
  if (!existsSync(output)) {
    if (check)
      return { errors: ["missing generated skills directory"], excluded, count: expected.size };
    mkdirSync(output);
  }
  for (const name of readdirSync(output)) {
    const path = resolve(output, name);
    const stat = lstatSync(path);
    if (!stat.isSymbolicLink()) {
      errors.push(`refusing unmanaged skill entry: ${name}`);
      continue;
    }
    const wanted = expected.get(name);
    if (wanted && readlinkSync(path) === wanted) continue;
    if (check) errors.push(`stale generated skill link: ${name}`);
    else unlinkSync(path);
  }
  for (const [name, target] of expected) {
    const path = resolve(output, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (stat) {
      if (!stat.isSymbolicLink() || readlinkSync(path) !== target) {
        if (!errors.some((error) => error.endsWith(`: ${name}`)))
          errors.push(`invalid generated skill link: ${name}`);
      }
      continue;
    }
    if (check) errors.push(`missing generated skill link: ${name}`);
    else symlinkSync(target, path, "dir");
  }
  return { errors, excluded, count: expected.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = syncCodexSkills(ROOT, process.argv.includes("--check"));
  for (const error of result.errors) console.error(error);
  console.log(
    `Codex skills: ${result.count} linked; invocation-disabled exclusions: ${result.excluded.join(", ") || "none"}`,
  );
  process.exitCode = result.errors.length ? 1 : 0;
}
