#!/usr/bin/env sh
set -e

DEPS_HASH="$(cat /app/package.json /app/package-lock.json 2>/dev/null | sha256sum | awk '{print $1}')"
CURRENT_HASH=""
if [ -f /app/node_modules/.deps.sha256 ]; then
    CURRENT_HASH="$(cat /app/node_modules/.deps.sha256)"
fi

if [ ! -d /app/node_modules ] || [ ! -f /app/node_modules/.deps.sha256 ] || [ "$DEPS_HASH" != "$CURRENT_HASH" ]; then
    echo "Syncing npm dependencies into /app/node_modules..."
    if [ -f /app/package-lock.json ]; then
        npm ci || npm install
    else
        npm install
    fi
    DEPS_HASH="$(cat /app/package.json /app/package-lock.json 2>/dev/null | sha256sum | awk '{print $1}')"
    printf '%s' "$DEPS_HASH" > /app/node_modules/.deps.sha256
fi

exec "$@"
