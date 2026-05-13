param(
    [string]$ConfigPath = '',
    [int]$TimeoutSec = 8
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$ProjectRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $ProjectRoot -ConfigPath $ConfigPath
$health = Invoke-TermLinkHealthCheck -Config $loaded.Config -TimeoutSec $TimeoutSec
Write-Host "Health OK HTTP $($health.StatusCode)"
