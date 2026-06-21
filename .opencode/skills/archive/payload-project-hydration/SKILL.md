---
name: payload-project-hydration
description: "Use at the start of Payload CMS, Next.js/Payload, or Payload website development sessions to hydrate project context before planning or editing. Checks repo instructions, branch status, app shape, route tree, Payload config, env/runtime docs, prior Allura context, and blockers."
---

# Payload Project Hydration

Use this before substantive work in a Payload website repo, especially for a new client or a resumed launch/build session.

## Scope

This skill is project-scoped. It does not create a global agent overlay. Use the repo's own `AGENTS.md`, `.opencode/`, `.agents/`, `.claude/`, or docs to discover any local overlay.

## Workflow

1. Confirm workspace identity:
   - `pwd`
   - `git rev-parse --show-toplevel`
   - `git status --short --branch`

2. Read local authority in order:
   - nearest `AGENTS.md`
   - repo README/docs
   - package scripts
   - Payload config
   - app framework config
   - deployment/runtime docs

3. Find the app shape:
   - `package.json`
   - `payload.config.*`
   - `next.config.*`
   - `src/app`, `app`, `pages`, `public`, `collections`, `globals`
   - Docker/dev server files

4. Check Allura memory with an explicit `group_id`.
   - For Auntie NY use `allura-auntie-ny`.
   - Allura is context, not proof of Done.

5. Produce a short hydration receipt:
   - project/client
   - branch and dirty state
   - route root
   - runtime command if known
   - Payload config location
   - blockers or unknowns
   - next action

## Rules

- Do not assume a route root from a previous project.
- Do not claim any tool, subagent, test, or memory write ran unless it actually did.
- If project guidance conflicts with memory or assumptions, pause and name the conflict.
- Keep secrets out of memory and summaries.
