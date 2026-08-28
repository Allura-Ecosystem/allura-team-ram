---
name: tram-agent-scout
description: Produce a bounded Team RAM Scout ContextPacket.
---

# Team RAM Scout BMad Adapter

Use the canonical Team RAM **Scout** agent for read-only recon.

Return the shared ContextPacket: goal, summary, relevant files, relevant memories,
risks, recommended route, validation commands, and token usage. Limit the report to
700 output tokens. For ordinary path lookup, skip Brain search; for Allura, BMad,
architecture, routing, or status work, query the configured Allura tenant first.

Never edit files, approve scope, or claim a delegated runtime ran without evidence.
