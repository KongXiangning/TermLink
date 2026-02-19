$devices = & adb devices
Write-Host "== adb devices =="
$devices | ForEach-Object { Write-Host $_ }

Write-Host "`n== selected target =="
try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $target = & "$scriptDir\select-adb-device.ps1"
    Write-Host $target

    Write-Host "`n== device props =="
    & adb -s $target shell getprop ro.product.model
    & adb -s $target shell getprop ro.build.version.release

    Write-Host "`n== app package check =="
    & adb -s $target shell pm list packages com.termlink.app
} catch {
    Write-Host "Doctor failed: $($_.Exception.Message)"
    exit 1
}

