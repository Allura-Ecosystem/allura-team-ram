# /skill-propose

Propose a skill and see which specialist agent handles it.

## Usage

```bash
/skill-propose <skill-name>
```

## Examples

```bash
/skill-propose code-review           # Code review specialist (@Pike)
/skill-propose postgres-optimization # Database specialist (@Woz)
/skill-propose system-design         # Architecture specialist (@Fowler)
```

## How It Works

1. Harness looks up skill in registry
2. Shows skill metadata: purpose, preferred executor, requirements
3. Logs `SKILL_PROPOSED` event to PostgreSQL
4. Shows next step: execute with `/skill-load`

## Surgical Team

| Skill                      | Executor     | Specialty                                    |
| -------------------------- | ------------ | -------------------------------------------- |
| `code-review`              | `@Pike`      | Read-only architecture review                |
| `postgres-optimization`    | `@Knuth`     | Deep database work                           |
| `system-design`            | `@Fowler`    | Strategic planning                           |
| `frontend-design`          | `@ux`        | Accessibility-first design                   |
| `deep-research`            | `@Scout`     | Documentation search                         |
| `codebase-search`          | `@Scout`     | Pattern discovery                            |
| `intelligence-sources`     | `@Scout`     | Intelligence source discovery and evaluation |
| `multi-search`             | `@Scout`     | Multi-source research orchestration          |
| `mcp-builder`              | `@Woz`       | MCP server construction                      |
| `skill-creator`            | `@Brooks`    | Skill creation, improvement, eval, and description optimization |
| `skill-creator --improve`  | `@Brooks`    | Improve existing skill with eval loop       |
| `skill-creator --eval`     | `@Brooks`    | Run evals and benchmark skill performance   |
| `skill-creator --optimize` | `@Brooks`    | Optimize skill description for triggering   |
| `github`                   | `@Woz`       | GitHub operations                            |
| `mcp-docker`               | `@Hightower` | Docker-based MCP management                  |
| `mcp-docker-memory-system` | `@Knuth`     | Memory system MCP operations                 |
| `memory-client`            | `@Brooks`    | Allura Brain memory operations               |
| `systematic-debugging`     | `@Bellard`   | Systematic debugging with memory             |
| `party-mode`               | `@Brooks`    | Parallel agent orchestration                 |
| `task-management`         | `@Brooks`    | Task tracking, deps, and management           |
| `task-management`          | `@Brooks`    | Task tracking and management                 |

## Result

```json
{
  "event": "SKILL_PROPOSED",
  "skill_name": "code-review",
  "executor": "pike-interface-review",
  "description": "Read-only code review and architecture feedback",
  "requirements": ["Can read source files", "Cannot write code"]
}
```

**Note:** Only Brooks routes to specific executors. See `/skill-load`.
