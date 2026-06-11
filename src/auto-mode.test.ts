import { describe, test, expect } from "bun:test";
import { assessComplexity, isDestructive } from "./auto-mode";

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
});
