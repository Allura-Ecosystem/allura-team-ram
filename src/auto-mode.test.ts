import { describe, test, expect } from "bun:test";
import {
  assessComplexity,
  isDestructive,
  isTokenBudgetExceeded,
  mapAutoTaskToAgent,
  normalizeIterationLimit,
} from "./auto-mode";

describe("auto-mode", () => {
  describe("assessComplexity", () => {
    test("returns 'simple' for fix/typo/rename tasks", () => {
      expect(assessComplexity("fix typo in readme")).toBe("simple");
      expect(assessComplexity("rename variable to camelCase")).toBe("simple");
      expect(assessComplexity("remove unused import")).toBe("simple");
      expect(assessComplexity("bump version to 1.2.3")).toBe("simple");
    });

    test("returns 'multi' for add/implement/refactor tasks", () => {
      expect(assessComplexity("add authentication feature")).toBe("multi");
      expect(assessComplexity("implement the login page")).toBe("multi");
      expect(assessComplexity("refactor the routing module")).toBe("multi");
      expect(assessComplexity("migrate database to PostgreSQL")).toBe("multi");
    });

    test("returns 'epic' for build/create system/redesign tasks", () => {
      expect(assessComplexity("build a new notification system")).toBe("epic");
      expect(assessComplexity("create system for user management")).toBe("epic");
      expect(assessComplexity("redesign the entire API layer")).toBe("epic");
      expect(assessComplexity("overhaul the permission model")).toBe("epic");
    });

    test("returns 'epic' when scout report is long (>500 chars)", () => {
      expect(assessComplexity("do something", 600)).toBe("epic");
    });

    test("returns 'multi' when scout report is medium (>200 chars)", () => {
      expect(assessComplexity("do something", 300)).toBe("multi");
    });

    test("returns 'simple' for unrecognized task with no scout report", () => {
      expect(assessComplexity("hello world")).toBe("simple");
    });
  });

  describe("isDestructive", () => {
    test("detects rm -rf", () => {
      expect(isDestructive("rm -rf /some/path")).toBe(true);
    });

    test("detects git push --force", () => {
      expect(isDestructive("git push --force origin main")).toBe(true);
    });

    test("detects git branch -D", () => {
      expect(isDestructive("git branch -D feature-branch")).toBe(true);
    });

    test("detects DROP TABLE", () => {
      expect(isDestructive("DROP TABLE users")).toBe(true);
    });

    test("detects DELETE FROM", () => {
      expect(isDestructive("DELETE FROM events WHERE id = 1")).toBe(true);
    });

    test("returns false for normal commands", () => {
      expect(isDestructive("git push origin main")).toBe(false);
      expect(isDestructive("bun test")).toBe(false);
      expect(isDestructive("SELECT * FROM events")).toBe(false);
      expect(isDestructive("echo hello")).toBe(false);
    });
  });

  describe("bounded execution budgets", () => {
    test("caps requested iterations and uses conservative defaults", () => {
      expect(normalizeIterationLimit(undefined, "simple")).toBe(1);
      expect(normalizeIterationLimit(undefined, "multi")).toBe(5);
      expect(normalizeIterationLimit(99, "epic")).toBe(10);
      expect(normalizeIterationLimit(0, "multi")).toBe(1);
    });

    test("stops when combined token use reaches the budget", () => {
      expect(isTokenBudgetExceeded(8_000, 4_000, 12_000)).toBe(true);
      expect(isTokenBudgetExceeded(7_999, 4_000, 12_000)).toBe(false);
    });
  });

  describe("auto routing", () => {
    test("routes implementation to Woz instead of the Brooks fallback", () => {
      expect(mapAutoTaskToAgent("implement a typed response contract")).toBe("woz");
      expect(mapAutoTaskToAgent("add tests for the packet")).toBe("woz");
    });

    test("routes specialist task classes explicitly", () => {
      expect(mapAutoTaskToAgent("debug a crash in the executor")).toBe("bellard");
      expect(mapAutoTaskToAgent("refactor the routing module")).toBe("fowler");
      expect(mapAutoTaskToAgent("architect the public contract")).toBe("brooks");
      expect(mapAutoTaskToAgent("deploy with docker and CI")).toBe("hightower");
    });
  });
});
