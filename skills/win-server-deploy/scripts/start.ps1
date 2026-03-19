<#
.SYNOPSIS
  Quick start/restart TermLink without full install.
.DESCRIPTION
  Starts TermLink using pm2 if pm2 is available, otherwise falls
  back to a direct node process (foreground).
#>
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (Test-Path (Join-Path $ProjectRoot 'src\server.js')) {
    # good
}
else {
    $ProjectRoot = $PSScriptRoot
}

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Cmd) {
    Push-Location $ProjectRoot
    try {
        & pm2 restart termlink 2>$null
        if ($LASTEXITCODE -ne 0) {
            & pm2 start ecosystem.config.js
        }
        & pm2 save
        Write-Host "TermLink started via pm2. Use 'pm2 logs termlink' to view output."
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "pm2 not found, starting in foreground mode (Ctrl+C to stop)..."
    Push-Location $ProjectRoot
    try {
        & node src/server.js
    }
    finally {
        Pop-Location
    }
}
