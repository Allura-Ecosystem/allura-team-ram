#!/usr/bin/env node
/**
 * Agent sync — single source of truth generator for THREE runtimes.
 *
 * SOURCE OF TRUTH:  .opencode/agent/core/<name>.md   (author here — full Markdown body)
 * GENERATED MIRRORS (never hand-edit):
 *   - .claude/agents/<name>.md     Claude Code (Markdown, tools list, model alias)
 *   - .codex/agents/<name>.toml    Codex CLI  (TOML, developer_instructions = body)
 *
 * The body (everything after the .opencode frontmatter) is copied VERBATIM to every
 * runtime, so Codex / OpenCode / Claude run the identical persona. The only per-runtime
 * differences are (a) the model and (b) the file format.
 *
 * MODEL BINDING differs by runtime:
 *   - opencode / claude  -> model lives in the agent file frontmatter (set from models.map.json)
 *   - codex              -> model is NOT in the agent .toml; it is set in .codex/config.toml
 *                           (profiles) or per-thread. We emit it as a comment for reference only.
 *
 * Usage:
 *   node sync-agents.mjs            # write/refresh mirrors (+ align .opencode source model to map)
 *   node sync-agents.mjs --check    # CI mode: exit 1 if anything is out of sync (no writes)
 *
 * Zero dependencies (Node >= 18, ESM).
 * NOTE: not yet run end-to-end (authored while the shell was unavailable). Run once and eyeball
 * the first generated mirror before trusting the batch — esp. the TOML escaping below.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = resolve(__dirname, "..", "..");
const SRC_DIR = join(HARNESS_ROOT, ".opencode", "agent", "core");
const CLAUDE_DIR = join(HARNESS_ROOT, ".claude", "agents");
const CODEX_DIR = join(HARNESS_ROOT, ".codex", "agents");
const MAP = JSON.parse(readFileSync(join(__dirname, "models.map.json"), "utf8"));

const APPLY = process.argv.includes("--apply"); // write the mirrors
const CI = process.argv.includes("--check"); // CI gate: read-only, exit 1 on drift
// SAFE BY DEFAULT: with neither flag this is a DRY RUN (reports, writes nothing).
const MD_BANNER =
  "<!-- GENERATED — DO NOT EDIT. Source: .opencode/agent/core/%NAME%.md · regen: tooling/agent-sync/sync-agents.mjs -->";
const TOML_BANNER =
  "# GENERATED — DO NOT EDIT. Source: .opencode/agent/core/%NAME%.md · regen: tooling/agent-sync/sync-agents.mjs";
const CLAUDE_DEFAULT_TOOLS = ["Read", "Grep", "Glob", "Bash", "Edit", "Write", "Skill", "Task"];

let drift = 0;
const log = (...a) => console.log(...a);

function split(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  return { fm: m[1], body: m[2] };
}
const fmGet = (fm, k) => {
  const m = fm.match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};
const fmSet = (fm, k, v) =>
  new RegExp(`^${k}:`, "m").test(fm)
    ? fm.replace(new RegExp(`^${k}:.*$`, "m"), `${k}: ${v}`)
    : `${fm}\n${k}: ${v}`;

function writeOrCheck(path, next, label) {
  const cur = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (cur === next) {
    log(`  ✓ ${label}`);
    return;
  }
  drift++;
  if (!APPLY) {
    log(`  ${CI ? "✗ DRIFT" : "~ would write"}: ${label}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
  log(`  → wrote ${label}`);
}

// TOML basic-string escaping for a multi-line value. Codex uses """...""" blocks.
function tomlTriple(body) {
  // A literal """ inside the body would close the string early — escape defensively.
  const safe = body.replace(/"""/g, '\\"\\"\\"');
  return `"""\n${safe}\n"""`;
}

const files = readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));
log(`agent-sync: ${files.length} source agents · runtimes: ${MAP.runtimes.join(", ")}\n`);

for (const file of files) {
  const name = basename(file, ".md").toLowerCase();
  const spec = MAP.agents[name];
  if (!spec) {
    log(`! ${name}: not in models.map.json — skipping`);
    continue;
  }
  const tier = MAP.tiers[spec.tier];
  if (!tier) {
    log(`! ${name}: unknown tier "${spec.tier}" — skipping`);
    continue;
  }

  const srcPath = join(SRC_DIR, file);
  const { fm, body } = split(readFileSync(srcPath, "utf8"));
  const description = (fmGet(fm, "description") ?? "").replace(/^"|"$/g, "");
  log(`• ${name} [${spec.tier}]`);

  // 1) .opencode SOURCE — keep its model aligned to the map (opencode model).
  let srcFm = fmSet(fm, "model", tier.opencode);
  srcFm = srcFm.replace(/^fallback_model:.*$\n?/m, ""); // fallback is a provider-level concern in opencode.jsonc, not a per-agent field
  writeOrCheck(srcPath, `---\n${srcFm}\n---\n${body}`, `.opencode/agent/core/${file}`);

  // 2) .claude MIRROR — Markdown, mapped Claude model, tools list, identical body.
  const claudeFm = [
    `name: ${name}`,
    `description: "${description}"`,
    `mode: ${fmGet(fm, "mode") ?? "primary"}`,
    `persona: ${fmGet(fm, "persona") ?? name}`,
    `category: ${fmGet(fm, "category") ?? "Core"}`,
    `status: ${fmGet(fm, "status") ?? "active"}`,
    `model: ${tier.claude}`,
    `tools:`,
    ...CLAUDE_DEFAULT_TOOLS.map((t) => `  - ${t}`),
  ].join("\n");
  const claudeOut = `---\n${claudeFm}\n---\n\n${MD_BANNER.replace("%NAME%", name)}\n${body}`;
  writeOrCheck(join(CLAUDE_DIR, `${name}.md`), claudeOut, `.claude/agents/${name}.md`);

  // 3) .codex MIRROR — TOML. Body -> developer_instructions. Model is set in .codex/config.toml,
  //    NOT here; we record it as a comment for traceability.
  const codexOut = [
    TOML_BANNER.replace("%NAME%", name),
    `# model (set in .codex/config.toml profile, not here): ${tier.codex}`,
    `name = "${name}"`,
    `description = ${JSON.stringify(description)}`,
    `developer_instructions = ${tomlTriple(body.trim())}`,
    "",
  ].join("\n");
  writeOrCheck(join(CODEX_DIR, `${name}.toml`), codexOut, `.codex/agents/${name}.toml`);
}

const verb = APPLY ? "updated" : CI ? "out of sync" : "would change";
log(`\n${drift === 0 ? "✓ all three runtimes in sync" : `${drift} file(s) ${verb}`}`);
log(
  APPLY
    ? "Re-run codex/opencode to confirm."
    : "Dry run — re-run with --apply to write the mirrors.",
);
process.exit(CI && drift > 0 ? 1 : 0);
