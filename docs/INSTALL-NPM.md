# Installing Team RAM via npm

The harness publishes to npm as **`@allura/team-ram-harness`**. This is the
native OpenCode distribution path — a versioned package you can install and
update with your package manager, instead of copying `.opencode/` by hand.

## Scaffold into a project

```bash
# no install step runs code — you opt in explicitly
bunx @allura/team-ram-harness init          # or: npx @allura/team-ram-harness init
```

That copies the OpenCode harness (`.opencode/agent`, `command`, `skills`,
`routing`, `hooks`, `contracts`, `config`) into the current directory. Point
your OpenCode config at the copied tree and you have the full surgical team.

### Options

```
team-ram init [options]
  -t, --target <dir>     Target project directory (default: cwd)
  -r, --runtime <name>   opencode | claude | codex | all (default: opencode)
  -f, --force            Overwrite existing files
  -h, --help             Show help
  -v, --version          Show version
```

- `--runtime claude` / `--runtime codex` install the generated mirrors for
  those runtimes; `--runtime all` installs every mirror.
- Re-running is idempotent — existing files are skipped unless `--force`.
- Dangling symlinks in the source tree are reported and skipped, never copied.

## Why no postinstall

Per the repo's `bun-security` policy, this package **never runs code on
install**. There is no `preinstall`/`postinstall` hook. Scaffolding happens
only when you run `team-ram init` yourself. This is deliberate: a harness that
silently wrote files into your project on `npm install` would be exactly the
supply-chain behavior the policy exists to prevent.

## Relationship to the other distribution surfaces

| Surface | Path | Use |
|---------|------|-----|
| npm (this) | `@allura/team-ram-harness` | Native OpenCode; versioned + updatable |
| Claude Code plugin | `.claude-plugin/marketplace.json` | `/plugin marketplace add Allura-Ecosystem/allura-team-ram` |
| awesome-opencode | directory listing | Discovery (PR #496) |
| `install.sh` | shell copy | Legacy / no-npm environments |

All of these ship the **same** generated agent definitions. The source of truth
is `.opencode/agent/**` → `tooling/agent-sync/sync-agents.mjs` regenerates the
`.claude` and `.codex` mirrors. No distribution surface hand-maintains its own
copy — that is the drift this harness is built to prevent.
