/** Governed retrieval availability, not inferred storage subsystem health. */
import { memory_add, memory_search } from "mcp:allura-memory";
import { normalizeMemorySearch } from "../../src/memory-search-response";

export interface SessionStartParams {
  agentId: string;
  task: string;
  group_id?: string;
}

export interface MemoryStackHealth {
  retrieval: "healthy" | "unreachable";
  postgres: "unverified";
  ruvector: "unverified";
  overall: "unverified";
}

/** A search cannot prove graph health, freshness, or promotion readiness. */
export async function checkMemoryStackHealth(group_id: string): Promise<MemoryStackHealth> {
  let retrieval: MemoryStackHealth["retrieval"] = "unreachable";
  try {
    const result = await memory_search({ group_id, query: "health check probe", limit: 1 });
    normalizeMemorySearch(result);
    retrieval = "healthy";
  } catch {
    console.warn("[Session Hook] Governed retrieval unavailable; subsystem health unverified");
  }
  return { retrieval, postgres: "unverified", ruvector: "unverified", overall: "unverified" };
}

export async function onSessionStart(params: SessionStartParams): Promise<MemoryStackHealth> {
  const { agentId, task, group_id = "allura-system" } = params;
  const health = await checkMemoryStackHealth(group_id);
  try {
    // Transport supplies identity. Persona attribution is content, not an auth assertion.
    await memory_add({
      group_id,
      content: `Session started: ${task}; agent=${agentId}; retrieval=${health.retrieval}; subsystem health unverified`,
      metadata: { source: "conversation" },
    });
  } catch {
    console.warn("[Session Hook] Session logging unavailable");
  }
  return health;
}

export async function scoutPreTaskQuery(
  _agentId: string,
  task: string,
  group_id = "allura-system",
): Promise<unknown[]> {
  try {
    const results = await memory_search({ group_id, query: task, limit: 5 });
    return normalizeMemorySearch(results);
  } catch {
    console.warn("[Scout Hook] Governed retrieval unavailable");
    return [];
  }
}
