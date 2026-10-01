[CmdletBinding()]
param(
    [string]$FormalVendorRoot = (Join-Path $PSScriptRoot "..\vendor\codex"),
    [string]$SpikeVendorRoot = (Join-Path $PSScriptRoot "..\..\codex-rollout-compat-spike\vendor\codex")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-VendorRoot([string]$Path, [string]$Label) {
    try {
        return (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    } catch {
        throw "$Label vendor root does not exist: $Path"
    }
}

function Read-ManifestText([string]$VendorRoot) {
    $path = Join-Path $VendorRoot "vendor-manifest.toml"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "vendor manifest does not exist: $path"
    }
    return Get-Content -LiteralPath $path -Raw -Encoding UTF8
}

function Read-ManifestScalar([string]$Text, [string]$Name) {
    $pattern = '(?m)^\s*' + [regex]::Escape($Name) + '\s*=\s*"([^"]*)"'
    $match = [regex]::Match($Text, $pattern)
    if (-not $match.Success) {
        throw "manifest field is missing: $Name"
    }
    return $match.Groups[1].Value
}

function Read-ManifestArray([string]$Text, [string]$Name) {
    $pattern = '(?ms)^\s*' + [regex]::Escape($Name) + '\s*=\s*\[(.*?)\]'
    $match = [regex]::Match($Text, $pattern)
    if (-not $match.Success) {
        throw "manifest array is missing: $Name"
    }
    return @([regex]::Matches($match.Groups[1].Value, '"([^"]*)"') |
        ForEach-Object { $_.Groups[1].Value })
}

function Assert-Same([string]$Name, [object]$Expected, [object]$Actual) {
    $expectedJson = ConvertTo-Json -InputObject @($Expected) -Compress
    $actualJson = ConvertTo-Json -InputObject @($Actual) -Compress
    if ($expectedJson -ne $actualJson) {
        throw "$Name differs: formal=$expectedJson spike=$actualJson"
    }
}

function Get-PatchFile([string]$VendorRoot, [string]$RelativePath) {
    if ([IO.Path]::IsPathRooted($RelativePath) -or $RelativePath.Contains("..")) {
        throw "local patch path is not a safe relative path: $RelativePath"
    }
    $path = Join-Path $VendorRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "declared local patch does not exist: $path"
    }
    return $path
}

try {
    $formalRoot = Resolve-VendorRoot $FormalVendorRoot "formal"
    $spikeRoot = Resolve-VendorRoot $SpikeVendorRoot "Spike"
    $formalText = Read-ManifestText $formalRoot
    $spikeText = Read-ManifestText $spikeRoot

    Assert-Same "upstream_revision" (Read-ManifestScalar $formalText "upstream_revision") (Read-ManifestScalar $spikeText "upstream_revision")
    Assert-Same "path_dependency_closure" (Read-ManifestArray $formalText "path_dependency_closure") (Read-ManifestArray $spikeText "path_dependency_closure")
    Assert-Same "local_patches" (Read-ManifestArray $formalText "local_patches") (Read-ManifestArray $spikeText "local_patches")

    $patches = @(Read-ManifestArray $formalText "local_patches")
    foreach ($patch in $patches) {
        $formalPath = Get-PatchFile $formalRoot $patch
        $spikePath = Get-PatchFile $spikeRoot $patch
        $formalHash = Get-FileHash -LiteralPath $formalPath -Algorithm SHA256
        $spikeHash = Get-FileHash -LiteralPath $spikePath -Algorithm SHA256
        if ($formalHash.Hash -ne $spikeHash.Hash -or (Get-Item -LiteralPath $formalPath).Length -ne (Get-Item -LiteralPath $spikePath).Length) {
            throw "local patch bytes differ: $patch formal=$($formalHash.Hash) spike=$($spikeHash.Hash)"
        }
        Write-Output ("parity: {0} sha256={1} bytes={2}" -f $patch, $formalHash.Hash.ToLowerInvariant(), (Get-Item -LiteralPath $formalPath).Length)
    }

    Write-Output ("vendor parity: PASS revision={0} patches={1}" -f (Read-ManifestScalar $formalText "upstream_revision"), $patches.Count)
    exit 0
} catch {
    Write-Error ("vendor parity: FAIL: {0}" -f $_.Exception.Message)
    exit 1
}
