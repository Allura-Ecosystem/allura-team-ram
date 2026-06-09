# Harness Sync from allura-memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the OpenAgentsControl harness with the latest allura-memory `.claude/` and `.opencode/` configurations, bringing governance files, updated agents, missing commands, missing skills, and expanded context.

**Architecture:** Copy-and-adapt approach. Source of truth is allura-memory's `.claude/` directory (Claude Code native). Target is OpenAgentsControl's `.opencode/` directory (OpenCode native). Agent model references must be kept as `ollama-cloud/*` (not Claude-native `opus`/`sonnet`/`haiku`). Paths referencing `.claude/` must be adapted to `.opencode/`.

**Tech Stack:** Bash (file operations), Markdown, JSON

**Source:** `/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/`
**Target:** `/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/`

---

## Tier 1: Governance & Structural Files (Critical)

### Task 1: Copy governance files to .opencode/ root

**Files:**
- Create: `.opencode/AGENTS.md`
- Create: `.opencode/COWORK.md`
- Create: `.opencode/SKILL-OWNERSHIP.md`
- Create: `.opencode/manifest.json`

- [ ] **Step 1: Copy AGENTS.md**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/AGENTS.md" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/AGENTS.md"
```

- [ ] **Step 2: Copy COWORK.md**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/COWORK.md" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/COWORK.md"
```

- [ ] **Step 3: Copy SKILL-OWNERSHIP.md**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/SKILL-OWNERSHIP.md" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/SKILL-OWNERSHIP.md"
```

- [ ] **Step 4: Copy manifest.json**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/manifest.json" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/manifest.json"
```

- [ ] **Step 5: Copy _bootstrap.md to rules/**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/rules/_bootstrap.md" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/rules/_bootstrap.md"
```

- [ ] **Step 6: Adapt paths** — In each copied file, replace `.claude/` references with `.opencode/` using sed.

- [ ] **Step 7: Verify files exist**

```bash
ls -la .opencode/AGENTS.md .opencode/COWORK.md .opencode/SKILL-OWNERSHIP.md .opencode/manifest.json .opencode/rules/_bootstrap.md
```

---

### Task 2: Update agent-metadata and agent-skills config

**Files:**
- Update: `.opencode/config/agent-metadata.json`
- Update: `.opencode/config/agent-skills.json`

- [ ] **Step 1: Copy updated agent-metadata.json**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/config/agent-metadata.json" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/config/agent-metadata.json"
```

- [ ] **Step 2: Copy updated agent-skills.json**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/config/agent-skills.json" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/config/agent-skills.json"
```

---

## Tier 2: Agent Updates

### Task 3: Sync all 10 agent definitions

**Files:**
- Update: `.opencode/agent/brooks.md`
- Update: `.opencode/agent/jobs.md`
- Update: `.opencode/agent/woz.md`
- Update: `.opencode/agent/scout.md`
- Update: `.opencode/agent/pike.md`
- Update: `.opencode/agent/fowler.md`
- Update: `.opencode/agent/bellard.md`
- Update: `.opencode/agent/carmack.md`
- Update: `.opencode/agent/knuth.md`
- Update: `.opencode/agent/hightower.md`

- [ ] **Step 1: Copy all agent files from allura-memory**

```bash
for agent in brooks jobs woz scout pike fowler bellard carmack knuth hightower; do
  cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/agents/${agent}.md" \
     "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/agent/${agent}.md"
done
```

- [ ] **Step 2: Fix model references** — Replace Claude-native model names with ollama-cloud equivalents in YAML frontmatter:
  - `model: opus` → `model: ollama-cloud/gpt-5.4`
  - `model: sonnet` → `model: ollama-cloud/gpt-5.4-mini`
  - `model: haiku` → `model: ollama-cloud/nemotron-3-super`

- [ ] **Step 3: Fix path references** — Replace `.claude/` with `.opencode/` in agent body text.

- [ ] **Step 4: Verify all 10 agents exist**

```bash
ls -1 .opencode/agent/*.md | wc -l  # Should be 10
```

---

## Tier 3: Missing Commands

### Task 4: Add missing command files

**Files:**
- Create: `.opencode/command/goal.md`
- Create: `.opencode/command/intent-gate.md`

- [ ] **Step 1: Copy goal.md**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/commands/goal.md" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/command/goal.md"
```

- [ ] **Step 2: Copy intent-gate.md**

```bash
cp "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/commands/intent-gate.md" \
   "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/command/intent-gate.md"
```

- [ ] **Step 3: Fix path references in both files** — Replace `.claude/` with `.opencode/`.

---

## Tier 4: Missing Skills (45 skills)

### Task 5: Copy all missing skills from allura-memory

**Files:**
- Create: 45 skill directories under `.opencode/skills/`

- [ ] **Step 1: Copy all missing skill directories**

```bash
MISSING_SKILLS=(
  advanced-elicitation agent-builder allura-approve-promotion allura-architecture
  allura-code-review allura-design allura-dev-story allura-graph-debug
  allura-health-observability allura-memory-skill allura-product-intake
  allura-propose-promotion allura-retrospective allura-team-ram brain-reliability
  brainstorming event-payload-sanitizer figma-code-connect figma-create-new-file
  figma-generate-design figma-generate-library figma-implement-design figma-use
  frontend-craft frontend-design get-started guide-skill-creator
  harness-recommendation-advisor impeccable mcp-docker-ops memory-hygiene-auditor
  notion-dreaming-governance open-ralph-wiggum perplexica-search roundtable
  schema-boundary-guard source-command-analyze-patterns source-command-dashboard
  source-command-end-session source-command-party source-command-query
  source-command-quick-commands source-command-quickprompt source-command-start-session
  source-command-task source-command-test team-ram-cowork workspace-guide
)

SRC="/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/skills"
DST="/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/skills"

for skill in "${MISSING_SKILLS[@]}"; do
  if [ -d "$SRC/$skill" ]; then
    cp -r "$SRC/$skill" "$DST/$skill"
    echo "Copied: $skill"
  else
    echo "MISSING in source: $skill"
  fi
done
```

- [ ] **Step 2: Verify skill count**

```bash
ls -1d .opencode/skills/*/ | wc -l  # Should be ~70 (25 existing + 45 new)
```

- [ ] **Step 3: Remove deprecated skills from OpenAgentsControl**

These skills were replaced in allura-memory:
```bash
# hitl-governance → replaced by allura-approve-promotion
# mcp-builder → replaced by mcp-docker-ops + mcp-harness
# mcp-docker-memory-system → absorbed into allura-memory-skill
# readme-memory → deprecated
# superpowers-memory → deprecated
# next-best-practices → deprecated
# trailofbits-audit → deprecated
```

Ask user before removing — these may still be useful as reference.

---

## Tier 5: Context Expansion

### Task 6: Sync missing context files

**Files:**
- Create/Update: Multiple files under `.opencode/context/`

- [ ] **Step 1: Sync context directories using rsync**

```bash
rsync -av --ignore-existing \
  "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/context/" \
  "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/context/"
```

Note: `--ignore-existing` preserves any OAC-specific context files.

- [ ] **Step 2: Verify context file count**

```bash
find .opencode/context/ -name "*.md" | wc -l
```

---

## Tier 6: Rules Sync

### Task 7: Sync rules files

**Files:**
- Update: `.opencode/rules/` directory

- [ ] **Step 1: Sync rules**

```bash
rsync -av \
  "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/rules/" \
  "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/rules/"
```

- [ ] **Step 2: Fix path references** — Replace `.claude/` with `.opencode/`.

---

## Tier 7: Archive Strategy

### Task 8: Archive deprecated active files

**Files:**
- Move: `.opencode/hooks/` → `.opencode/archive/hooks-2026-06-07/`
- Move: `.opencode/routing/` → `.opencode/archive/routing-2026-06-07/`
- Move: `.opencode/migrations/` → `.opencode/archive/migrations-2026-06-07/`

- [ ] **Step 1: Create archive and move deprecated dirs**

```bash
mkdir -p .opencode/archive
for dir in hooks routing migrations; do
  if [ -d ".opencode/$dir" ]; then
    mv ".opencode/$dir" ".opencode/archive/${dir}-2026-06-07"
    echo "Archived: $dir"
  fi
done
```

- [ ] **Step 2: Copy allura-memory archive if it has newer versions**

```bash
rsync -av --ignore-existing \
  "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/archive/" \
  "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/archive/"
```

---

## Tier 8: Templates and Guidelines

### Task 9: Sync templates and guidelines

- [ ] **Step 1: Sync templates**

```bash
rsync -av --ignore-existing \
  "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/templates/" \
  "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/templates/"
```

- [ ] **Step 2: Sync guidelines (if exists)**

```bash
if [ -d "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/guidelines/" ]; then
  rsync -av --ignore-existing \
    "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/guidelines/" \
    "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/guidelines/"
fi
```

---

## Post-Sync Verification

### Task 10: Verify sync completeness

- [ ] **Step 1: Count files in both directories**

```bash
echo "=== allura-memory .claude/ ==="
find "/media/ronin704/Games/Projects/ai-agents/allura-memory/.claude/" -type f | wc -l

echo "=== OpenAgentsControl .opencode/ ==="
find "/media/ronin704/Games/Projects/ai-agents/OpenAgentsControl/.opencode/" -type f | wc -l
```

- [ ] **Step 2: Verify governance files**

```bash
for f in AGENTS.md COWORK.md SKILL-OWNERSHIP.md manifest.json; do
  test -f ".opencode/$f" && echo "OK: $f" || echo "MISSING: $f"
done
```

- [ ] **Step 3: Run integration tests**

```bash
bun run test-integration.ts
```

- [ ] **Step 4: Update CLAUDE.md** — Add notes about sync status and any allura-memory-specific adaptations.

- [ ] **Step 5: Commit**

```bash
git add .opencode/ CLAUDE.md
git commit -m "feat: sync harness with allura-memory latest (.claude + .opencode)"
```
