---
name: mcp-docker
description: Discover available Docker MCP capabilities and validate schemas before authorized configuration or calls.
---

# Docker MCP Capability Discovery

Inspect the current host tool inventory before using discovery, configuration,
activation, or execution capabilities. Use the exact exposed names and argument
schemas; catalog examples are not proof that a server is installed or authorized.

1. Identify the requested capability and its authorized project scope.
2. Use a supported discovery/list operation if present. If missing, report the
   capability unavailable rather than inventing tool names.
3. Inspect server requirements and schema before proposing configuration.
4. Configure or activate only with explicit task authorization. Never print or
   embed secrets in recipes, output, or tracked files.
5. Verify returned results rather than assuming successful dispatch proves health.

## Allura Brain

Allura uses PostgreSQL + RuVector. Access it through supported governed memory
interfaces, preserving tenant scope, transport-derived identity, append-only
events, immutable `SUPERSEDES` lineage, and human canonical-promotion approval.
Docker database tools are not a fallback around Brain governance. Do not install,
configure, query, or health-check a retired backend for Allura.

The catalog reference is general discovery guidance, not a current deployment map.
