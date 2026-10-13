import { afterEach, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncCodexSkills } from "./sync-codex-skills.mjs";

const roots: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ram-codex-skills-"));
  roots.push(root);
  for (const name of ["review", "manual-only"]) {
    const directory = join(root, ".opencode/skills", name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "SKILL.md"),
      `---\nname: ${name}\ndescription: Review evidence\n${name === "manual-only" ? "disable-model-invocation: true\n" : ""}---\nRead ../policy.md\n`,
    );
  }
  writeFileSync(join(root, ".opencode/skills/policy.md"), "canonical policy");
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("links canonical content and relative references; excludes invocation-disabled skills", () => {
  const root = fixture();
  expect(syncCodexSkills(root)).toEqual({ errors: [], excluded: ["manual-only"], count: 1 });
  expect(readlinkSync(join(root, "skills/review"))).toBe("../.opencode/skills/review");
  expect(readFileSync(`${root}/skills/review/../policy.md`, "utf8")).toBe("canonical policy");
  expect(syncCodexSkills(root, true).errors).toEqual([]);
});

test("check detects missing and incorrect links without repairing them", () => {
  const root = fixture();
  expect(syncCodexSkills(root, true).errors).toContain("missing generated skills directory");
  syncCodexSkills(root);
  unlinkSync(join(root, "skills/review"));
  symlinkSync("../.opencode/skills/manual-only", join(root, "skills/review"));
  expect(syncCodexSkills(root, true).errors).toContain("stale generated skill link: review");
  expect(readlinkSync(join(root, "skills/review"))).toBe("../.opencode/skills/manual-only");
});

test("generator refuses unmanaged content", () => {
  const root = fixture();
  mkdirSync(join(root, "skills"));
  writeFileSync(join(root, "skills/review"), "human-owned");
  expect(syncCodexSkills(root).errors).toContain("refusing unmanaged skill entry: review");
  expect(readFileSync(join(root, "skills/review"), "utf8")).toBe("human-owned");
});

test("disabled canonical skills are removed from discovery on regeneration", () => {
  const root = fixture();
  syncCodexSkills(root);
  const source = join(root, ".opencode/skills/review/SKILL.md");
  writeFileSync(
    source,
    "---\nname: review\ndescription: Review\ndisable-model-invocation: true\n---\n",
  );
  expect(syncCodexSkills(root, true).errors).toContain("stale generated skill link: review");
  expect(syncCodexSkills(root).errors).toEqual([]);
  expect(syncCodexSkills(root, true).count).toBe(0);
});
