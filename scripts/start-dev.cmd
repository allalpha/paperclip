@echo off
setlocal enabledelayedexpansion
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

:: Take a snapshot backup of the DB directory before starting (rotates, keeps last 3)
:: This gives a clean recovery point if the DB ever corrupts again
set "BAKROOT=%USERPROFILE%\.paperclip\instances\default\db-snapshots"
if not exist "%BAKROOT%" mkdir "%BAKROOT%"

:: Rotate: delete oldest snapshot if 3 already exist
set "COUNT=0"
for /d %%D in ("%BAKROOT%\*") do set /a COUNT+=1
if !COUNT! GEQ 3 (
    for /f "skip=2 delims=" %%O in ('dir /b /ad /o-d "%BAKROOT%"') do (
        echo [paperclip] Removing old snapshot: %%O
        rmdir /s /q "%BAKROOT%\%%O"
        goto :snapshot_done_rotating
    )
)
:snapshot_done_rotating

:: Copy current DB as snapshot (only if Postgres is NOT running — this is startup, so it shouldn't be)
set "SNAP=%BAKROOT%\snap-%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "SNAP=%SNAP: =0%"
if exist "%DBDIR%\PG_VERSION" (
    echo [paperclip] Snapshot: %SNAP%
    xcopy /e /i /q /h "%DBDIR%" "%SNAP%" >nul 2>&1
)

echo [paperclip] Starting Paperclip...
cd /d "%~dp0\.."
pnpm dev