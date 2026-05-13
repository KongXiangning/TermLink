param(
    [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$SourceRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $SourceRoot -ConfigPath $ConfigPath
$Config = $loaded.Config
$ResolvedConfigPath = $loaded.Path
$InstallRoot = Resolve-TermLinkInstallRoot -SourceRoot $SourceRoot -Config $Config

Write-Host '=== TermLink Windows Release Installer ===' -ForegroundColor Cyan
Write-Host "Source root : $SourceRoot"
Write-Host "Install dir : $InstallRoot"
Write-Host "Config      : $ResolvedConfigPath"
Write-Host "Service     : $($Config.serviceName)"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js not found in PATH. Install Node.js first.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm not found in PATH. Install Node.js/npm first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $InstallRoot 'ecosystem.config.js'))) {
    throw 'ecosystem.config.js not found. Windows release install requires the PM2 ecosystem baseline.'
}

Write-TermLinkEnv -ProjectRoot $InstallRoot -Config $Config
Initialize-TermLinkRuntimeDirs -ProjectRoot $InstallRoot -Config $Config

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host 'pm2 not found. Installing pm2 globally...'
    & npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        throw "npm install -g pm2 failed with exit code $LASTEXITCODE"
    }
}

$env:TERMLINK_SERVICE_NAME = [string]$Config.serviceName
Push-Location $InstallRoot
try {
    & pm2 start ecosystem.config.js
    if ($LASTEXITCODE -ne 0) {
        throw "pm2 start ecosystem.config.js failed with exit code $LASTEXITCODE"
    }
    & pm2 save --force
    if ($LASTEXITCODE -ne 0) {
        throw "pm2 save failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

if (ConvertTo-TermLinkBool $Config.autoStart) {
    Enable-TermLinkAutostart -ProjectRoot $ProjectRoot -Config $Config -ConfigPath $ResolvedConfigPath
    $autoStartStatus = 'enabled'
}
else {
    $autoStartStatus = 'disabled by config'
}

Start-Sleep -Seconds 3
try {
    $health = Invoke-TermLinkHealthCheck -Config $Config
    $healthStatus = "OK HTTP $($health.StatusCode)"
}
catch {
    $healthStatus = "FAILED: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '=== Installation Result ===' -ForegroundColor Green
Write-Host "Install dir : $InstallRoot"
Write-Host "Config file : $ResolvedConfigPath"
Write-Host "Env file    : $(Join-Path $InstallRoot '.env')"
Write-Host "Service     : $($Config.serviceName)"
Write-Host "Auto-start  : $autoStartStatus"
Write-Host "Health URL  : $(Get-TermLinkHealthUrl -Config $Config)"
Write-Host "Health      : $healthStatus"
Write-Host "Logs        : pm2 logs $($Config.serviceName) --lines 50 --nostream"
