# Testing Guide

## Overview

| Test file | What it covers |
|-----------|----------------|
| `test-integration.ts` | End-to-end integration tests for harness contracts |
| `test-http-service.ts` | HTTP service endpoints (health, invoke, error handling) |

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- For HTTP service tests: the server must be running first

```bash
# Start the server (separate terminal)
bun run service
```

## Running Tests

```bash
# All tests
bun test

# Integration tests only
bun run test-integration.ts

# HTTP service tests only
bun test ./test-http-service.ts
```

## Writing Tests

Tests use the Bun test runner with `describe` / `it` / `expect` syntax.

```typescript
import { describe, it, expect } from "bun:test";

describe("feature", () => {
  it("should behave correctly", () => {
    const result = doSomething();
    expect(result).toBe(expected);
  });
});
```

### Conventions

- Place test files in the project root with a `test-` prefix.
- Use `describe` blocks to group related assertions.
- Keep HTTP tests idempotent -- they should not mutate shared state.
- Mock external services (Anthropic API, Allura Brain) when possible.

## Environment Variables

HTTP service tests may require:

| Variable | Purpose |
|----------|---------|
| `HARNESS_PORT` | Port the server listens on (default: 3000) |
| `HARNESS_API_KEY` | API key for authenticated endpoints |
| `ANTHROPIC_API_KEY` | Anthropic API key (for live agent invocation tests) |

See `.env.example` for the full template.
