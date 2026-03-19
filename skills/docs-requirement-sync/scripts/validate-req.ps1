param(
    [Parameter(Mandatory = $true)]
    [string]$ReqPath,
    [string]$ProjectRoot,
    [switch]$Strict
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
    if (Test-Path $PathValue) { return (Resolve-Path $PathValue).Path }
    $joined = Join-Path $Root $PathValue
    if (Test-Path $joined) { return (Resolve-Path $joined).Path }
    throw "Path not found: $PathValue"
}

function Get-FrontMatterMap([string]$FilePath) {
    $lines = Get-Content -Path $FilePath -Encoding UTF8
    $map = @{}
    if ($lines.Length -lt 3 -or $lines[0].Trim() -ne '---') {
        return $map
    }
    $end = -1
    for ($i = 1; $i -lt $lines.Length; $i++) {
        if ($lines[$i].Trim() -eq '---') { $end = $i; break }
    }
    if ($end -lt 0) { return $map }
    for ($j = 1; $j -lt $end; $j++) {
        if ($lines[$j] -match '^\s*([A-Za-z0-9_]+)\s*:\s*(.*)\s*$') {
            $k = $Matches[1].ToLowerInvariant()
            $v = $Matches[2].Trim()
            $map[$k] = $v
        }
    }
    return $map
}

function Parse-InlineArray([string]$Value) {
    if (-not $Value) { return @() }
    $trimmed = $Value.Trim()
    if (-not ($trimmed.StartsWith('[') -and $trimmed.EndsWith(']'))) { return @() }
    $inner = $trimmed.Substring(1, $trimmed.Length - 2)
    if ([string]::IsNullOrWhiteSpace($inner)) { return @() }
    return $inner.Split(',') | ForEach-Object { $_.Trim().Trim("'").Trim('"') } | Where-Object { $_ }
}

function Get-MetaMap([string]$FilePath) {
    $lines = Get-Content -Path $FilePath -Encoding UTF8
    $meta = @{}
    $metaStart = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^##\s+Meta\s*$') { $metaStart = $i; break }
    }
    if ($metaStart -lt 0) { return $meta }

    for ($j = $metaStart + 1; $j -lt $lines.Length; $j++) {
        if ($lines[$j] -match '^##\s+') { break }
        if ($lines[$j] -match '^\s*-\s*([A-Za-z0-9_]+)\s*:\s*(.*)\s*$') {
            $meta[$Matches[1].ToLowerInvariant()] = $Matches[2].Trim()
        }
    }
    return $meta
}

$root = Resolve-ProjectRoot -ExplicitRoot $ProjectRoot
$reqFile = Resolve-InputPath -PathValue $ReqPath -Root $root

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

$front = Get-FrontMatterMap -FilePath $reqFile
$meta = Get-MetaMap -FilePath $reqFile
$raw = Get-Content -Path $reqFile -Raw -Encoding UTF8

$requiredFront = @('title', 'status', 'owner', 'last_updated', 'source_of_truth', 'related_code', 'related_docs')
foreach ($k in $requiredFront) {
    if (-not $front.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($front[$k])) {
        $errors.Add("Missing front matter field: $k")
    }
}

$requiredMeta = @('id', 'title', 'priority', 'status', 'owner', 'target_release', 'links')
foreach ($k in $requiredMeta) {
    if (-not $meta.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($meta[$k])) {
        $errors.Add("Missing Meta field: $k")
    }
}

$requiredSections = @(
    '^##\s+1\.',
    '^##\s+2\.',
    '^##\s+3\.',
    '^##\s+5\.',
    '^##\s+7\.',
    '^##\s+8\.'
)

foreach ($pattern in $requiredSections) {
    if (-not [regex]::IsMatch($raw, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)) {
        $errors.Add("Missing section matching: $pattern")
    }
}

$relatedCode = Parse-InlineArray -Value $front['related_code']
if ($relatedCode.Count -eq 0) {
    $warnings.Add("related_code is empty or not inline-array format: [path1, path2]")
}
foreach ($pathItem in $relatedCode) {
    $candidate = Join-Path $root $pathItem
    if (-not (Test-Path $candidate)) {
        $errors.Add("related_code path not found: $pathItem")
    }
}

if ($Strict) {
    if ($meta.ContainsKey('id') -and $meta['id'] -notmatch '^REQ-\d{8}-[a-z0-9-]+$') {
        $errors.Add("Meta id format invalid: $($meta['id'])")
    }
    if ($meta.ContainsKey('status') -and $meta['status'] -notmatch '^(proposed|triaged|planned|in_progress|done|archived)$') {
        $errors.Add("Meta status invalid: $($meta['status'])")
    }
}

Write-Host "REQ: $reqFile"
if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS:"
    $warnings | ForEach-Object { Write-Host "  - $_" }
}

if ($errors.Count -gt 0) {
    Write-Host "FAILED:"
    $errors | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "PASS: REQ validation succeeded."
