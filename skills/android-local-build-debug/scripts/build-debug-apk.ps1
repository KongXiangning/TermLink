param(
    [string]$ProjectRoot = 'E:\coding\TermLink',
    [string]$JdkHome = 'D:\ProgramCode\openjdk\jdk-21'
)

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot"
}

$androidDir = Join-Path $ProjectRoot 'android'
if (-not (Test-Path $androidDir)) {
    throw "Android directory not found: $androidDir"
}

$env:JAVA_HOME = $JdkHome
$env:Path = "$($env:JAVA_HOME)\bin;$($env:Path)"

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

