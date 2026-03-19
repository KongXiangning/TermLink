param(
    [string]$ProjectRoot,
    [string]$JdkHome,
    [string]$OutDir = 'E:\project\TermLink',
    [string]$OutName = 'app-debug.apk'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath

if (-not $ProjectRoot) {
    $ProjectRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path
}

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot"
}

$androidDir = Join-Path $ProjectRoot 'android'
if (-not (Test-Path $androidDir)) {
    throw "Android directory not found: $androidDir"
}

if (-not $JdkHome) {
    if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) {
        $JdkHome = $env:JAVA_HOME
    } elseif (Test-Path 'D:\ProgramCode\openjdk\jdk-21') {
        $JdkHome = 'D:\ProgramCode\openjdk\jdk-21'
    } elseif (Test-Path 'C:\Program Files\Android\Android Studio\jbr') {
        $JdkHome = 'C:\Program Files\Android\Android Studio\jbr'
    }
}

if (-not $JdkHome) {
    throw 'JDK path not found. Set JAVA_HOME or pass -JdkHome (JDK 21 required).'
}

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
        Write-Host "Building debug APK..."
        .\gradlew.bat :app:assembleDebug
        if ($LASTEXITCODE -ne 0) {
            throw 'assembleDebug failed'
        }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

$apkPath = Join-Path $ProjectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apkPath)) {
    throw "APK not found: $apkPath"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$target = Join-Path $OutDir $OutName
Copy-Item -Path $apkPath -Destination $target -Force

Write-Host "APK built: $apkPath"
Write-Host "APK copied: $target"
