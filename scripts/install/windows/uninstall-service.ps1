param(
    [string]$ConfigPath = '',
    [switch]$RemoveAutostart
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$SourceRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $SourceRoot -ConfigPath $ConfigPath
$Config = $loaded.Config
$InstallRoot = Resolve-TermLinkInstallRoot -SourceRoot $SourceRoot -Config $Config

Write-Host '=== TermLink Windows Release Uninstaller ===' -ForegroundColor Cyan
Write-Host "Install dir : $InstallRoot"
Write-Host "Service     : $($Config.serviceName)"

if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    & pm2 stop $Config.serviceName 2>$null
    & pm2 delete $Config.serviceName 2>$null
    & pm2 save --force
    Write-Host "Removed PM2 process: $($Config.serviceName)"
}
else {
    Write-Warning 'pm2 not found. Skipping PM2 cleanup.'
}

if ($RemoveAutostart) {
    Disable-TermLinkAutostart -Config $Config
    Write-Host "Removed startup task: $(Get-TermLinkStartupTaskName -Config $Config)"
}

Write-Host ''
Write-Host '=== Uninstall Result ===' -ForegroundColor Green
Write-Host 'Application files were not deleted.'
Write-Host 'Use -RemoveAutostart from Administrator PowerShell to remove the scheduled task.'
