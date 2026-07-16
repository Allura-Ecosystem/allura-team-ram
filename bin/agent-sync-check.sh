#!/usr/bin/env bash
# agent-sync-check.sh — verify Claude-native agents/ dir and OpenCode-native .opencode/agent/core/ dir stay in sync.
# Drift between them causes Claude Code and OpenCode to see different agents.
# Usage: bash Agent-Harnesses/Allura-TeamRam/bin/agent-sync-check.sh
# Exit 0 = in sync, Exit 1 = drift detected

set -euo pipefail

HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_AGENTS="$HARNESS_ROOT/agents"
OPENCODE_AGENTS="$HARNESS_ROOT/.opencode/agent/core"

if [[ ! -d "$CLAUDE_AGENTS" ]]; then
  echo "ERROR: Claude-native agents dir not found: $CLAUDE_AGENTS" >&2
  exit 1
fi

if [[ ! -d "$OPENCODE_AGENTS" ]]; then
  echo "ERROR: OpenCode-native agents dir not found: $OPENCODE_AGENTS" >&2
  exit 1
fi

# Compare file lists (names only, not contents — frontmatter differs by design)
CLAUDE_LIST=$(ls "$CLAUDE_AGENTS" | sort)
OPENCODE_LIST=$(ls "$OPENCODE_AGENTS" | sort)

if [[ "$CLAUDE_LIST" != "$OPENCODE_LIST" ]]; then
  echo "DRIFT DETECTED: agent file lists differ between agents/ (Claude) and .opencode/agent/core/ (OpenCode)" >&2
  echo "" >&2
  echo "Only in agents/ (Claude-native):" >&2
  diff <(echo "$OPENCODE_LIST") <(echo "$CLAUDE_LIST") | grep '^>' | sed 's/^> /  /' >&2
  echo "Only in .opencode/agent/core/ (OpenCode-native):" >&2
  diff <(echo "$CLAUDE_LIST") <(echo "$OPENCODE_LIST") | grep '^>' | sed 's/^> /  /' >&2
  echo "" >&2
  echo "Fix: add the missing agent to the deficient directory." >&2
  echo "Claude-native agents/ use model: inherit and no OpenCode-only frontmatter fields." >&2
  echo "OpenCode-native .opencode/agent/core/ use mode, persona, permission, scope, etc." >&2
  exit 1
fi

COUNT=$(echo "$CLAUDE_LIST" | wc -l)
echo "OK: $COUNT agents in sync between agents/ (Claude) and .opencode/agent/core/ (OpenCode)"
exit 0