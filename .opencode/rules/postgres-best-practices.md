---
description: PostgreSQL database best practices for Allura agents
globs: ["src/lib/postgres/**", "src/server/**", "scripts/**"]
---

# PostgreSQL Best Practices

## Query Patterns
- Use parameterized queries with `$1, $2` syntax
- Always include `group_id` filter for tenant isolation
- Prefer batch operations over N+1 queries
- Use connection pooling via `src/lib/postgres/connection.ts`

## Schema Design
- Events table is append-only (no UPDATE/DELETE)
- Use JSONB for flexible metadata
- Index on: `group_id`, `agent_id`, `created_at`
- Partition large tables by date

## Example
```typescript
// Good
const result = await pool.query(
  'SELECT * FROM events WHERE group_id = $1 AND agent_id = $2',
  ['allura-system', 'brooks']
);

// Bad - Missing group_id
const result = await pool.query(
  'SELECT * FROM events WHERE agent_id = $1',
  ['brooks']
);
```

## Security Patterns

**NEVER** expose sensitive information:
- Don't log database credentials or connection strings
- Don't expose internal error details to users
- Use environment variables for PostgreSQL credentials
- Use parameterized queries (prevent SQL injection)
- Validate and sanitize all user input
- Follow principle of least privilege

**Configuration Pattern:**
- Never hardcode secrets or credentials
- Provide sensible defaults
- Validate required configuration on startup
- Document all configuration options
- Use different configs for dev/staging/production

## Error Handling

**ALWAYS** handle errors gracefully:
- Catch specific PostgreSQL errors, not generic ones
- Log errors with context (but not credentials)
- Return meaningful error messages
- Don't expose internal implementation details

## Logging Pattern

**USE** consistent logging levels:
- **Debug**: Detailed query information (development only)
- **Info**: Connection events and milestones
- **Warning**: Potential issues that don't stop execution
- **Error**: Query failures and exceptions

## Invariants
- ✅ group_id on every query
- ✅ Append-only events
- ✅ Validate with Zod at boundaries
- ✅ Parameterized queries only
- ✅ Environment variables for credentials
