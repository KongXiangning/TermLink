<#
.SYNOPSIS
  Install TermLink as a Windows background service using pm2 and Task Scheduler.
.DESCRIPTION
  1. Requires Administrator PowerShell.
  2. Ensures .env, data/, logs/, and global pm2.
  3. Removes legacy pm2-windows-startup Run entries.
  4. Registers scheduled task PM2-Termlink-Admin using pm2-admin-startup.cmd.
  5. Restarts the pm2 daemon as admin, starts ecosystem.config.js, saves the process list, and verifies /api/health.
#>
$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
    return ([Security.Principal.WindowsPrincipal]([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
}

function Get-EnvMap {
    param([string]$EnvPath)

    $map = @{}
    if (-not (Test-Path $EnvPath)) {
        return $map
    }

    foreach ($line in Get-Content $EnvPath) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) {
            continue
        }

        $eqIndex = $trimmed.IndexOf('=')
        if ($eqIndex -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $eqIndex).Trim()
        $value = $trimmed.Substring($eqIndex + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $map[$key] = $value
    }

    return $map
}

function Get-EnvValue {
    param(
        [hashtable]$EnvMap,
        [string]$Key,
        [string]$DefaultValue
    )

    if ($EnvMap.ContainsKey($Key) -and $EnvMap[$Key] -ne '') {
        return [string]$EnvMap[$Key]
    }

    return $DefaultValue
}

function Get-EnvBool {
    param(
        [hashtable]$EnvMap,
        [string]$Key,
        [bool]$DefaultValue
    )

    if (-not $EnvMap.ContainsKey($Key)) {
        return $DefaultValue
    }

    $raw = [string]$EnvMap[$Key]
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $DefaultValue
    }

    return $raw.Trim().ToLowerInvariant() -in @('1', 'true', 'yes', 'on')
}

function Remove-LegacyPm2StartupEntries {
    $runPaths = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'
    )

    foreach ($runPath in $runPaths) {
        if (-not (Test-Path $runPath)) {
            continue
        }

        $props = (Get-ItemProperty -Path $runPath).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }
        foreach ($prop in $props) {
            $valueText = [string]$prop.Value
            if (($prop.Name -match '^PM2($|[._-])') -or $valueText -match 'pm2(\.exe)?|pm2-startup|pm2-windows-startup|pm2 resurrect') {
                try {
                    Remove-ItemProperty -Path $runPath -Name $prop.Name -Force
                    Write-Host "Removed legacy startup entry: $runPath::$($prop.Name)"
                }
                catch {
                    Write-Warning "Failed to remove legacy startup entry $runPath::$($prop.Name): $($_.Exception.Message)"
                }
            }
        }
    }
}

function Register-AdminStartupTask {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TaskName,

        [Parameter(Mandatory = $true)]
        [string]$StartupScript
    )

    $quotedStartup = '"' + $StartupScript + '"'
    & schtasks.exe /Create /F /TN $TaskName /SC ONLOGON /DELAY 0000:10 /TR $quotedStartup /RL HIGHEST | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "schtasks /Create failed with exit code $LASTEXITCODE"
    }
}

function Get-Pm2HomePath {
    if ($env:PM2_HOME) {
        return $env:PM2_HOME
    }

    return Join-Path $HOME '.pm2'
}

function Get-Pm2ProcessNames {
    try {
        $raw = & pm2 jlist 2>$null | Out-String
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return @()
        }

        $items = $raw | ConvertFrom-Json -ErrorAction Stop
        if ($items -isnot [System.Array]) {
            $items = @($items)
        }

        return @($items | ForEach-Object { $_.name } | Where-Object { $_ })
    }
    catch {
        return @()
    }
}

function Assert-NoForeignPm2Processes {
    $foreign = @(Get-Pm2ProcessNames | Where-Object { $_ -and $_ -ne 'termlink' } | Sort-Object -Unique)
    if ($foreign.Count -gt 0) {
        $joined = $foreign -join ', '
        throw "Existing PM2 apps detected ($joined). Elevated TermLink startup resets the PM2 daemon, so deploy on a dedicated Windows user or remove those apps first."
    }
}

function Wait-Pm2Shutdown {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Pm2Home,

        [int]$TimeoutSeconds = 15
    )

    $pidFile = Join-Path $Pm2Home 'pm2.pid'
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-Path $pidFile)) {
            return
        }

        $pidText = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
        if ([string]::IsNullOrWhiteSpace($pidText)) {
            Start-Sleep -Seconds 1
            continue
        }

        $pm2Pid = 0
        if (-not [int]::TryParse($pidText, [ref]$pm2Pid)) {
            Start-Sleep -Seconds 1
            continue
        }

        if (-not (Get-Process -Id $pm2Pid -ErrorAction SilentlyContinue)) {
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Timed out waiting for PM2 daemon to stop cleanly."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
if (Test-Path (Join-Path $ScriptDir '..\src\server.js')) {
    $ProjectRoot = (Resolve-Path (Join-Path $ScriptDir '..')).Path
}

Write-Host "=== TermLink Windows Service Installer ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"

if (-not (Test-IsAdmin)) {
    Write-Error 'Administrator PowerShell is required. Re-run install-service.ps1 as Administrator.'
    exit 1
}

$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Error "Node.js not found in PATH. Install Node.js first."
    exit 1
}
Write-Host "Node.js: $(& node --version)"

$envFile = Join-Path $ProjectRoot '.env'
$envExample = Join-Path $ProjectRoot '.env.example'
if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Warning '.env not found - created from .env.example. Review it before production use.'
    }
    else {
        Write-Warning '.env not found and .env.example is missing. Server defaults will apply.'
    }
}
else {
    Write-Host '.env found.'
}

$envMap = Get-EnvMap -EnvPath $envFile
$port = Get-EnvValue -EnvMap $envMap -Key 'PORT' -DefaultValue '3010'
$authEnabled = Get-EnvBool -EnvMap $envMap -Key 'AUTH_ENABLED' -DefaultValue $true
$authUser = Get-EnvValue -EnvMap $envMap -Key 'AUTH_USER' -DefaultValue 'admin'
$authPass = Get-EnvValue -EnvMap $envMap -Key 'AUTH_PASS' -DefaultValue 'admin'
$privilegeMode = Get-EnvValue -EnvMap $envMap -Key 'TERMLINK_PRIVILEGE_MODE' -DefaultValue 'standard'
$elevatedEnable = Get-EnvBool -EnvMap $envMap -Key 'TERMLINK_ELEVATED_ENABLE' -DefaultValue $false

if ($authEnabled -and ($authUser -eq 'admin' -and $authPass -eq 'admin')) {
    Write-Warning 'AUTH_USER/AUTH_PASS are still admin/admin. Change them before production use.'
}
if ($privilegeMode -eq 'elevated' -and -not $elevatedEnable) {
    Write-Warning 'TERMLINK_PRIVILEGE_MODE=elevated but TERMLINK_ELEVATED_ENABLE is not true.'
}

@('data', 'logs') | ForEach-Object {
    $dir = Join-Path $ProjectRoot $_
    if (-not (Test-Path $dir)) {
        New-Item $dir -ItemType Directory -Force | Out-Null
        Write-Host "Created $_ directory."
    }
}

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
    Write-Host 'Installing pm2 globally...'
    & npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install pm2."
        exit 1
    }
}
else {
    Write-Host 'pm2 already installed.'
}

$pm2Home = Get-Pm2HomePath
Write-Host "PM2 home: $pm2Home"

$startupScript = Join-Path $ScriptDir 'pm2-admin-startup.cmd'
if (-not (Test-Path $startupScript)) {
    Write-Error "Missing startup script: $startupScript"
    exit 1
}

Write-Host 'Removing legacy pm2-windows-startup registry entries (if any)...'
Remove-LegacyPm2StartupEntries

$taskName = 'PM2-Termlink-Admin'
Write-Host "Registering scheduled task $taskName ..."
Register-AdminStartupTask -TaskName $taskName -StartupScript $startupScript

$ecosystemConfig = Join-Path $ProjectRoot 'ecosystem.config.js'
if (-not (Test-Path $ecosystemConfig)) {
    Write-Error "ecosystem.config.js not found at $ecosystemConfig"
    exit 1
}

Write-Host 'Restarting pm2 daemon with administrator privileges...'
Push-Location $ProjectRoot
try {
    Assert-NoForeignPm2Processes
    & pm2 kill 2>$null | Out-Null
    Wait-Pm2Shutdown -Pm2Home $pm2Home
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

Write-Host ''
Write-Host '=== Installation Complete ===' -ForegroundColor Green
Write-Host @"

  Service name : termlink
  PM2 status   : pm2 list
  Logs         : pm2 logs termlink --lines 50 --nostream
  Restart      : pm2 restart termlink
  Stop         : pm2 stop termlink
  Startup task : $taskName
  Uninstall    : Run uninstall-service.ps1

  Server URL   : http://localhost:$port

"@

Start-Sleep -Seconds 3
try {
    $headers = @{}
    if ($authEnabled) {
        $token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${authUser}:${authPass}"))
        $headers.Authorization = "Basic $token"
    }

    $health = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -Headers $headers -TimeoutSec 8 -ErrorAction Stop
    Write-Host "[OK] Server is running. Health HTTP $($health.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Warning "Health check failed. Inspect: pm2 logs termlink --lines 50 --nostream"
}
