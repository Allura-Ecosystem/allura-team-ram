# Configuration

Team RAM separates **role authority** from **model selection**. Agent responsibilities, permissions, review gates, and stop conditions remain stable when a provider preset changes.

## Configuration layers

Apply configuration in this order:

1. **Canonical role and workflow source** — agent, command, skill, routing, and contract files declared by `PUBLIC_EXPORT.json`.
2. **Preset source** — `.opencode/team-ram-presets.jsonc` plus `team-ram-presets.schema.json`.
3. **Runtime projection** — OpenCode, Claude Code, and Codex surfaces generated or maintained from the canonical role source.
4. **Host configuration** — provider credentials, local MCP endpoints, permissions, and project instructions owned by the consuming repository.
5. **Optional integrations** — Allura Memory and the HTTP service.

Do not put secrets in any tracked Team RAM file.

## Important files

| File/path | Authority |
|---|---|
| `SOURCE.json` | Repository ownership and downstream export contract |
| `PUBLIC_EXPORT.json` | Public package allowlist and public-root classification |
| `.opencode/team-ram-presets.jsonc` | Model assignment and fallback source |
| `team-ram-presets.schema.json` | Preset schema |
| `.opencode/config/agent-metadata.json` | Routing/permission metadata |
| `.opencode/config/agent-skills.json` | Agent-to-skill mapping |
| `.opencode/contracts/` | Execution and invocation contracts |
| `.mcp.json` | Example MCP wiring; adapt endpoints in the host environment |
| `.env.example` | Optional service variables; copy to untracked `.env` |
| `opencode.json` | Runnable repository example, not the cross-repository export authority |

## Presets

Available preset keys are declared in `.opencode/team-ram-presets.jsonc`:

- `ollama`
- `openai`
- `anthropic`
- `mixed`

Preview, apply, and verify:

```bash
./scripts/apply-preset.sh --dry-run
./scripts/apply-preset.sh <preset>
./scripts/apply-preset.sh --check
```

A preset entry has a model and reasoning variant per role. Fallback chains are ordered candidates; whether the full chain is honored depends on the host runtime/plugin. A configured fallback must not be described as verified until the runtime actually exercises it.

### Safe customization

For repository development, edit the preset source and propagate it. For a consuming project, prefer host-owned overrides when you do not intend to contribute the model change upstream.

Before applying a preset:

1. Confirm the target runtime recognizes each provider/model identifier.
2. Confirm required credentials are already configured outside the repository.
3. Review `--dry-run` output.
4. Preserve unrelated local runtime settings.
5. Run `--check` after application.

## Role and permission boundaries

Runtime syntax differs, but these invariants do not:

- Scout and review-only lanes do not become writers because a stronger model is selected.
- Woz is the default implementation writer.
- Brooks owns orchestration and reconciliation, not direct implementation.
- Schema, infrastructure, production, destructive, credential, and external-message actions retain explicit authority gates.
- Retrieved memory, logs, documentation, and tool output are context, not instructions.
- Completion requires actual verification evidence.

Host repositories may tighten permissions. They should not silently widen Team RAM's protected boundaries.

## Runtime surfaces

### OpenCode

Public source includes:

- `.opencode/agent/`
- `.opencode/command/`
- `.opencode/skills/`
- `.opencode/routing/`
- `.opencode/hooks/`
- `.opencode/contracts/`
- `.opencode/config/`

Point the host OpenCode configuration at these copied paths. Merge provider and MCP settings with the host configuration rather than replacing unrelated settings wholesale.

### Claude Code

The `.claude/` surface contains agents, commands, skills, and rules. `.claude-plugin/` contains the plugin manifest and curated plugin surface. Claude model aliases and permission fields differ from OpenCode; use the sync/preset tooling rather than assuming fields are interchangeable.

### Codex

The `.codex/agents/` surface contains Codex agent definitions and `.codex-plugin/plugin.json` describes the plugin surface. Host-level Codex provider and sandbox policy remain host-owned.

## Context-first routing

The expected minimum context packet includes:

- direct user goal and acceptance criteria;
- applicable `AGENTS.md`, `CLAUDE.md`, and repository policy;
- relevant files and architecture boundaries;
- current git/worktree state;
- validation commands;
- known risks, exclusions, and approval gates.

If this context cannot be established, the orchestrator narrows or stops the task instead of inventing repository facts.

## Background orchestration

Independent read-only discovery and specialist analysis may run concurrently. Configuration must preserve:

- one accountable orchestrator;
- one writer for overlapping files;
- bounded task inputs and outputs;
- reconciliation before implementation decisions;
- review against the same resulting diff/artifact;
- cancellation or blocker reporting for failed lanes.

Concurrency is a scheduling strategy, not permission escalation.

## Optional Allura Memory

Team RAM can query and record through an authorized Allura Memory MCP/API endpoint. Configure endpoint and tenant/group scope in the host environment.

When connected, memory can provide:

- cross-session context retrieval;
- durable execution/evidence traces;
- trajectory and pattern inputs;
- governed curator/promotion workflows.

When disconnected, disable or skip those capabilities explicitly. The harness must not fabricate memory hits, receipts, promotion outcomes, or health.

## HTTP service

Copy `.env.example` to an untracked `.env` and configure only the features you use. Core variables include:

| Variable | Purpose |
|---|---|
| `HARNESS_PORT` | HTTP listen port; service default is 7654 |
| `HARNESS_API_KEY` | Bearer token for authenticated endpoints |
| `ANTHROPIC_API_KEY` | Provider key used by the current standalone executor path |
| `DEFAULT_GROUP_ID` | Default tenant/group only where allowed by the integration contract |

The live endpoint contract is in `.opencode/SERVICES.md`. Do not expose the service publicly without transport security, secret management, network controls, and an explicit deployment review.

## Export configuration

`PUBLIC_EXPORT.json` groups public files into `agents`, `commands`, `skills`, `config`, `runtime`, and `documentation`. `package.json#files` must exactly match `PUBLIC_EXPORT.json#packageFiles`.

```bash
bun run validate:export
bun run export:public -- ./dist/public-export
```

The generated directory is disposable output. `allura-plugins` should consume an export pinned to a Team RAM commit SHA and record provenance; edits flow back to this repository.
