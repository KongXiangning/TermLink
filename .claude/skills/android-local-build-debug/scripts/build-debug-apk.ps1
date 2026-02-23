param(
    [string]$ProjectRoot,
    [string]$JdkHome
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
    $ProjectRoot = Resolve-Path (Join-Path $scriptDir '..\..\..')
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

if ($JdkHome) {
    $env:JAVA_HOME = $JdkHome
    $env:Path = "$($env:JAVA_HOME)\bin;$($env:Path)"
} else {
    Write-Warning 'JDK path not provided and JAVA_HOME not set. Build may fail if Java is unavailable in PATH.'
}

Push-Location $ProjectRoot
try {
    npm run android:sync
    if ($LASTEXITCODE -ne 0) {
        throw 'android:sync failed'
    }

    Push-Location $androidDir
    try {
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

Write-Host "APK: $ProjectRoot\android\app\build\outputs\apk\debug\app-debug.apk"
