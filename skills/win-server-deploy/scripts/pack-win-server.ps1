<#
.SYNOPSIS
  Pack TermLink server into a self-contained deployable zip (Windows).
.DESCRIPTION
  Creates a zip archive including source, public assets, and a pruned
  node_modules (server-only deps, no Capacitor/Android artifacts).
  Uses robocopy for the copy step to handle any remaining long paths,
  and excludes @capacitor/xterm/nodemon which are not needed on server.
.PARAMETER OutDir
  Directory to write the zip into. Defaults to ./dist.
#>
param(
    [string]$OutDir = ".\dist"
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $ScriptDir))

# ── Preflight checks ────────────────────────────────────
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Error "node_modules not found. Run 'npm install' first."
    exit 1
}
if (-not (Test-Path "$ProjectRoot\src\server.js")) {
    Write-Error "src/server.js not found. Are you in the right project?"
    exit 1
}

# ── Prepare staging area (short temp path to avoid MAX_PATH) ─
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$PackageName = "termlink-win-$Timestamp"
# Use a short path to maximise headroom for nested node_modules
$StageDir = Join-Path $env:TEMP "tl-pack"

Write-Host "=== TermLink Win Server Packer ===" -ForegroundColor Cyan
Write-Host "Project root : $ProjectRoot"

if (Test-Path $StageDir) { Remove-Item $StageDir -Recurse -Force }
New-Item $StageDir -ItemType Directory -Force | Out-Null

# ── Copy application source files ───────────────────────
$ItemsToCopy = @(
    'src',
    'public',
    'package.json',
    'package-lock.json',
    'ecosystem.config.js',
    '.env.example'
)

foreach ($item in $ItemsToCopy) {
    $src = Join-Path $ProjectRoot $item
    $dst = Join-Path $StageDir $item
    if (Test-Path $src -PathType Container) {
        Copy-Item $src $dst -Recurse -Force
        Write-Host "  [DIR]  $item"
    }
    elseif (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  [FILE] $item"
    }
    else {
        Write-Warning "  [SKIP] $item (not found)"
    }
}

# ── Copy deploy scripts (install/uninstall/start from this skill) ──
$DeployScripts = @('install-service.ps1', 'uninstall-service.ps1', 'start.ps1')
$DeployDst = Join-Path $StageDir 'deploy-scripts'
New-Item $DeployDst -ItemType Directory -Force | Out-Null
foreach ($ds in $DeployScripts) {
    $dsSrc = Join-Path $ScriptDir $ds
    if (Test-Path $dsSrc) {
        Copy-Item $dsSrc (Join-Path $DeployDst $ds) -Force
    }
}
Write-Host "  [DIR]  deploy-scripts"

# ── Create empty runtime directories ────────────────────
@('data', 'logs') | ForEach-Object {
    New-Item (Join-Path $StageDir $_) -ItemType Directory -Force | Out-Null
}

# ── Copy node_modules (pruned, robocopy for long-path safety) ─
# Exclude packages only needed for Android build or dev:
#   @capacitor/*     - Android/Capacitor tooling (contains .dex with very long paths)
#   nodemon          - devDependency
#   xterm, xterm-addon-fit  - bundled in public/ already, not needed by server
Write-Host "  [DIR]  node_modules (pruned copy, please wait)..."

$nmSrc = Join-Path $ProjectRoot 'node_modules'
$nmDst = Join-Path $StageDir 'node_modules'

$ExcludeDirs = @(
    '@capacitor',
    'nodemon',
    'xterm',
    'xterm-addon-fit'
)

$robocopyArgs = @(
    $nmSrc, $nmDst,
    '/E',
    '/NFL', '/NDL', '/NJH', '/NJS',
    '/R:1', '/W:1'
)
foreach ($exc in $ExcludeDirs) {
    $robocopyArgs += '/XD'
    $robocopyArgs += (Join-Path $nmSrc $exc)
}

& robocopy @robocopyArgs | Out-Null
# Robocopy exit codes < 8 are success
if ($LASTEXITCODE -ge 8) {
    Write-Error "robocopy failed with exit code $LASTEXITCODE"
    exit 1
}

$moduleCount = (Get-ChildItem $nmDst -Directory -ErrorAction SilentlyContinue).Count
Write-Host "  [OK]   $moduleCount top-level packages (excluded: $($ExcludeDirs -join ', '))"

# ── Create zip ──────────────────────────────────────────
if (-not (Test-Path $OutDir)) {
    New-Item $OutDir -ItemType Directory -Force | Out-Null
}
$OutDirResolved = Resolve-Path $OutDir
$ZipPath = Join-Path $OutDirResolved "$PackageName.zip"

Write-Host "`nCompressing to: $ZipPath ..."
Compress-Archive -Path "$StageDir\*" -DestinationPath $ZipPath -Force

# ── Cleanup ─────────────────────────────────────────────
Remove-Item $StageDir -Recurse -Force -ErrorAction SilentlyContinue

$SizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Archive : $ZipPath ($SizeMB MB)"
Write-Host @"

Deploy on target Windows machine:
  1. Right-click zip -> Extract All (or: Expand-Archive *.zip -Dest C:\TermLink)
  2. Copy .env.example -> .env, edit credentials
  3. Admin PowerShell: .\deploy-scripts\install-service.ps1
"@
