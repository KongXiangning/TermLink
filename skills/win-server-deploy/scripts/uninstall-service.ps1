<#
.SYNOPSIS
  Uninstall TermLink service (pm2).
.DESCRIPTION
  Stops the TermLink process, removes it from pm2, and optionally
  unregisters pm2 startup. Does NOT delete application files.
#>
$ErrorActionPreference = 'Stop'

Write-Host "=== TermLink Service Uninstaller ===" -ForegroundColor Cyan

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
    Write-Host "pm2 is not installed. Nothing to uninstall."
    exit 0
}

# Stop and remove the termlink process
Write-Host "Stopping termlink..."
& pm2 stop termlink 2>$null
& pm2 delete termlink 2>$null
& pm2 save --force

Write-Host "TermLink process removed from pm2."

# Ask whether to remove pm2 startup
$removeStartup = Read-Host "Remove pm2 auto-start on boot? (y/N)"
if ($removeStartup -eq 'y' -or $removeStartup -eq 'Y') {
    $isAdmin = ([Security.Principal.WindowsPrincipal]([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        try {
            & pm2-startup uninstall
            Write-Host "pm2 startup removed."
        }
        catch {
            Write-Warning "Failed to remove pm2 startup: $_"
        }
    }
    else {
        Write-Warning "Not running as Administrator. Re-run as Admin to remove startup."
    }
}

Write-Host ""
Write-Host "=== Uninstall Complete ===" -ForegroundColor Green
Write-Host "Application files were NOT deleted. Remove the folder manually if needed."
