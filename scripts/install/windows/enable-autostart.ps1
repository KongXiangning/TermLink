param(
    [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

$ProjectRoot = Resolve-TermLinkRoot -StartDir $PSScriptRoot
$loaded = Read-TermLinkInstallConfig -ProjectRoot $ProjectRoot -ConfigPath $ConfigPath
Enable-TermLinkAutostart -ProjectRoot $ProjectRoot -Config $loaded.Config -ConfigPath $loaded.Path
Write-Host "Enabled startup task: $(Get-TermLinkStartupTaskName -Config $loaded.Config)"
