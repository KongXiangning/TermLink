$ErrorActionPreference = 'Stop'

function Resolve-TermLinkRoot {
    param([string]$StartDir = $PSScriptRoot)

    $current = Resolve-Path -LiteralPath $StartDir
    while ($null -ne $current) {
        $candidate = $current.Path
        if ((Test-Path -LiteralPath (Join-Path $candidate 'package.json')) -and
            (Test-Path -LiteralPath (Join-Path $candidate 'src\server.js'))) {
            return $candidate
        }

        $parent = Split-Path -Parent $candidate
        if (-not $parent -or $parent -eq $candidate) {
            break
        }
        $current = Resolve-Path -LiteralPath $parent
    }

    throw "TermLink project root not found from: $StartDir"
}

function Resolve-TermLinkConfigPath {
    param(
        [string]$ProjectRoot,
        [string]$ConfigPath
    )

    if ($ConfigPath) {
        return (Resolve-Path -LiteralPath $ConfigPath).Path
    }

    $candidates = @(
        (Join-Path $ProjectRoot 'install.config.json'),
        (Join-Path $ProjectRoot 'termlink-install.config.json'),
        (Join-Path $ProjectRoot 'scripts\install\termlink-install.config.example.json')
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    throw "No install config found. Copy scripts\install\termlink-install.config.example.json to install.config.json and edit it first."
}

function Read-TermLinkInstallConfig {
    param(
        [string]$ProjectRoot,
        [string]$ConfigPath
    )

    $resolvedPath = Resolve-TermLinkConfigPath -ProjectRoot $ProjectRoot -ConfigPath $ConfigPath
    $config = Get-Content -LiteralPath $resolvedPath -Raw | ConvertFrom-Json

    if (-not $config.serviceName) {
        $config | Add-Member -NotePropertyName serviceName -NotePropertyValue 'termlink' -Force
    }
    if (-not $config.port) {
        $config | Add-Member -NotePropertyName port -NotePropertyValue 3010 -Force
    }
    if ($null -eq $config.autoStart) {
        $config | Add-Member -NotePropertyName autoStart -NotePropertyValue $true -Force
    }
    if (-not $config.auth) {
        $config | Add-Member -NotePropertyName auth -NotePropertyValue ([pscustomobject]@{}) -Force
    }
    if ($null -eq $config.auth.enabled) {
        $config.auth | Add-Member -NotePropertyName enabled -NotePropertyValue $true -Force
    }
    if (-not $config.auth.user) {
        $config.auth | Add-Member -NotePropertyName user -NotePropertyValue 'admin' -Force
    }
    if (-not $config.auth.pass) {
        $config.auth | Add-Member -NotePropertyName pass -NotePropertyValue 'admin' -Force
    }
    if (-not $config.privilege) {
        $config | Add-Member -NotePropertyName privilege -NotePropertyValue ([pscustomobject]@{}) -Force
    }
    if (-not $config.privilege.mode) {
        $config.privilege | Add-Member -NotePropertyName mode -NotePropertyValue 'standard' -Force
    }
    if ($null -eq $config.privilege.elevatedEnable) {
        $config.privilege | Add-Member -NotePropertyName elevatedEnable -NotePropertyValue $false -Force
    }
    if (-not $config.tls) {
        $config | Add-Member -NotePropertyName tls -NotePropertyValue ([pscustomobject]@{}) -Force
    }
    if (-not $config.tls.mode) {
        $config.tls | Add-Member -NotePropertyName mode -NotePropertyValue 'off' -Force
    }
    if (-not $config.tls.clientCertPolicy) {
        $config.tls | Add-Member -NotePropertyName clientCertPolicy -NotePropertyValue 'none' -Force
    }

    $tlsMode = [string]$config.tls.mode
    if ($tlsMode -notin @('off', 'direct', 'nginx')) {
        throw "tls.mode must be one of: off, direct, nginx."
    }
    if ([int]$config.port -lt 1 -or [int]$config.port -gt 65535) {
        throw "port must be between 1 and 65535."
    }
    if ([string]$config.privilege.mode -notin @('standard', 'elevated')) {
        throw "privilege.mode must be one of: standard, elevated."
    }
    if ([string]$config.tls.clientCertPolicy -notin @('none', 'request', 'require')) {
        throw "tls.clientCertPolicy must be one of: none, request, require."
    }

    return [pscustomobject]@{
        Path = $resolvedPath
        Config = $config
    }
}

function Resolve-TermLinkInstallRoot {
    param(
        [string]$SourceRoot,
        [object]$Config
    )

    $configuredDir = ''
    if ($Config.installDir) {
        $configuredDir = [string]$Config.installDir
    }

    if ([string]::IsNullOrWhiteSpace($configuredDir)) {
        return $SourceRoot
    }

    $candidate = $configuredDir.Trim()
    if (-not [System.IO.Path]::IsPathRooted($candidate)) {
        $candidate = Join-Path $SourceRoot $candidate
    }

    if (-not (Test-Path -LiteralPath $candidate)) {
        throw "installDir does not exist: $candidate"
    }

    $resolved = (Resolve-Path -LiteralPath $candidate).Path
    if (-not (Test-Path -LiteralPath (Join-Path $resolved 'package.json')) -or
        -not (Test-Path -LiteralPath (Join-Path $resolved 'src\server.js'))) {
        throw "installDir must point to an extracted TermLink application root containing package.json and src\server.js: $resolved"
    }

    return $resolved
}

function ConvertTo-TermLinkBool {
    param([object]$Value)
    if ($Value -is [bool]) {
        return $Value
    }
    return ([string]$Value).Trim().ToLowerInvariant() -in @('1', 'true', 'yes', 'on')
}

function Write-TermLinkEnv {
    param(
        [string]$ProjectRoot,
        [object]$Config
    )

    $tlsMode = [string]$Config.tls.mode
    $tlsEnabled = if ($tlsMode -eq 'direct') { 'true' } else { 'false' }
    $proxyMode = if ($tlsMode -eq 'nginx') { 'nginx' } else { 'off' }
    $certDir = if ($Config.tls.certDir) { [string]$Config.tls.certDir } else { './certs' }
    $serverCert = if ($Config.tls.serverCert) { [string]$Config.tls.serverCert } else { Join-Path $certDir 'server.crt' }
    $serverKey = if ($Config.tls.serverKey) { [string]$Config.tls.serverKey } else { Join-Path $certDir 'server.key' }
    $caCert = if ($Config.tls.caCert) { [string]$Config.tls.caCert } else { Join-Path $certDir 'client-ca.crt' }
    $proxySecret = if ($Config.tls.proxySecret) { [string]$Config.tls.proxySecret } else { '' }

    $lines = @(
        '# Generated by TermLink Windows release installer.',
        "PORT=$([int]$Config.port)",
        "AUTH_ENABLED=$((ConvertTo-TermLinkBool $Config.auth.enabled).ToString().ToLowerInvariant())",
        "AUTH_USER=$($Config.auth.user)",
        "AUTH_PASS=$($Config.auth.pass)",
        "TERMLINK_SERVICE_NAME=$($Config.serviceName)",
        "TERMLINK_PRIVILEGE_MODE=$($Config.privilege.mode)",
        "TERMLINK_ELEVATED_ENABLE=$((ConvertTo-TermLinkBool $Config.privilege.elevatedEnable).ToString().ToLowerInvariant())",
        'TERMLINK_ELEVATED_AUDIT_PATH=./logs/elevated-audit.log',
        'SESSION_PERSIST_ENABLED=true',
        'SESSION_PERSIST_PATH=./data/sessions.json',
        "TERMLINK_TLS_ENABLED=$tlsEnabled",
        "TERMLINK_TLS_CERT=$serverCert",
        "TERMLINK_TLS_KEY=$serverKey",
        "TERMLINK_TLS_CA=$caCert",
        "TERMLINK_TLS_CLIENT_CERT=$($Config.tls.clientCertPolicy)",
        "TERMLINK_TLS_PROXY_MODE=$proxyMode",
        "TERMLINK_TLS_PROXY_SECRET=$proxySecret"
    )

    Set-Content -LiteralPath (Join-Path $ProjectRoot '.env') -Value $lines -Encoding UTF8
}

function Initialize-TermLinkRuntimeDirs {
    param(
        [string]$ProjectRoot,
        [object]$Config
    )

    $certDir = if ($Config.tls.certDir) { [string]$Config.tls.certDir } else { './certs' }
    foreach ($relativePath in @('data', 'logs', $certDir)) {
        $target = Join-Path $ProjectRoot $relativePath
        if (-not (Test-Path -LiteralPath $target)) {
            New-Item -Path $target -ItemType Directory -Force | Out-Null
        }
    }
}

function Test-TermLinkAdmin {
    return ([Security.Principal.WindowsPrincipal]([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
}

function Get-TermLinkStartupTaskName {
    param([object]$Config)
    return "PM2-$($Config.serviceName)-Admin"
}

function Get-TermLinkHealthUrl {
    param([object]$Config)

    $scheme = if ([string]$Config.tls.mode -eq 'direct') { 'https' } else { 'http' }
    return "${scheme}://localhost:$([int]$Config.port)/api/health"
}

function Enable-TermLinkAutostart {
    param(
        [string]$ProjectRoot,
        [object]$Config,
        [string]$ConfigPath
    )

    if (-not (Test-TermLinkAdmin)) {
        throw 'Administrator PowerShell is required to register the startup scheduled task.'
    }

    $taskName = Get-TermLinkStartupTaskName -Config $Config
    $startScript = Join-Path $PSScriptRoot 'start.ps1'
    $argument = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -ConfigPath `"$ConfigPath`""
    & schtasks.exe /Create /F /TN $taskName /SC ONLOGON /DELAY 0000:10 /TR "powershell.exe $argument" /RL HIGHEST | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "schtasks /Create failed with exit code $LASTEXITCODE"
    }
}

function Disable-TermLinkAutostart {
    param([object]$Config)

    if (-not (Test-TermLinkAdmin)) {
        throw 'Administrator PowerShell is required to remove the startup scheduled task.'
    }

    $taskName = Get-TermLinkStartupTaskName -Config $Config
    & schtasks.exe /Delete /TN $taskName /F | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "schtasks /Delete failed with exit code $LASTEXITCODE"
    }
}

function Invoke-TermLinkHealthCheck {
    param(
        [object]$Config,
        [int]$TimeoutSec = 8
    )

    $uri = Get-TermLinkHealthUrl -Config $Config
    $headers = @{}
    if (ConvertTo-TermLinkBool $Config.auth.enabled) {
        $token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Config.auth.user):$($Config.auth.pass)"))
        $headers.Authorization = "Basic $token"
    }

    return Invoke-WebRequest -Uri $uri -Headers $headers -TimeoutSec $TimeoutSec -ErrorAction Stop
}
