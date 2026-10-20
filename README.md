# Team RAM

Plan, build, and review software with clear ownership and evidence of what changed.

Team RAM supplies ten specialist roles and ten public skills for OpenCode, Claude Code, and Codex. Brooks coordinates the work; Scout finds the relevant context; Woz implements; reviewers inspect the result. The host runtime supplies the model, tools, and permissions. Allura Brain is an optional memory connection.

Use this repository for the canonical source and project scaffolding. For the Claude/Codex catalog package, follow the [Allura plugin installation guide](https://github.com/Allura-Ecosystem/allura-plugins#installation).

## How Team RAM operates

```text
Task and acceptance criteria
  → Repository context and available evidence
  → Accountable owner and relevant specialists
  → Implementation and review
  → Executed checks, result, and remaining limits
```

This is the delivery contract, not evidence that agents have run. A bounded correction can keep one owner and a targeted check. Larger changes add independent review; protected operations retain their human approval requirements. See the [adaptive workflow](.opencode/contracts/adaptive-workflow.md).

## What the harness does

- **Clarifies the task:** Jobs helps establish the goal, acceptance criteria, and boundaries when those are missing.
- **Finds the context:** Scout identifies source files, existing decisions, risks, and relevant checks before implementation.
- **Routes specialist work:** Brooks assigns useful responsibilities and reconciles results. Independent tasks can run concurrently when the host supports real delegation.
- **Builds and reviews:** Woz owns implementation; relevant specialists review interfaces, maintainability, data, infrastructure, or measured performance.
- **Reports evidence:** Completion claims identify actual changes, checks, outcomes, and unresolved limits.
- **Uses memory when authorized:** Allura Brain adds scoped retrieval and outcome persistence. Missing memory is reported; local work can continue where the evidence is sufficient.

## Delivery flow

The harness defines interactive `DAY_BUILD`, bounded unattended `NIGHT_BUILD`, and a six-step `AUTO` contract: `Observe → Choose → Act → Verify → Record → Stop`. Runtime support and project authority determine which operations can execute. A mode does not grant permission for destructive, production, credential, or governance changes.

## Quick start

### 1. Clone and verify the canonical source

```bash
git clone https://github.com/Allura-Ecosystem/allura-team-ram.git
cd allura-team-ram
bun install
bun run validate:export
bun run lint
bun run typecheck
bun test
```

### 2. Install into a project

The package CLI performs no post-install mutation. Scaffolding is explicit:

```bash
# From a published package
bunx @allura/team-ram-harness init --target /path/to/project --runtime opencode

# Or from this checkout
node ./bin/team-ram.mjs init --target /path/to/project --runtime opencode
```

Use `--runtime claude`, `--runtime codex`, or `--runtime all` for another public runtime surface. Existing files are preserved unless `--force` is supplied.

### 3. Review optional model configuration

The default is to inherit the configured host model. Apply a preset only when you intend to change runtime configuration:

```bash
./scripts/apply-preset.sh --dry-run
./scripts/apply-preset.sh ollama
./scripts/apply-preset.sh --check
```

Preset application edits runtime configuration. Review the dry run first, especially in a host repository with local provider settings.

### 4. Start a governed task

In a host that exposes the installed agent, give Brooks a concrete request:

```text
@brooks add validation to the account import flow and prove it with tests
```

Ask for **Menu** or **Help** to see Next steps, Help with a prompt, Council, Work, Loop, Validate, and More. A clear request proceeds directly. These chat choices route to installed skills; they do not guarantee matching slash commands in every runtime.

Council can examine one decision with relevant RAM and Durham specialists when real delegation is available. Otherwise, prepare a council brief and state that specialists have not run. Loops need a goal, checks, iteration limit, and stopping conditions.

Expect context discovery before edits, an accountable owner, review appropriate to the change, and a factual result summary.

For detailed setup and host-project options, see [Installation](docs/installation.md). For models, permissions, memory, and service settings, see [Configuration](docs/configuration.md).

## Specialist lanes

| Lane | Agent | Accountable behavior |
|---|---|---|
| Architecture/orchestration | Brooks | Owns conceptual integrity, work decomposition, delegation, and reconciliation; does not replace the writer |
| Intent | Jobs | Clarifies goal, acceptance criteria, scope, and stop conditions |
| Context/recon | Scout | Read-only discovery and risk/context packet creation |
| Implementation | Woz | Primary writer; implements and runs targeted checks |
| Interface | Pike | Read-only API and surface-area review |
| Maintainability | Fowler | Reviews structure, types, lint, and safe refactoring |
| Diagnostics | Bellard | Reproduces and measures before proposing a fix |
| Performance | Carmack | Optimizes only measured bottlenecks |
| Data | Knuth | Reviews schema, migration, query, and data-integrity changes |
| Infrastructure | Hightower | Reviews CI/CD, containers, deployment, and observability |

The canonical role definitions live in this repository. Runtime mirrors are validated by the repository tooling.

## Configuration at a glance

| Surface | Purpose |
|---|---|
| `.opencode/team-ram-presets.jsonc` | Canonical model presets and fallback chains |
| `.opencode/agent/`, `.opencode/command/`, `.opencode/skills/` | Canonical repository source; legacy commands and broad skills remain source-only |
| `.claude/` and `.claude-plugin/` | Claude Code runtime and plugin surfaces |
| `.codex/` and `.codex-plugin/` | Codex runtime and plugin surfaces |
| `plugin.json` | Portable Team RAM plugin manifest |
| `codex-public-skills.json` | Explicit ten-skill portable discovery contract |
| `.mcp.json` | Optional MCP wiring; hosts must supply their own reachable services |
| `.env.example` | Optional HTTP and memory integration variables |
| `PUBLIC_EXPORT.json` | Exact public export contract by agents, skills, config, runtime, and docs |
| `SOURCE.json` | Canonical ownership and downstream generation contract |

`opencode.json` is a runnable repository example, not the canonical cross-repository export contract. Host-specific provider or credential configuration should stay local.

## Optional HTTP service

The optional Bun service exposes authenticated invocation and lifecycle endpoints for external orchestrators. Its executor is a text-only Anthropic transport; repository implementation and hydration require a tool-capable host.

```bash
cp .env.example .env
bun run service
curl http://localhost:7654/health
```

Set `HARNESS_API_KEY` before invoking authenticated endpoints. See [`.opencode/SERVICES.md`](.opencode/SERVICES.md) for the live endpoint contract.

## Standalone and ecosystem modes

Team RAM is independently installable and remains useful with no Allura Memory server and no sibling repository checkout.

- **Standalone:** static/preset routing, repository context, specialist delegation, review gates, local/runtime evidence. Memory lookups and durable trajectory promotion are unavailable and must be reported as degraded rather than fabricated.
- **With Allura Memory:** optional tenant-scoped retrieval, trajectory/evidence persistence, and curator workflows become available through the configured MCP/API boundary.
- **With allura-plugins:** this repository remains canonical. `allura-plugins` consumes a pinned generated export; downstream copies are not edited as source.
- **Durham and Mortagate:** domain/product teams consume Team RAM as a delivery harness. Their policy, tenant, data, and release authority remain in those products; Team RAM does not inherit it.

See [Ecosystem relationships and degraded behavior](docs/ecosystem-relationships.md) and [`SOURCE.json`](SOURCE.json).

## Public export and releases

`PUBLIC_EXPORT.json` is the machine-readable allowlist for package source. It defines exactly which agent, command, skill, configuration, runtime, and documentation files are public.

```bash
bun run check:codex-skills
bun run validate:packed
bun run validate:tarball
bun run validate:export
bun run export:public -- ./dist/public-export
bun run team-ram:doctor
```

CI rejects stale patterns, symlinked or unallowlisted Codex skills, missing or
extra public agent definitions, unclassified public files, package/manifest drift, or an authority
declaration that no longer names this repository. The `allura-plugins` catalog consumes a pinned commit, runs the export, and records generation provenance. It is a generated distribution, not a second content authority.

## Documentation

- [Installation](docs/installation.md)
- [Configuration](docs/configuration.md)
- [Ecosystem relationships and degraded behavior](docs/ecosystem-relationships.md)
- [Agents and routing](docs/agents.md)
- [Presets](docs/presets.md)
- [Dual-runtime guide](docs/dual-runtime.md)
- [Quick reference](docs/quick-reference.md)
- [Testing](docs/TESTING.md)
- [Architecture](https://github.com/Allura-Ecosystem/allura-team-ram/blob/main/ARCHITECTURE.md)
- [Contributing](https://github.com/Allura-Ecosystem/allura-team-ram/blob/main/CONTRIBUTING.md)

## Canonical source

This repository is the canonical standalone source for Team RAM. Ownership and export semantics are declared in [`SOURCE.json`](SOURCE.json); the public package boundary is declared in [`PUBLIC_EXPORT.json`](PUBLIC_EXPORT.json). Historical planning records may describe earlier ownership arrangements, but they do not override these machine-readable contracts.

MIT licensed. See [LICENSE](LICENSE).

## Adaptive workflows

Team RAM selects quick, standard, or sensitive delivery based on risk and scope.
See [.opencode/contracts/adaptive-workflow.md](.opencode/contracts/adaptive-workflow.md).
Scout output length never escalates a task, and the selected specialist owns the
first iteration as well as retries. Runtime and plugin agents are generated from
one source; run `node tooling/agent-sync/sync-agents.mjs --check` to detect drift.
Models inherit the configured host selection. Configure supported explicit tier
choices in `tooling/agent-sync/models.map.json`, then regenerate with `--apply`.

The standalone HTTP executor is a text-only Anthropic transport, not a workspace
coding runtime. Direct API mode needs both `ANTHROPIC_API_KEY` and a concrete
`TEAM_RAM_ANTHROPIC_MODEL`; CLI aliases such as `inherit` are rejected. Without a
backend it returns a failed diagnostic. Hydration and implementation requests
require a tool-capable Codex, Claude Code, or OpenCode host; generated text and model
confidence cannot establish completion. No existing task approval is renewed merely
because work crosses a persona boundary.
