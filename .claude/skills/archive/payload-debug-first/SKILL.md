---
name: payload-debug-first
description: "Use when Payload CMS or Next.js/Payload routes, builds, admin screens, hydration, APIs, Docker/dev runtime, or deployments fail. Enforces symptom-before-cause debugging, avoids guess patches, and requires evidence before calling the issue fixed."
---

# Payload Debug First

Use this when something is broken, slow, blank, flaky, or timing out in a Payload website.

## Debug Order

1. State the symptom in plain language.
2. Reproduce it with the smallest reliable command or browser action.
3. Gather evidence:
   - server logs
   - browser console
   - network failures
   - HTTP status/body
   - build output
   - route file/config location
   - environment/runtime state
4. Separate likely layers:
   - dev server/container
   - routing
   - Payload config
   - collection/global schema
   - auth/session
   - data/seed/content
   - frontend hydration
   - deployment/DNS/SSL
5. Make the smallest targeted fix.
6. Rerun the failing check and one nearby regression check.
7. Record evidence and remaining risk.

## Rules

- Do not patch before finding the likely cause unless the evidence is already clear.
- Do not treat blank screenshots as proof of UI failure or success by themselves.
- Do not assume stale paths from another repo.
- Do not hide harness instability as app failure.
- Preserve unrelated user changes in a dirty worktree.

## Done Standard

The issue is fixed only when the original symptom no longer reproduces and the verification output is recorded.
