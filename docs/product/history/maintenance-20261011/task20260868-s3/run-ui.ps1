param([string]$Case)
$ErrorActionPreference='Stop'
$serial='MQS7N19402011743'
adb -s $serial shell input keyevent KEYCODE_WAKEUP
adb -s $serial shell wm dismiss-keyguard
adb -s $serial push "$PSScriptRoot/$Case.json" "/sdcard/Android/data/com.termlink.app/files/live-acceptance/$Case.json" | Out-Null
adb -s $serial shell am instrument -w -r -e class com.termlink.app.LiveAcceptanceDriverTest -e case $Case com.termlink.app.test/androidx.test.runner.AndroidJUnitRunner > "$PSScriptRoot/$Case.log"
Get-Content "$PSScriptRoot/$Case.log" -Tail 9
$remoteFiles=adb -s $serial shell ls "/sdcard/Android/data/com.termlink.app/files/live-acceptance/$Case-*.txt"
foreach($remoteFile in $remoteFiles){
 $oldPreference=$ErrorActionPreference; $ErrorActionPreference='Continue'
 adb -s $serial pull $remoteFile "$PSScriptRoot/$(Split-Path $remoteFile -Leaf)" 2>&1 | Out-Null
 $ErrorActionPreference=$oldPreference
}
if(!(Select-String -LiteralPath "$PSScriptRoot/$Case.log" -SimpleMatch 'OK (1 test)')){throw 'UI driver case failed; evidence retained'}
