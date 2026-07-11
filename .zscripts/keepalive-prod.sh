#!/usr/bin/env bash
# Robust keepalive for the production standalone server.
# Uses a 30s health-check timeout (to not interfere with long LLM calls).
# Only restarts if the server is truly down for >60s.
cd /home/z/my-project
LAST_START=0
FAIL_COUNT=0
while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://localhost:3000/ 2>/dev/null || echo "000")
  now=$(date +%s)
  if [ "$code" != "200" ]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
    # Only restart after 3 consecutive failures (60s down)
    if [ "$FAIL_COUNT" -ge 3 ]; then
      if [ $((now - LAST_START)) -lt 30 ]; then sleep 20; continue; fi
      echo "[$(date '+%H:%M:%S')] prod server down 3x (last code=$code), restarting..." >> /home/z/my-project/prod-keepalive.log
      pkill -9 -f "node server.js" 2>/dev/null; sleep 3
      cd /home/z/my-project/.next/standalone
      NEXT_TELEMETRY_DISABLED=1 setsid bash -c 'exec node server.js > /home/z/my-project/prod.log 2>&1' &
      cd /home/z/my-project
      LAST_START=$now; sleep 8
      FAIL_COUNT=0
    else
      sleep 10
    fi
  else
    FAIL_COUNT=0
  fi
  sleep 20
done
