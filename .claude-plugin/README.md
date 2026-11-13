# Team RAM for Claude Code

Software planning, implementation, and review through ten specialist roles. Brooks coordinates the task; the current Claude runtime supplies execution tools and permissions.

## Install

Use the Allura plugin marketplace:

```text
/plugin marketplace add Allura-Ecosystem/allura-plugins
/plugin install team-ram-coding@allura-ecosystem
```

`team-ram-coding` is the catalog alias. This standalone source retains the Claude manifest identity `team-ram-harness`; [source ownership](../SOURCE.json) and the [public export contract](../PUBLIC_EXPORT.json) define the relationship.

For project scaffolding and local development, follow the [main README](../README.md#quick-start).

## Start a task

Give Brooks the goal, relevant inputs, constraints, and desired checks. For example:

> Review this API change for interface complexity and migration risk. Report findings with file references before proposing edits.

Ask for **Menu** or **Help** when you need next steps, prompt help, Council, a work loop, or validation guidance. Clear requests proceed directly.

## Roles

| Agent | Responsibility |
|---|---|
| Brooks | Architecture, ownership, and coordination |
| Jobs | Intent, scope, and acceptance criteria |
| Scout | Read-only repository discovery |
| Woz | Implementation and targeted checks |
| Pike | Interface simplicity |
| Fowler | Maintainability and safe refactoring |
| Bellard | Diagnostics and measurement |
| Carmack | Measured performance improvements |
| Knuth | Data models, queries, and integrity |
| Hightower | Infrastructure and delivery |

Roles describe responsibilities. A role definition does not prove invocation, and plugin installation does not grant new permissions. Optional memory requires an authorized Allura Brain connection.

## Source and license

Agent mirrors are generated from canonical `.opencode/` source. Make changes there and regenerate; do not hand-edit the mirrors. See [agent sync](../tooling/agent-sync/README.md).

MIT — see [LICENSE](../LICENSE).
