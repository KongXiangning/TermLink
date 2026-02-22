param(
    [Parameter(Mandatory = $true)]
    [string]$RecordPath,
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

function Parse-InlineArray([string]$Value) {
    if (-not $Value) { return @() }
    $trimmed = $Value.Trim()
    if (-not ($trimmed.StartsWith('[') -and $trimmed.EndsWith(']'))) { return @() }
    $inner = $trimmed.Substring(1, $trimmed.Length - 2)
    if ([string]::IsNullOrWhiteSpace($inner)) { return @() }
    return $inner.Split(',') | ForEach-Object { $_.Trim().Trim("'").Trim('"') } | Where-Object { $_ }
}

function Test-GitCommitExists([string]$Root, [string]$CommitRef) {
    $null = & git -C $Root rev-parse --verify --quiet "$CommitRef`^{commit}" 2>$null
    return ($LASTEXITCODE -eq 0)
}

$root = Resolve-ProjectRoot -ExplicitRoot $ProjectRoot
$recordFile = Resolve-InputPath -PathValue $RecordPath -Root $root
$front = Get-FrontMatterMap -FilePath $recordFile
$raw = Get-Content -Raw $recordFile
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

$requiredFront = @('title', 'status', 'record_id', 'req_id', 'commit_ref', 'owner', 'last_updated', 'source_of_truth', 'related_code', 'related_docs')
foreach ($k in $requiredFront) {
    if (-not $front.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($front[$k])) {
        $errors.Add("Missing front matter field: $k")
    }
}

$requiredSections = @(
    '^##\s+1\.',
    '^##\s+2\.',
    '^##\s+3\.',
    '^##\s+4\.',
    '^##\s+5\.',
    '^##\s+6\.',
    '^##\s+7\.'
)
foreach ($pattern in $requiredSections) {
    if (-not [regex]::IsMatch($raw, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)) {
        $errors.Add("Missing section matching: $pattern")
    }
}

if ($front.ContainsKey('record_id') -and $front['record_id'] -notmatch '^CR-\d{8}-\d{4}-[a-z0-9-]+$') {
    $errors.Add("record_id format invalid: $($front['record_id'])")
}
if ($front.ContainsKey('req_id') -and $front['req_id'] -notmatch '^REQ-\d{8}-[a-z0-9-]+$') {
    $errors.Add("req_id format invalid: $($front['req_id'])")
}
if ($front.ContainsKey('status') -and $front['status'] -notmatch '^(draft|active|superseded)$') {
    $errors.Add("status invalid: $($front['status'])")
}

$relatedCode = Parse-InlineArray -Value $front['related_code']
foreach ($pathItem in $relatedCode) {
    $candidate = Join-Path $root $pathItem
    if (-not (Test-Path $candidate)) {
        $errors.Add("related_code path not found: $pathItem")
    }
}

if ($Strict) {
    $status = $front['status']
    $commitRef = $front['commit_ref']

    if ($status -eq 'active') {
        if ($commitRef -eq 'TBD') {
            $errors.Add("active record cannot use commit_ref=TBD")
        } elseif ($commitRef -notmatch '^[0-9a-fA-F]{7,40}$') {
            $errors.Add("active record commit_ref format invalid: $commitRef")
        } elseif (-not (Test-GitCommitExists -Root $root -CommitRef $commitRef)) {
            $errors.Add("commit_ref not found in git history: $commitRef")
        }
    }

    if ($status -eq 'superseded') {
        if ($raw -notmatch 'CR-\d{8}-\d{4}-[a-z0-9-]+') {
            $errors.Add("superseded record must reference replacement CR record_id in section 6")
        }
    }
}

if (-not (Select-String -InputObject $raw -Pattern 'git\s+(revert|checkout)' -AllMatches)) {
    $warnings.Add("rollback section has no obvious git command (revert/checkout)")
}

Write-Host "CR: $recordFile"
if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS:"
    $warnings | ForEach-Object { Write-Host "  - $_" }
}

if ($errors.Count -gt 0) {
    Write-Host "FAILED:"
    $errors | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "PASS: Change record validation succeeded."
