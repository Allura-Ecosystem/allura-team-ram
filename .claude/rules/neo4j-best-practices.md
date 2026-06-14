---
description: Neo4j knowledge graph best practices
globs: ["src/lib/neo4j/**", "scripts/**"]
---

# Neo4j Best Practices

## Node Structure
- Every node MUST have `group_id` property
- Use `SUPERSEDES` relationships for versioning
- Never edit existing nodes - create new versions
- Agent nodes track: confidence, contributions, learning

## Query Patterns
- Use parameterized queries
- Always filter by `group_id`
- Use `MERGE` for idempotent operations
- Create constraints for unique identifiers

## Example
```typescript
// Good - Versioning with SUPERSEDES
await session.run(`
  MATCH (v1:Insight {insight_id: $id})
  CREATE (v2:Insight {
    insight_id: 'ins_' + randomUUID(),
    summary: $newSummary,
    group_id: $groupId
  })
  CREATE (v2)-[:SUPERSEDES]->(v1)
  SET v1:deprecated
`, { id, newSummary, groupId: 'allura-system' });
```

## Security Patterns

**NEVER** expose sensitive information:
- Don't log Neo4j credentials or connection strings
- Don't expose internal error details to users
- Use environment variables for Neo4j credentials
- Validate and sanitize all Cypher query inputs
- Follow principle of least privilege

**File System Safety:**
- Validate file paths before reading/writing Cypher scripts
- Prevent path traversal attacks
- Check file permissions before operations

## Error Handling

**ALWAYS** handle errors gracefully:
- Catch specific Neo4j errors, not generic ones
- Log errors with context (but not credentials)
- Return meaningful error messages
- Don't expose internal implementation details

## Invariants
- ✅ group_id on every node
- ✅ SUPERSEDES for versioning
- ✅ Never mutate historical nodes
- ✅ Parameterized queries only
- ✅ Environment variables for credentials
