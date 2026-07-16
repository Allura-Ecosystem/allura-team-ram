# ADR: Loopy + Auto-Mode for Team RAM & Team Durham

**Status:** Accepted
**Date:** 2026-07-16
**Supersedes:** Prior ADR "loopy not in Durham" (via Option B — pattern, not skill)
**Author:** Brooks (Chief Architect)

## Context

Team RAM and Team Durham harnesses had three problems:

1. **Drift:** Allura Brain memory recorded that loopy was vendored into the Team
   RAM harness at v0.4.2, but disk showed v0.4.0 with no loopy skill or command.
   The canonical loopy skill lived only at `~/.agents/skills/loopy/` and in two
   orphan command files in payload websites pointing at a missing skill.

2. **Claude Desktop loading failure:** The OpenCode-native agent definitions at
   `.opencode/agent/core/*.md` carried frontmatter fields (`mode`, `persona`,
   `permission`, `scope`, `platform`, `status`, `category`, `type`,
   `model: openai/gpt-5.5`) that Claude Code does not recognize. While Claude
   Code ignores unknown fields, `model: openai/gpt-5.5` is not a valid Claude
   model alias and caused silent fallback or invocation errors.

3. **Fragmented auto-mode:** Three overlapping autonomous surfaces (`ultra`,
   `run-night`, `bmad-sprint-loop`) with no unified Brain-governed contract or
   single front door. Team Durham had no autonomous mode at all and no
   `.claude-plugin/` manifest (Codex-only — did not load in Claude Desktop).

## Decision

### 1. Reconcile drift + vendor loopy into Team RAM (v0.4.0 → v0.4.2)

- Vendored canonical loopy skill from `~/.agents/skills/loopy/` into
  `Agent-Harnesses/Allura-TeamRam/.opencode/skills/loopy/` (SKILL.md + 5
  reference docs + agents/openai.yaml)
- Added `.opencode/commands/loopy.md` (Loop Curation Layer command)
- Bumped both manifests to v0.4.2, registered loopy command (32 → 33 commands)
- Wired Brain events: `LOOP_DEBRIEF`, `LOOP_SAVED`, `LOOP_PUBLISH` with
  `agent_id: loopy`, `group_id: allura-system`

### 2. Fix Claude loading via Claude-native agents/ dir

- Made the fresh `agents/` directory at the harness root the canonical
  Claude-native agent location. These files use `model: inherit` (valid for
  Claude Code) and omit OpenCode-only frontmatter fields.
- Repointed `.claude-plugin/plugin.json` `agents` array to `./agents/*.md`
- Kept `.codex-plugin/plugin.json` pointing at `./.opencode/agent/core/*.md`
  (OpenCode-native frontmatter stays valid there)
- Added `bin/agent-sync-check.sh` to detect drift between the two directories

### 3. Unify auto-mode under loopy + Allura

- Created `.opencode/skills/auto-mode/SKILL.md` defining the 6-step contract:
  Observe (Scout + Brain search) → Choose (Brooks routes) → Act (one bounded
  slice) → Verify (explicit validation command) → Record (Brain trace) →
  Repeat/Stop (terminal states)
- Enhanced existing `.opencode/command/auto.md` to chain: loopy find-or-craft →
  complexity routing → ultra/ralph execution → loopy debrief → loopy save
- Added `--epic` flag to extend single-task to full sprint via bmad-sprint-loop
- Registered auto command in both manifests (33 → 34 commands)
- Hard stops: max iterations, RuVix violation, missing authority, destructive
  without approval
- HITL boundary preserved: auto-mode writes traces only; promotion/destructive
  stays human (POL-004)

### 4. Team Durham: Claude manifest + brand-loop skill (Option B)

- Added `allura-plugins/team-durham/.claude-plugin/plugin.json` — fixes Claude
  Desktop loading (was Codex-only)
- Created `allura-plugins/team-durham/skills/brand-loop/SKILL.md` following
  loopy's feedback-cycle contract but using Durham agents: Aaker (strategy),
  Kotler (positioning), Glaser (visual), Ogilvy (copy), Munari (QA), Rubin
  (taste gate)
- Added `allura-plugins/team-durham/commands/brand-auto.md` chaining: brief
  intake → specialist routing → bounded slice → Munari/Rubin verification →
  Brain writeback
- HITL taste gate preserved: brand-auto does not ship brand without approval
- Uses `group_id: "allura-team-durham"` (not `allura-system`)

### Option B rationale (supersedes prior "loopy not in Durham" ADR)

The prior ADR excluded loopy from Durham because "loopy-the-skill is
engineering-coded; brand loops need adaptation." Option B respects this
reasoning: Durham gets the **pattern** (loopy's feedback-cycle contract), not
the **skill**. Brand-loop follows the same observe/choose/act/verify/record/stop
cycle and the same terminal states, but uses Durham agents and Durham evidence
(QA rubric, taste gate) instead of engineering agents and engineering evidence
(tests, typecheck).

## Consequences

**Positive:**
- Single front door (`/auto`) for bounded autonomous execution in Team RAM
- Team Durham now loads in Claude Desktop (was Codex-only)
- Loopy drift reconciled — Brain memory and disk now agree at v0.4.2
- Claude Desktop loading fixed via Claude-native agents/ dir
- Agent-sync check prevents future drift between Claude and OpenCode agent defs
- Both teams have bounded autonomous modes with HITL gates preserved

**Negative:**
- Two agent definition locations (`agents/` for Claude, `.opencode/agent/core/`
  for OpenCode) must be kept in sync manually — mitigated by agent-sync-check.sh
- Brand-loop is a new skill that must be maintained separately from loopy

## Validation

- All JSON manifests parse cleanly
- `git diff --check` clean in both repos
- `agent-sync-check.sh` confirms 11 agents in sync
- Loopy skill + command vendored and registered
- Auto-mode skill + command created and registered
- Team Durham Claude manifest + brand-loop skill + brand-auto command created
- ADR logged to Allura Brain

## Layering (Final)

```
Team RAM:
  loopy (META)         → finds/crafts loops
    ↓
  /auto (orchestrator) → routes to ultra/ralph
    ↓
  ultra / ralph        → executes, returns evidence
    ↓
  Allura Brain         → canonical memory (group_id="allura-system")

Team Durham:
  brand-loop (META)    → finds/crafts brand loops
    ↓
  /brand-auto          → routes to Durham specialists
    ↓
  Durham agents        → execute, return evidence
    ↓
  Allura Brain         → canonical memory (group_id="allura-team-durham")
```

Both teams: bounded autonomy, HITL gates preserved, Brain-first, traces only.