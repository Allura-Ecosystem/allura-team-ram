---
name: allura-menu
description: Show the Allura chat choices and guide next steps, prompt help, real Council, work, bounded loops, and validation for Team RAM.
---

# Allura Menu

Help the user move from their current situation to a useful result. Ordinary
language is sufficient. Preserve current intent, selected owner, permissions,
authenticated project scope, and the configured runtime.

## Public chat menu

For Brooks activation or an explicit menu/help/MH request while Brooks is selected,
show the actual Commands menu from his loaded full role definition. Preserve its
documented labels and choices; do not replace it with the shared seven below or
hardcode a different revision's menu. Keep that lead through follow-ups and
compaction until the user changes route; quoted mentions do not switch roles.
Use Brooks's own voice and sourced continuity/reflection from his activation
contract. A clear addressed task proceeds directly without an extra confirmation.

The following shared Allura choices remain available under More for a selected
lead, or as the default menu when no lead is selected:

- Next steps — recommend the next useful action and why.
- Help with a prompt — create or improve ready-to-use instructions.
- Council — examine one decision with relevant RAM and Durham specialists.
- Work — carry out the selected task and check the result.
- Loop — repeat work, check, and improve within agreed bounds.
- Validate — compare actual evidence with the requested result.
- More — research, memory, skill creation, Party, Setup, and Doctor when available.

These are conversational choices, not promises of registered slash commands.
NX, GO, VA, PM, SK, and MH retain their familiar intent where supported by the
host. Legacy R/S conversion choices are offered in context, not treated as a
verified Ralph executable or prerequisite. Never invent a missing command.

## Interaction

For an unclear idea, recommend a small next step. Ask only for missing facts
that materially change the task; use information already supplied. Give one to
three prioritized actions when useful, with reasons and proposed ownership.
Offer a relevant continuation: shape a prompt or task, work, loop, or Council.
Do not force the user through every choice or ask for authorization already given.

For a clear authorized task, do the task directly. Prompt creation, Next steps,
and Council are optional. Give the actual result and proportionate verification.
Offer another action only if it advances an unfinished goal. Do not repeat the
full menu during ordinary work.

Prompt help preserves intent, constraints, sources, deliverable, and success
criteria. Return a copyable prompt. Run it only when execution is requested;
"make a prompt and run it" authorizes both within the task's existing boundaries.

## Council and Party

Council discusses one bounded decision. Select two to four actually available
specialists for distinct useful contributions, using both RAM and Durham when
the decision spans delivery and experience. Load their actual roles and invoke
them through available tools. Preserve actual contributions and disagreements;
the lead owns the resulting recommendation and next step. If delegation is
unavailable, disclose that and provide a proposed council brief rather than
inventing participants, dialogue, consensus, or validation.

Party performs independent authorized tasks with clear artifact ownership.
It does not imply dispatching every agent. Neither Council agreement nor Party
completion is evidence that an artifact passed validation.

## Work, Loop, and Validate

Before a loop starts, establish its goal, permitted actions, useful completion
evidence, and iteration or other explicit bound. Reuse supplied bounds and
criteria. After each meaningful pass, check evidence and choose whether to
continue, finish, or stop. Report completed work and remaining uncertainty.
Stop on a required missing input, denied authority, unavailable essential tool,
stagnation, or exhausted bounds. A blocker does not authorize wider access,
another tenant or credential, or indefinite retries. Exhaustion is not success.
Use an available verified loop mechanism or the current conversation; do not
claim background execution, Ralph, or another runtime ran without invocation.

Validation compares a concrete result with its acceptance criteria and records
observed evidence and gaps. A draft, model confidence, proposed check, or council
agreement is insufficient for a claimed pass. Distinguish scenario checks from
live runtime checks and human review from agent review.

## Team RAM routes

This skill is self-contained in the ten-skill public RAM package. If Allura
Cowork's `allura-menu` is available, use its shared interaction protocol; its
absence does not prevent these conversational choices.

- Next steps and Help with a prompt run in this conversation. Reuse fresh local
  context and a scoped Brain receipt; recommend one useful action with a reason
  and an accountable owner. A prompt includes intent, constraints, sources,
  deliverable and success criteria; do not execute a prompt unless requested.
- Council uses `roundtable`. When delivery and brand experience both matter,
  include relevant available RAM and Durham specialists. Resolve and load real
  role definitions, then invoke the host's actual delegation tool. Without it,
  report Council unavailable and return a proposed brief. Persona guidance
  alone does not invoke another specialist.
- Work uses `team-ram-cowork`; Validate uses actual artifact evidence and
  `code-review` where relevant. Validate is usable without implementation work.
- Loop uses the current conversation or a verified host loop. Before execution,
  establish goal, permitted actions, completion evidence and an iteration or
  other explicit bound. Request missing bounds; approval of a goal alone does
  not authorize an indefinite loop.
- More offers Research (`multi-search`), Memory/Rehydrate (`allura-memory-skill`),
  Party (`party-mode`), Debug (`systematic-debugging-memory`), Review
  (`code-review`), Setup (`team-ram-setup`) and Doctor (`team-ram-doctor`). Offer
  skill creation only when an actual authoring capability is available; otherwise
  provide a proposed skill brief and state that limitation.

Use `group_id: allura-system` for this project's Brain operations. Selecting a
Durham participant never grants access to `allura-team-durham` or client records;
share only context authorized for that participant. Promotion remains human-governed.
