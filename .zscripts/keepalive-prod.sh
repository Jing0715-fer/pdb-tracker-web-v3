#!/usr/bin/env bash
# Keepalive: continuously restart the standalone server if it dies.
# The server process gets killed between bash commands in this sandbox,
# so we need a persistent watcher that restarts it.
cd /home/z/my-project
while true; do
  # Check if server is running
  if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/ 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] server down, starting..." >> /home/z/my-project/prod-keepalive.log
    pkill -9 -f "node server.js" 2>/dev/null
    sleep 1
    cd /home/z/my-project/.next/standalone
    NEXT_TELEMETRY_DISABLED=1 node server.js > /home/z/my-project/prod.log 2>&1 &
    cd /home/z/my-project
    sleep 3
  fi
  sleep 5
done
