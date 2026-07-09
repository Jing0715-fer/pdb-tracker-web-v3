#!/usr/bin/env bash
# Keep-alive watcher for the Next.js dev server.
# Checks every 20s with a 40s timeout; if the server is down (and not freshly
# starting), restarts `bun run dev`. Gives a generous grace period because the
# molstar webpack compile takes ~30s.
cd /home/z/my-project

LAST_START=0

while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 40 http://localhost:3000/ 2>/dev/null || echo "000")
  now=$(date +%s)
  if [ "$code" != "200" ]; then
    # If we started less than 90s ago, skip — it's probably still compiling.
    if [ $((now - LAST_START)) -lt 90 ]; then
      sleep 20
      continue
    fi
    echo "[$(date '+%H:%M:%S')] dev server down (code=$code), restarting..." >> /home/z/my-project/dev-keepalive.log
    pkill -f "next dev" 2>/dev/null
    sleep 2
    rm -f /home/z/my-project/dev.log
    (nohup bun run dev > /dev/null 2>&1 &)
    LAST_START=$now
    sleep 45
  fi
  sleep 20
done
