#!/usr/bin/env bash
#
# ui-devserver.sh — bring the Quasar dev server up/down for playwright-cli UI tests.
#
# The tdd-bugfix skill uses this to reproduce/verify UI bugs against a running app
# at http://localhost:8080 (the Quasar dev port; /api is proxied to poc.gainstrack.com
# per quasar.config.js). Anonymous-user flows need no login.
#
# Usage:
#   ui-devserver.sh up      # start dev server in background, wait until it serves
#   ui-devserver.sh down    # stop the background dev server
#   ui-devserver.sh status  # print whether it's up
#
# The server logs to, and its PID is tracked in, the scratchpad dir so repeated
# runs don't leave orphans.

set -euo pipefail

CLIENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../client" && pwd)"
URL="http://localhost:8080"
RUN_DIR="${TMPDIR:-/tmp}/gainstrack-ui-devserver"
PID_FILE="$RUN_DIR/dev.pid"
LOG_FILE="$RUN_DIR/dev.log"

mkdir -p "$RUN_DIR"

is_up() { curl -sf -o /dev/null "$URL" 2>/dev/null; }

case "${1:-}" in
  up)
    if is_up; then echo "dev server already up at $URL"; exit 0; fi
    echo "starting quasar dev in $CLIENT_DIR (logs: $LOG_FILE)"
    ( cd "$CLIENT_DIR" && pnpm run dev >"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE" )
    echo -n "waiting for $URL "
    for _ in $(seq 1 90); do
      if is_up; then echo "— ready"; exit 0; fi
      echo -n "."; sleep 2
    done
    echo "— TIMEOUT. Last log lines:"; tail -20 "$LOG_FILE"; exit 1
    ;;
  down)
    if [[ -f "$PID_FILE" ]]; then
      PID="$(cat "$PID_FILE")"
      # quasar spawns children; kill the process group
      pkill -P "$PID" 2>/dev/null || true
      kill "$PID" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "stopped dev server (pid $PID)"
    else
      pkill -f "quasar dev" 2>/dev/null && echo "stopped stray quasar dev" || echo "no dev server tracked"
    fi
    ;;
  status)
    if is_up; then echo "up at $URL"; else echo "down"; fi
    ;;
  *)
    echo "usage: $0 {up|down|status}"; exit 2
    ;;
esac
