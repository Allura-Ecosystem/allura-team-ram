---
description: "Ultra work-until-done — bounded Team RAM execution until validation passes"
allowed-tools: ["Read", "Bash", "Glob", "Grep", "Edit", "Write", "mcp__allura-brain__*"]
---

# Ultra Work-Until-Done (`ultra`)

`ultra` is the canonical bounded loop for finishing concrete work. `ulw` remains a legacy alias.

## Mode: `$ARGUMENTS`

Default mode is **work**.

- `work` — plan, implement, validate, repeat until done or blocked
- `plan` — analyze scope and update the loop plan only
- `status` — summarize current loop status, blockers, and next action

## Protocol

### If Mode is `work`

1. Read `.claude/rules/AI-GUIDELINES.md`
2. Read `.opencode/ralph/PROMPT_ultra.md`
3. Read `.opencode/ralph/loop-runner.md`
4. Hydrate local context and search Allura Brain before editing
5. Resolve required skills before implementation
6. **Require an explicit validation command.** If the objective does not
   specify one, ask the user before proceeding. "Lightest meaningful check"
   is not a check — a command is a check (e.g. `bun run typecheck`, `bun test
   src/path/to/test.ts`, `python3 -m json.tool <file>`).
7. **Re-read current state** before implementing. Do not carry stale
   assumptions from a prior iteration — read the file or run the check again.
8. Implement the smallest valid slice
9. Validate with the **specified** command — not self-graded judgment
10. Repeat until one of these **terminal states** is reached:
    - **Success** — validation passes, objective met
    - **Clean no-op** — nothing to change, validation already passes
    - **Blocked** — hard blocker reached (destructive risk, secret risk,
      unclear irreversible change)
    - **Exhausted** — `maxIterations` exceeded (default 10, per
      PROMPT_ultra.md)
    - **No progress** — circuit breaker trips (3 iterations with no file
      changes, per PROMPT_ultra.md)
    - **Approval required** — destructive, irreversible, production, or
      external action detected; halt and ask

    Never report an error or exhausted budget as success.

### If Mode is `plan`

1. Read `.opencode/ralph/PROMPT_ultra.md`
2. Review current repo state and identify the next bounded slice
3. Update the loop plan only
4. Do not implement

### If Mode is `status`

1. Summarize the current plan, blockers, and validation state
2. Report whether the loop is safe to continue

## Loop Rules

- Scout-first is mandatory.
- **An explicit validation command is required** — "lightest meaningful check"
  is not a check. If the user did not supply one, ask before proceeding.
- **Re-read current state each iteration** — do not act on stale assumptions
  from a prior pass.
- Validation happens before declaring done. Never report an error as success.
- Stop on destructive risk, secret risk, or an unclear irreversible change.
- Keep changes minimal and reversible.
- `ultra` has no final governance authority; it executes work only.
- Terminal states: **success · clean no-op · blocked · exhausted · no progress
  · approval required**. Name which one was reached when the loop exits.
