param(
    [string]$Serial
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = & "$scriptDir\select-adb-device.ps1" -Serial $Serial

& adb -s $target shell am start -n com.termlink.app/.MainShellActivity | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to launch com.termlink.app/.MainShellActivity'
}

Write-Host "Launched TermLink on $target"

