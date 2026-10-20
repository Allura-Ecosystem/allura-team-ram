import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const source = read(".opencode/agent/core/brooks.md");
const body = (text: string): string => text.replace(/^---\n[\s\S]*?\n---\n/, "")
  .replace(/^\s*<!-- GENERATED[^\n]*-->\n/, "").trim();

test("Brooks's source menu remains authoritative across all runtime mirrors", () => {
  const commands = source.split("## Commands\n")[1].split("\n## ")[0];
  expect([...commands.matchAll(/`([^`]+)`/g)].map(m => m[1])).toEqual([
    "WS", "DG", "CA", "VA", "NX", "GO", "PM", "SK", "DA", "MH",
  ]);
  for (const mirror of ["agents/brooks.md", ".claude/agents/brooks.md", ".claude-plugin/agents/brooks.md"])
    expect(body(read(mirror))).toBe(body(source));
  expect(Bun.TOML.parse(read(".codex/agents/brooks.toml")).developer_instructions.trim()).toBe(body(source));
});

test("activation retains the main lead and separates recalled evidence from judgment", () => {
  const activation = source.split("## Lead activation and continuity\n")[1].split("\n## ")[0];
  for (const term of ["Quoted mentions", "main conversation", "compaction", "until the user changes",
    "one bounded search", "revision, tenant, and authority", "memory ID/date", "current judgment",
    "no relevant memory", "pending retrieval", "unavailable Brain", "no memory write", "clear task proceeds"])
    expect(activation).toContain(term);
  const menu = read("skills/allura-menu/SKILL.md");
  expect(menu).toContain("actual Commands menu from his loaded full role");
  expect(menu).toContain("shared Allura choices remain available under More");
  for (const skill of ["allura-menu", "team-ram-cowork"])
    expect(read(`skills/${skill}/SKILL.md`)).toBe(read(`.opencode/skills/${skill}/SKILL.md`));
});
