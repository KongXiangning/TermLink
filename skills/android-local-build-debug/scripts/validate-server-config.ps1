param(
    [string]$BaseUrl
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillDir = Split-Path -Parent $scriptDir
$localConfig = Join-Path $skillDir 'local-config.ps1'

if (-not $BaseUrl) {
    if (Test-Path $localConfig) {
        . $localConfig
        $BaseUrl = $TermLinkValidationBaseUrl
    }
}

if (-not $BaseUrl) {
    throw "Missing BaseUrl. Set -BaseUrl or create $localConfig"
}

$normalized = $BaseUrl.TrimEnd('/')
$healthUrl = "$normalized/api/health"

Write-Host "Validating: $healthUrl"
try {
    $resp = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 8
    Write-Host "HTTP $($resp.StatusCode)"
    Write-Output $resp.Content
} catch {
    Write-Host "Validation request failed: $($_.Exception.Message)"
    exit 1
}

