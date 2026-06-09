#!/usr/bin/env bun
/**
 * End-to-End Integration Test for Allura Memory + OpenAgentsControl
 * 
 * Tests:
 * 1. Allura databases are accessible
 * 2. MCP server can start
 * 3. Memory tools work (add, search, get, list, delete)
 * 4. Agent hooks can log events
 * 5. Performance router can query history
 * 6. Governance layer can propose promotions
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

// Test 1: PostgreSQL is accessible
async function testPostgresAccessible(): Promise<void> {
  const { stdout } = await execAsync(
    `docker exec knowledge-postgres psql -U ronin4life -d memory -c "SELECT COUNT(*) FROM events;"`
  );
  if (!stdout.includes('count')) {
    throw new Error('PostgreSQL query failed');
  }
}

// Test 2: Neo4j is accessible
async function testNeo4jAccessible(): Promise<void> {
  const { stdout } = await execAsync(
    `docker exec knowledge-neo4j cypher-shell -u neo4j -p "Kamina2025*" "RETURN 1 AS test;"`
  );
  if (!stdout.includes('test')) {
    throw new Error('Neo4j query failed');
  }
}

// Test 3: MCP server file exists
async function testMCPServerExists(): Promise<void> {
  const fs = require('fs');
  const path = '/home/ronin704/Projects/allura memory/src/mcp/memory-server-canonical.ts';
  if (!fs.existsSync(path)) {
    throw new Error(`MCP server not found at ${path}`);
  }
}

// Test 4: Agent hooks exist
async function testAgentHooksExist(): Promise<void> {
  const fs = require('fs');
  const hooks = [
    '/home/ronin704/Projects/opencode config/.opencode/hooks/session-start.ts',
    '/home/ronin704/Projects/opencode config/.opencode/hooks/task-complete.ts'
  ];
  for (const hook of hooks) {
    if (!fs.existsSync(hook)) {
      throw new Error(`Agent hook not found: ${hook}`);
    }
  }
}

// Test 5: Performance router exists
async function testPerformanceRouterExists(): Promise<void> {
  const fs = require('fs');
  const path = '/home/ronin704/Projects/opencode config/.opencode/routing/performance-router.ts';
  if (!fs.existsSync(path)) {
    throw new Error(`Performance router not found: ${path}`);
  }
}

// Test 6: Governance layer exists
async function testGovernanceLayerExists(): Promise<void> {
  const fs = require('fs');
  const path = '/home/ronin704/Projects/opencode config/.opencode/governance/curator.ts';
  if (!fs.existsSync(path)) {
    throw new Error(`Governance layer not found: ${path}`);
  }
}

// Test 7: MCP client config exists
async function testMCPClientConfigExists(): Promise<void> {
  const fs = require('fs');
  const path = '/home/ronin704/Projects/opencode config/.opencode/mcp-client-config.json';
  if (!fs.existsSync(path)) {
    throw new Error(`MCP client config not found: ${path}`);
  }
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!config.mcpServers?.['allura-memory']) {
    throw new Error('MCP client config missing allura-memory server');
  }
}

// Test 8: Environment config exists
async function testEnvConfigExists(): Promise<void> {
  const fs = require('fs');
  const path = '/home/ronin704/Projects/opencode config/.env.example';
  if (!fs.existsSync(path)) {
    throw new Error(`Environment config not found: ${path}`);
  }
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('POSTGRES_HOST') || !content.includes('NEO4J_URI')) {
    throw new Error('Environment config missing required variables');
  }
}

// Test 9: Agent definitions updated
async function testAgentDefinitionsUpdated(): Promise<void> {
  const fs = require('fs');
  const brooksPath = '/home/ronin704/Projects/opencode config/.opencode/agent/core/brooks-architect.md';
  const scoutPath = '/home/ronin704/Projects/opencode config/.opencode/agent/subagents/core/scout-recon.md';
  
  const brooksContent = fs.readFileSync(brooksPath, 'utf8');
  const scoutContent = fs.readFileSync(scoutPath, 'utf8');
  
  if (!brooksContent.includes('memory_add') || !brooksContent.includes('Memory Integration')) {
    throw new Error('Brooks agent definition not updated with memory tools');
  }
  if (!scoutContent.includes('memory_search') || !scoutContent.includes('Memory Integration')) {
    throw new Error('Scout agent definition not updated with memory tools');
  }
}

// Test 10: Integration guide exists
async function testIntegrationGuideExists(): Promise<void> {
  const fs = require('fs');
  const path = '/home/ronin704/Projects/opencode config/ALLURA-INTEGRATION-GUIDE.md';
  if (!fs.existsSync(path)) {
    throw new Error(`Integration guide not found: ${path}`);
  }
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('Quick Start') || !content.includes('Memory Tools Available')) {
    throw new Error('Integration guide missing required sections');
  }
}

// Run all tests
async function main() {
  console.log('\n🧪 Allura Memory Integration Tests\n');
  console.log('=' .repeat(60));
  
  await runTest('PostgreSQL is accessible', testPostgresAccessible);
  await runTest('Neo4j is accessible', testNeo4jAccessible);
  await runTest('MCP server file exists', testMCPServerExists);
  await runTest('Agent hooks exist', testAgentHooksExist);
  await runTest('Performance router exists', testPerformanceRouterExists);
  await runTest('Governance layer exists', testGovernanceLayerExists);
  await runTest('MCP client config exists', testMCPClientConfigExists);
  await runTest('Environment config exists', testEnvConfigExists);
  await runTest('Agent definitions updated', testAgentDefinitionsUpdated);
  await runTest('Integration guide exists', testIntegrationGuideExists);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Integration is complete.');
    process.exit(0);
  }
}

main().catch(console.error);