param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,
    [string]$User,
    [string]$Pass,
    [int]$Top = 100
)

$ErrorActionPreference = 'Stop'

function New-BasicAuthHeader([string]$Username, [string]$Password) {
    if (-not $Username) { return $null }
    $token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))
    return @{ Authorization = "Basic $token" }
}

$normalized = $BaseUrl.TrimEnd('/')
$url = "$normalized/api/sessions"
$headers = New-BasicAuthHeader -Username $User -Password $Pass

Write-Host "GET $url"
$resp = Invoke-RestMethod -Uri $url -Headers $headers -Method GET -TimeoutSec 10

if ($null -eq $resp) {
    Write-Host "No response body."
    exit 0
}

$sessions = @($resp)
if ($sessions.Count -eq 0) {
    Write-Host "No sessions found."
    exit 0
}

$nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$rows = $sessions | ForEach-Object {
    $lastMs = [int64]$_.lastActiveAt
    $idleMin = [math]::Round((($nowMs - $lastMs) / 60000.0), 2)
    [PSCustomObject]@{
        id = $_.id
        name = $_.name
        status = $_.status
        activeConnections = $_.activeConnections
        createdAt = ([DateTimeOffset]::FromUnixTimeMilliseconds([int64]$_.createdAt)).ToString('yyyy-MM-dd HH:mm:ss')
        lastActiveAt = ([DateTimeOffset]::FromUnixTimeMilliseconds($lastMs)).ToString('yyyy-MM-dd HH:mm:ss')
        idleMinutes = $idleMin
    }
}

$rows |
    Sort-Object -Property @{ Expression = 'activeConnections'; Descending = $true }, @{ Expression = 'idleMinutes'; Descending = $true } |
    Select-Object -First $Top |
    Format-Table -AutoSize
