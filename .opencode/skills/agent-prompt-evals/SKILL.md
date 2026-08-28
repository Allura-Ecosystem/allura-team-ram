---
name: agent-prompt-evals
description: "Evaluate agent prompts with regression fixtures."
version: 0.1.0
author: Sabir Asheed, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [prompts, evaluation, agents, tokens]
    related_skills: [skill-creator, model-routing]
---

# Agent Prompt Evals

Measure prompt size and score model outputs against stable routing, terminal-state,
token-budget, and evidence contracts. This skill evaluates behavior; it does not
select production models or modify prompts automatically.

## When to Use

- Before and after changing an agent definition.
- When migrating Sol/Terra/Luna or Claude model routes.
- When Scout, Brooks, or Durham selects the wrong route.
- When prompt or skill catalog growth increases startup tokens.
- Do not use for ordinary code tests that do not change agent behavior.

## Prerequisites

- Bun available in the Team RAM repository.
- Candidate model outputs normalized to the fixture result schema for behavioral grading.
- A clean baseline snapshot captured before prompt edits.

## How to Run

From the Team RAM repository, use `terminal` with:

```bash
bun run prompt:baseline
bun run prompt:eval
bun tooling/prompt-evals/prompt-eval.ts . --write evidence/prompt-evals/candidate.json
```

## Procedure

1. **Capture baseline** — write the current snapshot before editing prompts. Completion:
   baseline JSON records every core prompt and catalog description totals.
2. **Choose fixtures** — use `tooling/prompt-evals/fixtures.json`; add a fixture only
   for a demonstrated failure mode. Completion: expected route, terminal states,
   output budget, and evidence classes are explicit.
3. **Run candidate models** — execute the same fixture set against each configured
   model route. Completion: every output is normalized to:

```json
{
  "id": "scout-path-recon",
  "route": "scout",
  "terminal_state": "success",
  "output_tokens": 420,
  "evidence": ["file-path", "validation-command"]
}
```

4. **Grade** — call the evaluator for every fixture/result pair. Completion: no
   routing, terminal-state, token, or evidence violations remain.
5. **Compare** — compare candidate and baseline snapshots. Completion: token deltas
   are reported per prompt and for the skill-description catalog.
6. **Ship or rollback** — accept only a candidate that preserves fixture behavior
   while meeting the intended token/latency improvement. Completion: exact test and
   comparison evidence is attached to the change.

## Prompt Optimization Rules

- Start from the smallest role card that passes the fixtures.
- Add instructions or examples only for observed failures.
- Keep stable policy and role text before volatile task context for cache reuse.
- Use one or two tool examples when schemas do not express usage conventions.
- Prefer typed ContextPacket input over raw file dumps or session transcripts.
- Never trade away verification, tenant isolation, or HITL boundaries for fewer tokens.

## Pitfalls

- Static token estimates use `ceil(chars / 4)` and are comparative, not billing truth.
- A smaller prompt is not better if route accuracy or evidence completion regresses.
- Local executor mode loads definitions but does not run a live model; never score it
  as a successful behavioral evaluation.
- Do not compare models on different fixture mixes.
- Do not add broad trigger lists to descriptions; they are paid on every catalog load.

## Verification

- `bun run prompt:eval` passes.
- `bun test` passes across the repository.
- Candidate snapshot compares against the pre-edit baseline.
- Every changed prompt has at least one relevant fixture.
- No successful result exceeds its fixture output budget.
