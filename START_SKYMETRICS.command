#!/bin/zsh
set -e
ROOT="${0:A:h}"
RUNTIME="$ROOT/.run"
mkdir -p "$RUNTIME"
cd "$ROOT"
if [[ ! -d "$ROOT/.runtime/mysql/mysql" ]]; then
  echo 'SkyMetrics database is not initialized. See README.md or run the Docker option.'
  read '?Press Enter to close.'
  exit 1
fi
if ! lsof -nP -iTCP:3309 -sTCP:LISTEN >/dev/null 2>&1; then
  /usr/local/mysql/bin/mysqld --no-defaults \
    --datadir="$ROOT/.runtime/mysql" --port=3309 --bind-address=127.0.0.1 --mysqlx=OFF \
    --socket="$RUNTIME/mysql.sock" --pid-file="$RUNTIME/mysql.pid" --log-error="$RUNTIME/mysql.log" \
    </dev/null >"$RUNTIME/mysql-stdout.log" 2>&1 &
fi
for i in {1..45}; do
  lsof -nP -iTCP:3309 -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 1
done
if ! lsof -nP -iTCP:3309 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "MySQL did not start. Check $RUNTIME/mysql.log"
  read '?Press Enter to close.'
  exit 1
fi
if ! lsof -nP -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$ROOT/apix-backend"
  ./mvnw spring-boot:run >"$RUNTIME/backend.log" 2>&1 &
fi
for i in {1..100}; do
  curl -fsS http://127.0.0.1:8081/api/v1/health >/dev/null 2>&1 && break
  sleep 2
done
if ! curl -fsS http://127.0.0.1:8081/api/v1/health >/dev/null 2>&1; then
  echo "Backend did not start. Check $RUNTIME/backend.log"
  read '?Press Enter to close.'
  exit 1
fi
lsof -nP -tiTCP:8081 -sTCP:LISTEN | head -1 > "$RUNTIME/backend.pid"
if ! lsof -nP -iTCP:5174 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$ROOT/apix-frontend"
  [[ -d node_modules ]] || npm ci
  npm run dev -- --host 127.0.0.1 >"$RUNTIME/frontend.log" 2>&1 &
fi
for i in {1..30}; do
  curl -fsS http://127.0.0.1:5174/ >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -fsS http://127.0.0.1:5174/ >/dev/null 2>&1; then
  echo "Frontend did not start. Check $RUNTIME/frontend.log"
  read '?Press Enter to close.'
  exit 1
fi
lsof -nP -tiTCP:5174 -sTCP:LISTEN | head -1 > "$RUNTIME/frontend.pid"
echo 'SkyMetrics is ready at http://127.0.0.1:5174/'
open http://127.0.0.1:5174/
echo 'You may close this Terminal window.'
