# /skill-load

Execute a skill by routing it to a specialist agent executor.

## Usage

```bash
/skill-load <skill-name> [--executor <executor-name>]
```

## Examples

```bash
/skill-load code-review                       # Use default executor (@Pike)
/skill-load code-review --executor pike-interface-review     # Explicit routing
/skill-load postgres-optimization --executor woz-builder
```

## How It Works

1. Validates skill exists and is available
2. Routes to preferred executor (or specified override)
3. Executor receives skill context + permissions
4. Logs `SKILL_LOADED` event to PostgreSQL
5. Executor begins work

## Surgical Team Executors

| Executor | Specialty | Permissions |
| -------- | --------- | ----------- |
| `pike-interface-review` | Architecture review | Read-only (no writes) |
| `woz-builder` | Deep implementation | Full read/write |
| `fowler-refactor-gate` | Strategic planning | Read + planning tools |
| `ux` | Design + accessibility | Design tools only |
| `scout-recon` | Documentation search | Search tools only |
| `scout-recon` | Codebase patterns | Read + grep tools |
| `brooks-architect` | Todo coordination | Task + memory tools |
| `brooks-architect` | Orchestration | All tools (planning only) |
| `brooks-architect` | Skill creation & eval | All tools + subagents |
| `woz-builder` | Skill implementation | Full read/write + scripts |

## Result

```json
{
  "event": "SKILL_LOADED",
  "skill_name": "code-review",
  "executor": "pike-interface-review",
  "context": "project root directory",
  "permissions": ["read", "grep", "lsp"]
}
```

## Skill-Creator Integration

When loading `skill-creator`, Brooks orchestrates the full workflow:

```bash
/skill-load skill-creator              # Full: draft → test → review → improve → optimize
/skill-load skill-creator --improve     # Improve existing skill
/skill-load skill-creator --eval        # Run evals + benchmark
/skill-load skill-creator --optimize    # Description optimization only
```

See `/skill-create` for the complete skill-creator command.

**Note:** Only Brooks can route to executors. See `/skill-propose` for skill details.
