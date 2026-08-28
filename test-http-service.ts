#!/usr/bin/env bun
/**
 * Integration Test: Harness HTTP Service
 *
 * Validates the HTTP service wrapper built by Hightower (S1) and wired by Woz (S2).
 * Exercises the full flow: client -> HTTP endpoint -> auth -> validation -> agent -> result.
 *
 * Prerequisites:
 *   - HTTP server running: `bun src/http-server.ts`
 *   - Allura databases accessible (PostgreSQL with governed graph tables)
 *
 * Run:
 *   bun test test-http-service.ts
 *
 * Until S2 (Woz wiring) completes, /invoke will return 501 Not Implemented.
 * After S2, all tests should pass.
 */

import { beforeAll, describe, expect, it } from "bun:test";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.HARNESS_URL ?? "http://localhost:7654";
const API_KEY = process.env.HARNESS_API_KEY ?? "dev-key-insecure";
const TIMEOUT_MS = 30_000; // hard ceiling per the brief

const authedHeaders = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch with an AbortSignal timeout so no test hangs forever. */
async function req(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Pre-flight: confirm the server is reachable before running the suite. */
async function waitForServer(retries = 5, delayMs = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    if (i < retries - 1) await Bun.sleep(delayMs);
  }
  throw new Error(
    `Server at ${BASE_URL} not reachable after ${retries} attempts. ` +
      "Start it with: bun src/http-server.ts",
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Harness HTTP Service", () => {
  beforeAll(async () => {
    await waitForServer();
  });

  // -----------------------------------------------------------------------
  // 1. Health check
  // -----------------------------------------------------------------------
  describe("GET /health", () => {
    it("returns 200 with healthy status and subsystem fields", async () => {
      const res = await req("/health");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("healthy");
      expect(body).toHaveProperty("postgres");
      expect(body).toHaveProperty("graph");
      expect(body).toHaveProperty("uptime_ms");
      expect(typeof body.uptime_ms).toBe("number");
    });

    it("reports postgres health", async () => {
      const body = await (await req("/health")).json();
      expect(["healthy", "degraded", "unhealthy"]).toContain(body.postgres);
    });

    it("reports graph health", async () => {
      const body = await (await req("/health")).json();
      expect(["healthy", "degraded", "unhealthy"]).toContain(body.graph);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Auth validation
  // -----------------------------------------------------------------------
  describe("POST /invoke — auth", () => {
    const validBody = JSON.stringify({
      processName: "harness.discovery.recon",
      payload: { task: "test" },
      group_id: "allura-system",
    });

    it("rejects request without Authorization header (401)", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody,
      });
      expect(res.status).toBe(401);
    });

    it("rejects request with wrong API key (401)", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong-key-entirely",
          "Content-Type": "application/json",
        },
        body: validBody,
      });
      expect(res.status).toBe(401);
    });

    it("accepts request with valid API key (not 401)", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: validBody,
      });
      // After auth passes, acceptable statuses are 200, 202, or 501 (not yet wired).
      // The key assertion: it must NOT be 401.
      expect(res.status).not.toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Malformed requests
  // -----------------------------------------------------------------------
  describe("POST /invoke — validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: {
          ...authedHeaders,
          "Content-Type": "text/plain",
        },
        body: "this is not json {{{",
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("errors");
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 when processName is missing", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: JSON.stringify({
          payload: { task: "test" },
          group_id: "allura-system",
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.errors?.length).toBeGreaterThan(0);
    });

    it("returns 400 when payload is missing", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: JSON.stringify({
          processName: "harness.discovery.recon",
          group_id: "allura-system",
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.errors?.length).toBeGreaterThan(0);
    });

    it("returns 400 when group_id format is invalid", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: JSON.stringify({
          processName: "harness.discovery.recon",
          payload: { task: "test" },
          group_id: "BAD_FORMAT",
        }),
      });
      // group_id must match ^allura-[a-z0-9-]+$
      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Happy path — scout discovery
  // -----------------------------------------------------------------------
  describe("POST /invoke — happy path (scout recon)", () => {
    it("executes a valid discovery process and returns AgentResult", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: JSON.stringify({
          processName: "harness.discovery.recon",
          payload: { task: "Find agent files" },
          group_id: "allura-system",
        }),
      });

      // If wiring is not complete yet, 501 is acceptable
      if (res.status === 501) {
        console.log("  [info] /invoke returned 501 — executor not wired yet (expected before S2)");
        return;
      }

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("agent");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("metrics");
      // Agent should be scout-recon for discovery tasks
      expect(result.agent).toMatch(/scout/i);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Fallback when agent unavailable
  // -----------------------------------------------------------------------
  describe("POST /invoke — fallback routing", () => {
    it("falls back to brooks-architect for unknown processName", async () => {
      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: JSON.stringify({
          processName: "harness.nonexistent.process",
          payload: { task: "test fallback" },
          group_id: "allura-system",
        }),
      });

      if (res.status === 501) {
        console.log("  [info] /invoke returned 501 — executor not wired yet (expected before S2)");
        return;
      }

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.agent).toMatch(/brooks/i);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Timeout handling
  // -----------------------------------------------------------------------
  describe("POST /invoke — timeout", () => {
    it("completes within 30 seconds (no hangs)", async () => {
      const start = Date.now();

      const res = await req("/invoke", {
        method: "POST",
        headers: authedHeaders,
        body: JSON.stringify({
          processName: "harness.discovery.recon",
          payload: { task: "Quick health check" },
          group_id: "allura-system",
        }),
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(TIMEOUT_MS);

      // Any status is fine — we are testing that the server responds promptly
      expect(res.status).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Bonus: 404 for unknown routes
  // -----------------------------------------------------------------------
  describe("Unknown routes", () => {
    it("returns 404 for unregistered paths", async () => {
      const res = await req("/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
