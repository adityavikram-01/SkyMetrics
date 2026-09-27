#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
exec java -Xmx768m -jar target/apix-backend-0.1.0.jar
