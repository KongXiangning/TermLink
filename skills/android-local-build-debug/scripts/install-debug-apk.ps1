param(
    [string]$Serial,
    [string]$ProjectRoot,
    [string]$ApkPath,
    [switch]$SkipLaunch
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
    $ProjectRoot = Resolve-Path (Join-Path $scriptDir '..\..\..')
}
if (-not $ApkPath) {
    $ApkPath = Join-Path $ProjectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
}

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
