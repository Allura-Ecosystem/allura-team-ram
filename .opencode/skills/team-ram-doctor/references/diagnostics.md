# Doctor diagnostics

| Code | Meaning | Remediation |
|---|---|---|
| `VERSION_DRIFT` | Package, root manifest, compatibility manifest, or installed copy differs | Rebuild and reinstall through the normal plugin manager. |
| `SKILL_MISSING` | An allowlisted skill or `SKILL.md` is absent | Run `bun run sync:codex-skills` in canonical source, validate, then reinstall. |
| `SKILL_SYMLINK` | Packed public content still depends on a symlink | Regenerate the materialized public skills; never patch cache content. |
| `SKILL_DUPLICATE` | Two discovered skills declare the same name | Keep one owning plugin or narrow the enabled plugin set. |
| `DESCRIPTION_LARGE` | Discoverable metadata exceeds the token budget | Shorten frontmatter and move detail into the skill body or `references/`. |
| `AGENT_DRIFT` | A canonical agent mirror is missing or generated content differs | Run the agent sync check, review, then regenerate from canonical source. |
| `MODE_MISSING` | A runtime mode is no longer advertised | Restore the approved mode contract before release. |
| `BRAIN_*` | Live MCP check is unavailable, unauthorized, halted, or unreachable | Repair the host MCP connection without changing identity or tenant silently. |

Doctor output is evidence, not permission to mutate files, credentials,
marketplace configuration, or memory.
