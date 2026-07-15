@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"

if defined NVM_HOME set "PATH=%NVM_HOME%;%PATH%"
if defined NVM_SYMLINK set "PATH=%NVM_SYMLINK%;%PATH%"
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"

cd /d "%PROJECT_ROOT%"
echo [TermLink] Startup project root: %PROJECT_ROOT%

where pm2 >nul 2>&1
if errorlevel 1 (
    echo [TermLink] pm2 not found in PATH.
    exit /b 1
)

for /f "delims=" %%I in ('pm2 jlist 2^>nul ^| powershell -NoProfile -Command "$raw = [Console]::In.ReadToEnd(); if ($raw.Trim()) { $items = $raw ^| ConvertFrom-Json; if ($items -isnot [System.Array]) { $items = @($items) }; $items ^| ForEach-Object { $_.name } ^| Where-Object { $_ -and $_ -ne ''termlink'' } ^| Sort-Object -Unique }"') do (
    echo [TermLink] Found other PM2 app: %%I
    echo [TermLink] Refusing to reset the PM2 daemon because elevated startup would interrupt non-TermLink apps.
    exit /b 1
)

set "PM2_PID_FILE=%USERPROFILE%\.pm2\pm2.pid"
timeout /t 5 /nobreak >nul
call pm2 kill >nul 2>&1

set /a WAIT_RETRIES=0
:wait_pm2_shutdown
if not exist "%PM2_PID_FILE%" goto pm2_stopped

set "PM2_PID="
set /p PM2_PID=<"%PM2_PID_FILE%"
if not defined PM2_PID goto pm2_sleep

tasklist /FI "PID eq %PM2_PID%" | findstr /R /C:" %PM2_PID% " >nul
if errorlevel 1 goto pm2_stopped

:pm2_sleep
if %WAIT_RETRIES% GEQ 15 (
    echo [TermLink] PM2 daemon did not stop within timeout.
    exit /b 1
)
set /a WAIT_RETRIES+=1
timeout /t 1 /nobreak >nul
goto wait_pm2_shutdown

:pm2_stopped

call pm2 start ecosystem.config.js
if errorlevel 1 (
    echo [TermLink] pm2 start ecosystem.config.js failed.
    exit /b 1
)

call pm2 save --force
if errorlevel 1 (
    echo [TermLink] pm2 save failed.
    exit /b 1
)

echo [TermLink] PM2 startup completed.
exit /b 0
