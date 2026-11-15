#!/bin/bash
# Double-click to stop the room that "Start BYOC.command" (or npm run local) started. Stops only our own server: the
# PID in .byoc-server.pid, or, failing that, our node server from this folder listening on the port in
# .byoc-server.port. Never anything else: another app on 3000 is left alone.
cd "$(dirname "$0")" || exit 1
PIDFILE=".byoc-server.pid"
PORTFILE=".byoc-server.port"
HERE="$(pwd -P)"

ours() { # is this PID our node server (scripts/local.mjs or server.js) started from this folder?
  local cmd; cmd="$(ps -p "$1" -o command= 2>/dev/null)" || return 1
  case "$cmd" in *node*scripts/local.mjs*|*node*"$HERE"/server.js*|*node*" server.js"*) ;; *) return 1 ;; esac
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
fi
if [ "$stopped" = 0 ] && [ -s "$PORTFILE" ] && command -v lsof >/dev/null 2>&1; then
  port="$(cat "$PORTFILE")"
  for pid in $(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null); do
    if ours "$pid"; then kill -TERM "$pid" && stopped=1 && echo "Stopped the room (process $pid, port $port)."; fi
  done
fi
if [ "$stopped" = 1 ]; then sleep 1; rm -f "$PIDFILE" "$PORTFILE"; else echo "The room wasn't running (nothing of ours to stop)."; fi
echo; read -n 1 -s -r -t 30 -p "Press any key to close." || true; echo
