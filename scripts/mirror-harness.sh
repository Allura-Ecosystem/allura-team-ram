#!/usr/bin/env bash
# mirror-harness.sh — Apply harness updates from opencode-config to allura-memory
# Usage: bash scripts/mirror-harness.sh
# 
# This script mirrors the same changes made to the opencode-config project
# to the allura-memory project path.

set -euo pipefail

SOURCE="/home/ronin704/Projects/opencode config"
TARGET="/home/ronin704/Projects/allura memory"

echo "=== Mirror Harness: opencode-config → allura-memory ==="
echo ""

# ── 1. Merge opencode.json (preserve target-specific fields) ──
echo "1. Merging opencode.json..."
if [ -f "$TARGET/opencode.json" ]; then
  # Preserve target-specific fields (default_agent, autoupdate, permission)
  # while adding/overwriting mcp section from source
  python3 -c "
import json, sys
with open('$SOURCE/opencode.json') as f:
    src = json.load(f)
with open('$TARGET/opencode.json') as f:
    tgt = json.load(f)
# Merge: source provides mcp, target keeps its own default_agent/autoupdate/permission
tgt['mcp'] = src.get('mcp', {})
if 'model' in src:
    tgt['model'] = src['model']
if '\$schema' in src:
    tgt['\$schema'] = src['\$schema']
with open('$TARGET/opencode.json', 'w') as f:
    json.dump(tgt, f, indent=2)
    f.write('\n')
print('   Merged (preserved target default_agent/autoupdate/permission)')
"
else
  cp "$SOURCE/opencode.json" "$TARGET/opencode.json"
  echo "   Created new opencode.json"
fi

# ── 2. Copy agent-skills.json ──
echo "2. Copying agent-skills.json..."
cp "$SOURCE/.opencode/config/agent-skills.json" "$TARGET/.opencode/config/agent-skills.json"
echo "   Done."

# ── 3. Copy all 10 agent files ──
echo "3. Copying agent files..."
for agent in brooks.md woz.md scout.md jobs.md hightower.md bellard.md carmack.md knuth.md fowler.md pike.md; do
  cp "$SOURCE/.opencode/agent/$agent" "$TARGET/.opencode/agent/$agent"
  echo "   Copied $agent"
done

# ── 4. Verify ──
echo ""
echo "4. Verifying..."
echo ""

# Check permission blocks
PERM_COUNT=0
for agent in brooks.md woz.md scout.md jobs.md hightower.md bellard.md carmack.md knuth.md fowler.md pike.md; do
  count=$(grep -c "MCP_DOCKER" "$TARGET/.opencode/agent/$agent" 2>/dev/null || echo "0")
  echo "   $agent: $count MCP_DOCKER permission lines"
  if [ "$count" -gt 0 ]; then
    PERM_COUNT=$((PERM_COUNT + 1))
  fi
done

echo ""
echo "   Agents with MCP_DOCKER permissions: $PERM_COUNT / 10"

# Check Memory Protocol sections
MEM_COUNT=0
for agent in brooks.md woz.md scout.md jobs.md hightower.md bellard.md carmack.md knuth.md fowler.md pike.md; do
  count=$(grep -c "Memory Protocol" "$TARGET/.opencode/agent/$agent" 2>/dev/null || echo "0")
  if [ "$count" -gt 0 ]; then
    MEM_COUNT=$((MEM_COUNT + 1))
  fi
done

echo "   Agents with Memory Protocol: $MEM_COUNT / 10"

# Check agent-skills.json has memory-client
SKILL_CHECK=$(grep -c "memory-client" "$TARGET/.opencode/config/agent-skills.json")
echo "   memory-client references in agent-skills.json: $SKILL_CHECK"

# Check opencode.json has mcp.memory
MCP_CHECK=$(grep -c "memory-server-canonical" "$TARGET/opencode.json")
echo "   Memory MCP server in opencode.json: $MCP_CHECK"

echo ""
echo "=== Mirror complete. ==="
echo ""
echo "Changes applied:"
echo "  - opencode.json: Added \$schema + mcp.memory server config"
echo "  - agent-skills.json: mcp-builder→mcp-docker, github removed, memory-client added to all"
echo "  - All 10 agent files: permission blocks + Memory Protocol sections"
echo "  - scout.md: Stage 2: Search Memories + Stage renumbering"