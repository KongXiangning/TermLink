param(
    [ValidateSet('status', 'start', 'stop', 'restart')]
    [string]$Action = 'status',
    [string]$ProjectRoot,
    [string]$BaseUrl = 'http://127.0.0.1:3010',
    [string]$AuthUser,
    [string]$AuthPass,
    [int]$StartupTimeoutSec = 25
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
    $ProjectRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path
}

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot"
}

$projectRootResolved = (Resolve-Path $ProjectRoot).Path
$logDir = Join-Path $projectRootResolved 'logs'
$combinedLog = Join-Path $logDir 'dev-server.log'

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

function Get-ResolvedAuth {
    $envMap = Get-EnvMap (Join-Path $projectRootResolved '.env')

    $resolvedUser = $AuthUser
    $resolvedPass = $AuthPass

    if (-not $resolvedUser) {
        if ($envMap.ContainsKey('AUTH_USER') -and $envMap['AUTH_USER']) {
            $resolvedUser = $envMap['AUTH_USER']
        } else {
            $resolvedUser = 'admin'
        }
    }

    if (-not $resolvedPass) {
        if ($envMap.ContainsKey('AUTH_PASS') -and $envMap['AUTH_PASS']) {
            $resolvedPass = $envMap['AUTH_PASS']
        } else {
            $resolvedPass = 'admin'
        }
    }

    return [PSCustomObject]@{
        User = $resolvedUser
        Pass = $resolvedPass
    }
}

function Get-ExpectedProcessList {
    $escapedRoot = [Regex]::Escape($projectRootResolved)

    Get-CimInstance Win32_Process | Where-Object {
        $_.Name -in @('node.exe', 'npm.exe', 'cmd.exe')
    } | Where-Object {
        $commandLine = $_.CommandLine
        if (-not $commandLine) {
            return $false
        }

        return (
            $commandLine -match $escapedRoot -or
            $commandLine -like '*src/server.js*' -or
            $commandLine -like '*npm-cli.js*run dev*' -or
            $commandLine -like '*nodemon*src/server.js*'
        )
    } | Sort-Object ProcessId -Descending
}

function Get-PortFromBaseUrl {
    param([string]$TargetBaseUrl)

    $uri = [Uri]$TargetBaseUrl
    if ($uri.IsDefaultPort) {
        if ($uri.Scheme -eq 'https') {
            return 443
        }
        return 80
    }
    return $uri.Port
}

function Get-HealthStatus {
    param(
        [string]$TargetBaseUrl,
        [int]$TimeoutSec = 3
    )

    $auth = Get-ResolvedAuth
    $normalized = $TargetBaseUrl.Trim().TrimEnd('/')
    $healthUrl = "$normalized/api/health"
    $pair = '{0}:{1}' -f $auth.User, $auth.Pass
    $encoded = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec $TimeoutSec -Headers @{
            Authorization = "Basic $encoded"
        }
        return [PSCustomObject]@{
            Reachable = $true
            Healthy = $true
            AuthRequired = $false
            StatusCode = [int]$response.StatusCode
            Content = $response.Content
            Url = $healthUrl
        }
    } catch {
        $webResponse = $_.Exception.Response
        if ($webResponse -and [int]$webResponse.StatusCode -eq 401) {
            return [PSCustomObject]@{
                Reachable = $true
                Healthy = $true
                AuthRequired = $true
                StatusCode = 401
                Content = $null
                Url = $healthUrl
            }
        }
        return [PSCustomObject]@{
            Reachable = $false
            Healthy = $false
            AuthRequired = $false
            StatusCode = $null
            Content = $null
            Url = $healthUrl
        }
    }
}

function Show-Status {
    $processes = @(Get-ExpectedProcessList)
    $port = Get-PortFromBaseUrl $BaseUrl
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $port })
    $health = Get-HealthStatus -TargetBaseUrl $BaseUrl

    Write-Host "Action: status"
    Write-Host "ProjectRoot: $projectRootResolved"
    Write-Host "BaseUrl: $BaseUrl"
    Write-Host "Port: $port"
    Write-Host "TrackedProcessCount: $($processes.Count)"

    foreach ($process in $processes) {
        Write-Host ("PID {0} {1} :: {2}" -f $process.ProcessId, $process.Name, $process.CommandLine)
    }

    if ($listeners.Count -gt 0) {
        foreach ($listener in $listeners) {
            Write-Host ("Listening: {0}:{1} pid={2}" -f $listener.LocalAddress, $listener.LocalPort, $listener.OwningProcess)
        }
    } else {
        Write-Host "Listening: none"
    }

    if ($health.Healthy) {
        if ($health.AuthRequired) {
            Write-Host "Health: AUTH_REQUIRED ($($health.Url))"
        } else {
            Write-Host "Health: OK ($($health.Url))"
            if ($health.Content) {
                Write-Output $health.Content
            }
        }
    } else {
        Write-Host "Health: unavailable ($($health.Url))"
    }
}

function Stop-TrackedProcesses {
    $processes = @(Get-ExpectedProcessList)
    if ($processes.Count -eq 0) {
        Write-Host 'No tracked local dev server processes found.'
        return
    }

    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
            Write-Host ("Stopped PID {0} ({1})" -f $process.ProcessId, $process.Name)
        } catch {
            if ($_.Exception.Message -like '*Cannot find a process with the process identifier*') {
                Write-Host ("PID {0} already exited" -f $process.ProcessId)
            } else {
                Write-Warning ("Failed to stop PID {0}: {1}" -f $process.ProcessId, $_.Exception.Message)
            }
        }
    }

    $deadline = (Get-Date).AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 500
        if ((@(Get-ExpectedProcessList)).Count -eq 0) {
            break
        }
    } while ((Get-Date) -lt $deadline)
}

function Start-TrackedProcess {
    $health = Get-HealthStatus -TargetBaseUrl $BaseUrl
    if ($health.Healthy) {
        Write-Host "Local dev server is already running."
        Show-Status
        return
    }

    $port = Get-PortFromBaseUrl $BaseUrl
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $port })
    if ($listeners.Count -gt 0) {
        throw "Port $port is already listening, but the expected dev server health check is not healthy. Refusing to start a duplicate process."
    }

    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $command = "set PORT=$port&& cd /d $projectRootResolved && npm run dev >> logs\dev-server.log 2>&1"

    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $command -WindowStyle Hidden | Out-Null
    Write-Host "Started local dev server with PORT=$port"

    $deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
    do {
        Start-Sleep -Seconds 1
        $probe = Get-HealthStatus -TargetBaseUrl $BaseUrl
        if ($probe.Healthy) {
            if ($probe.AuthRequired) {
                Write-Host "Health: AUTH_REQUIRED ($($probe.Url))"
            } else {
                Write-Host "Health: OK ($($probe.Url))"
                if ($probe.Content) {
                    Write-Output $probe.Content
                }
            }
            return
        }
    } while ((Get-Date) -lt $deadline)

    $tail = if (Test-Path $combinedLog) {
        Get-Content $combinedLog -Tail 80 -ErrorAction SilentlyContinue
    } else {
        @()
    }

    $detail = if ($tail.Count -gt 0) {
        "`nRecent log output:`n$($tail -join [Environment]::NewLine)"
    } else {
        ''
    }

    throw "Timed out waiting for local dev server health after ${StartupTimeoutSec}s.$detail"
}

switch ($Action) {
    'status' {
        Show-Status
    }
    'stop' {
        Stop-TrackedProcesses
        Show-Status
    }
    'start' {
        Start-TrackedProcess
        Show-Status
    }
    'restart' {
        Stop-TrackedProcesses
        Start-TrackedProcess
        Show-Status
    }
}
