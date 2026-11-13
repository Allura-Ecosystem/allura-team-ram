#!/usr/bin/env bash
set -euo pipefail
# This repository cannot infer an authenticated host MCP transport from a shell.
printf '%s\n' 'UNVERIFIED: use the host governed memory_search capability with authorized group_id, query, and limit: 1.' >&2
printf '%s\n' 'No database connections attempted. Retrieval success does not prove subsystem health.' >&2
exit 2
