#!/usr/bin/env bash
# Paperclip dev startup with automatic Postgres cleanup
# Run this instead of `pnpm dev` to avoid stale shared memory issues

echo "[paperclip] Cleaning up stale Postgres processes..."

# Kill any leftover postgres/pg_ctl processes
pkill -f postgres 2>/dev/null || true
pkill -f pg_ctl 2>/dev/null || true

# Remove stale PID file if Postgres isn't running
PIDFILE="$HOME/.paperclip/instances/default/db/postmaster.pid"
if [ -f "$PIDFILE" ]; then
    echo "[paperclip] Removing stale postmaster.pid"
    rm -f "$PIDFILE"
fi

echo "[paperclip] Starting Paperclip..."
cd "$(dirname "$0")/.."
pnpm dev