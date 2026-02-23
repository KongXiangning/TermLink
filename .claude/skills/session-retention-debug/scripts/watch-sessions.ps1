param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,
    [string]$User,
    [string]$Pass,
    [int]$IntervalSec = 10,
    [int]$MaxRounds = 0
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inspectScript = Join-Path $scriptDir 'inspect-sessions.ps1'

if (-not (Test-Path $inspectScript)) {
    throw "Missing script: $inspectScript"
}

$round = 0
while ($true) {
    $round++
    Write-Host ""
    Write-Host "=== Session Snapshot #$round @ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
    & $inspectScript -BaseUrl $BaseUrl -User $User -Pass $Pass
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if ($MaxRounds -gt 0 -and $round -ge $MaxRounds) {
        break
    }
    Start-Sleep -Seconds $IntervalSec
}
