---
name: payload-route-smoke-harness
description: "Use when creating, updating, or running route smoke tests for Payload CMS or Next.js/Payload websites. Builds a repeatable harness that validates core HTML routes, records status/title/H1/content/accessibility signals, treats XML/TXT assets as request probes, writes evidence artifacts, and fails loudly."
---

# Payload Route Smoke Harness

Use this whenever a Payload website needs route validation, release evidence, or regression checks.

## Goal

Create a repeatable smoke path that proves public routes are present and usable. The harness should be boring, durable, and artifact-producing.

## Route Selection

1. Verify the actual route root before writing tests.
2. Prefer stable HTML pages first:
   - `/`
   - about/company pages
   - service pages
   - contact/booking pages
   - blog/resources listing
   - at least one detail page when content exists
3. Treat XML/TXT assets as request probes:
   - `robots.txt`
   - `sitemap.xml`
   - feeds or static files

## Signals To Capture

For browser-rendered HTML routes capture:

- HTTP status
- final URL after redirects
- document title
- first H1 or main heading
- key content text
- obvious error text
- console errors
- failed network requests
- basic accessibility snapshot or landmarks when available

For request probes capture:

- HTTP status
- content type
- short body sanity check

## Artifacts

Write machine-readable output:

- per-route JSON result files
- `summary.json`
- optional screenshot only when it renders real content

Blank screenshots are not proof. Rerun or debug capture failures.

## Failure Policy

- Exit nonzero on failed required routes.
- Separate app failures from harness failures.
- Route timeouts are debug-first. Identify server, route, build, hydration, or data cause before patching.

## Done Standard

Do not call route work done until the harness ran against the intended local or deployed target and produced evidence artifacts.
