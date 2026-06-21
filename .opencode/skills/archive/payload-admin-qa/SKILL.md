---
name: payload-admin-qa
description: "Use when validating Payload CMS admin, backend APIs, collections, globals, auth, media, or editor workflows. Prefers real browser admin checks plus direct HTTP/API checks, captures console/network errors, and reports without storing secrets."
---

# Payload Admin QA

Use this for Payload admin/backend verification before handoff, launch, or after model/schema changes.

## Safety

- Never store passwords, tokens, or private client data in memory.
- Redact temporary credentials in summaries.
- Prefer disposable admin accounts for QA when appropriate.

## Workflow

1. Hydrate runtime:
   - confirm server URL
   - confirm admin path, usually `/admin`
   - confirm env is local/staging/production

2. Login through the real browser admin flow.
   - Target fields by stable selectors when possible:
     - `input[name="email"]`
     - `input[name="password"]`
     - submit button

3. Check core admin screens:
   - dashboard
   - users
   - pages
   - posts/resources
   - media
   - navigation/header/footer globals
   - site settings
   - client-specific collections

4. Check API/backend endpoints when available:
   - authenticated user endpoint
   - collections
   - globals
   - media
   - published page/post fetches

5. Watch for:
   - console errors
   - failed network requests
   - auth loops
   - missing collection labels
   - broken uploads/previews
   - stale seed data

## Fallbacks

If inline scripts or `tsx` checks fail because of Payload loader/top-level-await quirks, use:

- real browser admin flow
- direct HTTP login/API checks
- app's documented test command

## Done Standard

Admin QA is done only when the checked screens/endpoints are listed with evidence and any secrets are redacted.
