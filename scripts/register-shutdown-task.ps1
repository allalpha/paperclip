# Registers a Windows Scheduled Task that gracefully stops Paperclip's Postgres
# before Windows shuts down or restarts — prevents DB corruption.
#
# Run once (no admin required):
#   powershell -ExecutionPolicy Bypass -File scripts\register-shutdown-task.ps1
#
# To verify: schtasks /Query /TN "PaperclipGracefulStop" /FO LIST /V
# To remove: schtasks /Delete /TN "PaperclipGracefulStop" /F

$taskName = "PaperclipGracefulStop"
$stopScript = "C:\Users\ganes\Projects\Clients\paperclip\scripts\stop-dev.cmd"

# Event 1074: USER32 logs this when a user/process initiates shutdown or restart.
# It fires before Windows starts killing processes, giving ~5-10s for cleanup.
$query = '*[System[Provider[@Name=''USER32''] and EventID=1074]]'
$tr = "cmd.exe /c `"$stopScript`""

# Remove existing task if present
schtasks /Delete /TN $taskName /F 2>&1 | Out-Null

# Create via schtasks.exe (works without admin, Register-ScheduledTask requires elevation)
$result = schtasks /Create /TN $taskName /SC ONEVENT /EC System /MO $query /TR $tr /F 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[paperclip] Registered task: $taskName"
    Write-Host "[paperclip] Trigger: System Event 1074 (USER32 shutdown/restart initiation)"
    Write-Host "[paperclip] Script:  $stopScript"
    Write-Host ""
    Write-Host "Done. Postgres will now shut down gracefully whenever you restart or shut down Windows."
    Write-Host "To verify: schtasks /Query /TN `"PaperclipGracefulStop`" /FO LIST /V"
} else {
    Write-Host "[paperclip] ERROR creating task: $result"
    exit 1
}
