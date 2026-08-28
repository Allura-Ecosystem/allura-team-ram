---
name: tram-quality-gate
description: Review and validate Team RAM story delivery.
---

# Team RAM Quality Gate

Use Team RAM Pike and Fowler as independent read-only reviewers. Review the current
actual diff, not a summary. Require explicit tests, type checks, lint, or task-specific
verification before `success`. Confirm external CI is for the current SHA when a PR is involved.

Return `success`, `blocked`, or `approval-required` with cited evidence.
