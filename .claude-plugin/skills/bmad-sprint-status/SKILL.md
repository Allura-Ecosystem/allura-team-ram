---
name: bmad-sprint-status
description: >
  Reads and summarizes sprint-status.yaml with actionable recommendations. Activated
  when the user says "sprint status", "show sprint", "what's next", "sprint summary",
  "check sprint progress", or "validate sprint". Supports three modes: interactive
  (default), data (returns values for other flows), and validate (checks file integrity).
---

# BMAD Sprint Status

Read, summarize, and act on `sprint-status.yaml`. Detects risks, maps legacy statuses, recommends the next action, and offers quick follow-through.

## Activation

When the user asks about sprint status, progress, or next steps, run this skill. Default to interactive mode unless another skill invokes it programmatically (data mode) or the user explicitly requests validation.

## Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| `interactive` | Default, user-facing | Full summary + recommendations + action menu |
| `data` | Called by another skill/flow | Return structured values, no display |
| `validate` | User says "validate sprint" | Check file integrity, report issues, no actions |

## Step 1: Locate sprint-status.yaml

Search in order:
1. `stories/sprint-status.yaml`
2. `_bmad/sprint-status.yaml`
3. Project root `sprint-status.yaml`
4. Any `**/sprint-status.yaml` in the workspace

If not found:
- Interactive mode: suggest running `team-ram:bmad-sprint-planning` to generate it
- Data mode: return `{ found: false }`
- Validate mode: report missing file

## Step 2: Parse development_status

Read the `development_status` key from the YAML. Classify each entry by its key pattern:

| Pattern | Classification |
|---------|---------------|
| `epic-{num}` (no story suffix) | Epic |
| `*-retrospective` | Retrospective |
| Everything else | Story |

For each entry, extract:
- `key`: the YAML key
- `status`: the status value
- `title`: the title value (if present)
- `epic`: the parent epic reference (if present)

## Step 3: Map Legacy Statuses

If any entry has a legacy status, map it transparently:

| Legacy Status | Maps To | Note |
|---------------|---------|------|
| `drafted` | `ready-for-dev` | Story file exists but no dev started |
| `contexted` | `in-progress` | Context gathered, development active |
| `complete` | `done` | Finished |

Log each mapping so the user knows what was translated. In data mode, return both original and mapped values.

## Step 4: Count and Classify

Build status counts:

### Story Counts
```
backlog:        {n}
ready-for-dev:  {n}
in-progress:    {n}
review:         {n}
done:           {n}
blocked:        {n}  (if any)
```

### Epic Counts
```
backlog:      {n}
in-progress:  {n}
done:         {n}
```

### Retrospective Counts
```
optional: {n}
done:     {n}
```

### Derived Metrics
- **Velocity**: `done / total stories` as percentage
- **WIP**: count of `in-progress` stories (flag if > 3 as potential overcommit)
- **Pipeline**: count of `ready-for-dev` stories waiting

## Step 5: Detect Risks

Check for these risk conditions:

| Risk | Detection | Severity |
|------|-----------|----------|
| Stale file | File modification time > 7 days ago | Warning |
| Orphaned stories | Story references an epic key that does not exist in the file | Error |
| Review backlog | More than 2 stories in `review` status | Warning |
| WIP overload | More than 3 stories `in-progress` simultaneously | Warning |
| Empty sprint | Zero stories in any status other than `backlog` | Info |
| Epic/story mismatch | Epic marked `done` but has stories not `done` | Error |
| Epic stale | Epic is `backlog` but has `in-progress` or `review` stories | Warning |

## Step 6: Recommend Next Action

Priority-ordered recommendation engine:

| Priority | Condition | Recommendation | Suggested Skill |
|----------|-----------|----------------|-----------------|
| 1 | Any story `in-progress` | Continue development on the active story | `team-ram:bmad-quick-dev` |
| 2 | Any story in `review` | Complete code review | (manual or code-review flow) |
| 3 | Any story `ready-for-dev` | Start developing the next ready story | `team-ram:bmad-quick-dev` |
| 4 | Stories only in `backlog` | Create a story file to advance to ready | `team-ram:bmad-sprint-planning` |
| 5 | All stories `done`, retro `optional` | Run retrospective | (retrospective flow) |
| 6 | All stories `done`, retro `done` | Sprint complete — plan next sprint | `team-ram:bmad-sprint-planning` |

Pick the FIRST matching condition. If multiple stories match the same priority, prefer the one with the lowest epic number, then lowest story number.

## Step 7: Display (Interactive Mode Only)

Present the summary in a clear, scannable format:

```
Sprint Status
=============
File: stories/sprint-status.yaml
Last modified: {date}

Progress: {done}/{total} stories ({velocity}%)
  [=========>          ] 45%

Epics:  {done}/{total} done
Stories breakdown:
  backlog:        {n}
  ready-for-dev:  {n}
  in-progress:    {n}  {⚠ WIP overload if >3}
  review:         {n}
  done:           {n}

{Risk warnings, if any}

Recommended: {action description}
  Target: {story key} — "{story title}"

Actions:
  [1] Run recommended action
  [2] Show stories grouped by epic
  [3] Show raw status data
  [4] Validate file integrity
  [5] Exit
```

**[CHECKPOINT]** — Wait for user selection before proceeding.

### Action Handlers

**[1] Run recommended** — Invoke the suggested skill with the target story context.

**[2] Show grouped** — Display stories organized under their parent epic, with status indicators:
```
Epic 1: {Title} [in-progress]
  ✅ 1-1-story-name (done)
  🔨 1-2-story-name (in-progress)
  📋 1-3-story-name (ready-for-dev)
  ⬜ 1-4-story-name (backlog)
  🔍 Epic 1 Retrospective (optional)
```

**[3] Show raw** — Print the parsed YAML data as-is.

**[4] Validate** — Switch to validate mode and run Step 8.

**[5] Exit** — End the skill.

## Step 8: Validate Mode

Run all risk checks from Step 5 plus additional integrity checks:

- All keys follow expected naming patterns
- All statuses are valid values per the state machines
- All story `epic` references point to existing epic keys
- No duplicate keys
- YAML is well-formed
- Metadata comments are present (header block)

Report results:

```
Sprint Status Validation
========================
File: {path}

Checks:
  ✅ YAML well-formed
  ✅ {n} keys follow naming convention
  ✅ All statuses valid
  ⚠️  2 stories reference non-existent epic
  ✅ No duplicates
  ⚠️  File is 12 days old — may be stale

Result: {PASS | WARN | FAIL}
```

## Data Mode Return Shape

When invoked by another skill, return a structured object:

```yaml
found: true
path: "stories/sprint-status.yaml"
epics:
  total: 3
  done: 1
  in_progress: 1
  backlog: 1
stories:
  total: 12
  backlog: 3
  ready_for_dev: 2
  in_progress: 2
  review: 1
  done: 4
velocity: 33
recommended_action: "dev-story"
recommended_target: "2-3-implement-search"
risks: ["wip-overload"]
legacy_mappings: {"drafted": "ready-for-dev"}
```

## Brain Integration

After displaying status, optionally record a checkpoint:

```
allura-memory-cowork:remember
  content: "Sprint check: {velocity}% complete. {in_progress} in progress, {review} in review. Next: {recommended_action} on {target}."
  tags: sprint-status, bmad, checkpoint
```

Before analysis, search for prior sprint context:

```
allura-memory-cowork:search-memory
  query: "sprint status progress"
```

## Cross-Skill References

- To generate or regenerate the file: `team-ram:bmad-sprint-planning`
- To act on a recommended story: `team-ram:bmad-quick-dev`
