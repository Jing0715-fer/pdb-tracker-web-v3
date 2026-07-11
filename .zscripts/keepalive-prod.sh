#!/usr/bin/env bash
# Robust keepalive for the production standalone server.
# Restarts if the server crashes or gets OOM-killed.
# The SSE endpoints continue running even if the browser page is closed,
# because tasks execute server-side.
cd /home/z/my-project
LAST_START=0
while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/ 2>/dev/null || echo "000")
  now=$(date +%s)
  if [ "$code" != "200" ]; then
    if [ $((now - LAST_START)) -lt 20 ]; then sleep 10; continue; fi
    echo "[$(date '+%H:%M:%S')] prod server down (code=$code), restarting..." >> /home/z/my-project/prod-keepalive.log
    pkill -f "node server.js" 2>/dev/null; sleep 2
    cd /home/z/my-project/.next/standalone
    NEXT_TELEMETRY_DISABLED=1 setsid bash -c 'exec node server.js > /home/z/my-project/prod.log 2>&1' &
    cd /home/z/my-project
    LAST_START=$now; sleep 6
  fi
  sleep 10
done
