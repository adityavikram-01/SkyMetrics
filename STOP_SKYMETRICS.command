#!/bin/zsh
set -e
ROOT="${0:A:h}"
RUNTIME="$ROOT/.run"
for service in frontend backend mysql; do
  if [[ -f "$RUNTIME/$service.pid" ]]; then
    kill "$(cat "$RUNTIME/$service.pid")" 2>/dev/null || true
    rm -f "$RUNTIME/$service.pid"
  fi
done
echo 'SkyMetrics stopped. The database and accounts remain saved.'
