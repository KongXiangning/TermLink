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
        # Re-invoke through powershell.exe so forwarded named arguments like -Serial
        # are parsed as script parameters instead of being treated positionally.
        & powershell -ExecutionPolicy Bypass -File $candidate @ForwardArgs
        exit $LASTEXITCODE
    }

    $parent = Split-Path -Parent $current
    if (-not $parent -or $parent -eq $current) {
        break
    }

    $current = $parent
}

throw "Shared script not found: $SharedRelativePath"

