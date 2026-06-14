# Loop Runner — Ultra Execution Protocol

## Pre-Loop Gate (MANDATORY)

Before entering the loop:

1. **Scout-first** — search Allura Brain for prior work on this objective
   ```
   allura-brain_memory_search({ query: "{objective}", group_id: "allura-system", limit: 5 })
   ```

2. **Read AI-GUIDELINES** — load `.claude/rules/AI-GUIDELINES.md` for documentation standards

3. **Resolve skills** — load any skills required by the task (e.g., `systematic-debugging` for bug fixes, `test-driven-development` for new features)

4. **Define objective** — fill the objective template from `PROMPT_ultra.md`

5. **Verify validation command** — confirm the validation command runs and produces a meaningful result (even if it currently fails)

## Loop Execution

```
iteration = 0

WHILE iteration < maxIterations:
    iteration += 1

    # 1. PLAN
    Identify the smallest valid slice that moves toward the objective.
    If no slice is obvious, STOP and escalate to Brooks.

    # 2. IMPLEMENT
    Make the change. Rules:
    - Minimal diff — change only what's needed
    - Reversible — prefer edits over deletions
    - No secrets — stop if credentials are encountered
    - No destructive ops — stop if rm -rf, DROP TABLE, force push, etc.

    # 3. VALIDATE
    Run the validation command(s) from the objective.
    Record: pass/fail, error message if fail.

    # 4. DECIDE
    IF validation passes AND objective is met:
        EXIT with status: COMPLETE
    ELIF validation passes BUT more slices remain:
        CONTINUE
    ELIF validation fails:
        IF same error for 3 consecutive iterations:
            TRIGGER struggle detector
            Log STRUGGLE_DETECTED to Brain
            Present hint to user, PAUSE for guidance
        ELSE:
            CONTINUE with adjusted approach
    ELIF stopCondition triggered:
        EXIT with status: BLOCKED
```

## Struggle Detection

The struggle detector fires when:

- **No file changes** in 3 consecutive iterations, OR
- **Same validation error** in 3 consecutive iterations, OR
- **Token consumption** exceeds 50% of context with no progress

On struggle:

1. Log `STRUGGLE_DETECTED` to Allura Brain
2. Generate a hint (what has been tried, what hasn't)
3. Present to user with options:
   - Continue with hint applied
   - Escalate to Brooks for architectural review
   - Abort and log findings

## Circuit Breaker

Hard stops that override the loop:

| Trigger | Action |
|---------|--------|
| `maxIterations` exceeded | EXIT BLOCKED — log to Brain |
| Destructive command detected | STOP — present to user for approval |
| Secret/credential in diff | STOP — do not commit, alert user |
| Context window > 80% consumed | EXIT BLOCKED — log state for continuation |

## Post-Loop (MANDATORY)

On every exit, regardless of status:

1. **Log to Brain:**
   ```
   allura-brain_memory_add({
     group_id: "allura-system",
     user_id: "ultra-loop",
     content: "ULTRA_LOOP_{COMPLETE|BLOCKED}: {summary}. Iterations: {N}. Validation: {pass|fail}. Files changed: [{list}].",
     metadata: { source: "conversation", agent_id: "ultra-loop", event_type: "ULTRA_LOOP_{COMPLETE|BLOCKED}" }
   })
   ```

2. **Report to user:**
   - What was done
   - What validation passed/failed
   - What remains (if blocked)
   - Suggested next action

3. **Do NOT:**
   - Declare done without validation evidence
   - Merge, deploy, or promote
   - Start a new loop without user confirmation
