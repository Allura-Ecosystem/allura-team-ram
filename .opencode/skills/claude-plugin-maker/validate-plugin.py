#!/usr/bin/env python3
"""Validate a Claude Code plugin so it adds + installs cleanly.

Usage:
    python3 validate-plugin.py <plugin-root>

Checks (in order of how often they break "won't add"):
  1. .claude-plugin/plugin.json exists + parses + has a name
  2. .claude-plugin/marketplace.json exists + parses + lists the plugin
  3. marketplace plugin entry name matches plugin.json name
  4. every referenced agent/command/skill/hook/mcp path resolves
  5. warns on the known schema gotchas (mcp vs mcpServers, custom keys)

Exit code 0 = OK (warnings allowed), 1 = error.
"""
import json
import sys
from pathlib import Path

RECOGNIZED = {
    "name", "version", "description", "author", "homepage", "repository",
    "license", "keywords", "commands", "agents", "skills", "hooks", "mcpServers",
}
PATH_FIELDS = ("commands", "agents", "skills", "hooks", "mcp", "mcpServers")

errors: list[str] = []
warnings: list[str] = []


def load_json(path: Path):
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        errors.append(f"MISSING: {path}")
    except json.JSONDecodeError as e:
        errors.append(f"INVALID JSON in {path}: {e}")
    return None


def check_paths(root: Path, manifest: dict):
    for field in PATH_FIELDS:
        val = manifest.get(field)
        if val is None:
            continue
        entries = val if isinstance(val, list) else [val]
        for entry in entries:
            if not isinstance(entry, str):
                continue  # inline objects (e.g. mcpServers map) — skip path check
            target = (root / entry).resolve()
            if not target.exists():
                errors.append(f"{field}: path does not exist -> {entry}")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)

    root = Path(sys.argv[1]).resolve()
    cp = root / ".claude-plugin"

    plugin = load_json(cp / "plugin.json")
    market = load_json(cp / "marketplace.json")

    plugin_name = None
    if plugin is not None:
        plugin_name = plugin.get("name")
        if not plugin_name:
            errors.append("plugin.json: missing required 'name'")
        special = {"mcp", "interface"}
        for key in plugin:
            if key not in RECOGNIZED and key not in special:
                warnings.append(f"plugin.json: unrecognized key '{key}' (ignored by Claude Code)")
        if "mcp" in plugin:
            warnings.append("plugin.json: 'mcp' is not recognized — use 'mcpServers' or rely on auto-discovered .mcp.json")
        if "interface" in plugin:
            warnings.append("plugin.json: 'interface' is a custom key — ignored by Claude Code")
        check_paths(root, plugin)

    if market is not None:
        plugins = market.get("plugins")
        if not isinstance(plugins, list) or not plugins:
            errors.append("marketplace.json: 'plugins' must be a non-empty list")
        else:
            names = [p.get("name") for p in plugins if isinstance(p, dict)]
            if plugin_name and plugin_name not in names:
                errors.append(
                    f"marketplace.json: no entry named '{plugin_name}' "
                    f"(found {names}) — entry name must match plugin.json name"
                )
            for p in plugins:
                src = p.get("source")
                if isinstance(src, str):
                    target = (root / src / ".claude-plugin" / "plugin.json").resolve()
                    if not target.exists():
                        errors.append(
                            f"marketplace.json: plugin '{p.get('name')}' source '{src}' "
                            f"has no .claude-plugin/plugin.json"
                        )
    elif (cp / "plugin.json").exists():
        errors.append(
            "marketplace.json is MISSING — a lone plugin.json is NOT addable. "
            "This is the usual cause of 'won't add to marketplace'."
        )

    for w in warnings:
        print(f"  ⚠  {w}")
    for e in errors:
        print(f"  ✗  {e}")

    if errors:
        print(f"\nFAIL — {len(errors)} error(s), {len(warnings)} warning(s).")
        sys.exit(1)
    print(f"\nOK — addable + installable. {len(warnings)} warning(s).")
    sys.exit(0)


if __name__ == "__main__":
    main()
