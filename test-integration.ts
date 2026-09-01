#!/usr/bin/env bun
/**
 * Integration smoke test for the Team RAM harness (allura-team-ram).
 *
 * Verifies the harness wiring that lives IN THIS REPO plus the optional governed
 * Allura Brain gateway boundary. It does NOT reach into sibling repositories or
 * touch databases directly. An unreachable optional gateway is reported as
 * standalone degraded mode; a reachable but unhealthy gateway remains a failure.
 *
 * All paths are resolved relative to this file, so the test is machine-agnostic.
 * (Rewritten 2026-07-04: the prior version hardcoded a former machine's layout —
 *  /home/ronin704/Projects/opencode config — and pre-split agent names, so it
 *  failed 9/10 regardless of harness state.)
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir);
const BRAIN_GATEWAY =
  process.env.ALLURA_BRAIN_GATEWAY || process.env.ALLURA_MCP_URL || "http://127.0.0.1:5888";
const REQUIRE_BRAIN = process.env.REQUIRE_ALLURA_BRAIN === "1";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
    console.log(`❌ ${name}: ${errorMsg}`);
  }
}

function requireFile(relPath: string): string {
  const path = resolve(ROOT, relPath);
  if (!existsSync(path)) {
    throw new Error(`Expected file not found: ${relPath}`);
  }
  return path;
}

// Test 1: Allura Brain is optional, but a reachable gateway must be healthy.
async function testBrainGatewayHealthy(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BRAIN_GATEWAY}/health`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    if (!REQUIRE_BRAIN) {
      console.warn(
        `⚠️  Allura Brain unavailable; standalone degraded mode active (${String(error)})`,
      );
      return;
    }
    throw error;
  }
  if (!res.ok) {
    throw new Error(`Brain gateway ${BRAIN_GATEWAY}/health returned ${res.status}`);
  }
  const body = (await res.json()) as { status?: string };
  if (body.status !== "healthy") {
    throw new Error(`Brain gateway status is "${body.status}", expected "healthy"`);
  }
}

// Test 2: Agent lifecycle hooks exist
async function testAgentHooksExist(): Promise<void> {
  requireFile(".opencode/hooks/session-start.ts");
  requireFile(".opencode/hooks/task-complete.ts");
}

// Test 3: Performance router exists
async function testPerformanceRouterExists(): Promise<void> {
  requireFile(".opencode/routing/performance-router.ts");
}

// Test 4: Governance layer exists
async function testGovernanceLayerExists(): Promise<void> {
  requireFile(".opencode/governance/curator.ts");
}

// Test 5: MCP client config declares the allura-memory server
async function testMCPClientConfig(): Promise<void> {
  const path = requireFile(".opencode/mcp-client-config.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  const servers = config.mcpServers ?? config.mcp ?? {};
  if (!servers["allura-memory"] && !servers["allura-brain"]) {
    throw new Error("MCP client config missing an allura-memory / allura-brain server");
  }
}

// Test 6: Environment example documents the governed remote MCP boundary.
async function testEnvExample(): Promise<void> {
  const path = requireFile(".env.example");
  const content = readFileSync(path, "utf8");
  for (const required of ["ALLURA_MCP_URL", "ALLURA_MCP_TOKEN", "DEFAULT_GROUP_ID"]) {
    if (!content.includes(required)) {
      throw new Error(`.env.example missing ${required}`);
    }
  }
  if (/POSTGRES_|NEO4J_/i.test(content)) {
    throw new Error(".env.example must not expose direct database configuration");
  }
}

// Test 7: Memory is an optional integration skill, not embedded role authority.
async function testOptionalMemoryIntegration(): Promise<void> {
  const skill = readFileSync(requireFile(".agents/skills/allura-memory-skill/SKILL.md"), "utf8");
  if (!/Allura (Memory|Brain)|memory_search|memory_add/i.test(skill)) {
    throw new Error("Optional Allura Memory integration skill is missing its contract markers");
  }
  requireFile(".opencode/agent/core/brooks.md");
  requireFile(".opencode/agent/core/scout.md");
}

// Test 8: Model tier map is the single machine authority and stays parseable
async function testModelsMapAuthority(): Promise<void> {
  const path = requireFile("tooling/agent-sync/models.map.json");
  const map = JSON.parse(readFileSync(path, "utf8"));
  for (const [name, spec] of Object.entries<{ tier?: string }>(map.agents ?? {})) {
    const tier = spec.tier;
    if (!tier || !map.tiers?.[tier]) {
      throw new Error(`Agent "${name}" references unknown tier "${tier}"`);
    }
  }
}

async function main() {
  console.log("\n🧪 Team RAM Harness Integration Tests\n");
  console.log("=".repeat(60));

  await runTest("Allura Brain is healthy when reachable", testBrainGatewayHealthy);
  await runTest("Agent lifecycle hooks exist", testAgentHooksExist);
  await runTest("Performance router exists", testPerformanceRouterExists);
  await runTest("Governance layer exists", testGovernanceLayerExists);
  await runTest("MCP client config declares memory server", testMCPClientConfig);
  await runTest(".env.example documents remote MCP boundary", testEnvExample);
  await runTest("Optional memory integration skill is available", testOptionalMemoryIntegration);
  await runTest("Model tier map is coherent", testModelsMapAuthority);

  console.log(`\n${"=".repeat(60)}`);
  console.log("\n📊 Test Results\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total: ${total} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n✅ All harness integration checks passed.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
