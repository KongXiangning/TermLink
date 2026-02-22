param(
    [Parameter(Mandatory = $true)]
    [string]$ReqId,
    [Parameter(Mandatory = $true)]
    [string]$Slug,
    [string]$ReqPath,
    [string]$ProjectRoot,
    [ValidateSet('draft', 'active', 'superseded')]
    [string]$Status = 'draft',
    [string]$CommitRef = 'TBD',
    [string]$Owner = '@maintainer',
    [ValidateSet('code', 'product', 'ops')]
    [string]$SourceOfTruth = 'product'
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

function Resolve-ReqFile([string]$ReqIdValue, [string]$ExplicitReqPath, [string]$Root) {
    $resolved = Resolve-InputPath -PathValue $ExplicitReqPath -Root $Root
    if ($resolved) { return $resolved }

    $candidateDir = Join-Path $Root 'docs\product\requirements'
    $candidates = Get-ChildItem -Path $candidateDir -File -Filter 'REQ-*.md'
    foreach ($c in $candidates) {
        if (Select-String -Path $c.FullName -Pattern "^\s*-\s*id:\s*$ReqIdValue\s*$" -Quiet) {
            return $c.FullName
        }
    }
    return $null
}

if ($Status -eq 'active' -and $CommitRef -eq 'TBD') {
    throw "Status 'active' requires real -CommitRef."
}

$root = Resolve-ProjectRoot -ExplicitRoot $ProjectRoot
$reqFile = Resolve-ReqFile -ReqIdValue $ReqId -ExplicitReqPath $ReqPath -Root $root

$reqTitle = $ReqId
if ($reqFile) {
    $line = Select-String -Path $reqFile -Pattern '^\s*-\s*title:\s*(.+)\s*$' | Select-Object -First 1
    if ($line) {
        $reqTitle = $line.Matches[0].Groups[1].Value.Trim()
    }
}

$recordId = "CR-$((Get-Date).ToString('yyyyMMdd-HHmm'))-$Slug"
$recordsDir = Join-Path $root 'docs\changes\records'
New-Item -ItemType Directory -Force -Path $recordsDir | Out-Null
$recordPath = Join-Path $recordsDir "$recordId.md"

if (Test-Path $recordPath) {
    throw "Record already exists: $recordPath"
}

$today = (Get-Date).ToString('yyyy-MM-dd')
$content = @"
---
title: $reqTitle - 变更记录
status: $Status
record_id: $recordId
req_id: $ReqId
commit_ref: $CommitRef
owner: $Owner
last_updated: $today
source_of_truth: $SourceOfTruth
related_code: []
related_docs: [docs/product/requirements/$(if($reqFile){Split-Path -Leaf $reqFile}else{'REQ-YYYYMMDD-slug.md'}), docs/changes/records/INDEX.md]
---

# $recordId

## 1. 变更意图（Compact Summary）

- 背景：
- 目标：
- 本次边界：

## 2. 实施内容（What changed）

1.
2.
3.

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
- 模块：
- 运行时行为：

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
- 结果：

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1.
2.
"@

Set-Content -Path $recordPath -Value $content -Encoding utf8
Write-Host "Created change record: $recordPath"
