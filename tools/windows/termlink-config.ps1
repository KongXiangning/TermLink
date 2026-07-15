[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('config', 'status', 'port', 'start', 'stop', 'restart', 'autostart', 'mtls', 'health', 'open', 'help')]
    [string]$Command = 'status',

    [Parameter(Position = 1)]
    [string]$Action,

    [string]$InstallRoot,
    [string]$Value,
    [int]$TimeoutSeconds = 10,
    [switch]$Json,
    [switch]$ShowSecrets,
    [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'TermLink.Windows.psm1') -Force

function Write-TermLinkCliResult {
    param($Result)
    if ($Json) { $Result | ConvertTo-Json -Depth 12 -Compress }
    elseif ($Result -is [string] -or $Result -is [ValueType]) { Write-Output $Result }
    else { $Result | Format-List | Out-String | Write-Output }
}

function Write-TermLinkHelp {
    @'
TermLink Windows configuration CLI

Usage:
  termlink-config.ps1 status [-Json] [-InstallRoot PATH]
  termlink-config.ps1 config [show] [-ShowSecrets] [-Json]
  termlink-config.ps1 port get
  termlink-config.ps1 port set -Value PORT
  termlink-config.ps1 start | stop | restart
  termlink-config.ps1 autostart status | enable | disable [-WhatIf]
  termlink-config.ps1 mtls enable
  termlink-config.ps1 health [-TimeoutSeconds N]
  termlink-config.ps1 open page | logs [-WhatIf]
'@
}

try {
    switch ($Command) {
        'help' { Write-TermLinkHelp }
        'config' { Write-TermLinkCliResult (Get-TermLinkConfiguration -InstallRoot $InstallRoot -IncludeSecrets:$ShowSecrets) }
        'status' { Write-TermLinkCliResult (Get-TermLinkServiceStatus -InstallRoot $InstallRoot) }
        'port' {
            switch ($Action) {
                'get' { Write-TermLinkCliResult ((Get-TermLinkConfiguration -InstallRoot $InstallRoot).port) }
                'set' {
                    if ([string]::IsNullOrWhiteSpace($Value)) { throw 'port set requires -Value PORT.' }
                    Write-TermLinkCliResult (Set-TermLinkPort -InstallRoot $InstallRoot -Port $Value)
                }
                default { throw 'port requires action get or set.' }
            }
        }
        'start' { Write-TermLinkCliResult (Start-TermLinkService -InstallRoot $InstallRoot) }
        'stop' { Write-TermLinkCliResult (Stop-TermLinkService -InstallRoot $InstallRoot -TimeoutSeconds $TimeoutSeconds) }
        'restart' { Write-TermLinkCliResult (Restart-TermLinkService -InstallRoot $InstallRoot) }
        'autostart' {
            switch ($Action) {
                'status' { Write-TermLinkCliResult (Get-TermLinkAutostartStatus -InstallRoot $InstallRoot) }
                'enable' {
                    $result = Enable-TermLinkAutostart -InstallRoot $InstallRoot -Preview:$WhatIf
                    Write-TermLinkCliResult $result
                }
                'disable' {
                    $result = Disable-TermLinkAutostart -InstallRoot $InstallRoot -Preview:$WhatIf
                    Write-TermLinkCliResult $result
                }
                default { throw 'autostart requires action status, enable, or disable.' }
            }
        }
        'mtls' {
            if ($Action -ne 'enable') { throw 'mtls requires action enable.' }
            Write-TermLinkCliResult (Enable-TermLinkMtls -InstallRoot $InstallRoot -HealthTimeoutSeconds $TimeoutSeconds -Confirm:$false)
        }
        'health' {
            $result = Invoke-TermLinkHealthCheck -InstallRoot $InstallRoot -TimeoutSeconds $TimeoutSeconds
            Write-TermLinkCliResult $result
            if (-not $result.Healthy) { exit 2 }
        }
        'open' {
            switch ($Action) {
                'page' {
                    $result = Open-TermLinkPage -InstallRoot $InstallRoot -Preview:$WhatIf
                    Write-TermLinkCliResult $result
                }
                'logs' {
                    $result = Open-TermLinkLogDirectory -InstallRoot $InstallRoot -Preview:$WhatIf
                    Write-TermLinkCliResult $result
                }
                default { throw 'open requires action page or logs.' }
            }
        }
    }
} catch {
    [Console]::Error.WriteLine("TermLink: $($_.Exception.Message)")
    exit 1
}
