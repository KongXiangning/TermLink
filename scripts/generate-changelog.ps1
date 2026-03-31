param([string]$OutFile)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$RecordsDir  = Join-Path $ProjectRoot 'docs\changes\records'

$entries = @()
Get-ChildItem (Join-Path $RecordsDir 'CR-*.md') | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $fields = @{}
    foreach ($key in @('cr_id','req_id','status','commit_ref','last_updated','created','category')) {
        if ($content -match "(?m)^${key}:\s*(.+)") {
            $fields[$key] = $Matches[1].Trim()
        }
    }

    $date = ''
    if ($_.BaseName -match '^CR-(\d{4})(\d{2})(\d{2})') {
        $date = "$($Matches[1])-$($Matches[2])-$($Matches[3])"
    }

    $category = 'docs'
    $heading = ''
    if ($content -match "(?m)^#\s+.+?\s\u2014\s+(.+)") {
        $heading = $Matches[1].Trim()
    }
    $nameLower = $_.BaseName.ToLower()
    if ($nameLower -match 'server|mtls-listener|session-retention|admin-privilege|session-ttl|gateway') {
        $category = 'server'
    } elseif ($nameLower -match 'android|mobile|client|keyboard|shortcut|codex-phase|workspace-phase|cache|settings|ui|runtime|plan-workflow|slash|thread|image|sandbox|permission|anchor|history|foreground') {
        $category = 'client'
    }

    $reqId = if ($fields['req_id']) { $fields['req_id'] } else { '' }
    $summary = if ($heading) { $heading } else { $_.BaseName -replace '^CR-\d{8}-\d{4}-', '' -replace '-', ' ' }

    $entries += [PSCustomObject]@{
        Date     = $date
        Category = $category
        ReqId    = $reqId
        Summary  = $summary
        CrId     = if ($fields['cr_id']) { $fields['cr_id'] } else { $_.BaseName }
        Status   = if ($fields['status']) { $fields['status'] } else { 'unknown' }
    }
}

$grouped = $entries | Where-Object { $_.Date } | Group-Object Date | Sort-Object Name -Descending

$output = @()
$output += '# CHANGELOG Draft (auto-generated)'
$output += ''

foreach ($group in $grouped) {
    $output += "## $($group.Name)"
    $output += ''

    $byCategory = $group.Group | Group-Object Category | Sort-Object {
        $n = $_.Name
        if ($n -eq 'server') { 1 } elseif ($n -eq 'client') { 2 } elseif ($n -eq 'docs') { 3 } else { 4 }
    }
    foreach ($cat in $byCategory) {
        $output += "### $($cat.Name)"
        $output += ''
        $i = 1
        foreach ($entry in ($cat.Group | Sort-Object CrId)) {
            $reqRef = ''
            if ($entry.ReqId) { $reqRef = " ($($entry.ReqId))" }
            $output += "$i. $($entry.Summary)$reqRef"
            $i++
        }
        $output += ''
    }
}

if ($OutFile) {
    $output | Set-Content $OutFile -Encoding UTF8
    Write-Host "[generate-changelog] Draft: $($grouped.Count) date sections -> $OutFile"
} else {
    $output | ForEach-Object { Write-Host $_ }
    Write-Host "`n[generate-changelog] $($grouped.Count) date sections, $($entries.Count) entries"
}