<#
.SYNOPSIS
  Install TermLink as a Windows background service using pm2.
.DESCRIPTION
  1. Installs pm2 globally (if not present).
  2. Registers pm2 startup so it auto-starts on Windows boot.
  3. Starts TermLink via ecosystem.config.js.
  4. Saves the pm2 process list.
  Must be run as Administrator for startup registration.
#>
$ErrorActionPreference = 'Stop'

# Determine project root (parent of deploy-scripts)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
if (Test-Path (Join-Path $ScriptDir '..\src\server.js')) {
    $ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..')
}

Write-Host "=== TermLink Windows Service Installer ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"

# ── Check Node.js ───────────────────────────────────────
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Error "Node.js not found in PATH. Please install Node.js LTS (https://nodejs.org) first."
    exit 1
}
$nodeVersion = & node --version
Write-Host "Node.js: $nodeVersion"

# ── Check .env ──────────────────────────────────────────
$envFile = Join-Path $ProjectRoot '.env'
$envExample = Join-Path $ProjectRoot '.env.example'
if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Warning ".env not found — created from .env.example. Please edit it before putting into production!"
    }
    else {
        Write-Warning ".env not found and no .env.example available. Using defaults."
    }
}
else {
    Write-Host ".env found."
}

# ── Ensure data and logs directories ────────────────────
@('data', 'logs') | ForEach-Object {
    $dir = Join-Path $ProjectRoot $_
    if (-not (Test-Path $dir)) {
        New-Item $dir -ItemType Directory -Force | Out-Null
        Write-Host "Created $_ directory."
    }
}

# ── Install pm2 globally ───────────────────────────────
$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
    Write-Host "Installing pm2 globally..."
    & npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install pm2."
        exit 1
    }
}
else {
    Write-Host "pm2 already installed."
}

# ── Install pm2-windows-startup ─────────────────────────
# This makes pm2 resurrect saved processes on Windows boot.
$pm2Startup = Get-Command pm2-startup -ErrorAction SilentlyContinue
if (-not $pm2Startup) {
    Write-Host "Installing pm2-windows-startup..."
    & npm install -g pm2-windows-startup
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "pm2-windows-startup install failed. Auto-start on boot may not work."
        Write-Warning "You can manually set up startup later."
    }
}

# ── Register pm2 startup (requires Admin) ──────────────
$isAdmin = ([Security.Principal.WindowsPrincipal]([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "Registering pm2 startup service..."
    try {
        & pm2-startup install
    }
    catch {
        Write-Warning "pm2 startup registration failed: $_"
        Write-Warning "Service will work but may not auto-start on reboot."
    }
}
else {
    Write-Warning "Not running as Administrator. Skipping auto-start registration."
    Write-Warning "To enable auto-start, re-run this script as Administrator."
}

# ── Start TermLink ──────────────────────────────────────
$ecosystemConfig = Join-Path $ProjectRoot 'ecosystem.config.js'
if (-not (Test-Path $ecosystemConfig)) {
    Write-Error "ecosystem.config.js not found at $ecosystemConfig"
    exit 1
}

Write-Host "Starting TermLink..."
Push-Location $ProjectRoot
try {
    & pm2 start ecosystem.config.js
    & pm2 save
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Green

# ── Read port from .env or show default ─────────────────
$port = '3000'
if (Test-Path $envFile) {
    $portLine = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT\s*=' }
    if ($portLine) {
        $port = ($portLine -split '=', 2)[1].Trim()
    }
}

Write-Host @"

  Service name : termlink
  Status       : pm2 status
  Logs         : pm2 logs termlink
  Restart      : pm2 restart termlink
  Stop         : pm2 stop termlink
  Uninstall    : Run uninstall-service.ps1

  Server URL   : http://localhost:$port

"@

# ── Verify TermLink is responding ───────────────────────
Start-Sleep -Seconds 3
try {
    $health = Invoke-RestMethod "http://localhost:$port/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Server is running. Health: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
}
catch {
    Write-Warning "Server may still be starting. Check with: pm2 logs termlink"
}
