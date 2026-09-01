#!/bin/bash
# Harness Router — Routes Claude Code commands to the OpenCode orchestrator
# Invoked by: /mcp-discover, /mcp-approve, /mcp-load, /skill-propose, /skill-load

set -e

# Navigate to the canonical Team RAM repository root.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Route to harness orchestrator
# Expected usage: ./harness-router.sh mcp-discover [keyword]
#                 ./harness-router.sh mcp-approve <server-id>
#                 ./harness-router.sh mcp-load <server-id>
#                 ./harness-router.sh skill-propose <skill-name>
#                 ./harness-router.sh skill-load <skill-name> [--executor <executor>]

bun .opencode/harness/index.ts "$@"
