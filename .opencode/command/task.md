---
description: "Task creator — generate structured task with memory integration"
allowed-tools: ["Write", "Read", "Grep", "mcp__allura-brain__*"]
---

# Task Creator Command

Create tasks with proper structure, metadata, and memory integration.

## Usage

```
/task <task description>
```

## Protocol

### Phase 1: Gather Context

```javascript
// Search Allura Brain
mcp__allura-brain__memory_search({ query: "<task topic>", group_id: "allura-system" })

// Find related tasks
Grep({ pattern: "TASK-", path: "docs/archive/planning-artifacts/" })
```

### Phase 2: Generate Task

```javascript
// Create task file
Write({
  path: `docs/archive/planning-artifacts/tasks/TASK-XXX.md`,
  content: taskContent
})
```

### Phase 3: Link to Memory

```javascript
// Create memory link
// episodic; auto-queued for curator:approve — never a direct graph write
mcp__allura-brain__memory_add({
  group_id: "allura-system",
  user_id: "scout-recon",
  content: "Created TASK-XXX linking task to memory insights",
  metadata: { source: "manual", agent_id: "scout-recon" }
})
```

## Example

```
User: /task Add OAuth2 authentication with Google provider

Creates:
- TASK-042: Add OAuth2 authentication
- Links to memory insights
- Assigns to Woz
```

---

**Invoke with:** `/task <task description>`