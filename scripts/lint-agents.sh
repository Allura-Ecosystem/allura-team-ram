#!/usr/bin/env bash
# lint-agents.sh - Team RAM Drift Detection
# Checks that all 4 agent surfaces match team-ram-presets.jsonc
#
# Usage:
#   ./scripts/lint-agents.sh           # full check with diff output
#   ./scripts/lint-agents.sh --ci       # exit 1 on any drift (for CI)
#   ./scripts/lint-agents.sh --fix      # auto-fix drift using apply-preset
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PRESET_FILE="$REPO_ROOT/.opencode/team-ram-presets.jsonc"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CI_MODE=false
FIX_MODE=false
TOTAL_DRIFT=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --ci)    CI_MODE=true; shift ;;
    --fix)   FIX_MODE=true; shift ;;
    --help)  echo "Usage: $0 [--ci] [--fix]"; exit 0 ;;
    *)       echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$PRESET_FILE" ]]; then
  echo -e "${RED}ERROR${NC}: Preset file not found: $PRESET_FILE"
  exit 1
fi

echo -e "${BLUE}Team RAM Agent Drift Detection${NC}"
echo "Preset file: $PRESET_FILE"
echo ""

# Use apply-preset in check mode
if "$SCRIPT_DIR/apply-preset.sh" --check; then
  echo -e "\n${GREEN}No drift detected${NC}. All surfaces are consistent."
  exit 0
else
  TOTAL_DRIFT=1
  echo -e "\n${YELLOW}Drift detected${NC}."
  
  if [[ "$FIX_MODE" == "true" ]]; then
    echo -e "${BLUE}Auto-fixing...${NC}"
    "$SCRIPT_DIR/apply-preset.sh"
    echo -e "${GREEN}Fixed${NC}. Re-running check..."
    exec "$0" --ci
  fi
  
  if [[ "$CI_MODE" == "true" ]]; then
    echo -e "${RED}CI check failed${NC}: Agent drift detected."
    echo "Run './scripts/apply-preset.sh' to fix."
    exit 1
  fi
fi
