<#
.SYNOPSIS
    从 CR 文件 front-matter 自动重建 docs/changes/records/INDEX.md 表格。
.DESCRIPTION
    扫描所有 CR-*.md 文件，提取 YAML front-matter 字段，
    按 cr_id 倒序生成 INDEX.md 的 Records 表格部分。
    保留 INDEX.md 的 front-matter + 使用规则，只替换表格。
.USAGE
    powershell -File scripts/generate-cr-index.ps1
#>

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$RecordsDir = Join-Path $ProjectRoot 'docs\changes\records'
$IndexFile  = Join-Path $RecordsDir 'INDEX.md'

# --- 1. 扫描 CR 文件 ---
$crFiles = Get-ChildItem (Join-Path $RecordsDir 'CR-*.md') | Sort-Object Name -Descending
Write-Host "[generate-cr-index] Found $($crFiles.Count) CR files"

$rows = foreach ($f in $crFiles) {
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    $fields = @{}
    foreach ($key in @('cr_id','record_id','req_id','status','commit_ref','last_updated')) {
        if ($content -match "(?m)^${key}:\s*(.+)") {
            $fields[$key] = $Matches[1].Trim()
        }
    }
    $crId       = if ($fields['cr_id']) { $fields['cr_id'] } elseif ($fields['record_id']) { $fields['record_id'] } else { $f.BaseName }
    $reqId      = if ($fields['req_id'])       { $fields['req_id'] }     else { '' }
    $status     = if ($fields['status'])       { $fields['status'] }     else { 'unknown' }
    $commitRef  = if ($fields['commit_ref'])   { $fields['commit_ref'] } else { 'TBD' }
    $lastUpdated= if ($fields['last_updated']) { $fields['last_updated'] } else { '' }

    # 提取 heading 摘要（# CR-xxx — Summary）
    $summary = ''
    if ($content -match '(?m)^#\s+.+?\s\u2014\s+(.+)') {
        $summary = $Matches[1].Trim()
    }

    "| $crId | $reqId | $status | $commitRef | @maintainer | $lastUpdated | $summary | ``docs/changes/records/$($f.Name)`` |"
}

# --- 2. 读取 INDEX 头部（front-matter + 使用规则） ---
$indexLines = Get-Content $IndexFile
$headerEnd = -1
$tableStart = -1
for ($i = 0; $i -lt $indexLines.Count; $i++) {
    if ($indexLines[$i] -match '^\|\s*record_id') {
        $tableStart = $i
        break
    }
}

if ($tableStart -lt 0) {
    Write-Error "Cannot find table header in INDEX.md"
    exit 1
}

$header = $indexLines[0..($tableStart - 1)]

# --- 3. 重建文件 ---
$tableHeader = "| record_id | req_id | status | commit_ref | owner | last_updated | summary | file |"
$tableSep    = "|---|---|---|---|---|---|---|---|"

$output = @()
$output += $header
$output += $tableHeader
$output += $tableSep
$output += $rows
$output += ''  # trailing newline

$output | Set-Content $IndexFile -Encoding UTF8
Write-Host "[generate-cr-index] INDEX.md rebuilt: $($rows.Count) rows"
