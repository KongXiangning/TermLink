param(
    [string]$BaseUrl,
    [string]$AuthUser,
    [string]$AuthPass
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillDir = Split-Path -Parent $scriptDir
$localConfig = Join-Path $skillDir 'local-config.ps1'

if (-not $BaseUrl -and (Test-Path $localConfig)) {
    . $localConfig
    if ($TermLinkValidationBaseUrl) {
        $BaseUrl = $TermLinkValidationBaseUrl
    }
}

$forwardArgs = @()
if ($BaseUrl) {
    $forwardArgs += '-BaseUrl'
    $forwardArgs += $BaseUrl
}
if ($PSBoundParameters.ContainsKey('AuthUser')) {
    $forwardArgs += '-AuthUser'
    $forwardArgs += $AuthUser
}
if ($PSBoundParameters.ContainsKey('AuthPass')) {
    $forwardArgs += '-AuthPass'
    $forwardArgs += $AuthPass
}

& "$scriptDir\invoke-shared-script.ps1" -SharedRelativePath 'skills\android-local-build-debug\scripts\validate-server-config.ps1' -ForwardArgs $forwardArgs
exit $LASTEXITCODE

