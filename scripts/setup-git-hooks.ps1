param(
    [string]$HooksPath = '.githooks'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $HooksPath)) {
    throw "Hooks path not found: $HooksPath"
}

& git config core.hooksPath $HooksPath
if ($LASTEXITCODE -ne 0) {
    throw "Failed to set git core.hooksPath."
}

Write-Host "Git hooks configured: core.hooksPath=$HooksPath"
