param(
    [string]$ConfigPath = '',
    [int]$TimeoutSec = 8
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$SourceRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $SourceRoot -ConfigPath $ConfigPath
$InstallRoot = Resolve-TermLinkInstallRoot -SourceRoot $SourceRoot -Config $loaded.Config
$health = Invoke-TermLinkHealthCheck -Config $loaded.Config -InstallRoot $InstallRoot -ConfigPath $loaded.Path -TimeoutSec $TimeoutSec
Write-Host $health
