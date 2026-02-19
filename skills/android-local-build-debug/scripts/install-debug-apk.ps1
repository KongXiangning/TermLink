param(
    [string]$Serial,
    [string]$ApkPath = 'E:\coding\TermLink\android\app\build\outputs\apk\debug\app-debug.apk',
    [switch]$SkipLaunch
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = & "$scriptDir\select-adb-device.ps1" -Serial $Serial

if (-not (Test-Path $ApkPath)) {
    throw "APK not found: $ApkPath"
}

Write-Host "Installing APK to $target ..."
& adb -s $target install -r $ApkPath
if ($LASTEXITCODE -ne 0) {
    throw 'adb install failed'
}

if (-not $SkipLaunch) {
    & "$scriptDir\launch-termlink.ps1" -Serial $target
}

Write-Host "Done on $target"

