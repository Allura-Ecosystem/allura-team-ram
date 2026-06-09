#!/usr/bin/env bash
# Start the Harness HTTP service and verify it is healthy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${HARNESS_PORT:-7654}"

echo "Starting harness service on port $PORT ..."
bun "$PROJECT_ROOT/src/http-server.ts" &
SERVER_PID=$!

# Wait for the health endpoint to respond (up to 5 seconds)
for i in $(seq 1 10); do
  if curl -sf "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
    echo "Health check passed."
    echo "Server running (PID $SERVER_PID)."
    exit 0
  fi
  sleep 0.5
done

echo "ERROR: Health endpoint did not respond within 5 seconds." >&2
kill "$SERVER_PID" 2>/dev/null || true
exit 1
