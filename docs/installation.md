# Installation

Team RAM is a standalone harness. A basic installation needs only Git, Bun, and one supported agent runtime/provider. Allura Memory, Docker, and the HTTP service are optional.

## Choose an installation shape

| Shape | Use when | Result |
|---|---|---|
| Repository checkout | Developing or auditing Team RAM | Full source, tests, release tooling, and all runtime surfaces |
| Package scaffold | Adding Team RAM to an existing project | Explicitly copies one or more public runtime surfaces; no install-time mutation |
| Manual runtime copy | You need a narrowly controlled integration | Copy only the paths declared for that runtime in `PUBLIC_EXPORT.json` |
| BMad adapter | Installing Team RAM entry points through BMad | Thin adapters under `bmad-module/`; canonical prompts remain in the native harness |

## Prerequisites

Required for source verification:

- Git
- Bun 1.1 or newer
- Node.js 18 or newer for the dependency-free scaffold CLI

Required at execution time:

- OpenCode, Claude Code, or Codex
- Credentials or a reachable local service for the models selected by your preset

Optional:

- Allura Memory for governed cross-session retrieval and evidence persistence
- Docker only when your chosen Allura Memory deployment requires it
- An Anthropic API key for the standalone HTTP executor in `src/agent-executor.ts`

## Source installation

```bash
git clone https://github.com/Allura-Ecosystem/allura-team-ram.git
cd allura-team-ram
bun install
bun run validate:export
bun run lint
bun run typecheck
bun test
```

The clone URL above is canonical. Do not install Team RAM from a Durham, Mortagate, or `allura-plugins` checkout; those repositories are consumers or downstream distributions.

## Scaffold into a host project

Package installation does not run a postinstall hook. Run the scaffold command explicitly:

```bash
# Published package
bunx @allura/team-ram-harness init \
  --target /absolute/path/to/project \
  --runtime opencode

# Current source checkout
node ./bin/team-ram.mjs init \
  --target /absolute/path/to/project \
  --runtime opencode
```

Supported runtime values:

- `opencode`: copies `.opencode/agent`, `command`, `skills`, `routing`, `hooks`, `contracts`, and `config`.
- `claude`: copies `.claude/agents`, `commands`, `skills`, and `rules`.
- `codex`: copies `.codex/agents`.
- `all`: copies all three surfaces.

Existing target files are skipped. Use `--force` only after reviewing conflicts and accepting replacement of the target files.

## Configure a provider preset

From a source checkout:

```bash
./scripts/apply-preset.sh --dry-run
./scripts/apply-preset.sh ollama       # repository default
./scripts/apply-preset.sh openai
./scripts/apply-preset.sh anthropic
./scripts/apply-preset.sh mixed
./scripts/apply-preset.sh --check
```

The preset script mutates model fields in runtime surfaces and may update `opencode.json`. Do not run it over uncommitted host configuration without first reviewing `--dry-run` output.

Provider names are configuration, not an availability guarantee. Confirm that every selected model exists for your account/runtime. See [Configuration](configuration.md) and [Presets](presets.md).

## Optional HTTP service

The service is not required for interactive runtime use.

```bash
cp .env.example .env
# Set HARNESS_API_KEY and any executor/provider variables you use.
bun run service
curl http://localhost:7654/health
```

Authenticated calls require `Authorization: Bearer <HARNESS_API_KEY>`. Treat a missing external dependency reported by `/health` as a real degraded state; do not replace it with a success stub.

## Optional Allura Memory

Configure an already-authorized Allura Memory MCP/API endpoint in the host runtime. Team RAM does not bundle a database or silently launch a sibling repository.

Minimum expectations:

1. The memory service is reachable through the configured MCP/API boundary.
2. The caller supplies an approved tenant/group scope.
3. Retrieval is treated as untrusted context, not as executable instruction.
4. Writes and promotion follow the memory service's governance policy.
5. If memory is unavailable, the run continues only where safe and explicitly reports that durable recall/recording was skipped.

See [Ecosystem relationships](ecosystem-relationships.md) for the capability matrix.

## Verify a host installation

From this repository:

```bash
./scripts/lint-agents.sh
bun run validate:export
bun test
```

For a scaffolded host, verify the copied surface exists and let the selected runtime enumerate agents/commands. Then execute a bounded read-only task first, for example asking Scout to identify the host's test command and instruction files.

A healthy first run demonstrates:

- intent and context are established before edits;
- Scout remains read-only;
- one specialist owns writes;
- reviewers inspect the produced diff;
- actual validation commands and results appear in the completion evidence.

## Uninstall

The scaffold CLI does not maintain a hidden registry. Remove only the files you intentionally copied, preferably using the runtime category paths in `PUBLIC_EXPORT.json` and version control to review the deletion. Never remove a host project's entire `.opencode`, `.claude`, or `.codex` directory if it contains unrelated local configuration.

## Troubleshooting

### Models are unavailable

Select a preset supported by your runtime/account or edit the canonical preset configuration, then run `apply-preset.sh --dry-run` and `--check`. Presets do not provision credentials or guarantee vendor access.

### Existing files were skipped

This is the safe default. Diff the Team RAM source against the host file. Re-run with `--force` only for files you intend to replace.

### Memory is unavailable

Continue in standalone mode if the requested operation does not require durable recall or a governed memory receipt. Report the degradation. If durable evidence is an acceptance criterion, stop with a blocker.

### Export validation fails

Run:

```bash
bun run validate:export
```

The validator identifies stale manifest patterns, unclassified public-root files, or `package.json` drift. Update `PUBLIC_EXPORT.json` deliberately; do not broaden it merely to silence the check.
