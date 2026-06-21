#!/usr/bin/env bash
# Allura-TeamRam Harness Smoke Test
# Validates structural correctness across Claude Code, OpenCode, and Codex runtimes.
# Dependencies: bash, python3 (for JSON validation), standard unix tools.
# Exit 0 if no FAIL, exit 1 if any FAIL.

set -uo pipefail

# Resolve repo root (parent of scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PASS=0
FAIL=0
WARN=0

pass() {
  echo "  ✅ $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "  ❌ FAIL: $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo "  ⚠️  WARNING: $1"
  WARN=$((WARN + 1))
}

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

check_yaml_frontmatter() {
  # Check that a .md file starts with --- and contains name: and description: in frontmatter
  local file="$1"
  local in_frontmatter=false
  local found_end=false
  local has_name=false
  local has_description=false
  local line_num=0

  while IFS= read -r line; do
    ((line_num++))
    if [[ $line_num -eq 1 ]]; then
      if [[ "$line" == "---" ]]; then
        in_frontmatter=true
      else
        return 1
      fi
      continue
    fi
    if $in_frontmatter; then
      if [[ "$line" == "---" ]]; then
        found_end=true
        break
      fi
      if [[ "$line" =~ ^name: ]]; then has_name=true; fi
      if [[ "$line" =~ ^description: ]]; then has_description=true; fi
    fi
  done < "$file"

  $found_end && $has_name && $has_description
}

check_model_in_frontmatter() {
  local file="$1"
  local in_frontmatter=false
  local line_num=0

  while IFS= read -r line; do
    ((line_num++))
    if [[ $line_num -eq 1 ]]; then
      if [[ "$line" == "---" ]]; then in_frontmatter=true; fi
      continue
    fi
    if $in_frontmatter; then
      if [[ "$line" == "---" ]]; then break; fi
      if [[ "$line" =~ ^model: ]]; then return 0; fi
    fi
  done < "$file"
  return 1
}

check_permission_not_tools() {
  # OpenCode agents should use permission: not tools: array
  local file="$1"
  local in_frontmatter=false
  local has_tools=false
  local line_num=0

  while IFS= read -r line; do
    ((line_num++))
    if [[ $line_num -eq 1 ]]; then
      if [[ "$line" == "---" ]]; then in_frontmatter=true; fi
      continue
    fi
    if $in_frontmatter; then
      if [[ "$line" == "---" ]]; then break; fi
      if [[ "$line" =~ ^tools: ]]; then has_tools=true; fi
    fi
  done < "$file"

  ! $has_tools
}

detect_secrets() {
  # Search for real API key patterns in .md and .json files
  # Excludes obvious placeholders (your-key-here, xxx, example, placeholder)
  local dir="$1"
  local found=""
  found=$(grep -rE '(sk-ant-[A-Za-z0-9_-]{10,}|sk-proj-[A-Za-z0-9_-]{10,}|ntn_[A-Za-z0-9_-]{10,}|fal_[A-Za-z0-9_-]{10,})' \
    --include="*.md" --include="*.json" "$dir" 2>/dev/null \
    | grep -ivE '(your-key|placeholder|example|xxxx|replace-|fake-|dummy)' || true)
  if [[ -n "$found" ]]; then
    echo "$found"
    return 1
  fi
  return 0
}

# ──────────────────────────────────────────────
echo "══════ Allura-TeamRam Smoke Test ══════"
echo ""

# ──────────────────────────────────────────────
# 1. STRUCTURE (all runtimes)
# ──────────────────────────────────────────────
echo "Structure (all runtimes):"

# Check for .env.local files
env_local_files=$(find "$REPO_ROOT" -name ".env.local" -not -path "*/node_modules/*" 2>/dev/null || true)
if [[ -z "$env_local_files" ]]; then
  pass "No .env.local files committed"
else
  fail ".env.local files found: $env_local_files"
fi

# Check for secrets
secret_output=""
secret_output=$(detect_secrets "$REPO_ROOT" 2>&1) && pass "No secrets detected in .md/.json files" || fail "Potential secrets found: $(echo "$secret_output" | head -3)"

echo ""

# ──────────────────────────────────────────────
# 2. CLAUDE CODE (.claude/)
# ──────────────────────────────────────────────
echo "Runtime: Claude Code (.claude/)"

CLAUDE_DIR="$REPO_ROOT/.claude"

# Check agents directory
if [[ -d "$CLAUDE_DIR/agents" ]]; then
  agent_count=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -name "*.md" -not -name "BRAIN-CONNECTION.md" -not -name "AGENTS.md" | wc -l)
  if [[ $agent_count -ge 10 ]]; then
    pass "$agent_count agent definitions found"
  else
    fail "Only $agent_count agent .md files found (need >= 10)"
  fi

  # Check YAML frontmatter on all agent files
  bad_frontmatter=()
  missing_model=()
  for f in "$CLAUDE_DIR/agents/"*.md; do
    [[ "$(basename "$f")" == "BRAIN-CONNECTION.md" ]] && continue
    [[ "$(basename "$f")" == "AGENTS.md" ]] && continue
    if ! check_yaml_frontmatter "$f"; then
      bad_frontmatter+=("$(basename "$f")")
    fi
    if ! check_model_in_frontmatter "$f"; then
      missing_model+=("$(basename "$f")")
    fi
  done

  if [[ ${#bad_frontmatter[@]} -eq 0 ]]; then
    pass "All agents have valid YAML frontmatter"
  else
    fail "${#bad_frontmatter[@]} agents missing valid frontmatter: ${bad_frontmatter[*]}"
  fi

  if [[ ${#missing_model[@]} -eq 0 ]]; then
    pass "All agents have model: in frontmatter"
  else
    warn "${#missing_model[@]} agents missing model: field: ${missing_model[*]}"
  fi
else
  fail ".claude/agents/ directory not found"
fi

# Check skills directory
if [[ -d "$CLAUDE_DIR/skills" ]]; then
  skill_count=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l)
  if [[ $skill_count -ge 100 ]]; then
    pass "$skill_count skill directories found"
  else
    fail "Only $skill_count skill directories found (need >= 100)"
  fi

  # Check for SKILL.md in each skill directory
  missing_skill_md=()
  for d in "$CLAUDE_DIR/skills"/*/; do
    [[ -d "$d" ]] || continue
    if [[ ! -f "$d/SKILL.md" ]]; then
      missing_skill_md+=("$(basename "$d")")
    fi
  done

  if [[ ${#missing_skill_md[@]} -eq 0 ]]; then
    pass "All skill directories have SKILL.md"
  else
    warn "${#missing_skill_md[@]} skills missing SKILL.md: ${missing_skill_md[*]:0:10}$([ ${#missing_skill_md[@]} -gt 10 ] && echo " ...")"
  fi
else
  fail ".claude/skills/ directory not found"
fi

# Check commands directory
if [[ -d "$CLAUDE_DIR/commands" ]]; then
  pass ".claude/commands/ exists"
else
  warn ".claude/commands/ not found (optional)"
fi

echo ""

# ──────────────────────────────────────────────
# 3. OPENCODE (.opencode/)
# ──────────────────────────────────────────────
echo "Runtime: OpenCode (.opencode/)"

OPENCODE_DIR="$REPO_ROOT/.opencode"

# Check agent directory (note: .opencode/agent/ not agents/)
if [[ -d "$OPENCODE_DIR/agent" ]]; then
  oc_agent_count=$(find "$OPENCODE_DIR/agent" -maxdepth 1 -name "*.md" | wc -l)
  pass ".opencode/agent/ exists with $oc_agent_count definitions"
elif [[ -d "$OPENCODE_DIR/agents" ]]; then
  oc_agent_count=$(find "$OPENCODE_DIR/agents" -maxdepth 1 -name "*.md" | wc -l)
  pass ".opencode/agents/ exists with $oc_agent_count definitions"
else
  fail ".opencode/agent/ directory not found"
fi

# Check permission: not tools: format
if [[ -d "$OPENCODE_DIR/agent" || -d "$OPENCODE_DIR/agents" ]]; then
  agent_dir="$OPENCODE_DIR/agent"
  [[ -d "$agent_dir" ]] || agent_dir="$OPENCODE_DIR/agents"

  tools_bug=()
  for f in "$agent_dir/"*.md; do
    [[ -f "$f" ]] || continue
    if ! check_permission_not_tools "$f"; then
      tools_bug+=("$(basename "$f")")
    fi
  done

  if [[ ${#tools_bug[@]} -eq 0 ]]; then
    pass "Agent definitions use permission: format (no tools: array bug)"
  else
    fail "${#tools_bug[@]} agents still use tools: array: ${tools_bug[*]}"
  fi
fi

# Check skills directory
if [[ -d "$OPENCODE_DIR/skills" ]]; then
  oc_skill_count=$(find "$OPENCODE_DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l)
  if [[ $oc_skill_count -ge 100 ]]; then
    pass "$oc_skill_count skill directories found in .opencode/skills/"
  else
    fail "Only $oc_skill_count skill directories in .opencode/skills/ (need >= 100)"
  fi
else
  fail ".opencode/skills/ directory not found"
fi

# Check ralph directory
if [[ -d "$OPENCODE_DIR/ralph" ]]; then
  ralph_files=("PROMPT_ultra.md" "loop-runner.md" "state-schema.json")
  ralph_missing=()
  for rf in "${ralph_files[@]}"; do
    if [[ ! -f "$OPENCODE_DIR/ralph/$rf" ]]; then
      ralph_missing+=("$rf")
    fi
  done
  if [[ ${#ralph_missing[@]} -eq 0 ]]; then
    pass ".opencode/ralph/ exists with all 3 required files"
  else
    fail ".opencode/ralph/ missing: ${ralph_missing[*]}"
  fi
else
  fail ".opencode/ralph/ directory not found"
fi

# Check opencode.json at root
if [[ -f "$REPO_ROOT/opencode.json" ]]; then
  pass "opencode.json exists at root"
else
  warn "opencode.json not found at root"
fi

echo ""

# ──────────────────────────────────────────────
# 4. CODEX (.codex-plugin/ or .Codex/)
# ──────────────────────────────────────────────
echo "Runtime: Codex"

CODEX_DIR=""
if [[ -d "$REPO_ROOT/.codex-plugin" ]]; then
  CODEX_DIR="$REPO_ROOT/.codex-plugin"
elif [[ -d "$REPO_ROOT/.Codex" ]]; then
  CODEX_DIR="$REPO_ROOT/.Codex"
fi

if [[ -n "$CODEX_DIR" ]]; then
  if [[ -f "$CODEX_DIR/plugin.json" ]]; then
    if python3 -c "import json; json.load(open('$CODEX_DIR/plugin.json'))" 2>/dev/null; then
      pass "$(basename "$CODEX_DIR")/plugin.json is valid JSON"

      # Check if referenced files exist
      referenced_files=$(python3 -c "
import json, os, sys
data = json.load(open('$CODEX_DIR/plugin.json'))
missing = []
def check_refs(obj, base='$CODEX_DIR'):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and (v.endswith('.md') or v.endswith('.json')):
                path = os.path.join(base, v) if not os.path.isabs(v) else v
                if not os.path.exists(path):
                    # Try from repo root
                    alt = os.path.join('$REPO_ROOT', v)
                    if not os.path.exists(alt):
                        missing.append(v)
            else:
                check_refs(v, base)
    elif isinstance(obj, list):
        for item in obj:
            check_refs(item, base)
check_refs(data)
if missing:
    print('\\n'.join(missing))
    sys.exit(1)
" 2>/dev/null) && pass "All plugin.json references resolve" || warn "plugin.json references unresolved files: $(echo "$referenced_files" | head -5)"
    else
      fail "$(basename "$CODEX_DIR")/plugin.json is invalid JSON"
    fi
  else
    fail "plugin.json not found in $(basename "$CODEX_DIR")/"
  fi
else
  warn "No .codex-plugin/ or .Codex/ directory found"
fi

echo ""

# ──────────────────────────────────────────────
# 5. CROSS-RUNTIME CONSISTENCY
# ──────────────────────────────────────────────
echo "Cross-Runtime:"

# Compare agent definitions
if [[ -d "$CLAUDE_DIR/agents" ]]; then
  claude_agents=()
  for f in "$CLAUDE_DIR/agents/"*.md; do
    [[ -f "$f" ]] || continue
    bn="$(basename "$f")"
    [[ "$bn" == "BRAIN-CONNECTION.md" || "$bn" == "AGENTS.md" || "$bn" == "reality-checker-tram.md" ]] && continue
    claude_agents+=("$bn")
  done

  oc_agent_dir="$OPENCODE_DIR/agent"
  [[ -d "$oc_agent_dir" ]] || oc_agent_dir="$OPENCODE_DIR/agents"

  if [[ -d "$oc_agent_dir" ]]; then
    missing_in_opencode=()
    for agent in "${claude_agents[@]}"; do
      # Search recursively — OpenCode uses subdirectories (core/, subagents/)
      if ! find "$oc_agent_dir" -name "$agent" -type f 2>/dev/null | grep -q .; then
        missing_in_opencode+=("$agent")
      fi
    done

    if [[ ${#missing_in_opencode[@]} -eq 0 ]]; then
      pass "All .claude agents have .opencode counterparts"
    else
      warn "${#missing_in_opencode[@]} .claude agents missing in .opencode: ${missing_in_opencode[*]:0:5}$([ ${#missing_in_opencode[@]} -gt 5 ] && echo " ...")"
    fi
  fi
fi

# Compare skill counts
if [[ -d "$CLAUDE_DIR/skills" && -d "$OPENCODE_DIR/skills" ]]; then
  claude_skills=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l)
  opencode_skills=$(find "$OPENCODE_DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l)
  diff=$((opencode_skills - claude_skills))
  if [[ $diff -eq 0 ]]; then
    pass "Skill count matches across runtimes ($claude_skills)"
  elif [[ $diff -gt 0 ]]; then
    warn ".opencode has $diff more skills than .claude ($opencode_skills vs $claude_skills)"
  else
    warn ".claude has $((-diff)) more skills than .opencode ($claude_skills vs $opencode_skills)"
  fi
fi

echo ""

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
echo "══════ Result: $PASS PASS / $FAIL FAIL / $WARN WARN ══════"

if [[ $FAIL -gt 0 ]]; then
  exit 1
else
  exit 0
fi
