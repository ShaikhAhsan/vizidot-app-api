#!/bin/sh
# Dump CREATE TABLE definitions using mysqldump (no data).
# Requires: mysql client tools and .env with DB_* variables.
# Usage: ./scripts/getCreateTables.sh [output-file]
# Example: ./scripts/getCreateTables.sh schema.sql

set -e
cd "$(dirname "$0")/.."

# Prefer .env, fall back to env.example
if [ -f .env ]; then
  set -a && . .env && set +a
elif [ -f env.example ]; then
  set -a && . env.example && set +a
else
  echo "Missing .env and env.example. Create .env with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME."
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-vizidot}"
OUT="${1:-schema.sql}"

mysqldump --no-data --skip-triggers --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" --password="${DB_PASSWORD}" "${DB_NAME}" > "${OUT}"
echo "Wrote schema to ${OUT}"
