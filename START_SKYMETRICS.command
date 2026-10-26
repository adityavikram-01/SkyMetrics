#!/bin/zsh
set -e
ROOT="${0:A:h}"
RUNTIME="$ROOT/.run"
mkdir -p "$RUNTIME"
cd "$ROOT"
if [[ ! -d "$ROOT/.runtime/mysql/mysql" ]]; then
  "$ROOT/SETUP_LOCAL.command"
fi
if ! lsof -nP -iTCP:3310 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup /usr/local/mysql/bin/mysqld --no-defaults \
    --datadir="$ROOT/.runtime/mysql" --port=3310 --bind-address=127.0.0.1 --mysqlx=OFF --skip-log-bin \
    --socket="$RUNTIME/mysql.sock" --pid-file="$RUNTIME/mysql.pid" --log-error="$RUNTIME/mysql.log" \
    </dev/null >"$RUNTIME/mysql-stdout.log" 2>&1 &
fi
for i in {1..45}; do
  lsof -nP -iTCP:3310 -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 1
done
if ! lsof -nP -iTCP:3310 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "MySQL did not start. Check $RUNTIME/mysql.log"
  read '?Press Enter to close.'
  exit 1
fi
if ! lsof -nP -iTCP:8082 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$ROOT/apix-backend"
  nohup python3 scripts/start_local.py >"$RUNTIME/backend.log" 2>&1 </dev/null &
fi
for i in {1..100}; do
  curl -fsS http://127.0.0.1:8082/api/v1/health >/dev/null 2>&1 && break
  sleep 2
done
if ! curl -fsS http://127.0.0.1:8082/api/v1/health >/dev/null 2>&1; then
  echo "Backend did not start. Check $RUNTIME/backend.log"
  read '?Press Enter to close.'
  exit 1
fi
lsof -nP -tiTCP:8082 -sTCP:LISTEN | head -1 > "$RUNTIME/backend.pid"
if ! lsof -nP -iTCP:5175 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$ROOT/apix-frontend"
  [[ -d node_modules ]] || npm ci
  nohup npm run dev -- --host 127.0.0.1 >"$RUNTIME/frontend.log" 2>&1 </dev/null &
fi
for i in {1..30}; do
  curl -fsS http://127.0.0.1:5175/ >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -fsS http://127.0.0.1:5175/ >/dev/null 2>&1; then
  echo "Frontend did not start. Check $RUNTIME/frontend.log"
  read '?Press Enter to close.'
  exit 1
fi
lsof -nP -tiTCP:5175 -sTCP:LISTEN | head -1 > "$RUNTIME/frontend.pid"
echo 'SkyMetrics Next is ready at http://127.0.0.1:5175/'
open http://127.0.0.1:5175/
echo 'Keep this Terminal window open while using the local site. Use STOP_SKYMETRICS.command to stop it.'
while lsof -nP -iTCP:8082 -sTCP:LISTEN >/dev/null 2>&1; do
  sleep 10
done
