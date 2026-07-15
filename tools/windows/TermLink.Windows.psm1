Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-TermLinkInstallRoot {
    param([string]$InstallRoot)

    if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
        $InstallRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    }
    return [System.IO.Path]::GetFullPath($InstallRoot)
}

function Get-TermLinkContext {
    [CmdletBinding()]
    param([string]$InstallRoot)

    $root = Resolve-TermLinkInstallRoot $InstallRoot
    $persistent = Join-Path $root 'persistent'
    [pscustomobject]@{
        InstallRoot = $root
        AppRoot = Join-Path $root 'app'
        ServerEntry = Join-Path $root 'app\src\server.js'
        NodePath = Join-Path $root 'runtime\node.exe'
        PersistentRoot = $persistent
        ConfigPath = Join-Path $persistent 'config\termlink.json'
        RuntimeEnvPath = Join-Path $persistent 'runtime\.env'
        DataRoot = Join-Path $persistent 'data'
        LogRoot = Join-Path $persistent 'logs'
        RunRoot = Join-Path $persistent 'run'
        CertRoot = Join-Path $persistent 'certs'
        ClientPackage = Join-Path $persistent 'certs\clients\client.p12'
        ClientPackagePasswordFile = Join-Path $persistent 'certs\clients\client.p12.password.txt'
        PublicCaCertificate = Join-Path $root 'TermLink-CA.crt'
        PidPath = Join-Path $persistent 'run\termlink.pid.json'
        StdoutLog = Join-Path $persistent 'logs\service.out.log'
        StderrLog = Join-Path $persistent 'logs\service.error.log'
        CliPath = Join-Path $root 'tools\windows\termlink-config.ps1'
    }
}

function New-TermLinkPassword {
    $bytes = New-Object byte[] 24
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-TermLinkDefaultConfiguration {
    [CmdletBinding()]
    param([string]$InstallRoot)

    [pscustomobject][ordered]@{
        schemaVersion = 1
        serviceName = 'TermLink'
        port = 3010
        auth = [pscustomobject][ordered]@{
            enabled = $true
            user = 'admin'
            pass = New-TermLinkPassword
        }
        tls = [pscustomobject][ordered]@{
            enabled = $false
            clientCertPolicy = 'none'
            serverCert = 'persistent\certs\server\server.crt'
            serverKey = 'persistent\certs\server\server.key'
            caCert = 'persistent\certs\ca\TermLink-CA.crt'
        }
    }
}

function Test-TermLinkPort {
    [CmdletBinding()]
    param([Parameter(Mandatory = $true)]$Port)

    $parsed = 0
    $valid = [int]::TryParse([string]$Port, [ref]$parsed) -and $parsed -ge 1 -and $parsed -le 65535
    [pscustomobject]@{
        Valid = $valid
        Port = if ($valid) { $parsed } else { $null }
        Message = if ($valid) { 'Port is valid.' } else { 'Port must be an integer from 1 to 65535.' }
    }
}

function Assert-TermLinkEnvironmentValue {
    param([string]$Name, [AllowEmptyString()][string]$Value)
    if ($Value -match '[\r\n]') { throw "$Name cannot contain line breaks." }
}

function Test-TermLinkConfiguration {
    [CmdletBinding()]
    param([Parameter(Mandatory = $true)]$Configuration)

    $errors = New-Object System.Collections.Generic.List[string]
    foreach ($required in @('port', 'serviceName', 'auth', 'tls')) {
        if ($null -eq $Configuration.PSObject.Properties[$required]) { $errors.Add("$required is required.") }
    }
    if ($errors.Count -gt 0) { return [pscustomobject]@{ Valid = $false; Errors = @($errors) } }
    $portResult = Test-TermLinkPort $Configuration.port
    if (-not $portResult.Valid) { $errors.Add($portResult.Message) }
    if ([string]::IsNullOrWhiteSpace([string]$Configuration.serviceName)) { $errors.Add('serviceName is required.') }
    if ($null -eq $Configuration.auth) { $errors.Add('auth is required.') }
    else {
        foreach ($authProperty in @('enabled', 'user', 'pass')) {
            if ($null -eq $Configuration.auth.PSObject.Properties[$authProperty]) { $errors.Add("auth.$authProperty is required.") }
        }
        if ($null -ne $Configuration.auth.PSObject.Properties['user']) {
            if ([string]::IsNullOrWhiteSpace([string]$Configuration.auth.user)) { $errors.Add('auth.user is required.') }
            elseif ([string]$Configuration.auth.user -match '[\r\n]') { $errors.Add('auth.user cannot contain line breaks.') }
        }
        if ($null -ne $Configuration.auth.PSObject.Properties['pass']) {
            if ([string]::IsNullOrWhiteSpace([string]$Configuration.auth.pass)) { $errors.Add('auth.pass is required.') }
            elseif ([string]$Configuration.auth.pass -match '[\r\n]') { $errors.Add('auth.pass cannot contain line breaks.') }
        }
    }
    if ($null -eq $Configuration.tls.PSObject.Properties['enabled']) { $errors.Add('tls.enabled is required.') }
    foreach ($tlsProperty in @('serverCert', 'serverKey', 'caCert', 'clientCertPolicy')) {
        if ($null -eq $Configuration.tls.PSObject.Properties[$tlsProperty] -or [string]::IsNullOrWhiteSpace([string]$Configuration.tls.$tlsProperty)) {
            $errors.Add("tls.$tlsProperty is required.")
        } elseif ([string]$Configuration.tls.$tlsProperty -match '[\r\n]') {
            $errors.Add("tls.$tlsProperty cannot contain line breaks.")
        }
    }
    if ($null -ne $Configuration.tls.PSObject.Properties['clientCertPolicy'] -and [string]$Configuration.tls.clientCertPolicy -notin @('none', 'request', 'require')) {
        $errors.Add('tls.clientCertPolicy must be none, request, or require.')
    }
    [pscustomobject]@{ Valid = ($errors.Count -eq 0); Errors = @($errors) }
}

function Initialize-TermLinkDirectories {
    param($Context)
    @(
        (Split-Path -Parent $Context.ConfigPath),
        (Split-Path -Parent $Context.RuntimeEnvPath),
        $Context.DataRoot,
        $Context.LogRoot,
        $Context.RunRoot,
        (Join-Path $Context.PersistentRoot 'certs\ca'),
        (Join-Path $Context.PersistentRoot 'certs\server'),
        (Join-Path $Context.PersistentRoot 'certs\clients')
    ) | ForEach-Object {
        if (-not (Test-Path -LiteralPath $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
    }
}

function ConvertTo-TermLinkEnvironment {
    param($Configuration, $Context)

    $tlsEnabled = [bool]$Configuration.tls.enabled
    $resolveConfiguredPath = {
        param([string]$Path)
        if ([System.IO.Path]::IsPathRooted($Path)) { return $Path }
        return [System.IO.Path]::GetFullPath((Join-Path $Context.InstallRoot $Path))
    }
    [ordered]@{
        PORT = [string]$Configuration.port
        AUTH_ENABLED = ([bool]$Configuration.auth.enabled).ToString().ToLowerInvariant()
        AUTH_USER = [string]$Configuration.auth.user
        AUTH_PASS = [string]$Configuration.auth.pass
        SESSION_PERSIST_ENABLED = 'true'
        SESSION_PERSIST_PATH = Join-Path $Context.DataRoot 'sessions.json'
        TERMLINK_TLS_ENABLED = $tlsEnabled.ToString().ToLowerInvariant()
        TERMLINK_TLS_CERT = & $resolveConfiguredPath ([string]$Configuration.tls.serverCert)
        TERMLINK_TLS_KEY = & $resolveConfiguredPath ([string]$Configuration.tls.serverKey)
        TERMLINK_TLS_CA = & $resolveConfiguredPath ([string]$Configuration.tls.caCert)
        TERMLINK_TLS_CLIENT_CERT = [string]$Configuration.tls.clientCertPolicy
    }
}

function Write-TermLinkAtomicText {
    param([string]$Path, [string]$Content)
    $directory = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $directory)) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
    $temporary = Join-Path $directory ('.' + [System.IO.Path]::GetFileName($Path) + '.' + [Guid]::NewGuid().ToString('N') + '.tmp')
    try {
        [System.IO.File]::WriteAllText($temporary, $Content, (New-Object System.Text.UTF8Encoding($false)))
        Move-Item -LiteralPath $temporary -Destination $Path -Force
    } finally {
        if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    }
}

function Write-TermLinkRuntimeEnvironment {
    param($Configuration, $Context)
    $environment = ConvertTo-TermLinkEnvironment $Configuration $Context
    $lines = foreach ($entry in $environment.GetEnumerator()) {
        Assert-TermLinkEnvironmentValue $entry.Key ([string]$entry.Value)
        '{0}={1}' -f $entry.Key, $entry.Value
    }
    Write-TermLinkAtomicText $Context.RuntimeEnvPath (($lines -join "`r`n") + "`r`n")
}

function Save-TermLinkConfiguration {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]$Configuration,
        [string]$InstallRoot
    )

    $validation = Test-TermLinkConfiguration $Configuration
    if (-not $validation.Valid) { throw ($validation.Errors -join ' ') }
    $context = Get-TermLinkContext $InstallRoot
    Initialize-TermLinkDirectories $context
    Write-TermLinkAtomicText $context.ConfigPath (($Configuration | ConvertTo-Json -Depth 10) + "`r`n")
    Write-TermLinkRuntimeEnvironment $Configuration $context
    return $Configuration
}

function Get-TermLinkConfigurationInternal {
    param([string]$InstallRoot)
    $context = Get-TermLinkContext $InstallRoot
    Initialize-TermLinkDirectories $context
    if (-not (Test-Path -LiteralPath $context.ConfigPath)) {
        $configuration = New-TermLinkDefaultConfiguration
        Save-TermLinkConfiguration $configuration $context.InstallRoot | Out-Null
        return $configuration
    }
    try { $configuration = Get-Content -LiteralPath $context.ConfigPath -Raw | ConvertFrom-Json }
    catch { throw "Invalid TermLink configuration at '$($context.ConfigPath)': $($_.Exception.Message)" }
    $validation = Test-TermLinkConfiguration $configuration
    if (-not $validation.Valid) { throw "Invalid TermLink configuration: $($validation.Errors -join ' ')" }
    return $configuration
}

function Get-TermLinkConfiguration {
    [CmdletBinding()]
    param([string]$InstallRoot, [switch]$IncludeSecrets)

    $configuration = Get-TermLinkConfigurationInternal $InstallRoot
    $copy = $configuration | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    if (-not $IncludeSecrets) { $copy.auth.pass = '<redacted>' }
    return $copy
}

function Set-TermLinkPort {
    [CmdletBinding()]
    param([Parameter(Mandatory = $true)]$Port, [string]$InstallRoot)

    $result = Test-TermLinkPort $Port
    if (-not $result.Valid) { throw $result.Message }
    $context = Get-TermLinkContext $InstallRoot
    $identity = Get-TermLinkProcessIdentity $context
    $configuration = Get-TermLinkConfigurationInternal $InstallRoot
    $configuration.port = $result.Port
    Save-TermLinkConfiguration $configuration $InstallRoot | Out-Null
    $activePort = $null
    if ($identity.Running -and $null -ne $identity.Record.PSObject.Properties['port']) {
        $activePort = [int]$identity.Record.port
    }
    [pscustomobject]@{
        Port = [int]$configuration.port
        RestartRequired = ($identity.Running -and ($null -eq $activePort -or $activePort -ne [int]$configuration.port))
        ActivePort = $activePort
    }
}

function Read-TermLinkPidRecord {
    param($Context)
    if (-not (Test-Path -LiteralPath $Context.PidPath)) { return $null }
    try { return Get-Content -LiteralPath $Context.PidPath -Raw | ConvertFrom-Json }
    catch { return $null }
}

function Get-TermLinkProcessIdentity {
    param($Context)
    $record = Read-TermLinkPidRecord $Context
    if ($null -eq $record) { return [pscustomobject]@{ Running = $false; Process = $null; Record = $null; Reason = 'No PID record.' } }
    $process = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
    if ($null -eq $process) { return [pscustomobject]@{ Running = $false; Process = $null; Record = $record; Reason = 'Recorded process is not running.' } }
    try { $actualPath = [System.IO.Path]::GetFullPath($process.Path) } catch { $actualPath = '' }
    $expectedPath = [System.IO.Path]::GetFullPath([string]$record.executablePath)
    if (-not [string]::Equals($actualPath, $expectedPath, [StringComparison]::OrdinalIgnoreCase)) {
        return [pscustomobject]@{ Running = $false; Process = $process; Record = $record; Reason = 'PID belongs to another executable.' }
    }
    try {
        $actualStart = $process.StartTime.ToUniversalTime()
        $recordedStart = [DateTime]::Parse([string]$record.startedAtUtc).ToUniversalTime()
        if ([Math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) {
            return [pscustomobject]@{ Running = $false; Process = $process; Record = $record; Reason = 'PID start time does not match.' }
        }
    } catch {
        return [pscustomobject]@{ Running = $false; Process = $process; Record = $record; Reason = 'Process identity could not be verified.' }
    }
    [pscustomobject]@{ Running = $true; Process = $process; Record = $record; Reason = 'Process identity verified.' }
}

function Get-TermLinkAutostartTaskName {
    param([string]$InstallRoot)
    $root = (Resolve-TermLinkInstallRoot $InstallRoot).ToLowerInvariant()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $hash = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($root)) } finally { $sha.Dispose() }
    $suffix = ([BitConverter]::ToString($hash)).Replace('-', '').Substring(0, 12)
    return "TermLink-$suffix"
}

function Get-TermLinkAutostartAction {
    param($Context)
    return 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" start -InstallRoot "{1}"' -f $Context.CliPath, $Context.InstallRoot
}

function Get-TermLinkRunRegistryPath {
    return 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
}

function Get-TermLinkAutostartStatus {
    [CmdletBinding()]
    param([string]$InstallRoot)
    $context = Get-TermLinkContext $InstallRoot
    $taskName = Get-TermLinkAutostartTaskName $context.InstallRoot
    $action = Get-TermLinkAutostartAction $context
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $xmlText = (& schtasks.exe /Query /TN $taskName /XML 2>$null) -join "`n"
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    $taskRegistered = $exitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($xmlText)
    $taskMatches = $taskRegistered -and
        $xmlText.IndexOf($context.CliPath, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
        $xmlText.IndexOf($context.InstallRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0

    $registryPath = Get-TermLinkRunRegistryPath
    $registryAction = $null
    try { $registryAction = Get-ItemPropertyValue -LiteralPath $registryPath -Name $taskName -ErrorAction Stop } catch {}
    $registryRegistered = -not [string]::IsNullOrWhiteSpace([string]$registryAction)
    $registryMatches = $registryRegistered -and [string]::Equals([string]$registryAction, $action, [StringComparison]::OrdinalIgnoreCase)
    if ($taskRegistered) {
        return [pscustomobject]@{
            Enabled = $true; Backend = 'ScheduledTask'; TaskName = $taskName
            MatchesInstallRoot = $taskMatches; TaskRegistered = $true
            RegistryRegistered = $registryRegistered
        }
    }
    if ($registryRegistered) {
        return [pscustomobject]@{
            Enabled = $true; Backend = 'CurrentUserRunRegistry'; TaskName = $taskName
            MatchesInstallRoot = $registryMatches; TaskRegistered = $false
            RegistryRegistered = $true
        }
    }
    [pscustomobject]@{
        Enabled = $false; Backend = 'None'; TaskName = $taskName
        MatchesInstallRoot = $false; TaskRegistered = $false
        RegistryRegistered = $false
    }
}

function Enable-TermLinkAutostart {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
    param([string]$InstallRoot, [switch]$Preview)
    $context = Get-TermLinkContext $InstallRoot
    $taskName = Get-TermLinkAutostartTaskName $context.InstallRoot
    $action = Get-TermLinkAutostartAction $context
    if ($Preview) {
        return [pscustomobject]@{ Enabled = $true; Backend = 'ScheduledTaskWithRegistryFallback'; TaskName = $taskName; Action = $action; PrimaryError = $null }
    }
    if (-not $Preview -and $PSCmdlet.ShouldProcess($taskName, 'Create current-user logon task')) {
        $previousPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $taskOutput = (& schtasks.exe /Create /F /TN $taskName /SC ONLOGON /RL LIMITED /TR $action 2>&1) -join ' '
            $exitCode = $LASTEXITCODE
        } finally { $ErrorActionPreference = $previousPreference }
        if ($exitCode -eq 0) {
            $registryPath = Get-TermLinkRunRegistryPath
            if (Test-Path -LiteralPath $registryPath) { Remove-ItemProperty -LiteralPath $registryPath -Name $taskName -ErrorAction SilentlyContinue }
            return [pscustomobject]@{ Enabled = $true; Backend = 'ScheduledTask'; TaskName = $taskName; Action = $action; PrimaryError = $null }
        }

        $registryPath = Get-TermLinkRunRegistryPath
        if (-not (Test-Path -LiteralPath $registryPath)) { New-Item -Path $registryPath -Force | Out-Null }
        Set-ItemProperty -LiteralPath $registryPath -Name $taskName -Value $action -Type String
        return [pscustomobject]@{ Enabled = $true; Backend = 'CurrentUserRunRegistry'; TaskName = $taskName; Action = $action; PrimaryError = [string]$taskOutput }
    }
}

function Disable-TermLinkAutostart {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
    param([string]$InstallRoot, [switch]$Preview)
    $taskName = Get-TermLinkAutostartTaskName $InstallRoot
    if ($Preview) { return [pscustomobject]@{ Enabled = $false; Backend = 'None'; TaskName = $taskName } }
    if (-not $Preview -and $PSCmdlet.ShouldProcess($taskName, 'Delete current-user logon task')) {
        $current = Get-TermLinkAutostartStatus $InstallRoot
        if ($current.TaskRegistered) {
            $previousPreference = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                & schtasks.exe /Delete /F /TN $taskName 2>$null | Out-Null
                $exitCode = $LASTEXITCODE
            } finally { $ErrorActionPreference = $previousPreference }
            if ($exitCode -ne 0) { throw "Failed to delete scheduled task '$taskName'." }
        }
        $registryPath = Get-TermLinkRunRegistryPath
        if (Test-Path -LiteralPath $registryPath) { Remove-ItemProperty -LiteralPath $registryPath -Name $taskName -ErrorAction SilentlyContinue }
    }
    [pscustomobject]@{ Enabled = $false; Backend = 'None'; TaskName = $taskName }
}

function Get-TermLinkServiceStatus {
    [CmdletBinding()]
    param([string]$InstallRoot)
    $context = Get-TermLinkContext $InstallRoot
    $configuration = Get-TermLinkConfigurationInternal $context.InstallRoot
    $identity = Get-TermLinkProcessIdentity $context
    $autostart = Get-TermLinkAutostartStatus $context.InstallRoot
    $configuredPort = [int]$configuration.port
    $configuredProtocol = if ([bool]$configuration.tls.enabled) { 'https' } else { 'http' }
    $activePort = $configuredPort
    $activeProtocol = $configuredProtocol
    if ($identity.Running) {
        if ($null -ne $identity.Record.PSObject.Properties['port']) { $activePort = [int]$identity.Record.port }
        if ($null -ne $identity.Record.PSObject.Properties['protocol']) { $activeProtocol = [string]$identity.Record.protocol }
    }
    [pscustomobject]@{
        Status = if ($identity.Running) { 'running' } else { 'stopped' }
        Running = $identity.Running
        Pid = if ($identity.Running) { [int]$identity.Record.pid } else { $null }
        Port = $activePort
        ConfiguredPort = $configuredPort
        Protocol = $activeProtocol
        ConfiguredProtocol = $configuredProtocol
        RestartRequired = ($identity.Running -and ($activePort -ne $configuredPort -or $activeProtocol -ne $configuredProtocol))
        Url = ('{0}://localhost:{1}' -f $activeProtocol, $activePort)
        Autostart = $autostart.Enabled
        AutostartMatchesInstallRoot = $autostart.MatchesInstallRoot
        Detail = $identity.Reason
        InstallRoot = $context.InstallRoot
        LogRoot = $context.LogRoot
    }
}

function Start-TermLinkService {
    [CmdletBinding()]
    param([string]$InstallRoot)
    $context = Get-TermLinkContext $InstallRoot
    $configuration = Get-TermLinkConfigurationInternal $context.InstallRoot
    $identity = Get-TermLinkProcessIdentity $context
    if ($identity.Running) { return Get-TermLinkServiceStatus $context.InstallRoot }
    if (-not (Test-Path -LiteralPath $context.NodePath -PathType Leaf)) { throw "Embedded Node.js not found: $($context.NodePath)" }
    if (-not (Test-Path -LiteralPath $context.ServerEntry -PathType Leaf)) { throw "TermLink server entry not found: $($context.ServerEntry)" }
    $port = [int]$configuration.port
    $listener = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $port)
    try { $listener.Start() } catch { throw "Port $port is already in use." } finally { try { $listener.Stop() } catch {} }
    Write-TermLinkRuntimeEnvironment $configuration $context
    if (Test-Path -LiteralPath $context.PidPath) { Remove-Item -LiteralPath $context.PidPath -Force }

    $environment = ConvertTo-TermLinkEnvironment $configuration $context
    $launcher = Join-Path $PSScriptRoot 'launch-service.js'
    $launch = Invoke-TermLinkNodeHelper -Context $context -ScriptPath $launcher -Arguments @(
        '--server', $context.ServerEntry,
        '--cwd', $context.AppRoot,
        '--stdout', $context.StdoutLog,
        '--stderr', $context.StderrLog
    ) -Environment $environment
    Start-Sleep -Milliseconds 150
    $process = Get-Process -Id ([int]$launch.pid) -ErrorAction SilentlyContinue
    if ($null -eq $process) { throw "TermLink exited during startup. See '$($context.StderrLog)'." }
    $record = [pscustomobject][ordered]@{
        pid = $process.Id
        startedAtUtc = $process.StartTime.ToUniversalTime().ToString('o')
        executablePath = [System.IO.Path]::GetFullPath($context.NodePath)
        installRoot = $context.InstallRoot
        port = [int]$configuration.port
        protocol = if ([bool]$configuration.tls.enabled) { 'https' } else { 'http' }
    }
    Write-TermLinkAtomicText $context.PidPath (($record | ConvertTo-Json) + "`r`n")
    return Get-TermLinkServiceStatus $context.InstallRoot
}

function Stop-TermLinkService {
    [CmdletBinding()]
    param([string]$InstallRoot, [int]$TimeoutSeconds = 10)
    $context = Get-TermLinkContext $InstallRoot
    $identity = Get-TermLinkProcessIdentity $context
    if ($identity.Running) {
        Stop-Process -Id $identity.Process.Id -Force
        $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
        while ((Get-Process -Id $identity.Process.Id -ErrorAction SilentlyContinue) -and [DateTime]::UtcNow -lt $deadline) {
            Start-Sleep -Milliseconds 100
        }
        if (Get-Process -Id $identity.Process.Id -ErrorAction SilentlyContinue) {
            throw "TermLink process $($identity.Process.Id) did not stop within $TimeoutSeconds seconds."
        }
    }
    if (Test-Path -LiteralPath $context.PidPath) { Remove-Item -LiteralPath $context.PidPath -Force }
    return Get-TermLinkServiceStatus $context.InstallRoot
}

function Restart-TermLinkService {
    [CmdletBinding()]
    param([string]$InstallRoot)
    Stop-TermLinkService $InstallRoot | Out-Null
    Start-TermLinkService $InstallRoot
}

function Invoke-TermLinkNodeHelper {
    param(
        $Context,
        [string]$ScriptPath,
        [string[]]$Arguments,
        [hashtable]$Environment = @{},
        [int[]]$AllowedExitCodes = @(0)
    )
    if (-not (Test-Path -LiteralPath $Context.NodePath -PathType Leaf)) { throw "Embedded Node.js not found: $($Context.NodePath)" }
    if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) { throw "TermLink helper not found: $ScriptPath" }
    $stderrPath = Join-Path $Context.RunRoot ('.helper-' + [Guid]::NewGuid().ToString('N') + '.stderr')
    $previous = @{}
    try {
        foreach ($entry in $Environment.GetEnumerator()) {
            $previous[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
            [Environment]::SetEnvironmentVariable($entry.Key, [string]$entry.Value, 'Process')
        }
        $previousPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $stdout = (& $Context.NodePath $ScriptPath @Arguments 2> $stderrPath) -join "`n"
            $exitCode = $LASTEXITCODE
        } finally { $ErrorActionPreference = $previousPreference }
        $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
        if ($AllowedExitCodes -notcontains $exitCode) {
            $message = if ([string]::IsNullOrWhiteSpace($stderr)) { "Helper exited with code $exitCode." } else { $stderr.Trim() }
            throw $message
        }
        if ([string]::IsNullOrWhiteSpace($stdout)) { throw 'Helper returned no JSON output.' }
        try { return $stdout | ConvertFrom-Json } catch { throw "Helper returned invalid JSON: $($_.Exception.Message)" }
    } finally {
        foreach ($entry in $Environment.GetEnumerator()) { [Environment]::SetEnvironmentVariable($entry.Key, $previous[$entry.Key], 'Process') }
        if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force }
    }
}

function Invoke-TermLinkHealthCheck {
    [CmdletBinding()]
    param([string]$InstallRoot, [int]$TimeoutSeconds = 5)
    $configuration = Get-TermLinkConfigurationInternal $InstallRoot
    $status = Get-TermLinkServiceStatus $InstallRoot
    # Use the process launch snapshot while running: configuration changes only
    # become active after restart. Explicit IPv4 also avoids localhost IPv6 stalls.
    $url = '{0}://127.0.0.1:{1}/api/health' -f $status.Protocol, $status.Port
    if ($status.Protocol -eq 'https') {
        $context = Get-TermLinkContext $InstallRoot
        $helper = Join-Path $PSScriptRoot 'check-mtls-health.js'
        $environment = @{
            AUTH_ENABLED = ([bool]$configuration.auth.enabled).ToString().ToLowerInvariant()
            AUTH_USER = [string]$configuration.auth.user
            AUTH_PASS = [string]$configuration.auth.pass
        }
        try {
            $arguments = @(
                '--url', $url,
                '--timeout-ms', ([string]($TimeoutSeconds * 1000))
            )
            $caPath = Join-Path $context.CertRoot 'ca\TermLink-CA.crt'
            if (Test-Path -LiteralPath $caPath) { $arguments += @('--ca', $caPath) }
            if ([string]$configuration.tls.clientCertPolicy -ne 'none') {
                $arguments += @('--p12', $context.ClientPackage, '--password-file', $context.ClientPackagePasswordFile)
            }
            $result = Invoke-TermLinkNodeHelper -Context $context -ScriptPath $helper -Arguments $arguments -Environment $environment -AllowedExitCodes @(0, 2)
            return [pscustomobject]@{
                Healthy = [bool]$result.healthy; StatusCode = $result.statusCode
                Url = $url; Body = $result.body; Error = $null
            }
        } catch {
            return [pscustomobject]@{ Healthy = $false; StatusCode = $null; Url = $url; Body = $null; Error = $_.Exception.Message }
        }
    }
    $headers = @{}
    if ([bool]$configuration.auth.enabled) {
        $token = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(('{0}:{1}' -f $configuration.auth.user, $configuration.auth.pass)))
        $headers.Authorization = "Basic $token"
    }
    try {
        $response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec $TimeoutSeconds
        $body = $response.Content | ConvertFrom-Json
        [pscustomobject]@{ Healthy = ($response.StatusCode -eq 200 -and $body.status -eq 'ok'); StatusCode = [int]$response.StatusCode; Url = $url; Body = $body; Error = $null }
    } catch {
        [pscustomobject]@{ Healthy = $false; StatusCode = $null; Url = $url; Body = $null; Error = $_.Exception.Message }
    }
}

function Enable-TermLinkMtls {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
    param([string]$InstallRoot, [int]$HealthTimeoutSeconds = 20)

    $context = Get-TermLinkContext $InstallRoot
    $configuration = Get-TermLinkConfigurationInternal $context.InstallRoot
    $oldConfiguration = $configuration | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    $identity = Get-TermLinkProcessIdentity $context
    $wasRunning = $identity.Running
    $generator = Join-Path $PSScriptRoot 'generate-mtls.js'
    $operationId = [Guid]::NewGuid().ToString('N')
    $generatedRoot = Join-Path (Split-Path -Parent $context.RuntimeEnvPath) ("mtls-$operationId")
    $backupRoot = Join-Path (Split-Path -Parent $context.RuntimeEnvPath) ("certs-backup-$operationId")
    $certsReplaced = $false
    $newServiceStarted = $false
    $oldPublicCa = if (Test-Path -LiteralPath $context.PublicCaCertificate) { [System.IO.File]::ReadAllBytes($context.PublicCaCertificate) } else { $null }

    if (-not $PSCmdlet.ShouldProcess($context.InstallRoot, 'Generate certificates, enable mTLS, restart, and verify TermLink')) {
        return [pscustomobject]@{ Enabled = $false; Healthy = $false; Preview = $true }
    }

    try {
        Initialize-TermLinkDirectories $context
        $generation = Invoke-TermLinkNodeHelper -Context $context -ScriptPath $generator -Arguments @(
            '--output', $generatedRoot,
            '--app-root', $context.AppRoot
        )
        if (-not [bool]$generation.ok) { throw 'Certificate generator did not report success.' }

        if ($wasRunning) { Stop-TermLinkService -InstallRoot $context.InstallRoot | Out-Null }
        if (Test-Path -LiteralPath $backupRoot) { Remove-Item -LiteralPath $backupRoot -Recurse -Force }
        if (Test-Path -LiteralPath $context.CertRoot) { Move-Item -LiteralPath $context.CertRoot -Destination $backupRoot }
        Move-Item -LiteralPath $generatedRoot -Destination $context.CertRoot
        $certsReplaced = $true

        $configuration.tls.enabled = $true
        $configuration.tls.clientCertPolicy = 'require'
        $configuration.tls.serverCert = 'persistent\certs\server\server.crt'
        $configuration.tls.serverKey = 'persistent\certs\server\server.key'
        $configuration.tls.caCert = 'persistent\certs\ca\TermLink-CA.crt'
        Save-TermLinkConfiguration -Configuration $configuration -InstallRoot $context.InstallRoot | Out-Null

        Start-TermLinkService -InstallRoot $context.InstallRoot | Out-Null
        $newServiceStarted = $true
        $deadline = [DateTime]::UtcNow.AddSeconds($HealthTimeoutSeconds)
        do {
            $health = Invoke-TermLinkHealthCheck -InstallRoot $context.InstallRoot -TimeoutSeconds 3
            if ($health.Healthy) { break }
            Start-Sleep -Milliseconds 250
        } while ([DateTime]::UtcNow -lt $deadline)
        if (-not $health.Healthy) { throw "mTLS health check failed: $($health.Error)" }

        Copy-Item -LiteralPath (Join-Path $context.CertRoot 'ca\TermLink-CA.crt') -Destination $context.PublicCaCertificate -Force
        if (Test-Path -LiteralPath $backupRoot) { Remove-Item -LiteralPath $backupRoot -Recurse -Force }
        return [pscustomobject]@{
            Enabled = $true
            Healthy = $true
            Url = $health.Url
            CaCertificate = $context.PublicCaCertificate
            ClientPackage = $context.ClientPackage
        }
    } catch {
        $failure = $_.Exception
        if ($newServiceStarted) { Stop-TermLinkService -InstallRoot $context.InstallRoot -ErrorAction SilentlyContinue | Out-Null }
        if ($certsReplaced -and (Test-Path -LiteralPath $context.CertRoot)) { Remove-Item -LiteralPath $context.CertRoot -Recurse -Force }
        if (Test-Path -LiteralPath $backupRoot) { Move-Item -LiteralPath $backupRoot -Destination $context.CertRoot }
        Save-TermLinkConfiguration -Configuration $oldConfiguration -InstallRoot $context.InstallRoot | Out-Null
        if ($null -ne $oldPublicCa) { [System.IO.File]::WriteAllBytes($context.PublicCaCertificate, $oldPublicCa) }
        elseif (Test-Path -LiteralPath $context.PublicCaCertificate) { Remove-Item -LiteralPath $context.PublicCaCertificate -Force }
        if ($wasRunning) { Start-TermLinkService -InstallRoot $context.InstallRoot | Out-Null }
        throw $failure
    } finally {
        if (Test-Path -LiteralPath $generatedRoot) { Remove-Item -LiteralPath $generatedRoot -Recurse -Force }
        if (Test-Path -LiteralPath $backupRoot) { Remove-Item -LiteralPath $backupRoot -Recurse -Force }
    }
}

function Open-TermLinkPage {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param([string]$InstallRoot, [switch]$Preview)
    $status = Get-TermLinkServiceStatus $InstallRoot
    if (-not $Preview -and $PSCmdlet.ShouldProcess($status.Url, 'Open TermLink page')) { Start-Process $status.Url | Out-Null }
    return $status.Url
}

function Open-TermLinkLogDirectory {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param([string]$InstallRoot, [switch]$Preview)
    $context = Get-TermLinkContext $InstallRoot
    Initialize-TermLinkDirectories $context
    if (-not $Preview -and $PSCmdlet.ShouldProcess($context.LogRoot, 'Open log directory')) { Start-Process explorer.exe -ArgumentList @($context.LogRoot) | Out-Null }
    return $context.LogRoot
}

Export-ModuleMember -Function @(
    'Get-TermLinkContext', 'Get-TermLinkConfiguration', 'Save-TermLinkConfiguration',
    'Test-TermLinkConfiguration', 'Test-TermLinkPort', 'Set-TermLinkPort',
    'Get-TermLinkServiceStatus', 'Start-TermLinkService', 'Stop-TermLinkService',
    'Restart-TermLinkService', 'Get-TermLinkAutostartStatus', 'Enable-TermLinkAutostart',
    'Disable-TermLinkAutostart', 'Invoke-TermLinkHealthCheck', 'Enable-TermLinkMtls', 'Open-TermLinkPage',
    'Open-TermLinkLogDirectory'
)
