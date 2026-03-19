param(
    [string]$ProjectRoot,
    [string]$BaseUrl = 'http://127.0.0.1:3010',
    [string]$AuthUser = 'admin',
    [string]$AuthPass = 'admin',
    [int]$StartupTimeoutSec = 25
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
    $ProjectRoot = Resolve-Path (Join-Path $scriptDir '..\..\..')
}

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot"
}

function Test-TermLinkHealth {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetBaseUrl,
        [int]$TimeoutSec = 3
    )

    $normalized = $TargetBaseUrl.Trim().TrimEnd('/')
    if (-not $normalized) {
        return $null
    }

    $healthUrl = "$normalized/api/health"
    $authPair = "${AuthUser}:${AuthPass}"
    $authHeader = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($authPair))
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec $TimeoutSec -UseBasicParsing `
            -Headers @{ Authorization = "Basic $authHeader" }
        return [PSCustomObject]@{
            BaseUrl = $normalized
            HealthUrl = $healthUrl
            StatusCode = [int]$resp.StatusCode
            Content = $resp.Content
        }
    } catch {
        return $null
    }
}

$probe = Test-TermLinkHealth -TargetBaseUrl $BaseUrl
if ($probe) {
    Write-Host "Local server already healthy: $($probe.HealthUrl)"
    Write-Host "HTTP $($probe.StatusCode)"
    Write-Output $probe.Content
    exit 0
}

$parsedBaseUrl = [Uri]$BaseUrl
$port = if ($parsedBaseUrl.IsDefaultPort) {
    if ($parsedBaseUrl.Scheme -eq 'https') { 443 } else { 80 }
} else {
    $parsedBaseUrl.Port
}

try {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1
} catch {
    $listener = $null
}

if ($listener) {
    throw "Port $port is already listening but $BaseUrl/api/health is not healthy. Refusing to start a duplicate server."
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw 'node.exe was not found in PATH. Cannot start local TermLink server.'
}

$stdoutLog = Join-Path $scriptDir 'ensure-local-server.stdout.log'
$stderrLog = Join-Path $scriptDir 'ensure-local-server.stderr.log'
Remove-Item $stdoutLog, $stderrLog -Force -ErrorAction SilentlyContinue

Write-Host "Local server is not running. Starting with PORT=$port ..."
$previousPort = $env:PORT
$env:PORT = [string]$port
try {
    $process = Start-Process -FilePath $nodeCommand.Source `
        -ArgumentList 'src/server.js' `
        -WorkingDirectory $ProjectRoot `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru
} finally {
    if ($null -eq $previousPort) {
        Remove-Item Env:PORT -ErrorAction SilentlyContinue
    } else {
        $env:PORT = $previousPort
    }
}

$deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
do {
    Start-Sleep -Seconds 1
    $probe = Test-TermLinkHealth -TargetBaseUrl $BaseUrl
    if ($probe) {
        Write-Host "Local server started: $($probe.HealthUrl)"
        Write-Host "PID $($process.Id)"
        Write-Host "HTTP $($probe.StatusCode)"
        Write-Output $probe.Content
        exit 0
    }
} while ((Get-Date) -lt $deadline)

$tail = @()
if (Test-Path $stdoutLog) {
    $tail += Get-Content -Path $stdoutLog -Tail 20 -ErrorAction SilentlyContinue
}
if (Test-Path $stderrLog) {
    $tail += Get-Content -Path $stderrLog -Tail 20 -ErrorAction SilentlyContinue
}

try {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
} catch {
}

$detail = if ($tail.Count -gt 0) {
    "`nRecent server output:`n$($tail -join [Environment]::NewLine)"
} else {
    ''
}

throw "Timed out waiting for local server at $BaseUrl/api/health after ${StartupTimeoutSec}s.$detail"
