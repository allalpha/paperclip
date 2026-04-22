@echo off
:: Paperclip dev startup with automatic Postgres cleanup
:: Run this instead of `pnpm dev` to avoid stale shared memory issues

echo [paperclip] Cleaning up stale Postgres processes...

:: Kill any leftover postgres/pg_ctl processes
taskkill /F /IM postgres.exe >nul 2>&1
taskkill /F /IM pg_ctl.exe >nul 2>&1

:: Wait for Windows to release shared memory after process kill
timeout /t 2 /nobreak >nul 2>&1

:: Remove stale PID files
set "DBDIR=%USERPROFILE%\.paperclip\instances\default\db"
if exist "%DBDIR%\postmaster.pid" (
    echo [paperclip] Removing stale postmaster.pid
    del /f /q "%DBDIR%\postmaster.pid"
)

:: Remove stale shared memory semaphore files (postgresql-*.pid)
for %%f in ("%DBDIR%\postgresql-*.pid") do (
    echo [paperclip] Removing stale shared memory file: %%~nxf
    del /f /q "%%f"
)

echo [paperclip] Starting Paperclip...
cd /d "%~dp0\.."
pnpm dev