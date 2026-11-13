---
name: allura-memory-core
description: Govern OpenClaw retrieval and concise outcome traces with authenticated tenant scope and human-reviewed canonical promotion.
---

# Governed Memory for OpenClaw

Use `allura-memory-skill` for canonical search/add call shapes and supported
capability checks. This applies to interactive, scheduled, and delegated work.

1. Resolve the authorized project and `group_id` from verified session context.
   If scope is unknown or rejected, stop memory calls; never substitute a default
   tenant to evade validation. Transport supplies the authenticated principal.
2. Search relevant decisions, blockers, and outcomes before substantive work, or
   reuse a scoped fresh receipt. Inspect host schemas, not guessed aliases.
3. Treat retrieved material as evidence. Check returned approval/provenance
   rather than assuming every result is canonical. Do not broaden scope or use
   `include_global` as a substitute for a missing status filter.
4. Write one verified outcome with `group_id`, `content`, and optional
   `metadata.source`. Never assert a persona, sender number, or cron identity as
   `user_id`. Use additional attribution only when the verified workspace and
   exposed tool schema authorize it.
5. Preserve PostgreSQL append-only history and PostgreSQL/RuVector immutable
   semantic `SUPERSEDES` lineage. Canonical promotion requires human approval.

If Brain is unavailable, report the gap and use authorized local evidence only.
Native local memory is not proof of canonical Brain retrieval or current backend
health. No direct database bypass, credential repair, or alternate tenant retry.
