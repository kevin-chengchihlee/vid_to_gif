#!/bin/zsh
cd "$(dirname "$0")/dist" || exit 1
PORT=8765
URL="http://127.0.0.1:$PORT"
if ! curl -fsS "$URL" >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/loop-video-to-gif.log 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM
  sleep 1
fi
open "$URL"
echo "Video to GIF is running at $URL"
echo "Keep this window open while using the tool. Press Control-C to stop."
wait
