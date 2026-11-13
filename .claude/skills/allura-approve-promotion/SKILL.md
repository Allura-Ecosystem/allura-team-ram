---
name: allura-approve-promotion
description: Execute an explicitly human-approved canonical promotion through a supported governed capability.
---

# Allura Approve Promotion

1. Confirm the authorized tenant, exact proposal, and explicit human approval.
   A persona, score, or agent recommendation cannot supply curator authority.
2. Inspect the host's promotion and retrieval schemas. Use only the exposed
   operation and exact identifier/approval parameter names. If unavailable,
   report the blocker; do not guess an API or write internal tables.
3. Authenticated transport supplies the principal. Never fabricate `user_id`
   or a `curator_id` to satisfy a gate. Reject tenant or actor mismatches.
4. Verify pending status and submit only the approved operation. Preserve
   append-only audit events and immutable semantic `SUPERSEDES` lineage.
5. Verify the returned approval receipt and canonical retrieval with supported
   get/search operations in the same scope. Report partial/unverified if either
   is missing; do not claim Done from an approval response alone.

PostgreSQL/RuVector store current canonical memory. Return actual identifiers,
status, and evidence supplied by tools, never invented hashes or receipt fields.
