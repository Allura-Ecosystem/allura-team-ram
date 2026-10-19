import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { validateRuntimeIdentities } from "./validate-public-export.mjs";

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

test("Codex manifest matches the public marketplace selector without renaming Claude or package", () => {
  expect(read("plugin.json").name).toBe("team-ram-coding");
  expect(read(".codex-plugin/plugin.json").name).toBe("team-ram-coding");
  expect(read(".claude-plugin/plugin.json").name).toBe("team-ram-harness");
  expect(read("package.json").name).toBe("@allura/team-ram-harness");
});

test("portable and compatibility Codex manifests keep identity and version parity", () => {
  const portable = read("plugin.json");
  const compatibility = read(".codex-plugin/plugin.json");
  expect({ name: portable.name, version: portable.version }).toEqual({
    name: compatibility.name,
    version: compatibility.version,
  });
  expect(portable.skills).toBe("./skills");
  expect(portable.mcpServers).toBe("./.mcp.json");
});

test("export gate rejects mismatched Codex aliases and runtime version drift", () => {
  const source = read("SOURCE.json");
  const pkg = read("package.json");
  const claude = read(".claude-plugin/plugin.json");
  const codex = read(".codex-plugin/plugin.json");
  expect(validateRuntimeIdentities(source, pkg, claude, codex)).toEqual([]);
  expect(validateRuntimeIdentities(source, pkg, claude, { ...codex, name: claude.name })).toContain(
    "Codex manifest name must match the public marketplace alias",
  );
  expect(validateRuntimeIdentities(source, pkg, claude, { ...codex, version: "0.5.0" })).toContain(
    "package and runtime manifest versions must match",
  );
  expect(
    validateRuntimeIdentities({ ...source, runtimeIdentities: {} }, pkg, claude, codex).length,
  ).toBeGreaterThan(0);
});
