[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactDirectory,

    [string]$EvidenceRoot,
    [switch]$RequireNoSystemNode,
    [switch]$FailAfterSetup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$windowsPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$artifactRoot = [System.IO.Path]::GetFullPath($ArtifactDirectory)
if ([string]::IsNullOrWhiteSpace($EvidenceRoot)) {
    $EvidenceRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('TermLink-CleanHost-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
}
$evidenceRootFull = [System.IO.Path]::GetFullPath($EvidenceRoot)
$reportPath = Join-Path $evidenceRootFull 'clean-host-evidence.json'
$portableRoot = $null
$portableCli = $null
$installRoot = Join-Path $evidenceRootFull 'installed'
$installedCli = Join-Path $installRoot 'tools\windows\termlink-config.ps1'
$uninstaller = Join-Path $installRoot 'unins000.exe'

$report = [ordered]@{
    schemaVersion = 1
    startedAtUtc = [DateTime]::UtcNow.ToString('o')
    completedAtUtc = $null
    success = $false
    host = [ordered]@{
        osVersion = [Environment]::OSVersion.VersionString
        is64BitOperatingSystem = [Environment]::Is64BitOperatingSystem
        powershellVersion = $PSVersionTable.PSVersion.ToString()
        systemNodeCommands = @()
    }
    artifacts = [ordered]@{}
    checks = New-Object System.Collections.ArrayList
    cleanup = [ordered]@{ failedSetupUninstalled = $false; error = $null }
    evidenceRoot = $evidenceRootFull
    error = $null
}

function Add-Check {
    param([string]$Name, [bool]$Passed, $Detail = $null)
    [void]$report.checks.Add([ordered]@{ name = $Name; passed = $Passed; detail = $Detail })
    if (-not $Passed) { throw "Clean-host check failed: $Name" }
}

function Get-FreeTcpPort {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    } finally {
        $listener.Stop()
    }
}

function ConvertTo-ProcessArgument {
    param([string]$Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-Cli {
    param([string]$Root, [string[]]$Arguments)
    $cli = Join-Path $Root 'tools\windows\termlink-config.ps1'
    $commandEvidenceRoot = Join-Path $evidenceRootFull 'command-output'
    if (-not (Test-Path -LiteralPath $commandEvidenceRoot)) { New-Item -ItemType Directory -Path $commandEvidenceRoot -Force | Out-Null }
    $commandId = [Guid]::NewGuid().ToString('N')
    $stdoutPath = Join-Path $commandEvidenceRoot "$commandId.stdout.txt"
    $stderrPath = Join-Path $commandEvidenceRoot "$commandId.stderr.txt"
    $processArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $cli) + $Arguments + @('-InstallRoot', $Root, '-Json')
    $quotedArguments = @($processArguments | ForEach-Object { ConvertTo-ProcessArgument ([string]$_) })
    $argumentLine = $quotedArguments -join ' '
    $process = Start-Process -FilePath $windowsPowerShell -ArgumentList $argumentLine -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -Wait -PassThru -WindowStyle Hidden
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { '' }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
    Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
    if ($process.ExitCode -ne 0) { throw "CLI failed ($($Arguments -join ' ')): $stderr$stdout" }
    $text = $stdout.Trim()
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    return $text | ConvertFrom-Json
}

function Invoke-GuiPortExercise {
    param([string]$Root, [int]$Port)
    $gui = Join-Path $Root 'tools\windows\termlink-config-gui.ps1'
    $output = & $windowsPowerShell -NoProfile -STA -ExecutionPolicy Bypass -File $gui -SmokeTest -ExercisePort $Port -InstallRoot $Root -Json 2>&1
    if ($LASTEXITCODE -ne 0) { throw "GUI port exercise failed: $($output -join [Environment]::NewLine)" }
    return (($output -join [Environment]::NewLine).Trim() | ConvertFrom-Json)
}

function Invoke-CliLifecycle {
    param([string]$Root, [string[]]$Arguments)
    $cli = Join-Path $Root 'tools\windows\termlink-config.ps1'
    $processArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $cli) + $Arguments + @('-InstallRoot', $Root, '-Json')
    $quotedArguments = @($processArguments | ForEach-Object { ConvertTo-ProcessArgument ([string]$_) })
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $windowsPowerShell
    $startInfo.Arguments = $quotedArguments -join ' '
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "CLI failed to start: $($Arguments -join ' ')" }
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "CLI failed ($($Arguments -join ' ')) with exit code $($process.ExitCode)." }
}

function Invoke-Executable {
    param([string]$FilePath, [string[]]$Arguments)
    $quotedArguments = @($Arguments | ForEach-Object { ConvertTo-ProcessArgument ([string]$_) })
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = $quotedArguments -join ' '
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "$([System.IO.Path]::GetFileName($FilePath)) failed to start." }
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "$([System.IO.Path]::GetFileName($FilePath)) exited with code $($process.ExitCode)." }
}

function Assert-MtlsLayout {
    param([string]$Root)
    $publicCa = Join-Path $Root 'TermLink-CA.crt'
    $privateCa = Join-Path $Root 'persistent\certs\ca\TermLink-CA.crt'
    $clientP12 = Join-Path $Root 'persistent\certs\clients\client.p12'
    Add-Check 'mTLS public CA is present' (Test-Path -LiteralPath $publicCa -PathType Leaf)
    Add-Check 'mTLS client PKCS#12 is present' (Test-Path -LiteralPath $clientP12 -PathType Leaf)
    Add-Check 'public CA matches private certificate tree CA' ((Get-FileHash $publicCa -Algorithm SHA256).Hash -eq (Get-FileHash $privateCa -Algorithm SHA256).Hash)
    $leakedKeys = @(Get-ChildItem -LiteralPath $Root -Filter '*.key' -File -Recurse | Where-Object { $_.FullName -notlike ((Join-Path $Root 'persistent') + '\*') })
    Add-Check 'private keys remain under persistent cert storage' ($leakedKeys.Count -eq 0) @($leakedKeys | ForEach-Object { $_.Name })
}

function Assert-NoSecretLogging {
    param([string]$Root, [string]$Prefix)
    $configuration = Get-Content -LiteralPath (Join-Path $Root 'persistent\config\termlink.json') -Raw | ConvertFrom-Json
    $secrets = @([string]$configuration.auth.pass)
    $p12PasswordPath = Join-Path $Root 'persistent\certs\clients\client.p12.password.txt'
    if (Test-Path -LiteralPath $p12PasswordPath) { $secrets += (Get-Content -LiteralPath $p12PasswordPath -Raw).Trim() }
    $logs = @(Get-ChildItem -LiteralPath (Join-Path $Root 'persistent\logs') -File -ErrorAction SilentlyContinue)
    $leakDetected = $false
    foreach ($log in $logs) {
        $content = [string](Get-Content -LiteralPath $log.FullName -Raw -ErrorAction SilentlyContinue)
        if ($content -match '-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----') { $leakDetected = $true }
        foreach ($secret in $secrets) {
            if (-not [string]::IsNullOrWhiteSpace($secret) -and $content.Contains($secret)) { $leakDetected = $true }
        }
    }
    Add-Check "$Prefix logs exclude generated passwords and private keys" (-not $leakDetected) @($logs | ForEach-Object { $_.Name })
}

function Test-AutostartRegistrationAbsent {
    param([string]$TaskName)
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & schtasks.exe /Query /TN $TaskName 2>$null | Out-Null
        $taskExists = $LASTEXITCODE -eq 0
    } finally { $ErrorActionPreference = $previousPreference }
    $registryValue = $null
    try { $registryValue = Get-ItemPropertyValue -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $TaskName -ErrorAction Stop } catch {}
    return (-not $taskExists) -and [string]::IsNullOrWhiteSpace([string]$registryValue)
}

function Test-AutostartRoundTrip {
    param([string]$Root, [string]$Prefix)
    $enabled = Invoke-Cli $Root @('autostart', 'enable')
    $status = Invoke-Cli $Root @('autostart', 'status')
    Add-Check "$Prefix autostart enables" ([bool]$status.Enabled) $status.Backend
    Add-Check "$Prefix autostart points to current root" ([bool]$status.MatchesInstallRoot) $status.Backend
    [void](Invoke-Cli $Root @('autostart', 'disable'))
    $disabled = Invoke-Cli $Root @('autostart', 'status')
    Add-Check "$Prefix autostart disables" (-not [bool]$disabled.Enabled)
}

function Write-Report {
    $report.completedAtUtc = [DateTime]::UtcNow.ToString('o')
    if (-not (Test-Path -LiteralPath $evidenceRootFull)) { New-Item -ItemType Directory -Path $evidenceRootFull -Force | Out-Null }
    ($report | ConvertTo-Json -Depth 12) + [Environment]::NewLine | Set-Content -LiteralPath $reportPath -Encoding UTF8
}

try {
    if (-not (Test-Path -LiteralPath $artifactRoot -PathType Container)) { throw "Artifact directory does not exist: $artifactRoot" }
    if (-not (Test-Path -LiteralPath $windowsPowerShell -PathType Leaf)) { throw 'Windows PowerShell 5.1 is unavailable.' }
    if (-not (Test-Path -LiteralPath $evidenceRootFull)) { New-Item -ItemType Directory -Path $evidenceRootFull -Force | Out-Null }

    Add-Check 'host is Windows x64' ([Environment]::Is64BitOperatingSystem)
    $systemCommands = @(foreach ($name in 'node.exe', 'npm.cmd', 'pm2.cmd') {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $command) { [ordered]@{ name = $name; path = $command.Source } }
    })
    $report.host.systemNodeCommands = $systemCommands
    if ($RequireNoSystemNode) { Add-Check 'system Node npm and PM2 are absent' ($systemCommands.Count -eq 0) @($systemCommands | ForEach-Object { $_.name }) }

    $setups = @(Get-ChildItem -LiteralPath $artifactRoot -Filter 'TermLink-Setup-win-x64-v*.exe' -File)
    $portables = @(Get-ChildItem -LiteralPath $artifactRoot -Filter 'TermLink-Portable-win-x64-v*.zip' -File)
    $checksumFile = Join-Path $artifactRoot 'SHA256SUMS.txt'
    Add-Check 'exactly one Setup artifact is present' ($setups.Count -eq 1) @($setups | ForEach-Object { $_.Name })
    Add-Check 'exactly one Portable artifact is present' ($portables.Count -eq 1) @($portables | ForEach-Object { $_.Name })
    Add-Check 'SHA256SUMS.txt is present' (Test-Path -LiteralPath $checksumFile -PathType Leaf)

    $setup = $setups[0]
    $portable = $portables[0]
    $setupVersion = [regex]::Match($setup.Name, '^TermLink-Setup-win-x64-v(.+)\.exe$').Groups[1].Value
    $portableVersion = [regex]::Match($portable.Name, '^TermLink-Portable-win-x64-v(.+)\.zip$').Groups[1].Value
    Add-Check 'Setup and Portable versions match' ($setupVersion -eq $portableVersion) $setupVersion
    $checksumLines = @(Get-Content -LiteralPath $checksumFile | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Add-Check 'checksum file covers exactly two artifacts' ($checksumLines.Count -eq 2)
    foreach ($artifact in @($setup, $portable)) {
        $line = $checksumLines | Where-Object { $_ -match ('  ' + [regex]::Escape($artifact.Name) + '$') } | Select-Object -First 1
        $expected = if ($line -match '^([a-fA-F0-9]{64})  ') { $Matches[1].ToLowerInvariant() } else { '' }
        $actual = (Get-FileHash -LiteralPath $artifact.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        Add-Check "checksum matches $($artifact.Name)" ($expected -eq $actual) $actual
        $report.artifacts[$artifact.Name] = [ordered]@{ size = $artifact.Length; sha256 = $actual }
    }

    $portableExtract = Join-Path $evidenceRootFull 'portable'
    Expand-Archive -LiteralPath $portable.FullName -DestinationPath $portableExtract -Force
    $portableRoot = Join-Path $portableExtract 'TermLink'
    $portableCli = Join-Path $portableRoot 'tools\windows\termlink-config.ps1'
    Add-Check 'Portable CLI exists after extraction' (Test-Path -LiteralPath $portableCli -PathType Leaf)
    foreach ($name in 'TermLink-Config.cmd', 'Start-TermLink.cmd', 'Stop-TermLink.cmd', 'TermLink-CLI.cmd') {
        Add-Check "Portable launcher exists: $name" (Test-Path -LiteralPath (Join-Path $portableRoot $name) -PathType Leaf)
    }
    $forbiddenPayload = @(Get-ChildItem -LiteralPath $portableRoot -File -Recurse | Where-Object {
        $relative = $_.FullName.Substring($portableRoot.Length).TrimStart('\')
        $underPersistent = $relative.StartsWith('persistent\', [System.StringComparison]::OrdinalIgnoreCase)
        $_.Name -eq '.env' -or $_.Extension -in @('.key', '.p12', '.pfx', '.log') -or
            ($underPersistent -and $_.Name -match '^sessions(?:\.|$)')
    })
    Add-Check 'pristine Portable payload excludes runtime secrets and data' ($forbiddenPayload.Count -eq 0) @($forbiddenPayload | ForEach-Object { $_.Name })

    $embeddedNode = Join-Path $portableRoot 'runtime\node.exe'
    $nodeFacts = (& $embeddedNode -p "JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})") | ConvertFrom-Json
    Add-Check 'embedded Node is Windows x64' ($nodeFacts.platform -eq 'win32' -and $nodeFacts.arch -eq 'x64') "$($nodeFacts.version) $($nodeFacts.platform)-$($nodeFacts.arch)"
    Push-Location (Join-Path $portableRoot 'app')
    try {
        & $embeddedNode -e "require('node-pty'); process.stdout.write('ok')" | Out-Null
        Add-Check 'embedded node-pty loads' ($LASTEXITCODE -eq 0)
    } finally { Pop-Location }

    $portableCliPort = Get-FreeTcpPort
    [void](Invoke-Cli $portableRoot @('port', 'set', '-Value', [string]$portableCliPort))
    Add-Check 'Portable CLI modifies port' ((Invoke-Cli $portableRoot @('port', 'get')) -eq $portableCliPort) $portableCliPort
    $portableGuiPort = Get-FreeTcpPort
    $guiResult = Invoke-GuiPortExercise $portableRoot $portableGuiPort
    Add-Check 'Portable GUI modifies port through shared core' ([int]$guiResult.ExercisedPort -eq $portableGuiPort) $portableGuiPort
    Invoke-CliLifecycle $portableRoot @('start')
    $portableHealth = Invoke-Cli $portableRoot @('health', '-TimeoutSeconds', '10')
    Add-Check 'Portable service passes HTTP health' ([bool]$portableHealth.Healthy) $portableHealth.Url
    Test-AutostartRoundTrip $portableRoot 'Portable'
    Invoke-CliLifecycle $portableRoot @('mtls', 'enable', '-TimeoutSeconds', '30')
    Assert-MtlsLayout $portableRoot
    $portableMtlsHealth = Invoke-Cli $portableRoot @('health', '-TimeoutSeconds', '10')
    Add-Check 'Portable service passes mTLS health' ([bool]$portableMtlsHealth.Healthy) $portableMtlsHealth.Url
    $portablePage = Invoke-Cli $portableRoot @('open', 'page', '-WhatIf')
    $portableLogs = Invoke-Cli $portableRoot @('open', 'logs', '-WhatIf')
    Add-Check 'Portable open-page action resolves current URL' ([string]$portablePage -eq "https://localhost:$portableGuiPort") $portablePage
    Add-Check 'Portable open-logs action resolves local log directory' ([string]$portableLogs -eq (Join-Path $portableRoot 'persistent\logs')) $portableLogs
    [void](Invoke-Cli $portableRoot @('stop'))
    Assert-NoSecretLogging $portableRoot 'Portable'

    $existingInstall = @(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object {
        $displayNameProperty = $_.PSObject.Properties['DisplayName']
        $null -ne $displayNameProperty -and $displayNameProperty.Value -eq 'TermLink'
    } | Select-Object -First 1)
    Add-Check 'no pre-existing TermLink installation would be overwritten' ($existingInstall.Count -eq 0) @($existingInstall | ForEach-Object {
        $location = $_.PSObject.Properties['InstallLocation']
        if ($null -ne $location) { [string]$location.Value } else { [string]$_.PSChildName }
    })

    $setupPort = Get-FreeTcpPort
    $configRoot = Join-Path $installRoot 'persistent\config'
    New-Item -ItemType Directory -Path $configRoot -Force | Out-Null
    $randomBytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
    $generatedPassword = [Convert]::ToBase64String($randomBytes)
    $initialConfiguration = [ordered]@{
        schemaVersion = 1; serviceName = 'TermLink'; port = $setupPort
        auth = [ordered]@{ enabled = $true; user = 'admin'; pass = $generatedPassword }
        tls = [ordered]@{
            enabled = $false; clientCertPolicy = 'none'
            serverCert = 'persistent\certs\server\server.crt'
            serverKey = 'persistent\certs\server\server.key'
            caCert = 'persistent\certs\ca\TermLink-CA.crt'
        }
    }
    ($initialConfiguration | ConvertTo-Json -Depth 8) + [Environment]::NewLine | Set-Content -LiteralPath (Join-Path $configRoot 'termlink.json') -Encoding UTF8
    $generatedPassword = $null

    $installArguments = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CURRENTUSER', "/DIR=$installRoot", '/MERGETASKS=desktopicon,autostart')
    Invoke-Executable $setup.FullName $installArguments
    Add-Check 'Setup installs CLI' (Test-Path -LiteralPath $installedCli -PathType Leaf)
    Add-Check 'Setup creates uninstaller' (Test-Path -LiteralPath $uninstaller -PathType Leaf)
    $desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'TermLink.lnk'
    $startMenuRoot = Join-Path ([Environment]::GetFolderPath('Programs')) 'TermLink'
    Add-Check 'Setup creates desktop shortcut' (Test-Path -LiteralPath $desktopShortcut -PathType Leaf)
    Add-Check 'Setup creates Start menu shortcuts' (@(Get-ChildItem -LiteralPath $startMenuRoot -Filter '*.lnk' -File -ErrorAction SilentlyContinue).Count -ge 4)
    Add-Check 'Setup starts service and passes health' ([bool](Invoke-Cli $installRoot @('health', '-TimeoutSeconds', '10')).Healthy)
    $installerAutostart = Invoke-Cli $installRoot @('autostart', 'status')
    Add-Check 'Setup-selected autostart task enables registration' ([bool]$installerAutostart.Enabled) $installerAutostart.Backend
    Add-Check 'Setup-selected autostart points to installed root' ([bool]$installerAutostart.MatchesInstallRoot) $installerAutostart.Backend
    if ($FailAfterSetup) { throw 'Injected verifier failure after Setup installation.' }

    $setupGuiPort = Get-FreeTcpPort
    $installedGuiResult = Invoke-GuiPortExercise $installRoot $setupGuiPort
    Add-Check 'installed GUI modifies port through shared core' ([int]$installedGuiResult.ExercisedPort -eq $setupGuiPort) $setupGuiPort
    Invoke-CliLifecycle $installRoot @('restart')
    Add-Check 'installed service passes health after GUI port change' ([bool](Invoke-Cli $installRoot @('health', '-TimeoutSeconds', '10')).Healthy)
    Test-AutostartRoundTrip $installRoot 'Setup'
    Invoke-CliLifecycle $installRoot @('mtls', 'enable', '-TimeoutSeconds', '30')
    Assert-MtlsLayout $installRoot
    Add-Check 'installed service passes mTLS health' ([bool](Invoke-Cli $installRoot @('health', '-TimeoutSeconds', '10')).Healthy)

    $marker = Join-Path $installRoot 'persistent\data\clean-host-upgrade-marker.txt'
    New-Item -ItemType Directory -Path (Split-Path -Parent $marker) -Force | Out-Null
    'preserve-on-upgrade' | Set-Content -LiteralPath $marker -Encoding ASCII
    $caHashBeforeUpgrade = (Get-FileHash -LiteralPath (Join-Path $installRoot 'TermLink-CA.crt') -Algorithm SHA256).Hash
    Invoke-Executable $setup.FullName $installArguments
    Add-Check 'Setup upgrade preserves data' ((Get-Content -LiteralPath $marker -Raw).Trim() -eq 'preserve-on-upgrade')
    Add-Check 'Setup upgrade preserves certificates' ((Get-FileHash -LiteralPath (Join-Path $installRoot 'TermLink-CA.crt') -Algorithm SHA256).Hash -eq $caHashBeforeUpgrade)
    Add-Check 'upgraded service passes mTLS health' ([bool](Invoke-Cli $installRoot @('health', '-TimeoutSeconds', '10')).Healthy)
    $setupPage = Invoke-Cli $installRoot @('open', 'page', '-WhatIf')
    $setupLogs = Invoke-Cli $installRoot @('open', 'logs', '-WhatIf')
    Add-Check 'installed open-page action resolves current URL' ([string]$setupPage -eq "https://localhost:$setupGuiPort") $setupPage
    Add-Check 'installed open-logs action resolves local log directory' ([string]$setupLogs -eq (Join-Path $installRoot 'persistent\logs')) $setupLogs
    Assert-NoSecretLogging $installRoot 'Setup'
    $preUninstallAutostart = Invoke-Cli $installRoot @('autostart', 'status')
    Add-Check 'upgrade-selected autostart remains enabled before uninstall' ([bool]$preUninstallAutostart.Enabled) $preUninstallAutostart.Backend
    $uninstallTaskName = [string]$preUninstallAutostart.TaskName

    Invoke-Executable $uninstaller @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART')
    Add-Check 'uninstall removes application files' (-not (Test-Path -LiteralPath (Join-Path $installRoot 'app\src')))
    Add-Check 'uninstall preserves persistent data' (Test-Path -LiteralPath $marker -PathType Leaf)
    Add-Check 'uninstall removes desktop shortcut' (-not (Test-Path -LiteralPath $desktopShortcut))
    Add-Check 'uninstall removes Start menu group' (-not (Test-Path -LiteralPath $startMenuRoot))
    Add-Check 'uninstall removes autostart registration' (Test-AutostartRegistrationAbsent $uninstallTaskName) $uninstallTaskName

    $report.success = $true
} catch {
    $report.error = $_.Exception.Message
} finally {
    if ($null -ne $portableCli -and (Test-Path -LiteralPath $portableCli)) {
        try { [void](Invoke-Cli $portableRoot @('autostart', 'disable')) } catch {}
        try { [void](Invoke-Cli $portableRoot @('stop')) } catch {}
    }
    if (Test-Path -LiteralPath $installedCli) {
        try { [void](Invoke-Cli $installRoot @('autostart', 'disable')) } catch {}
        try { [void](Invoke-Cli $installRoot @('stop')) } catch {}
    }
    if (-not $report.success -and (Test-Path -LiteralPath $uninstaller -PathType Leaf)) {
        try {
            Invoke-Executable $uninstaller @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART')
            $report.cleanup.failedSetupUninstalled = $true
        } catch {
            $report.cleanup.error = $_.Exception.Message
        }
    }
    Write-Report
}

if (-not $report.success) {
    [Console]::Error.WriteLine("TermLink clean-host verification failed: $($report.error)")
    [Console]::Error.WriteLine("Evidence: $reportPath")
    exit 1
}

Write-Output "TermLink clean-host verification passed."
Write-Output "Evidence: $reportPath"
