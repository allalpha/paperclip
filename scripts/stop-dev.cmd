@echo off
setlocal enabledelayedexpansion
:: Paperclip graceful Postgres shutdown
:: Run BEFORE restarting or shutting down Windows to prevent DB corruption
:: Also called automatically by the Windows shutdown task (see register-shutdown-task.ps1)

set "DBDIR=%USERPROFILE%\.paperclip\instances\default\db"
set "PIDFILE=%DBDIR%\postmaster.pid"
set "OPTSFILE=%DBDIR%\postmaster.opts"

if not exist "%PIDFILE%" (
    echo [paperclip-stop] Postgres not running - nothing to do
    exit /b 0
)

if not exist "%OPTSFILE%" (
    echo [paperclip-stop] postmaster.opts not found, force-killing
    taskkill /F /IM postgres.exe >nul 2>&1
    exit /b 1
)

:: Read the postgres binary path from the first token of postmaster.opts
set "PGEXE="
for /f "usebackq tokens=1" %%P in ("%OPTSFILE%") do (
    if "!PGEXE!"=="" set "PGEXE=%%P"
)

if "!PGEXE!"=="" (
    echo [paperclip-stop] Could not parse postgres path, force-killing
    taskkill /F /IM postgres.exe >nul 2>&1
    exit /b 1
)

:: Derive pg_ctl.exe from the same bin directory as postgres.exe
for %%D in ("!PGEXE!") do set "BINDIR=%%~dpD"
set "PGCTL=!BINDIR!pg_ctl.exe"

if not exist "!PGCTL!" (
    echo [paperclip-stop] pg_ctl not found at: !PGCTL!
    echo [paperclip-stop] Force-killing postgres
    taskkill /F /IM postgres.exe >nul 2>&1
    exit /b 1
)

echo [paperclip-stop] Stopping Postgres gracefully (fast mode, 30s timeout)...
"!PGCTL!" stop -D "!DBDIR!" -m fast -t 30

if !errorlevel! == 0 (
    echo [paperclip-stop] Postgres stopped cleanly - safe to restart Windows
) else (
    echo [paperclip-stop] pg_ctl stop failed (exit !errorlevel!), force-killing
    taskkill /F /IM postgres.exe >nul 2>&1
)
