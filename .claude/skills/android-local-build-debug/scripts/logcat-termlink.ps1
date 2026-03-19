param(
    [string]$Serial,
    [switch]$NoClear
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = & "$scriptDir\select-adb-device.ps1" -Serial $Serial

if (-not $NoClear) {
    & adb -s $target logcat -c
}

$pid = (& adb -s $target shell pidof -s com.termlink.app 2>$null).Trim()
if ($pid) {
    Write-Host "Streaming logcat for com.termlink.app pid=$pid on $target"
    & adb -s $target logcat --pid=$pid -v time
    exit $LASTEXITCODE
}

Write-Host "PID not found. Falling back to tag filter on $target"
& adb -s $target logcat -v time TermLinkShell:I chromium:I Capacitor:I *:S

