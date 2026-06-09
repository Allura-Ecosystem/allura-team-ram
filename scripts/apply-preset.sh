#!/usr/bin/env bash
# apply-preset.sh - Team RAM Single Source of Truth
# Apply model assignments from team-ram-presets.jsonc to all 4 agent surfaces.
#
# Usage:
#   ./scripts/apply-preset.sh              # apply active preset from config
#   ./scripts/apply-preset.sh ollama       # apply named preset
#   ./scripts/apply-preset.sh --dry-run    # show diffs without writing
#   ./scripts/apply-preset.sh --check      # verify only, exit 1 if drift exists
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PRESET_FILE="$REPO_ROOT/.opencode/team-ram-presets.jsonc"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN=false
CHECK_MODE=false
PRESET_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run|-n) DRY_RUN=true; shift ;;
    --check|-c)   CHECK_MODE=true; shift ;;
    --help|-h)    echo "Usage: $0 [PRESET_NAME] [--dry-run] [--check]"; exit 0 ;;
    *)            PRESET_NAME="$1"; shift ;;
  esac
done

# Check preset file exists
if [[ ! -f "$PRESET_FILE" ]]; then
  echo -e "${RED}ERROR${NC}: Preset file not found: $PRESET_FILE"
  exit 1
fi

# Determine which repo we're in
REPO_NAME=$(basename "$REPO_ROOT")
IS_TEAMRAM=false
IS_ALLURA=false
if [[ "$REPO_NAME" == "Allura-TeamRam" ]]; then
  IS_TEAMRAM=true
  echo -e "${BLUE}Detected${NC}: Allura-TeamRam harness repo"
elif [[ "$REPO_NAME" == "allura-memory" ]]; then
  IS_ALLURA=true
  echo -e "${BLUE}Detected${NC}: allura-memory core repo"
else
  echo -e "${BLUE}Detected${NC}: Unknown repo ($REPO_NAME) -- applying generic config"
fi

# Parse JSONC (strip comments then use Python)
json_content=$(sed 's/\/\/.*$//' "$PRESET_FILE" | sed '/\/\*/,\*\//d')

# Get active preset name
if [[ -z "$PRESET_NAME" ]]; then
  PRESET_NAME=$(echo "$json_content" | python3 -c "import json,sys; print(json.load(sys.stdin).get('preset','ollama'))")
fi

echo -e "${GREEN}Applying preset${NC}: ${YELLOW}$PRESET_NAME${NC}"

# Extract preset data
preset_data=$(echo "$json_content" | python3 -c "
import json, sys
d = json.load(sys.stdin)
p = d.get('presets',{}).get('$PRESET_NAME',{})
print(json.dumps(p))
")

# Extract fallback data
fallback_data=$(echo "$json_content" | python3 -c "
import json, sys
d = json.load(sys.stdin)
f = d.get('fallback',{})
print(json.dumps(f))
")

echo "Fallback: $fallback_data"
if [[ "$preset_data" == "{}" ]]; then
  echo -e "${RED}ERROR${NC}: Preset '$PRESET_NAME' not found in config"
  exit 1
fi

# Define surfaces to update
declare -a SURFACES=()

# Function: map ollama model to Claude alias
model_to_claude() {
  local model="$1"
  # Quality / cost hierarchy for Claude models
  case "$model" in
    ollama/glm-5.1:cloud|openai/gpt-5.5|anthropic/claude-opus-4-6)
      echo "opus"
      ;;
    ollama/deepseek-v4-pro:cloud|openai/gpt-5.4|anthropic/claude-sonnet-4)
      echo "sonnet"
      ;;
    ollama/qwen3-coder-next:cloud|ollama/kimi-k2.6:cloud)
      echo "sonnet"
      ;;
    ollama/nemotron-3-super:cloud|openai/gpt-5.4-mini|anthropic/claude-haiku-4-5)
      echo "haiku"
      ;;
    ollama/qwen3:0.6b)
      echo "haiku"
      ;;
    *)
      echo "$model"
      ;;
  esac
}

# Function: update model in a markdown frontmatter
update_md_model() {
  local filepath="$1"
  local agent="$2"
  local model="$3"
  local fallback="$4"
  
  # Check if file exists
  if [[ ! -f "$filepath" ]]; then
    return 0  # Skip missing files
  fi
  
  local content
  content=$(cat "$filepath")
  
  # Extract current model
  local current_model
  current_model=$(echo "$content" | grep -oP '^model:\s*\K.*' | head -1 || echo "N/A")
  
  if [[ "$current_model" != "$model" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo -e "  ${YELLOW}DRY${NC} $filepath: model $current_model -> $model"
    elif [[ "$CHECK_MODE" == "true" ]]; then
      echo -e "  ${RED}DRIFT${NC} $filepath: model is '$current_model' expected '$model'"
      return 1
    else
      # Update model field
      sed -i.bak "s/^model:.*/model: $model/" "$filepath" && rm -f "$filepath.bak"
      echo -e "  ${GREEN}OK${NC} $filepath: model -> $model"
    fi
  fi
  
  # Update fallback_model field
  if ! echo "$content" | grep -q '^fallback_model:'; then
    # Add fallback_model after model line
    if [[ "$DRY_RUN" == "true" ]]; then
      echo -e "  ${YELLOW}DRY${NC} $filepath: +fallback_model $fallback"
    elif [[ "$CHECK_MODE" != "true" ]]; then
      sed -i.bak "/^model:.*/a\\fallback_model: $fallback" "$filepath" && rm -f "$filepath.bak"
    fi
  else
    local current_fb
    current_fb=$(echo "$content" | grep -oP '^fallback_model:\s*\K.*' | head -1 || echo "N/A")
    if [[ "$current_fb" != "$fallback" ]]; then
      if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${YELLOW}DRY${NC} $filepath: fallback $current_fb -> $fallback"
      elif [[ "$CHECK_MODE" == "true" ]]; then
        echo -e "  ${RED}DRIFT${NC} $filepath: fallback is '$current_fb' expected '$fallback'"
        return 1
      else
        sed -i.bak "s/^fallback_model:.*/fallback_model: $fallback/" "$filepath" && rm -f "$filepath.bak"
        echo -e "  ${GREEN}OK${NC} $filepath: fallback_model -> $fallback"
      fi
    fi
  fi
  
  return 0
}

# Function: update opencode.json
update_opencode_json() {
  local filepath="$1"
  
  if [[ ! -f "$filepath" ]]; then
    echo -e "  ${YELLOW}SKIP${NC}: $filepath not found"
    return 0
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}DRY${NC} Update $filepath (would rewrite agent.model fields)"
    return 0
  elif [[ "$CHECK_MODE" == "true" ]]; then
    local check_result=0
    while IFS= read -r agent; do
      local expected_model
      expected_model=$(echo "$preset_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$agent',{}).get('model',''))")
      local expected_fb
      expected_fb=$(echo "$fallback_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get('chains',{}).get('$agent',[]))[1:-1].replace('\"',''))")
      
      local actual_model
      actual_model=$(cat "$filepath" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('agent',{}).get('$agent',{}).get('model',''))")
      
      if [[ "$actual_model" != "$expected_model" ]]; then
        echo -e "  ${RED}DRIFT${NC} $filepath agent.$agent.model: '$actual_model' expected '$expected_model'"
        check_result=1
      fi
    done < <(echo "$preset_data" | python3 -c "import json,sys; print('\n'.join(json.load(sys.stdin).keys()))")
    
    return $check_result
  else
    # Create a Python script to update opencode.json
    local tmpfile=$(mktemp)
    cat > "$tmpfile" <<'PYTHON'
import json, sys, copy

with open(sys.argv[1]) as f:
    config = json.load(f)

preset_name = sys.argv[2]
preset_data = json.loads(sys.argv[3])
fallback_data = json.loads(sys.argv[4])

for agent, cfg in preset_data.items():
    if agent not in config.get('agent', {}):
        continue
    config['agent'][agent]['model'] = cfg['model']
    # Update fallback_model if it exists
    if 'fallback_model' in config['agent'][agent]:
        fb = fallback_data.get('chains', {}).get(agent, [])
        if fb:
            config['agent'][agent]['fallback_model'] = fb[0] if isinstance(fb, list) else fb

with open(sys.argv[1], 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')

print(f"Updated {sys.argv[1]}: {len(preset_data)} agents")
PYTHON
    python3 "$tmpfile" "$filepath" "$PRESET_NAME" "$preset_data" "$fallback_data"
    rm -f "$tmpfile"
    echo -e "  ${GREEN}OK${NC} $filepath"
  fi
}

# Execute updates
DRIFT_COUNT=0

# 1. Update .opencode/agent/ markdown files
echo -e "\n${BLUE}Surface 1${NC}: .opencode/agent/*.md"
if [[ "$IS_TEAMRAM" == "true" ]]; then
  for mdfile in "$REPO_ROOT/.opencode/agent/"*.md; do
    agent=$(basename "$mdfile" .md)
    model=$(echo "$preset_data" | python3 -c "import json,sys; d=json.load(sys.stdin); a='$agent'; print(d.get(a,{}).get('model',''))")
    fb=$(echo "$fallback_data" | python3 -c "import json,sys; d=json.load(sys.stdin); a='$agent'; c=d.get('chains',{}).get(a,[]); print(c[0] if c else '')")
    if [[ -n "$model" ]]; then
      update_md_model "$mdfile" "$agent" "$model" "$fb" || DRIFT_COUNT=$((DRIFT_COUNT + 1))
    fi
  done
elif [[ "$IS_ALLURA" == "true" ]]; then
  # Nested structure: core/, subagents/code/, core/, infrastructure/, review/
  for subdir in core subagents/core subagents/code subagents/review subagents/infrastructure; do
    for mdfile in "$REPO_ROOT/.opencode/agent/$subdir/"*.md; do
      [[ -f "$mdfile" ]] || continue
      agent=$(basename "$mdfile" .md)
      # Handle openwork.md specially
      if [[ "$agent" == "openwork" ]]; then continue; fi
      model=$(echo "$preset_data" | python3 -c "import json,sys; d=json.load(sys.stdin); a='$agent'; print(d.get(a,{}).get('model',''))")
      fb=$(echo "$fallback_data" | python3 -c "import json,sys; d=json.load(sys.stdin); a='$agent'; c=d.get('chains',{}).get(a,[]); print(c[0] if c else '')")
      if [[ -n "$model" ]]; then
        update_md_model "$mdfile" "$agent" "$model" "$fb" || DRIFT_COUNT=$((DRIFT_COUNT + 1))
      fi
    done
  done
fi

# 2. Update opencode.json
echo -e "\n${BLUE}Surface 2${NC}: opencode.json"
update_opencode_json "$REPO_ROOT/opencode.json" || DRIFT_COUNT=$((DRIFT_COUNT + $ ?))

# 3. Update .claude-plugin/agents/ (TeamRam) — map to Claude aliases
if [[ "$IS_TEAMRAM" == "true" ]]; then
  echo -e "\n${BLUE}Surface 3${NC}: .claude-plugin/agents/*.md"
  for mdfile in "$REPO_ROOT/.claude-plugin/agents/"*.md; do
    agent=$(basename "$mdfile" .md)
    model=$(echo "$preset_data" | python3 -c "import json,sys; d=json.load(sys.stdin); a='$agent'; print(d.get(a,{}).get('model',''))")
    if [[ -n "$model" ]]; then
      claude_model=$(model_to_claude "$model")
      update_md_model "$mdfile" "$agent" "$claude_model" "" || DRIFT_COUNT=$((DRIFT_COUNT + 1))
    fi
  done
fi

# 4. Update .claude/agents/ (allura-memory)
if [[ "$IS_ALLURA" == "true" ]]; then
  echo -e "\n${BLUE}Surface 4${NC}: .claude/agents/*.md"
  for mdfile in "$REPO_ROOT/.claude/agents/"*.md; do
    agent=$(basename "$mdfile" .md)
    model=$(echo "$preset_data" | python3 -c "import json,sys; d=json.load(sys.stdin); a='$agent'; print(d.get(a,{}).get('model',''))")
    if [[ -n "$model" ]]; then
      claude_model=$(model_to_claude "$model")
      # Claude agents don't have fallback_model
      update_md_model "$mdfile" "$agent" "$claude_model" "Not applicable" || DRIFT_COUNT=$((DRIFT_COUNT + 1))
    fi
  done
fi

# Summary
echo -e "\n${GREEN}Done${NC}. Preset ${YELLOW}$PRESET_NAME${NC} applied."
if [[ "$CHECK_MODE" == "true" && "$DRIFT_COUNT" -gt 0 ]]; then
  echo -e "${RED}$DRIFT_COUNT drift(s) detected${NC}"
  exit 1
fi
