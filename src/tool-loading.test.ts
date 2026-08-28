import { describe, expect, test } from "bun:test";
import { CORE_AGENT_TOOLS, planToolLoading, validateToolLoadPlan } from "./tool-loading";

describe("lazy tool loading", () => {
  test("keeps only discovery tools in the core set", () => {
    expect(CORE_AGENT_TOOLS).toEqual([
      "read_file",
      "search_files",
      "allura-brain.memory_search",
      "tool_search",
    ]);
  });

  test("loads repository and Brain read groups for Scout", () => {
    const plan = planToolLoading("find the routing configuration", "scout");
    expect(plan.deferred_groups).toEqual(["repository", "brain-read"]);
    expect(validateToolLoadPlan(plan)).toEqual([]);
  });

  test("loads browser tools only for browser work", () => {
    const normal = planToolLoading("review the TypeScript contract", "pike");
    const browser = planToolLoading("capture a browser screenshot", "pike");
    expect(normal.deferred_groups).not.toContain("browser");
    expect(browser.deferred_groups).toContain("browser");
  });

  test("caps deferred groups at three", () => {
    const plan = planToolLoading(
      "deploy the Figma website, capture browser screenshots, test it, and record a receipt",
      "hightower",
    );
    expect(plan.deferred_groups.length).toBe(3);
    expect(validateToolLoadPlan(plan)).toEqual([]);
  });
});
