param(
    [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$ProjectRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $ProjectRoot -ConfigPath $ConfigPath
Disable-TermLinkAutostart -Config $loaded.Config
Write-Host "Disabled startup task: $(Get-TermLinkStartupTaskName -Config $loaded.Config)"
