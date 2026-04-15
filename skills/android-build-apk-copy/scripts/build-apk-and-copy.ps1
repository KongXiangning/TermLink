param(
    [string]$ProjectRoot,
    [string]$JdkHome,
    [string]$OutDir = 'E:\project\TermLink',
    [string]$OutName
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath

function Resolve-ProjectRootFromScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartDir
    )

    $current = Resolve-Path $StartDir
    while ($null -ne $current) {
        $candidate = $current.Path
        $androidDir = Join-Path $candidate 'android'
        $packageJson = Join-Path $candidate 'package.json'
        if ((Test-Path $androidDir) -and (Test-Path $packageJson)) {
            return $candidate
        }

        $parent = Split-Path -Parent $candidate
        if (-not $parent -or $parent -eq $candidate) {
            break
        }
        $current = Resolve-Path $parent
    }

    throw "Project root not found from script directory: $StartDir"
}

function Get-JavaMajorVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$JavaHome
    )

    $javaExe = Join-Path $JavaHome 'bin\java.exe'
    if (-not (Test-Path $javaExe)) {
        return $null
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $versionLine = & $javaExe -version 2>&1 | Select-Object -First 1
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if (-not $versionLine) {
        return $null
    }

    if ($versionLine -match '"(?<version>\d+)(\.\d+)?') {
        return [int]$Matches.version
    }

    return $null
}

function Resolve-Jdk21Home {
    param(
        [string]$RequestedJdkHome
    )

    $candidates = @()
    if ($RequestedJdkHome) {
        $candidates += $RequestedJdkHome
    }
    if ($env:JAVA_HOME) {
        $candidates += $env:JAVA_HOME
    }
    $candidates += 'D:\ProgramCode\openjdk\jdk-21'
    $candidates += 'C:\Program Files\Android\Android Studio\jbr'

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if (-not $candidate -or -not (Test-Path $candidate)) {
            continue
        }

        $majorVersion = Get-JavaMajorVersion -JavaHome $candidate
        if ($majorVersion -eq 21) {
            return $candidate
        }
    }

    if ($RequestedJdkHome) {
        throw "Specified JDK is not Java 21: $RequestedJdkHome"
    }

    if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) {
        $currentVersion = Get-JavaMajorVersion -JavaHome $env:JAVA_HOME
        if ($currentVersion) {
            throw "JAVA_HOME is Java $currentVersion, but this build requires Java 21. Pass -JdkHome or install JDK 21."
        }
    }

    throw 'JDK 21 path not found. Set JAVA_HOME to JDK 21 or pass -JdkHome (JDK 21 required).'
}

function Get-AndroidVersionName {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRootPath
    )

    $buildGradlePath = Join-Path $ProjectRootPath 'android\app\build.gradle'
    if (-not (Test-Path $buildGradlePath)) {
        return 'unknown'
    }

    $content = Get-Content -Path $buildGradlePath -Raw
    if ($content -match 'versionName\s+"(?<version>[^"]+)"') {
        return $Matches.version.Trim()
    }

    return 'unknown'
}

function New-DefaultOutName {
    param(
        [Parameter(Mandatory = $true)]
        [string]$VersionName
    )

    $safeVersion = ($VersionName -replace '[^0-9A-Za-z._-]', '-').Trim('-')
    if (-not $safeVersion) {
        $safeVersion = 'unknown'
    }

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    return "TermLink-v$safeVersion-debug-$timestamp.apk"
}

if (-not $ProjectRoot) {
    $ProjectRoot = Resolve-ProjectRootFromScript -StartDir $scriptDir
}

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot"
}

$androidDir = Join-Path $ProjectRoot 'android'
if (-not (Test-Path $androidDir)) {
    throw "Android directory not found: $androidDir"
}

$apkPath = Join-Path $ProjectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$JdkHome = Resolve-Jdk21Home -RequestedJdkHome $JdkHome

$env:JAVA_HOME = $JdkHome
$env:Path = "$($env:JAVA_HOME)\bin;$($env:Path)"

Push-Location $ProjectRoot
try {
    Write-Host "Running android sync..."
    npm run android:sync
    if ($LASTEXITCODE -ne 0) {
        throw 'android:sync failed'
    }

    Push-Location $androidDir
    try {
        if (Test-Path $apkPath) {
            Write-Host "Removing previous APK output..."
            Remove-Item -LiteralPath $apkPath -Force
        }

        Write-Host "Building fresh debug APK..."
        .\gradlew.bat clean :app:assembleDebug --no-build-cache --rerun-tasks
        if ($LASTEXITCODE -ne 0) {
            throw 'assembleDebug failed'
        }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

if (-not (Test-Path $apkPath)) {
    throw "APK not found: $apkPath"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$resolvedOutName = if ($OutName) {
    $OutName
} else {
    New-DefaultOutName -VersionName (Get-AndroidVersionName -ProjectRootPath $ProjectRoot)
}
$target = Join-Path $OutDir $resolvedOutName
Copy-Item -Path $apkPath -Destination $target -Force

Write-Host "APK built: $apkPath"
Write-Host "APK copied: $target"
