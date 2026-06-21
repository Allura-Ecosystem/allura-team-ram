# scripts/

## smoke-test.sh

Validates the Allura-TeamRam harness is structurally correct and functional across all three supported runtimes: Claude Code, OpenCode, and Codex.

### What it checks

1. **Structure (all runtimes)** -- no committed .env.local files, no leaked API keys, valid YAML frontmatter on agent definitions, SKILL.md presence in skill directories.

2. **Claude Code (.claude/)** -- agent count, frontmatter with `model:` field, skill directory count, commands directory.

3. **OpenCode (.opencode/)** -- agent directory uses `permission:` not `tools:` array, ralph/ has all 3 required files, skill count, opencode.json at root.

4. **Codex (.codex-plugin/)** -- plugin.json is valid JSON and all referenced files exist.

5. **Cross-runtime consistency** -- every Claude agent has an OpenCode counterpart, skill count drift is reported.

### When to run

- **Before push** -- catch structural regressions before they hit remote.
- **After clone** -- verify the harness is intact in a fresh checkout.
- **CI** -- add to your pipeline as a gate. Exit code 1 means at least one FAIL.

### Usage

```bash
./scripts/smoke-test.sh
```

### Dependencies

- bash (4.0+)
- python3 (JSON validation only)
- Standard unix tools (find, grep, wc)

### Exit codes

- `0` -- all checks passed (warnings are informational only)
- `1` -- at least one FAIL detected
