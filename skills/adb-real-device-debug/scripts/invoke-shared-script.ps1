param(
    [Parameter(Mandatory = $true)]
    [string]$SharedRelativePath,
    [string[]]$ForwardArgs = @()
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$current = [string](Resolve-Path $scriptDir)

while ($true) {
    $candidate = Join-Path $current $SharedRelativePath
    if (Test-Path $candidate) {
        & $candidate @ForwardArgs
        exit $LASTEXITCODE
    }

    $parent = Split-Path -Parent $current
    if (-not $parent -or $parent -eq $current) {
        break
    }

    $current = $parent
}

throw "Shared script not found: $SharedRelativePath"

