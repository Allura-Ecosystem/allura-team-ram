#!/usr/bin/env node
/**
 * team-ram — Team RAM harness CLI.
 *
 * `init` scaffolds the harness into a host project. This is an EXPLICIT command,
 * never a postinstall hook — per the repo's bun-security policy, a package must
 * not run code on install. The user opts in by running `team-ram init`.
 *
 * Dependency-free ESM (node: builtins only) so it runs under both `npx` and
 * `bunx` without a toolchain.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));

// Runtime → packaged source trees and their native scaffold destinations.
// The root materialized catalog is the only shipped skill source.
const RUNTIMES = {
  opencode: [
    { source: "skills", target: ".opencode/skills", required: true, kind: "skills" },
    { source: ".opencode/agent", target: ".opencode/agent" },
    { source: ".opencode/routing", target: ".opencode/routing" },
    { source: ".opencode/hooks", target: ".opencode/hooks" },
    { source: ".opencode/contracts", target: ".opencode/contracts" },
  ],
  claude: [
    { source: "skills", target: ".claude/skills", required: true, kind: "skills" },
    { source: ".claude/agents", target: ".claude/agents" },
    { source: ".claude/rules", target: ".claude/rules" },
  ],
  codex: [{ source: ".codex/agents", target: ".codex/agents" }],
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: compact dependency-free CLI parsing keeps the public entry point self-contained.
function parseArgs(argv) {
  const opts = { target: process.cwd(), runtime: "opencode", force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target" || a === "-t") opts.target = resolve(argv[++i]);
    else if (a === "--runtime" || a === "-r") opts.runtime = argv[++i];
    else if (a === "--force" || a === "-f") opts.force = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--version" || a === "-v") opts.version = true;
    else opts._unknown = a;
  }
  return opts;
}

function walk(dir, out = [], broken = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p); // follows symlinks — throws on a dangling one
    } catch {
      broken.push(p); // dangling symlink or unreadable entry — never crash the scaffold
      continue;
    }
    if (st.isDirectory()) walk(p, out, broken);
    else out.push(p);
  }
  return out;
}

function publicSkillNames() {
  const contract = join(PKG_ROOT, "codex-public-skills.json");
  if (!existsSync(contract)) return null;
  try {
    const skills = JSON.parse(readFileSync(contract, "utf8")).skills;
    return Array.isArray(skills) ? skills : null;
  } catch {
    return null;
  }
}

function preflight(entry) {
  const absSrc = join(PKG_ROOT, entry.source);
  if (!existsSync(absSrc)) {
    return entry.required ? `required packaged source is missing: ${entry.source}` : null;
  }
  if (entry.kind !== "skills") return null;
  const expected = publicSkillNames();
  if (!expected) return "public skill contract is missing or invalid";
  const actual = readdirSync(absSrc)
    .filter((name) => existsSync(join(absSrc, name, "SKILL.md")))
    .sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    return `packaged skills must contain exactly ${expected.length} allowlisted entries`;
  }
  return null;
}

function copyTree(entry, targetRoot, force, tally) {
  const absSrc = join(PKG_ROOT, entry.source);
  if (!existsSync(absSrc)) return; // mirror not shipped in this runtime — skip quietly
  const broken = [];
  for (const file of walk(absSrc, [], broken)) {
    const rel = relative(absSrc, file);
    const destinationRelative = join(entry.target, rel);
    const dest = join(targetRoot, destinationRelative);
    if (existsSync(dest) && !force) {
      tally.skipped.push(destinationRelative);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    tally.written.push(destinationRelative);
    if (entry.kind === "skills" && basename(file) === "SKILL.md") {
      tally.skills += 1;
    }
  }
  for (const p of broken) tally.broken.push(relative(absSrc, p));
}

function init(opts) {
  const selected = opts.runtime === "all" ? Object.values(RUNTIMES).flat() : RUNTIMES[opts.runtime];
  if (!selected) {
    console.error(
      `Unknown runtime "${opts.runtime}". Choose one of: ${Object.keys(RUNTIMES).join(", ")}, all`,
    );
    process.exit(2);
  }

  const preflightErrors = selected.map(preflight).filter(Boolean);
  if (preflightErrors.length) {
    console.error("team-ram: scaffold preflight failed:");
    for (const error of preflightErrors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  const tally = { written: [], skipped: [], broken: [], skills: 0 };
  console.log(`team-ram: scaffolding "${opts.runtime}" harness into ${opts.target}\n`);
  for (const entry of selected) copyTree(entry, opts.target, opts.force, tally);

  console.log(`  wrote   ${tally.written.length} file(s)`);
  console.log(`  skills  ${tally.skills} copied from the public allowlist`);
  if (tally.skipped.length) {
    console.log(
      `  skipped ${tally.skipped.length} existing file(s) — re-run with --force to overwrite`,
    );
  }
  if (tally.broken.length) {
    console.log(`  ⚠ ${tally.broken.length} dangling symlink(s) skipped (not copied):`);
    for (const b of tally.broken) console.log(`      ${b}`);
  }
  if (!tally.written.length && !tally.skipped.length) {
    console.log("  nothing to copy — is this the right runtime?");
  }
  console.log(`\nNext: configure ${opts.runtime} to use the copied runtime surface.`);
}

const HELP = `team-ram ${pkg.version} — ${pkg.description ?? "Team RAM harness"}

Usage:
  team-ram init [options]     Scaffold the harness into a project

Options:
  -t, --target <dir>          Target project directory (default: cwd)
  -r, --runtime <name>        opencode | claude | codex | all (default: opencode)
  -f, --force                 Overwrite existing files
  -h, --help                  Show this help
  -v, --version               Show version

This CLI never runs on install. Scaffolding happens only when you run
\`team-ram init\` explicitly.`;

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = parseArgs(cmd && !cmd.startsWith("-") ? rest : process.argv.slice(2));

  if (opts.version) return console.log(pkg.version);
  if (opts.help || !cmd || cmd === "help") return console.log(HELP);

  if (cmd === "init") return init(opts);

  console.error(`Unknown command "${cmd}".\n`);
  console.log(HELP);
  process.exit(2);
}

main();
