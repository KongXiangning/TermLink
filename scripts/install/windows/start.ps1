param(
    [string]$ConfigPath = '',
    [switch]$Foreground
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$SourceRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $SourceRoot -ConfigPath $ConfigPath
$Config = $loaded.Config
$InstallRoot = Resolve-TermLinkInstallRoot -SourceRoot $SourceRoot -Config $Config

Write-TermLinkEnv -ProjectRoot $InstallRoot -Config $Config
Initialize-TermLinkRuntimeDirs -ProjectRoot $InstallRoot -Config $Config
$env:TERMLINK_SERVICE_NAME = [string]$Config.serviceName

Push-Location $InstallRoot
try {
    if ($Foreground -or -not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        & node src/server.js
    }
    else {
        & pm2 restart $Config.serviceName 2>$null
        if ($LASTEXITCODE -ne 0) {
            & pm2 start ecosystem.config.js
        }
        if ($LASTEXITCODE -ne 0) {
            throw "PM2 start/restart failed with exit code $LASTEXITCODE"
        }
        & pm2 save --force
        Write-Host "TermLink started via PM2: $($Config.serviceName)"
    }
}
finally {
    Pop-Location
}
