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
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));

// Runtime → the source trees copied into the host project.
// opencode is the source of truth; claude/codex are generated mirrors.
const RUNTIMES = {
  opencode: [
    ".opencode/agent",
    ".opencode/command",
    ".opencode/skills",
    ".opencode/routing",
    ".opencode/hooks",
    ".opencode/contracts",
    ".opencode/config",
  ],
  claude: [".claude/agents", ".claude/commands", ".claude/skills", ".claude/rules"],
  codex: [".codex/agents"],
};

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

function copyTree(srcTree, targetRoot, force, tally) {
  const absSrc = join(PKG_ROOT, srcTree);
  if (!existsSync(absSrc)) return; // mirror not shipped in this runtime — skip quietly
  const broken = [];
  for (const file of walk(absSrc, [], broken)) {
    const rel = relative(PKG_ROOT, file); // e.g. .opencode/agent/core/brooks.md
    const dest = join(targetRoot, rel);
    if (existsSync(dest) && !force) {
      tally.skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    tally.written.push(rel);
  }
  for (const p of broken) tally.broken.push(relative(PKG_ROOT, p));
}

function init(opts) {
  const selected =
    opts.runtime === "all"
      ? Object.values(RUNTIMES).flat()
      : RUNTIMES[opts.runtime];
  if (!selected) {
    console.error(`Unknown runtime "${opts.runtime}". Choose one of: ${Object.keys(RUNTIMES).join(", ")}, all`);
    process.exit(2);
  }

  const tally = { written: [], skipped: [], broken: [] };
  console.log(`team-ram: scaffolding "${opts.runtime}" harness into ${opts.target}\n`);
  for (const tree of selected) copyTree(tree, opts.target, opts.force, tally);

  console.log(`  wrote   ${tally.written.length} file(s)`);
  if (tally.skipped.length) {
    console.log(`  skipped ${tally.skipped.length} existing file(s) — re-run with --force to overwrite`);
  }
  if (tally.broken.length) {
    console.log(`  ⚠ ${tally.broken.length} dangling symlink(s) skipped (not copied):`);
    for (const b of tally.broken) console.log(`      ${b}`);
  }
  if (!tally.written.length && !tally.skipped.length) {
    console.log("  nothing to copy — is this the right runtime?");
  }
  console.log(`\nNext: point your OpenCode config at the copied .opencode/ tree.`);
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
