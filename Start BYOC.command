#!/bin/bash
# Double-click to start Bring your own craft on this Mac: checks the machine, starts the room, opens it in Chrome.
# Close this window (or press Ctrl-C) to stop the room. Untested on macOS at the time of writing (built on Linux).
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-3000}"
URL="http://localhost:$PORT/"
PIDFILE=".byoc-server.pid"
export PORT

pause() { echo; read -n 1 -s -r -p "Press any key to close."; echo; }

echo "Bring your own craft"
echo "Checking this Mac first..."
echo
if ! command -v node >/dev/null 2>&1; then
  echo "Node isn't installed. Install Node 22 from nodejs.org, then double-click this again."
  pause; exit 1
fi
if ! npm run --silent doctor; then
  echo
  echo "Something this needs isn't ready (see the FAIL lines and their fix just above)."
  echo "Fix that, then double-click this again."
  pause; exit 1
fi

echo
echo "Starting the room..."
node scripts/local.mjs &
SERVER=$!
echo "$SERVER" > "$PIDFILE"

stop() {
  trap - INT TERM HUP EXIT
  if kill -0 "$SERVER" 2>/dev/null; then kill -TERM "$SERVER" 2>/dev/null; wait "$SERVER" 2>/dev/null; fi
  rm -f "$PIDFILE"
}
trap 'stop; exit 0' INT TERM HUP
trap stop EXIT

for _ in $(seq 1 60); do
  if curl -s -o /dev/null "$URL"; then break; fi
  if ! kill -0 "$SERVER" 2>/dev/null; then echo "The room stopped while starting (see above)."; pause; exit 1; fi
  sleep 0.5
done
if ! curl -s -o /dev/null "$URL"; then echo "The room didn't answer at $URL after 30 s."; pause; exit 1; fi

if [ -d "/Applications/Google Chrome.app" ] || [ -d "$HOME/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "$URL"
else
  open "$URL"
fi
echo
echo "Room running at $URL. Close this window to stop."
wait "$SERVER"
echo "The room stopped."
