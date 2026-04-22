@echo off
:: Paperclip dev startup with automatic Postgres cleanup
:: Run this instead of `pnpm dev` to avoid stale shared memory issues

echo [paperclip] Cleaning up stale Postgres processes...

:: Kill any leftover postgres/pg_ctl processes
taskkill /F /IM postgres.exe >nul 2>&1
taskkill /F /IM pg_ctl.exe >nul 2>&1

:: Remove stale PID file if Postgres isn't running
set "PIDFILE=%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid"
if exist "%PIDFILE%" (
    echo [paperclip] Removing stale postmaster.pid
    del /f /q "%PIDFILE%"
)

echo [paperclip] Starting Paperclip...
cd /d "%~dp0\.."
pnpm dev