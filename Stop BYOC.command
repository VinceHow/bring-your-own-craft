#!/bin/bash
# Double-click to stop the room that "Start BYOC.command" started. Stops only our own server: the PID it wrote, or
# the node process of this folder listening on the port. Never anything else.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-3000}"
PIDFILE=".byoc-server.pid"
HERE="$(pwd -P)"

ours() { # is this PID our node server (scripts/local.mjs or server.js, from this folder)?
  local cmd; cmd="$(ps -p "$1" -o command= 2>/dev/null)" || return 1
  case "$cmd" in *node*scripts/local.mjs*|*node*"$HERE"/server.js*|*node*" server.js"*) ;; *) return 1 ;; esac
  # Started from this folder? (lsof shows the working directory; if lsof is missing, the command line is enough.)
  if command -v lsof >/dev/null 2>&1; then
    local cwd; cwd="$(lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)"
    [ -z "$cwd" ] || [ "$cwd" = "$HERE" ] || return 1
  fi
  return 0
}

stopped=0
if [ -f "$PIDFILE" ]; then
  pid="$(cat "$PIDFILE")"
  if [ -n "$pid" ] && ours "$pid"; then kill -TERM "$pid" && stopped=1 && echo "Stopped the room (process $pid)."; fi
  rm -f "$PIDFILE"
fi
if [ "$stopped" = 0 ] && command -v lsof >/dev/null 2>&1; then
  for pid in $(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null); do
    if ours "$pid"; then kill -TERM "$pid" && stopped=1 && echo "Stopped the room (process $pid, port $PORT)."; fi
  done
fi
[ "$stopped" = 1 ] || echo "The room wasn't running (nothing of ours on port $PORT)."
echo; read -n 1 -s -r -t 30 -p "Press any key to close." || true; echo
