import { afterEach, expect, test } from "bun:test";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GENERATED_MARKER, syncCodexSkills } from "./sync-codex-skills.mjs";

const PUBLIC_SKILLS = [
  "team-ram-cowork",
  "allura-memory-skill",
  "multi-search",
  "roundtable",
  "party-mode",
  "allura-menu",
  "systematic-debugging-memory",
  "code-review",
  "team-ram-setup",
  "team-ram-doctor",
];

const roots: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ram-codex-skills-"));
  roots.push(root);
  writeFileSync(
    join(root, "codex-public-skills.json"),
    `${JSON.stringify({ schemaVersion: 1, skills: PUBLIC_SKILLS })}\n`,
  );
  for (const name of PUBLIC_SKILLS) {
    const directory = join(root, ".opencode/skills", name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "SKILL.md"),
      `---\nname: ${name}\ndescription: Focused ${name} workflow\n---\n# ${name}\n`,
    );
  }
  writeFileSync(join(root, ".opencode/skills/code-review/reference.md"), "review policy");
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("materializes only the ten explicitly allowlisted skills", () => {
  const root = fixture();
  expect(syncCodexSkills(root)).toEqual({ errors: [], excluded: [], count: 10 });
  expect(lstatSync(join(root, "skills/code-review")).isDirectory()).toBe(true);
  expect(lstatSync(join(root, "skills/code-review")).isSymbolicLink()).toBe(false);
  expect(readFileSync(join(root, "skills/code-review/reference.md"), "utf8")).toBe("review policy");
  expect(JSON.parse(readFileSync(join(root, "skills", GENERATED_MARKER), "utf8")).skills).toEqual(
    PUBLIC_SKILLS,
  );
  expect(syncCodexSkills(root, true).errors).toEqual([]);
});

test("check detects a missing generated directory without repairing it", () => {
  const root = fixture();
  expect(syncCodexSkills(root, true).errors).toContain("missing generated skills directory");
  expect(() => lstatSync(join(root, "skills"))).toThrow();
});

test("generator refuses unmanaged content", () => {
  const root = fixture();
  mkdirSync(join(root, "skills"));
  writeFileSync(join(root, "skills/custom"), "human-owned");
  expect(syncCodexSkills(root).errors).toContain("refusing unmanaged skill entry: custom");
  expect(readFileSync(join(root, "skills/custom"), "utf8")).toBe("human-owned");
});

test("legacy generated links are replaced by materialized allowlisted content", () => {
  const root = fixture();
  mkdirSync(join(root, "skills"));
  symlinkSync("../.opencode/skills/code-review", join(root, "skills/code-review"));
  expect(syncCodexSkills(root).errors).toEqual([]);
  expect(lstatSync(join(root, "skills/code-review")).isSymbolicLink()).toBe(false);
  expect(syncCodexSkills(root, true).count).toBe(10);
});

test("check detects generated content that is stale against canonical source", () => {
  const root = fixture();
  syncCodexSkills(root);
  writeFileSync(
    join(root, ".opencode/skills/code-review/SKILL.md"),
    "---\nname: code-review\ndescription: Updated review\n---\n",
  );
  expect(syncCodexSkills(root, true).errors).toContain(
    "stale generated skill directory: code-review",
  );
});

test("failed staged swap restores the previous generated tree", () => {
  const root = fixture();
  syncCodexSkills(root);
  const generated = join(root, "skills/code-review/SKILL.md");
  const before = readFileSync(generated, "utf8");
  writeFileSync(
    join(root, ".opencode/skills/code-review/SKILL.md"),
    "---\nname: code-review\ndescription: Updated review\n---\n",
  );

  const result = syncCodexSkills(root, false, {
    afterBackup: () => {
      throw new Error("injected swap failure");
    },
  });

  expect(result.errors[0]).toContain("rolled back");
  expect(readFileSync(generated, "utf8")).toBe(before);
  expect(
    readdirSync(root).filter(
      (name) => name.startsWith(".skills-staging-") || name.startsWith(".skills-backup-"),
    ),
  ).toEqual([]);
});

test("installed artifact check validates materialized skills without canonical sources", () => {
  const root = fixture();
  expect(syncCodexSkills(root).errors).toEqual([]);
  rmSync(join(root, ".opencode"), { recursive: true });
  expect(syncCodexSkills(root, true).errors).toEqual([]);
  expect(syncCodexSkills(root).errors).toContain(
    "source-only regeneration unavailable: installed artifacts omit canonical .opencode/skills; use --check to validate materialized skills",
  );
});
