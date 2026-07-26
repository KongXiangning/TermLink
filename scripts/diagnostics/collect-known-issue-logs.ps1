param(
    [string]$OutputDirectory = "",
    [string]$PackageName = "com.termlink.app",
    [string]$ServerLogDirectory = "logs/diagnostics"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputDirectory = Join-Path (Join-Path (Get-Location) "output/diagnostics") $stamp
}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$appDirectory = Join-Path $OutputDirectory "android"
$serverDirectory = Join-Path $OutputDirectory "server"
New-Item -ItemType Directory -Force -Path $appDirectory, $serverDirectory | Out-Null

function Write-Manifest {
    $manifest = [ordered]@{
        collectedAt = (Get-Date).ToUniversalTime().ToString("o")
        packageName = $PackageName
        outputDirectory = (Resolve-Path $OutputDirectory).Path
        sourcesArePreserved = $true
        appSource = "adb shell run-as $PackageName files/diagnostics/termlink-diagnostics.jsonl*"
        serverSource = $ServerLogDirectory
    }
    $manifest | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $OutputDirectory "manifest.json")
}

function Collect-AppFile([string]$remoteName) {
    $safeName = Split-Path $remoteName -Leaf
    $target = Join-Path $appDirectory $safeName
    $bytes = & adb exec-out run-as $PackageName cat "files/diagnostics/$remoteName" 2>$null
    if ($LASTEXITCODE -eq 0 -and $null -ne $bytes) {
        [System.IO.File]::WriteAllBytes($target, [System.Text.Encoding]::UTF8.GetBytes(($bytes -join "`n")))
        return $true
    }
    return $false
}

Write-Manifest
$packageCheck = & adb shell pm path $PackageName 2>$null
if ($LASTEXITCODE -eq 0 -and $packageCheck) {
    $remoteFiles = @("termlink-diagnostics.jsonl") + (1..4 | ForEach-Object { "termlink-diagnostics.jsonl.$_" })
    foreach ($remoteFile in $remoteFiles) { [void](Collect-AppFile $remoteFile) }
    & adb logcat -d -v threadtime -t 20000 -s TermLinkDiag:V CodexNative:V WebViewConsole:V *:S | Set-Content -Encoding UTF8 (Join-Path $appDirectory "logcat.txt")
} else {
    "adb device/package unavailable" | Set-Content -Encoding UTF8 (Join-Path $appDirectory "unavailable.txt")
}

if (Test-Path $ServerLogDirectory) {
    Get-ChildItem -LiteralPath $ServerLogDirectory -File -Filter "termlink-diagnostics.jsonl*" |
        Copy-Item -Destination $serverDirectory -Force
} else {
    "server diagnostic directory unavailable" | Set-Content -Encoding UTF8 (Join-Path $serverDirectory "unavailable.txt")
}

$allFiles = Get-ChildItem -LiteralPath $OutputDirectory -Recurse -File |
    Where-Object { $_.Extension -in @(".jsonl", ".txt") }
$entries = foreach ($file in $allFiles) {
    Get-Content -LiteralPath $file.FullName -ErrorAction SilentlyContinue |
        ForEach-Object {
            try {
                $obj = $_ | ConvertFrom-Json
                [pscustomobject]@{ ts = $obj.ts; source = $file.FullName; line = $_ }
            } catch { }
        }
}
$entries | Sort-Object ts | ForEach-Object { $_.line } | Set-Content -Encoding UTF8 (Join-Path $OutputDirectory "timeline.jsonl")
Write-Output "Diagnostics collected at $((Resolve-Path $OutputDirectory).Path)"
