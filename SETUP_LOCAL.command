#!/bin/zsh
set -e
ROOT="${0:A:h}"
cd "$ROOT"
mkdir -p .runtime/mysql .run
chmod 700 .runtime .run
if [[ -d .runtime/mysql/mysql ]]; then
  echo 'Local database already initialized.'
  exit 0
fi
if [[ ! -x /usr/local/mysql/bin/mysqld ]]; then
  echo 'MySQL is required at /usr/local/mysql/bin/mysqld.'
  exit 1
fi
umask 077
python3 - <<'PY'
from pathlib import Path
import secrets
private = Path('.run/local-secrets')
private.write_text(secrets.token_hex(24) + '\n' + secrets.token_urlsafe(32) + '\n' + secrets.token_hex(24) + '\n')
PY
/usr/local/mysql/bin/mysqld --no-defaults --initialize-insecure --datadir="$ROOT/.runtime/mysql" >.run/mysql-init.log 2>&1
nohup /usr/local/mysql/bin/mysqld --no-defaults --datadir="$ROOT/.runtime/mysql" --port=3310 --bind-address=127.0.0.1 --mysqlx=OFF --skip-log-bin --socket="$ROOT/.run/mysql.sock" --pid-file="$ROOT/.run/mysql.pid" --log-error="$ROOT/.run/mysql.log" </dev/null >.run/mysql-stdout.log 2>&1 &
for i in {1..45}; do
  /usr/local/mysql/bin/mysqladmin --protocol=socket --socket="$ROOT/.run/mysql.sock" -uroot ping >/dev/null 2>&1 && break
  sleep 1
done
if ! /usr/local/mysql/bin/mysqladmin --protocol=socket --socket="$ROOT/.run/mysql.sock" -uroot ping >/dev/null 2>&1; then
  echo 'MySQL initialization failed. Check .run/mysql.log.'
  exit 1
fi
DB_PASSWORD="$(sed -n '1p' .run/local-secrets)"
ADMIN_PASSWORD="$(sed -n '2p' .run/local-secrets)"
ROOT_PASSWORD="$(sed -n '3p' .run/local-secrets)"
/usr/local/mysql/bin/mysql --protocol=socket --socket="$ROOT/.run/mysql.sock" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS skymetrics_next CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'skymetrics_next'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON skymetrics_next.* TO 'skymetrics_next'@'127.0.0.1';
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '$ROOT_PASSWORD';
SQL
cat > .run/mysql-root.cnf <<ROOT_CNF
[client]
user=root
password=$ROOT_PASSWORD
socket=$ROOT/.run/mysql.sock
ROOT_CNF
chmod 600 .run/mysql-root.cnf
cat > apix-backend/.env <<ENV
DB_URL=jdbc:mysql://127.0.0.1:3310/skymetrics_next?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&rewriteBatchedStatements=true
DB_USERNAME=skymetrics_next
DB_PASSWORD=$DB_PASSWORD
SKYMETRICS_BOOTSTRAP_ADMIN_EMAIL=devwithujjwal@gmail.com
SKYMETRICS_BOOTSTRAP_ADMIN_PASSWORD=$ADMIN_PASSWORD
COOKIE_SECURE=false
ENV
chmod 600 apix-backend/.env
unset DB_PASSWORD ADMIN_PASSWORD ROOT_PASSWORD
echo 'Independent local database and private backend settings are ready.'
echo 'Your new local admin password is stored privately in apix-backend/.env.'
