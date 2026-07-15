<#
.SYNOPSIS
  Quick start/restart TermLink without full install.
.DESCRIPTION
  Starts TermLink using pm2 if pm2 is available, otherwise falls
  back to a direct node process (foreground). Elevated mode should
  be run from an Administrator terminal so pm2 inherits the right
  process privileges.
#>
$ErrorActionPreference = 'Stop'

function Resolve-ProjectRootFromScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartDir
    )

    $current = Resolve-Path $StartDir
    while ($null -ne $current) {
        $candidate = $current.Path
        $packageJson = Join-Path $candidate 'package.json'
        $serverEntry = Join-Path $candidate 'src\server.js'
        if ((Test-Path $packageJson) -and (Test-Path $serverEntry)) {
            return $candidate
        }

        $parent = Split-Path -Parent $candidate
        if (-not $parent -or $parent -eq $candidate) {
            break
        }
        $current = Resolve-Path $parent
    }

    throw "Project root not found from script directory: $StartDir"
}

$ProjectRoot = Resolve-ProjectRootFromScript -StartDir $PSScriptRoot

function Test-IsAdmin {
    return ([Security.Principal.WindowsPrincipal]([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
}

$envFile = Join-Path $ProjectRoot '.env'
if (Test-Path $envFile) {
    $privilegeModeLine = Get-Content $envFile | Where-Object { $_ -match '^\s*TERMLINK_PRIVILEGE_MODE\s*=' } | Select-Object -First 1
    if ($privilegeModeLine) {
        $privilegeMode = (($privilegeModeLine -split '=', 2)[1]).Trim().Trim('"').Trim("'")
        if ($privilegeMode -eq 'elevated' -and -not (Test-IsAdmin)) {
            Write-Error 'TERMLINK_PRIVILEGE_MODE=elevated requires Administrator PowerShell.'
            exit 1
        }
    }
}

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Cmd) {
    Push-Location $ProjectRoot
    try {
        & pm2 restart termlink 2>$null
        if ($LASTEXITCODE -ne 0) {
            & pm2 start ecosystem.config.js
        }
        & pm2 save --force
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
