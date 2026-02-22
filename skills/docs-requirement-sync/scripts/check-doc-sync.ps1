param(
    [Parameter(Mandatory = $true)]
    [string]$ReqId,
    [string]$ReqPath,
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'
$script:SkillScriptDir = Split-Path -Parent $PSCommandPath

function Resolve-ProjectRoot([string]$ExplicitRoot) {
    if ($ExplicitRoot) {
        return (Resolve-Path $ExplicitRoot).Path
    }
    return (Resolve-Path (Join-Path $script:SkillScriptDir '..\..\..')).Path
}

function Resolve-InputPath([string]$PathValue, [string]$Root) {
    if (-not $PathValue) { return $null }
    if (Test-Path $PathValue) { return (Resolve-Path $PathValue).Path }
    $joined = Join-Path $Root $PathValue
    if (Test-Path $joined) { return (Resolve-Path $joined).Path }
    return $null
}

function Get-FrontMatterMap([string]$FilePath) {
    $lines = Get-Content $FilePath
    $map = @{}
    if ($lines.Length -lt 3 -or $lines[0].Trim() -ne '---') { return $map }
    $end = -1
    for ($i = 1; $i -lt $lines.Length; $i++) {
        if ($lines[$i].Trim() -eq '---') { $end = $i; break }
    }
    if ($end -lt 0) { return $map }
    for ($j = 1; $j -lt $end; $j++) {
        if ($lines[$j] -match '^\s*([A-Za-z0-9_]+)\s*:\s*(.*)\s*$') {
            $map[$Matches[1].ToLowerInvariant()] = $Matches[2].Trim()
        }
    }
    return $map
}

function Test-GitCommitExists([string]$Root, [string]$CommitRef) {
    $null = & git -C $Root rev-parse --verify --quiet "$CommitRef`^{commit}" 2>$null
    return ($LASTEXITCODE -eq 0)
}

$root = Resolve-ProjectRoot -ExplicitRoot $ProjectRoot
$errors = New-Object System.Collections.Generic.List[string]
$passes = New-Object System.Collections.Generic.List[string]

$backlog = Join-Path $root 'docs\product\REQUIREMENTS_BACKLOG.md'
$product = Join-Path $root 'docs\product\PRODUCT_REQUIREMENTS.md'
$roadmap = Join-Path $root 'docs\architecture\ROADMAP.md'
$changelog = Join-Path $root 'docs\changes\CHANGELOG_PROJECT.md'
$recordsDir = Join-Path $root 'docs\changes\records'

$resolvedReq = Resolve-InputPath -PathValue $ReqPath -Root $root
if (-not $resolvedReq) {
    $candidates = Get-ChildItem -Path (Join-Path $root 'docs\product\requirements') -File -Filter 'REQ-*.md'
    foreach ($c in $candidates) {
        if (Select-String -Path $c.FullName -Pattern "^\s*-\s*id:\s*$ReqId\s*$" -Quiet) {
            $resolvedReq = $c.FullName
            break
        }
    }
}

if (-not $resolvedReq) {
    $errors.Add("REQ file not found for id: $ReqId")
} else {
    $passes.Add("REQ file found: $resolvedReq")
}

if (Select-String -Path $backlog -Pattern ([regex]::Escape($ReqId)) -Quiet) {
    $passes.Add("Backlog contains req id.")
} else {
    $errors.Add("Backlog missing req id: $ReqId")
}

if (Select-String -Path $product -Pattern ([regex]::Escape($ReqId)) -Quiet) {
    $passes.Add("Product requirements contains req id.")
} else {
    $errors.Add("PRODUCT_REQUIREMENTS missing req id: $ReqId")
}

if (Select-String -Path $roadmap -Pattern ([regex]::Escape($ReqId)) -Quiet) {
    $passes.Add("Roadmap contains req id.")
} else {
    $errors.Add("ROADMAP missing req id: $ReqId")
}

if (Select-String -Path $changelog -Pattern ([regex]::Escape($ReqId)) -Quiet) {
    $passes.Add("Changelog contains req id.")
} else {
    $errors.Add("CHANGELOG_PROJECT missing req id: $ReqId")
}

$activeRecords = @()
if (Test-Path $recordsDir) {
    $recordFiles = Get-ChildItem -Path $recordsDir -File -Filter 'CR-*.md'
    foreach ($rf in $recordFiles) {
        $front = Get-FrontMatterMap -FilePath $rf.FullName
        if ($front['req_id'] -eq $ReqId -and $front['status'] -eq 'active') {
            $activeRecords += [PSCustomObject]@{
                path = $rf.FullName
                commit = $front['commit_ref']
                record = $front['record_id']
            }
        }
    }
}

if ($activeRecords.Count -eq 0) {
    $errors.Add("No active CR found for req id: $ReqId")
} else {
    $passes.Add("Active CR count: $($activeRecords.Count)")
}

foreach ($rec in $activeRecords) {
    if (-not $rec.commit -or $rec.commit -eq 'TBD') {
        $errors.Add("Active CR has invalid commit_ref (TBD): $($rec.path)")
        continue
    }
    if ($rec.commit -notmatch '^[0-9a-fA-F]{7,40}$') {
        $errors.Add("Active CR has malformed commit_ref '$($rec.commit)': $($rec.path)")
        continue
    }
    if (-not (Test-GitCommitExists -Root $root -CommitRef $rec.commit)) {
        $errors.Add("Active CR commit_ref not found in git: $($rec.commit) ($($rec.path))")
        continue
    }
    $passes.Add("Active CR commit_ref valid: $($rec.record) -> $($rec.commit)")
}

Write-Host "REQ: $ReqId"
Write-Host "PASSED CHECKS:"
$passes | ForEach-Object { Write-Host "  + $_" }

if ($errors.Count -gt 0) {
    Write-Host "FAILED CHECKS:"
    $errors | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "PASS: Documentation sync checks succeeded."
