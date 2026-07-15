$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$scriptDir\invoke-shared-script.ps1" -SharedRelativePath 'skills\android-local-build-debug\scripts\adb-doctor.ps1' -ForwardArgs $args
exit $LASTEXITCODE

