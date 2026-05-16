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
Install-TermLinkNodeDependenciesIfNeeded -ProjectRoot $InstallRoot
$env:TERMLINK_SERVICE_NAME = [string]$Config.serviceName

Push-Location $InstallRoot
try {
    $pm2Command = if ($Foreground) { $null } else { Resolve-TermLinkPm2Command -AllowMissing }
    if ($Foreground -or -not $pm2Command) {
        & node src/server.js
    }
    else {
        & $pm2Command restart $Config.serviceName 2>$null
        if ($LASTEXITCODE -ne 0) {
            & $pm2Command start ecosystem.config.js
        }
        if ($LASTEXITCODE -ne 0) {
            throw "PM2 start/restart failed with exit code $LASTEXITCODE"
        }
        & $pm2Command save --force
        Write-Host "TermLink started via PM2: $($Config.serviceName)"
    }
}
finally {
    Pop-Location
}
