---
name: mcp-integration
description: "MCP server integration patterns — tool discovery via mcp-find/mcp-add, active tool stack reference, Allura Brain access paths, security patterns. Use when working with MCP tools, adding new MCP servers, or referencing available tools."
---

# MCP Integration

## THE RULE
**NEVER `docker exec` for DB operations. ALWAYS use `mcp__MCP_DOCKER__*` tools.**

## Security Patterns

**NEVER** expose sensitive information:
- Don't log MCP credentials or API keys
- Don't expose internal error details to users
- Use environment variables for MCP server credentials
- Validate and sanitize all inputs to MCP tools
- Follow principle of least privilege

**Configuration Pattern:**
- Never hardcode secrets or credentials in MCP configs
- Provide sensible defaults
- Validate required configuration on startup
- Use different configs for dev/staging/production

## Error Handling

- Catch specific MCP errors, not generic ones
- Log errors with context (but not credentials)
- Return meaningful error messages
- Implement circuit breakers for failing MCP servers

## Tool Discovery (mcp-find → mcp-add)

The Docker MCP Toolkit is a gateway to 300+ signed, containerized MCP servers.

```
# 1. Find what's available
mcp__MCP_DOCKER__mcp-find("keyword")
→ returns: name, description, required_secrets

# 2. Add it — tools surface immediately
mcp__MCP_DOCKER__mcp-add("server-name")
→ new tools appear as mcp__MCP_DOCKER__<tool_name>

# No required_secrets → add immediately
# Has required_secrets → env vars must be set first
```

## Active Tool Stack

### Web Research
| Tool | Use |
|------|-----|
| `mcp__MCP_DOCKER__perplexica_search` | Self-hosted AI search (no API key) |
| `mcp__MCP_DOCKER__tavily_crawl` | Crawl from root URL (catalog) |
| `mcp__MCP_DOCKER__tavily_extract` | Extract specific URL (catalog) |
| `mcp__MCP_DOCKER__web_search_exa` | Neural/semantic search |

### Browser Automation (HyperBrowser)
| Tool | Use |
|------|-----|
| `mcp__MCP_DOCKER__scrape_webpage` | Single page content |
| `mcp__MCP_DOCKER__crawl_webpages` | Multi-page crawl |
| `mcp__MCP_DOCKER__extract_structured_data` | JSON via schema |
| `mcp__MCP_DOCKER__browser_use_agent` | Explicit tasks (cheapest) |
| `mcp__MCP_DOCKER__claude_computer_use_agent` | Complex cloud browser |
| `mcp__MCP_DOCKER__openai_computer_use_agent` | General cloud browser |

### Live Docs (Context7)
| Tool | Use |
|------|-----|
| `mcp__MCP_DOCKER__resolve-library-id` | Library → Context7 ID |
| `mcp__MCP_DOCKER__get-library-docs` | Fetch live docs |

### Allura Brain (Canonical Memory)
| Tool | Use |
|------|-----|
| `allura-brain__memory_add` | Governed write — add episodic memory |
| `allura-brain__memory_search` | Governed search — hybrid PG + Neo4j |
| `allura-brain__memory_get` | Governed read — single memory by ID |
| `allura-brain__memory_list` | Governed list — filter by user/group |
| `allura-brain__memory_update` | Governed update — versioned append-only |
| `allura-brain__memory_delete` | Governed delete — soft-delete with 30-day recovery |
| `allura-brain__memory_promote` | Governed promotion — episodic → canonical (SOC2) |
| `allura-brain__memory_export` | Governed export — canonical or merged |
| `allura-brain__memory_restore` | Governed restore — recover soft-deleted memory |
| `MCP_DOCKER__query_database` | NL SQL reads (diagnostics) |
| `MCP_DOCKER__execute_sql` | Raw SQL reads (diagnostics) |
| `MCP_DOCKER__insert_data` | Append events only (traces) |
| `MCP_DOCKER__create_entities` | Neo4j entity creation (seeding) |
| `MCP_DOCKER__search_memories` | Neo4j fulltext search |
| `MCP_DOCKER__find_memories_by_name` | Neo4j exact name lookup |
| `MCP_DOCKER__read_graph` | Neo4j full graph read |

### Notion
| Tool | Use |
|------|-----|
| `MCP_DOCKER__notion-search` | Search Notion workspace |
| `MCP_DOCKER__notion-fetch` | Fetch page/database content |
| `MCP_DOCKER__notion-create-pages` | Create pages in Notion |
| `MCP_DOCKER__notion-update-page` | Update page properties/content |

## Boot Policy — Allura Brain as Canonical Surface

> **AD-2026-04-28:** Allura Brain (`localhost:5888/mcp`) is the canonical memory surface.

### Access paths

| Harness | Tool Prefix | Registration |
|---------|------------|-------------|
| OpenClaw (Gilliam) | `allura-brain__memory_*` | Pre-registered in `openclaw.json` |
| OpenCode (Team RAM/Durham) | `allura-brain__memory_*` | Via `.opencode/mcp-client-config.json` |
| Docker MCP (any) | `MCP_DOCKER__*` | Via `mcp-add` on demand |

### What loads on-demand (via mcp-find → mcp-add)
| Server | Trigger |
|--------|---------|
| `perplexica` | Web search needed |
| `hyperbrowser` | Browser automation needed |
| `context7` | Live library docs needed |
