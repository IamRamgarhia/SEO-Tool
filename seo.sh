#!/usr/bin/env bash
# SEO Tool launcher (Linux/macOS). Starts the server on a chosen port
# and opens the browser when it's reachable.
#
# Mode selection:
#   - If .next/BUILD_ID exists → production mode (next start). Fast
#     startup (~2s), low RAM, instant page loads. Default.
#   - Otherwise → dev mode (next dev). Slower first paint, hot reload.
#     Run `pnpm build` once to switch to production mode.
#
# Env vars:
#   PORT           target port (default 3000)
#   SEO_RESTART    when 1, skips opening a fresh browser tab
#   SEO_FORCE_DEV  when 1, forces dev mode even if a build exists

set -e
cd "$(dirname "$0")"

# ---- 1. Resolve PORT
if [ -z "$PORT" ] && [ -f ".seo-port" ]; then
  PORT="$(cat .seo-port 2>/dev/null | tr -d '[:space:]')"
fi
PORT="${PORT:-3000}"

# ---- 2. Find pnpm or npm
if command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PM="npm"
else
  echo "Node / npm not found. Install Node 20+ from https://nodejs.org" >&2
  exit 1
fi

health_url="http://localhost:$PORT/api/v1/health"

# ---- 3. Already running on this port?
if curl -fsS -o /dev/null --max-time 1 "$health_url" 2>/dev/null; then
  if [ "$SEO_RESTART" != "1" ]; then
    if command -v open >/dev/null 2>&1; then open "http://localhost:$PORT" 2>/dev/null || true
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:$PORT" 2>/dev/null || true
    fi
  fi
  exit 0
fi

# Restart? Give the old server a beat to free the port.
[ "$SEO_RESTART" = "1" ] && sleep 2

# ---- 4. Stop any prior server we own (idempotent re-run)
if [ -f ".dev-server.pid" ]; then
  OLD_PID="$(cat .dev-server.pid 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
fi

# ---- 5. Pick mode
RUN_CMD="dev"
if [ -f ".next/BUILD_ID" ] && [ "$SEO_FORCE_DEV" != "1" ]; then
  RUN_CMD="start:daily"
fi

# ---- 6. Fresh log on each start
: > dev-server.log

# ---- 7. Start detached, log to file. HOSTNAME=127.0.0.1 binds to
# loopback so LAN devices can't reach us. Override with
# SEO_BIND_HOST=0.0.0.0 only when you've also set APP_PASSWORD or
# are running behind a trusted reverse proxy.
HOST_BIND="${SEO_BIND_HOST:-127.0.0.1}"
PORT="$PORT" HOSTNAME="$HOST_BIND" nohup $PM run "$RUN_CMD" >dev-server.log 2>&1 &
echo "$!" > .dev-server.pid

# ---- 8. Wait for /api/v1/health (cheap JSON, doesn't trigger dev compile)
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null --max-time 1 "$health_url" 2>/dev/null; then
    break
  fi
  sleep 1
done

# ---- 9. Open browser unless this is a restart
if [ "$SEO_RESTART" != "1" ]; then
  if command -v open >/dev/null 2>&1; then open "http://localhost:$PORT" 2>/dev/null || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:$PORT" 2>/dev/null || true
  fi
fi
