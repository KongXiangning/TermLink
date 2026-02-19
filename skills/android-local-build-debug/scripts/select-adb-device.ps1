param(
    [string]$Serial,
    [string[]]$Preferred = @('da34332c', 'MQS7N19402011743')
)

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    throw 'adb not found in PATH'
}

$lines = & adb devices
$online = @()
foreach ($line in $lines) {
    if ($line -match '^([A-Za-z0-9._:-]+)\s+device$') {
        $online += $Matches[1]
    }
}

if ($Serial) {
    if ($online -contains $Serial) {
        Write-Output $Serial
        exit 0
    }
    throw "Requested serial '$Serial' is not online. Online: $($online -join ', ')"
}

foreach ($candidate in $Preferred) {
    if ($online -contains $candidate) {
        Write-Output $candidate
        exit 0
    }
}

if ($online.Count -eq 1) {
    Write-Output $online[0]
    exit 0
}

if ($online.Count -gt 1) {
    throw "Multiple devices online. Pass -Serial explicitly. Online: $($online -join ', ')"
}

throw 'No adb device online.'

