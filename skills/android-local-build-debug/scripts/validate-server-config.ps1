param(
    [string]$BaseUrl,
    [string]$AuthUser = 'admin',
    [string]$AuthPass = 'admin'
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillDir = Split-Path -Parent $scriptDir
$localConfig = Join-Path $skillDir 'local-config.ps1'

function Test-TermLinkHealthUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CandidateBaseUrl
    )

    $normalized = $CandidateBaseUrl.Trim().TrimEnd('/')
    if (-not $normalized) {
        return $null
    }

    $healthUrl = "$normalized/api/health"
    $authPair = "${AuthUser}:${AuthPass}"
    $authHeader = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($authPair))
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 5 -UseBasicParsing `
            -Headers @{ Authorization = "Basic $authHeader" }
        return [PSCustomObject]@{
            BaseUrl = $normalized
            HealthUrl = $healthUrl
            Response = $resp
            Content = $resp.Content
        }
    } catch {
        return $null
    }
}

if (-not $BaseUrl) {
    if (Test-Path $localConfig) {
        . $localConfig
        $BaseUrl = $TermLinkValidationBaseUrl
    }
}

if (-not $BaseUrl) {
    $probe = $null

    if ($env:TERMLINK_VALIDATION_BASE_URL) {
        $probe = Test-TermLinkHealthUrl -CandidateBaseUrl $env:TERMLINK_VALIDATION_BASE_URL
    }

    if (-not $probe) {
        $probe = Test-TermLinkHealthUrl -CandidateBaseUrl 'http://127.0.0.1:3010'
    }

    if (-not $probe) {
        try {
            $hostCandidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
                Where-Object {
                    $_.IPAddress -notlike '127.*' -and
                    $_.IPAddress -notlike '169.254.*' -and
                    $_.IPAddress -notlike '0.*'
                } |
                Select-Object -ExpandProperty IPAddress -Unique
            foreach ($hostIp in $hostCandidates) {
                $probe = Test-TermLinkHealthUrl -CandidateBaseUrl "http://${hostIp}:3010"
                if ($probe) {
                    break
                }
            }
        } catch {
        }
    }

    if ($probe) {
        $BaseUrl = $probe.BaseUrl
        Write-Host "Auto-detected BaseUrl: $BaseUrl"
        Write-Host "HTTP $($probe.Response.StatusCode)"
        Write-Output $probe.Content
        exit 0
    }

    throw "Missing BaseUrl. Set -BaseUrl, set TERMLINK_VALIDATION_BASE_URL, or create $localConfig"
}

$normalized = $BaseUrl.TrimEnd('/')
$healthUrl = "$normalized/api/health"

Write-Host "Validating: $healthUrl"
try {
    $authPair = "${AuthUser}:${AuthPass}"
    $authHeader = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($authPair))
    $resp = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 8 -UseBasicParsing `
        -Headers @{ Authorization = "Basic $authHeader" }
    Write-Host "HTTP $($resp.StatusCode)"
    Write-Output $resp.Content
} catch {
    Write-Host "Validation request failed: $($_.Exception.Message)"
    exit 1
}
