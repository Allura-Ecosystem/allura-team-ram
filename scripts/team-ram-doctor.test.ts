import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { verifyAgentMirrors } from "./team-ram-doctor.mjs";

const SOURCE_ROOT = resolve(import.meta.dir, "..");
const roots: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ram-doctor-agents-"));
  roots.push(root);
  for (const directory of [
    ".opencode/agent/core",
    ".claude/agents",
    ".claude-plugin/agents",
    ".codex/agents",
    "agents",
    "tooling/agent-sync",
  ]) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  copyFileSync(
    join(SOURCE_ROOT, "tooling/agent-sync/sync-agents.mjs"),
    join(root, "tooling/agent-sync/sync-agents.mjs"),
  );
  copyFileSync(
    join(SOURCE_ROOT, "tooling/agent-sync/models.map.json"),
    join(root, "tooling/agent-sync/models.map.json"),
  );
  copyFileSync(
    join(SOURCE_ROOT, ".opencode/agent/core/brooks.md"),
    join(root, ".opencode/agent/core/brooks.md"),
  );
  const generated = spawnSync(
    process.execPath,
    [join(root, "tooling/agent-sync/sync-agents.mjs"), "--apply"],
    { cwd: root, encoding: "utf8" },
  );
  if (generated.status !== 0) throw new Error(generated.stderr || generated.stdout);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("doctor agent parity detects modified same-named mirror content", () => {
  const root = fixture();
  expect(verifyAgentMirrors(root)).toMatchObject({ level: "content-parity", ok: true });
  const mirror = join(root, ".claude/agents/brooks.md");
  writeFileSync(mirror, `${readFileSync(mirror, "utf8")}\nmodified\n`);
  const result = verifyAgentMirrors(root);
  expect(result.level).toBe("content-parity");
  expect(result.ok).toBe(false);
  expect(result.detail).toContain("DRIFT");
});

test("doctor labels minimal artifacts as presence-only", () => {
  const root = mkdtempSync(join(tmpdir(), "ram-doctor-minimal-"));
  roots.push(root);
  expect(verifyAgentMirrors(root)).toEqual({
    level: "presence-only",
    ok: true,
    detail: "source sync tooling unavailable; exact roster and file presence validated",
  });
});
