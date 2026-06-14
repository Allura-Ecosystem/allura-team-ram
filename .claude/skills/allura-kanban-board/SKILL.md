---
name: allura-kanban-board
description: Use when Ronin mentions the Kanban board, Allura board, work board, cards, lanes, Intake, Review, Evidence, Approved, Blocked, proposals, or moving project work through governed board status. Ensures the Allura Kanban board is the task tracker, not a local markdown/file board.
---

# Allura Kanban Board

Use this skill whenever work must be tracked on Ronin's Allura Kanban board.

## Core Rule

The Allura Kanban board is the task tracker.

Do not create a local markdown Kanban board unless Ronin explicitly asks for a repo-local mirror. Local docs can explain implementation, but they are not board state.

## Board Model

The visible Allura Kanban lanes are:

- `Intake`: fresh captures and raw events before curation.
- `Review`: proposals waiting for human approval.
- `Evidence`: receipts/provenance links that need inspection.
- `Approved`: accepted insights ready for reuse or promotion planning.
- `Blocked`: errors, rejected items, or superseded memories needing cleanup.

Project execution statuses such as `Backlog`, `Ready`, `In Progress`, `Review`, and `Done` can be written inside the card content, but the Allura board lanes are governed by Allura's capture/review/evidence workflow.

## Workflow

1. Search Allura first.
   - Use explicit `group_id`.
   - For Auntie NY use `allura-auntie-ny`.
   - Query for existing cards before adding duplicates.

2. Create or update cards through Allura.
   - Prefer `mcp__allura_brain__.memory_add` when available.
   - If the MCP write tool is not exposed but local Allura web is running, use `POST http://localhost:3100/api/memory`.
   - Do not use local files as the primary board.

3. Each card must include:
   - stable card id
   - title
   - project/group id
   - current implementation status
   - acceptance criteria
   - validation/evidence required
   - blocker, if any

4. Move toward Done only with evidence.
   - Allura memory is context/audit, not proof by itself.
   - Done requires receipts such as tests, route checks, screenshots that render, service health, integration test results, or user approval.

5. Report receipts.
   - Return Allura memory/card IDs after card creation.
   - Say exactly what tool/API was used.
   - If only a fallback was possible, say so plainly.

## Card Content Template

```text
KANBAN CARD <CARD-ID> — <Project Name>
Status: <Backlog|Ready|In Progress|Review|Done|Blocked>
Title: <short title>
Group: <allura-* group id>
Acceptance criteria: <what must be true>
Validation/evidence required: <command, route check, artifact, approval, or receipt>
Blocker: <none or exact blocker>
Board rule: Allura Kanban is task tracker; Allura memory is audit/context; Done requires external evidence, not memory alone.
```

## Local Allura REST Fallback

Use only when MCP memory write is unavailable and `http://localhost:3100` is reachable:

```bash
curl -s -X POST 'http://localhost:3100/api/memory' \
  -H 'Content-Type: application/json' \
  -d '{
    "group_id": "allura-auntie-ny",
    "user_id": "ronin704",
    "content": "KANBAN CARD ...",
    "metadata": {
      "source": "manual",
      "agent_id": "codex",
      "card_id": "CARD-ID",
      "status": "Ready"
    },
    "threshold": 0.85
  }'
```

Then verify with:

```bash
curl -s 'http://localhost:3100/api/memory?group_id=allura-auntie-ny&user_id=ronin704&limit=20&sort=created_at_desc'
```

## Guardrails

- Never claim a board card was created unless the MCP/API write returned a receipt.
- Never mark a card `Done` without fresh verification evidence.
- Never mix client namespaces. Auntie NY cards stay under `allura-auntie-ny`.
- Never treat Team RAM as global board authority unless the current repo declares Team RAM.
- If Notion, Mission Control, Allura Brain, and local docs disagree, stop and name the conflict.
