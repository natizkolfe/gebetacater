#!/bin/sh
set -eu

DATA_PATH="${DATA_DIR:-/data}"
mkdir -p "$DATA_PATH"

# Volume mounts are often root-owned; fix ownership then drop privileges.
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "$DATA_PATH" 2>/dev/null || true
  echo "[gebeta] DATA_DIR=$DATA_PATH PORT=${PORT:-3000}"
  exec setpriv --reuid=nextjs --regid=nodejs --init-groups -- "$@"
fi

echo "[gebeta] DATA_DIR=$DATA_PATH PORT=${PORT:-3000}"
exec "$@"
