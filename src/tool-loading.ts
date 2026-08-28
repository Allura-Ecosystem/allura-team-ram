export type ToolGroup =
  | "repository"
  | "brain-read"
  | "brain-write"
  | "testing"
  | "browser"
  | "design"
  | "deployment";

export interface ToolLoadPlan {
  core: readonly string[];
  deferred_groups: ToolGroup[];
  max_loaded_groups: number;
}

export const CORE_AGENT_TOOLS = [
  "read_file",
  "search_files",
  "allura-brain.memory_search",
  "tool_search",
] as const;

const ROUTE_GROUPS: Record<string, ToolGroup[]> = {
  scout: ["repository", "brain-read"],
  brooks: ["repository", "brain-read"],
  jobs: ["brain-read"],
  woz: ["repository", "testing"],
  pike: ["repository", "testing"],
  fowler: ["repository", "testing"],
  hightower: ["repository", "testing", "deployment"],
  munari: ["repository", "design"],
  glaser: ["repository", "design"],
  "brand-orchestrator": ["brain-read", "design"],
};

export function planToolLoading(task: string, route: string): ToolLoadPlan {
  const groups = new Set<ToolGroup>(ROUTE_GROUPS[route] ?? ["repository"]);

  if (/\b(browser|page|website|screenshot|playwright|chrome)\b/i.test(task)) groups.add("browser");
  if (/\b(figma|penpot|brand|design|visual|logo|typography)\b/i.test(task)) groups.add("design");
  if (/\b(deploy|docker|ci|release|infrastructure|production)\b/i.test(task)) {
    groups.add("deployment");
  }
  if (/\b(test|verify|typecheck|lint|coverage)\b/i.test(task)) groups.add("testing");
  if (/\b(record|receipt|remember|memory write)\b/i.test(task)) groups.add("brain-write");

  return {
    core: CORE_AGENT_TOOLS,
    deferred_groups: [...groups].slice(0, 3),
    max_loaded_groups: 3,
  };
}

export function validateToolLoadPlan(plan: ToolLoadPlan): string[] {
  const errors: string[] = [];
  if (plan.deferred_groups.length > plan.max_loaded_groups) {
    errors.push("deferred tool groups exceed max_loaded_groups");
  }
  if (!plan.core.includes("tool_search")) errors.push("tool_search must remain core");
  if (new Set(plan.deferred_groups).size !== plan.deferred_groups.length) {
    errors.push("deferred tool groups must be unique");
  }
  return errors;
}
