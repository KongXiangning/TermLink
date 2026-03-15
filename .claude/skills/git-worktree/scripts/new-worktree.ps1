$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory = $true)]
    [string]$Branch,

    [string]$Base = 'HEAD',

    [string]$Path,

    [switch]$CheckoutExisting
)

function Invoke-Git {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )

    & git @Args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
    throw 'Unable to resolve repository root.'
}
if ($LASTEXITCODE -ne 0) {
    throw 'git rev-parse --show-toplevel failed.'
}

if (-not $Path) {
    $repoDir = Split-Path -Leaf $repoRoot
    $repoParent = Split-Path -Parent $repoRoot
    $safeBranch = ($Branch -replace '[^A-Za-z0-9._-]+', '-').Trim('-')
    if (-not $safeBranch) {
        throw "Branch '$Branch' does not produce a usable folder name."
    }
    $Path = Join-Path $repoParent "$repoDir-$safeBranch"
}

if (Test-Path -LiteralPath $Path) {
    throw "Target path already exists: $Path"
}

if ($CheckoutExisting) {
    Invoke-Git worktree add $Path $Branch
}
else {
    Invoke-Git worktree add -b $Branch $Path $Base
}

Write-Host "Created worktree: $Path"
