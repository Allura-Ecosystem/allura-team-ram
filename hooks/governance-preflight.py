#!/usr/bin/env python3
"""
Team RAM Harness — Governance Preflight Hook (Plugin Distribution)

Enforces harness invariants before tool execution:
1. No docker exec — use MCP tools only
2. Append-only events — no UPDATE/DELETE on events/traces
3. group_id required — all DB queries must include group_id
4. allura-* namespace only — flag deprecated tenant IDs

This is the plugin-distributed version of the governance hook.
It uses tool-name guards to avoid false positives on non-DB tools.
"""
import json
import re
import sys

# ── Patterns ──────────────────────────────────────────────────────────────────

DOCKER_EXEC = re.compile(r"docker\s+exec\b", re.IGNORECASE)

APPEND_ONLY_VIOLATION = re.compile(
    r"\b(UPDATE|DELETE)\b[^;]*\b(events|traces|event_log)\b",
    re.IGNORECASE | re.DOTALL,
)

MISSING_GROUP_ID = re.compile(
    r"\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b(?:(?!group_id).)*$",
    re.IGNORECASE | re.DOTALL,
)

# Constructed dynamically to avoid triggering the hook on this file's own content
_DEPRECATED_PREFIX = "ronin" + "claw-"

BASH_TOOLS = {"Bash", "bash", "shell", "run_command", "computer"}
DB_PREFIXES = ("mcp__MCP_DOCKER__", "mcp__allura-brain__")


def _is_db_tool(tool_name: str) -> bool:
    return any(tool_name.startswith(p) for p in DB_PREFIXES)


# ── Checks ────────────────────────────────────────────────────────────────────

def check_bash(tool_input: dict) -> tuple[bool, str]:
    cmd = str(tool_input.get("command") or tool_input.get("cmd") or "")
    if DOCKER_EXEC.search(cmd):
        return True, (
            "BLOCKED — `docker exec` is banned.\n"
            "Use mcp__MCP_DOCKER__* tools for all DB operations."
        )
    if APPEND_ONLY_VIOLATION.search(cmd):
        return True, (
            "BLOCKED — UPDATE/DELETE on events/traces is banned.\n"
            "PostgreSQL event traces are append-only."
        )
    return False, ""


def check_sql(tool_input: dict) -> tuple[bool, str]:
    query = str(
        tool_input.get("query") or tool_input.get("sql") or
        tool_input.get("statement") or ""
    )
    if not query:
        return False, ""
    if APPEND_ONLY_VIOLATION.search(query):
        return True, (
            "BLOCKED — UPDATE/DELETE on events/traces is banned.\n"
            "PostgreSQL event traces are append-only."
        )
    if MISSING_GROUP_ID.search(query) and "group_id" not in query.lower():
        return True, (
            "BLOCKED — group_id missing from DB query.\n"
            "Every read/write must filter by group_id (pattern: allura-[a-z0-9-]+)."
        )
    return False, ""


def check_group_id_drift(tool_input: dict) -> tuple[bool, str]:
    raw = json.dumps(tool_input)
    if _DEPRECATED_PREFIX in raw:
        return True, (
            "BLOCKED — Deprecated tenant group_id detected.\n"
            "Use `allura-*` namespace only."
        )
    return False, ""


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_name = str(payload.get("tool_name") or payload.get("tool") or "")
    tool_input: dict = payload.get("tool_input") or payload.get("input") or {}

    checks = []

    if tool_name in BASH_TOOLS:
        checks.append(check_bash(tool_input))

    # Only run SQL checks on tools that actually execute SQL
    if tool_name in BASH_TOOLS or _is_db_tool(tool_name):
        checks.append(check_sql(tool_input))

    checks.append(check_group_id_drift(tool_input))

    for blocked, reason in checks:
        if blocked:
            print(json.dumps({"decision": "block", "reason": reason}))
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
