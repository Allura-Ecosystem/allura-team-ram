#!/usr/bin/env bash
# brain-stack.sh — Allura Brain service manager
# Manages the allura-memory docker-compose stack and verifies gateway readiness.
#
# Subcommands:
#   status              Show compose path, container states, gateway readiness
#   up                  Start stack, poll until gateway ready (60s timeout)
#   recover             Minimal restorative step (restart mcp if up; full up if down)
#   restart             docker compose restart, then poll readiness
#   logs                Tail last 80 lines from mcp/gateway services
#   install-user-service  Write + enable a systemd --user unit for boot-time startup

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants / overridable env
# ---------------------------------------------------------------------------
GATEWAY="${ALLURA_BRAIN_GATEWAY:-http://127.0.0.1:5888}"
MCP_CONTAINER="allura-memory-mcp"
READY_TIMEOUT=60
POLL_INTERVAL=2

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
usage() {
  cat >&2 <<EOF
Usage: $(basename "$0") <subcommand>

Subcommands:
  status               Print compose path, container states, and gateway codes
  up                   Start the brain stack and wait for readiness
  recover              Minimal restore (restart mcp-svc if containers up; else up)
  restart              Restart the stack, then poll readiness
  logs                 Tail last 80 log lines from mcp/gateway services
  install-user-service Install a systemd --user unit for boot-time startup

Env overrides:
  ALLURA_BRAIN_COMPOSE   Path to docker-compose.yml (skips auto-discovery)
  ALLURA_BRAIN_GATEWAY   Gateway base URL (default: http://127.0.0.1:5888)
EOF
  exit 1
}

log() { echo "[brain-stack] $*"; }
err() { echo "[brain-stack] ERROR: $*" >&2; }

# Resolve docker compose command (v2 plugin vs legacy) — stored as array to avoid word-splitting
if docker compose version &>/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE=(docker-compose)
else
  err "Neither 'docker compose' (v2) nor 'docker-compose' is available."
  exit 1
fi

# Resolve the compose file path — three-tier discovery:
#   1. $ALLURA_BRAIN_COMPOSE env override
#   2. com.docker.compose.project.config_files label on running mcp container
#   3. Sibling-repo fallback: <team-ram-root>/../allura-memory/docker-compose.yml
resolve_compose() {
  if [[ -n "${ALLURA_BRAIN_COMPOSE:-}" ]]; then
    if [[ -f "$ALLURA_BRAIN_COMPOSE" ]]; then
      echo "$ALLURA_BRAIN_COMPOSE"
      return 0
    else
      err "ALLURA_BRAIN_COMPOSE is set but file does not exist: $ALLURA_BRAIN_COMPOSE"
      return 1
    fi
  fi

  # Try label on running container
  local label_path
  label_path=$(docker inspect "$MCP_CONTAINER" \
    --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' 2>/dev/null || true)
  if [[ -n "$label_path" && -f "$label_path" ]]; then
    echo "$label_path"
    return 0
  fi

  # Sibling-repo fallback
  local this_script
  this_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local team_ram_root
  team_ram_root="$(cd "$this_script/.." && pwd)"
  local sibling_compose=""
  local candidate_dir
  candidate_dir="$(cd "$team_ram_root/../allura-memory" 2>/dev/null && pwd)" || true
  if [[ -n "$candidate_dir" ]]; then
    sibling_compose="$candidate_dir/docker-compose.yml"
  fi

  if [[ -n "$sibling_compose" && -f "$sibling_compose" ]]; then
    echo "$sibling_compose"
    return 0
  fi

  err "Cannot resolve compose file. Tried:"
  err "  1. \$ALLURA_BRAIN_COMPOSE (not set)"
  err "  2. docker inspect label on '$MCP_CONTAINER' -> '${label_path:-<not found or container not running>}'"
  err "  3. Sibling repo: ${sibling_compose:-<could not resolve path>}"
  err "Set ALLURA_BRAIN_COMPOSE=/path/to/docker-compose.yml to override."
  return 1
}

# Check both gateway readiness endpoints.
# Returns 0 if both return HTTP 200, 1 otherwise.
gateway_ready() {
  local ready_code health_code
  ready_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}/ready" 2>/dev/null || echo "000")
  health_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}/health" 2>/dev/null || echo "000")
  if [[ "$ready_code" == "200" && "$health_code" == "200" ]]; then
    return 0
  fi
  # Surface codes for diagnostics — to stderr so callers using `if gateway_ready` stay clean
  echo "$ready_code/$health_code" >&2
  return 1
}

# Poll gateway until ready or timeout.
# Prints progress, exits 0 on success, 1 on timeout.
poll_ready() {
  local elapsed=0
  log "Polling gateway readiness (timeout ${READY_TIMEOUT}s) ..."
  while (( elapsed < READY_TIMEOUT )); do
    if gateway_ready &>/dev/null; then
      log "Gateway ready after ${elapsed}s."
      return 0
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$(( elapsed + POLL_INTERVAL ))
  done
  local ready_code health_code
  ready_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}/ready" 2>/dev/null || echo "000")
  health_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}/health" 2>/dev/null || echo "000")
  err "Gateway not ready after ${READY_TIMEOUT}s."
  err "  /ready  -> HTTP $ready_code"
  err "  /health -> HTTP $health_code"
  return 1
}

# Check if the mcp container is running (state == running)
mcp_container_running() {
  local state
  state=$(docker inspect "$MCP_CONTAINER" --format '{{.State.Status}}' 2>/dev/null || echo "missing")
  [[ "$state" == "running" ]]
}

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

cmd_status() {
  local compose
  compose=$(resolve_compose)
  log "Compose file: $compose"
  echo ""
  echo "--- Container states (brain stack) ---"
  # Filter by compose project label so we only show brain containers
  local project_name
  project_name=$(docker inspect "$MCP_CONTAINER" \
    --format '{{ index .Config.Labels "com.docker.compose.project" }}' 2>/dev/null || true)
  if [[ -n "$project_name" ]]; then
    docker ps -a --filter "label=com.docker.compose.project=${project_name}" \
      --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  else
    # Fallback: show containers from the compose file (scoped — no host-wide docker ps)
    "${DOCKER_COMPOSE[@]}" -f "$compose" ps
  fi

  echo ""
  echo "--- Gateway readiness ---"
  local ready_code health_code
  ready_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}/ready" 2>/dev/null || echo "000")
  health_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}/health" 2>/dev/null || echo "000")
  echo "  ${GATEWAY}/ready  -> HTTP $ready_code"
  echo "  ${GATEWAY}/health -> HTTP $health_code"

  if [[ "$ready_code" == "200" && "$health_code" == "200" ]]; then
    log "Status: READY"
    return 0
  else
    log "Status: NOT READY"
    return 1
  fi
}

cmd_up() {
  local compose
  compose=$(resolve_compose)
  log "Starting stack: $compose"
  "${DOCKER_COMPOSE[@]}" -f "$compose" up -d
  poll_ready
}

cmd_recover() {
  local compose
  compose=$(resolve_compose)

  # Check if gateway is already ready — nothing to do
  if gateway_ready &>/dev/null; then
    log "Gateway already ready. Nothing to recover."
    return 0
  fi

  if mcp_container_running; then
    log "MCP container is running but gateway not ready. Restarting mcp/gateway service ..."
    # Try to restart only the mcp service; fall back to full restart if service name unknown
    local service_name
    service_name=$(docker inspect "$MCP_CONTAINER" \
      --format '{{ index .Config.Labels "com.docker.compose.service" }}' 2>/dev/null || echo "")
    if [[ -n "$service_name" ]]; then
      "${DOCKER_COMPOSE[@]}" -f "$compose" restart "$service_name"
    else
      "${DOCKER_COMPOSE[@]}" -f "$compose" restart
    fi
  else
    log "MCP container not running. Bringing stack up ..."
    "${DOCKER_COMPOSE[@]}" -f "$compose" up -d
  fi

  poll_ready
}

cmd_restart() {
  local compose
  compose=$(resolve_compose)
  log "Restarting stack: $compose"
  "${DOCKER_COMPOSE[@]}" -f "$compose" restart
  poll_ready
}

cmd_logs() {
  local compose
  compose=$(resolve_compose)
  # Try to show only the mcp/gateway service; fall back to all services
  local service_name
  service_name=$(docker inspect "$MCP_CONTAINER" \
    --format '{{ index .Config.Labels "com.docker.compose.service" }}' 2>/dev/null || echo "")
  if [[ -n "$service_name" ]]; then
    log "Tailing logs for service: $service_name"
    "${DOCKER_COMPOSE[@]}" -f "$compose" logs --tail 80 "$service_name"
  else
    log "Could not determine service name; showing all services"
    "${DOCKER_COMPOSE[@]}" -f "$compose" logs --tail 80
  fi
}

cmd_install_user_service() {
  local this_script
  this_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

  local unit_dir="$HOME/.config/systemd/user"
  local unit_file="$unit_dir/allura-brain.service"

  mkdir -p "$unit_dir"

  if [[ -f "$unit_file" ]]; then
    log "Overwriting existing unit: $unit_file"
  fi

  cat > "$unit_file" <<UNIT
[Unit]
Description=Allura Brain Stack (allura-memory MCP + gateway)
After=default.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=${this_script} up
ExecStop=true  # intentional no-op: containers are persistent, do not tear down on logout

[Install]
WantedBy=default.target
UNIT

  log "Unit written: $unit_file"

  # Enable the unit if systemctl --user is available
  if systemctl --user daemon-reload &>/dev/null 2>&1; then
    systemctl --user daemon-reload
    systemctl --user enable allura-brain.service
    log "Unit enabled. It will start on next user login."
    echo ""
    echo "To allow the service to start without an active login session, run:"
    echo "  loginctl enable-linger $(whoami)"
    echo ""
    echo "To start it immediately:"
    echo "  systemctl --user start allura-brain.service"
  else
    log "systemctl --user not available. To install manually, run:"
    echo "  systemctl --user daemon-reload"
    echo "  systemctl --user enable allura-brain.service"
    echo "  loginctl enable-linger $(whoami)"
  fi
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
[[ $# -lt 1 ]] && usage

case "$1" in
  status)               cmd_status ;;
  up)                   cmd_up ;;
  recover)              cmd_recover ;;
  restart)              cmd_restart ;;
  logs)                 cmd_logs ;;
  install-user-service) cmd_install_user_service ;;
  *)
    err "Unknown subcommand: $1"
    usage
    ;;
esac
