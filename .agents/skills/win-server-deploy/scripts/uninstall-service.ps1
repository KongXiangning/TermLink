<#
.SYNOPSIS
  Uninstall TermLink service (pm2).
.DESCRIPTION
  Stops the TermLink process, removes it from pm2, and optionally
  removes the PM2-Termlink-Admin scheduled task. Does NOT delete
  application files.
#>
$ErrorActionPreference = 'Stop'

Write-Host "=== TermLink Service Uninstaller ===" -ForegroundColor Cyan

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Cmd) {
    Write-Host "Stopping termlink..."
    & pm2 stop termlink 2>$null
    & pm2 delete termlink 2>$null
    & pm2 save --force
    Write-Host "TermLink process removed from pm2."
}
else {
    Write-Warning "pm2 is not installed. Skipping pm2 cleanup."
}

$taskName = 'PM2-Termlink-Admin'
$removeStartup = Read-Host "Remove startup scheduled task '$taskName'? (y/N)"
if ($removeStartup -eq 'y' -or $removeStartup -eq 'Y') {
    $isAdmin = ([Security.Principal.WindowsPrincipal]([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
        Write-Warning "Not running as Administrator. Re-run as Admin to remove $taskName."
    }
    else {
        & schtasks.exe /Delete /TN $taskName /F | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Removed startup task $taskName."
        }
        else {
            Write-Warning "Failed to remove startup task $taskName."
        }
    }
}

Write-Host ""
Write-Host "=== Uninstall Complete ===" -ForegroundColor Green
Write-Host "Application files were NOT deleted. Remove the folder manually if needed."
