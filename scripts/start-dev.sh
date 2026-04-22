#!/usr/bin/env bash
# Paperclip dev startup with automatic Postgres cleanup
# Run this instead of `pnpm dev` to avoid stale shared memory issues

echo "[paperclip] Cleaning up stale Postgres processes..."

# Kill any leftover postgres/pg_ctl processes
pkill -f postgres 2>/dev/null || true
pkill -f pg_ctl 2>/dev/null || true

# Wait for OS to release shared memory after process kill
sleep 2

# Remove stale PID and shared memory files
DBDIR="$HOME/.paperclip/instances/default/db"
if [ -f "$DBDIR/postmaster.pid" ]; then
    echo "[paperclip] Removing stale postmaster.pid"
    rm -f "$DBDIR/postmaster.pid"
fi

# Remove stale shared memory semaphore files
for f in "$DBDIR"/postgresql-*.pid; do
    [ -f "$f" ] && echo "[paperclip] Removing stale shared memory file: $(basename "$f")" && rm -f "$f"
done

echo "[paperclip] Starting Paperclip..."
cd "$(dirname "$0")/.."
pnpm dev