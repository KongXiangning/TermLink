'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const WINDOWS_WORK_ROOT = path.join(PROJECT_ROOT, 'dist', 'windows-release');
const CACHE_ROOT = path.join(WINDOWS_WORK_ROOT, 'cache');
const STAGING_ROOT = path.join(WINDOWS_WORK_ROOT, 'staging', 'TermLink');
const ARTIFACT_ROOT = path.join(WINDOWS_WORK_ROOT, 'artifacts');
const NODE_VERSION = '24.12.0';
const NODE_ARCHIVE = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}`;
const NODE_SHA256 = '9c125f61ae947b52e779095830f9cac267846a043ef7192183c84016aaad2812';
const INNO_VERSION = '6.7.3';
const INNO_INSTALLER = `innosetup-${INNO_VERSION}.exe`;
const INNO_URL = `https://github.com/jrsoftware/issrc/releases/download/is-6_7_3/${INNO_INSTALLER}`;
const INNO_SHA256 = '9c73c3bae7ed48d44112a0f48e66742c00090bdb5bef71d9d3c056c66e97b732';

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd || PROJECT_ROOT,
        encoding: 'utf8',
        stdio: options.stdio || 'pipe',
        env: { ...process.env, ...options.env }
    });
    if (result.status !== 0) {
        if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
        throw new Error(`${command} failed: ${String(result.stderr || result.stdout || `exit ${result.status}`).trim()}`);
    }
    return result;
}

function sha256(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function download(url, destination, redirects = 0) {
    if (redirects > 5) return Promise.reject(new Error('Too many redirects while downloading Node.js.'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${process.pid}.tmp`;
    fs.rmSync(temporary, { force: true });
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers: { 'User-Agent': 'TermLink-Windows-Release' } }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                fs.rmSync(temporary, { force: true });
                return download(new URL(response.headers.location, url).toString(), destination, redirects + 1).then(resolve, reject);
            }
            if (response.statusCode !== 200) {
                response.resume();
                return reject(new Error(`Node.js download failed with HTTP ${response.statusCode}.`));
            }
            const output = fs.createWriteStream(temporary, { flags: 'wx' });
            response.pipe(output);
            output.on('finish', () => {
                output.close(() => {
                    fs.renameSync(temporary, destination);
                    resolve();
                });
            });
            output.on('error', reject);
        });
        request.on('error', reject);
    }).finally(() => fs.rmSync(temporary, { force: true }));
}

async function prepareNodeArchive() {
    const archivePath = path.join(CACHE_ROOT, NODE_ARCHIVE);
    if (!fs.existsSync(archivePath) || sha256(archivePath) !== NODE_SHA256) {
        fs.rmSync(archivePath, { force: true });
        await download(NODE_URL, archivePath);
    }
    const actual = sha256(archivePath);
    if (actual !== NODE_SHA256) throw new Error(`Node.js SHA-256 mismatch: expected ${NODE_SHA256}, got ${actual}.`);
    return archivePath;
}

function copyAllowedApplicationFiles(stageRoot) {
    const appRoot = path.join(stageRoot, 'app');
    fs.mkdirSync(appRoot, { recursive: true });
    for (const name of ['src', 'public']) fs.cpSync(path.join(PROJECT_ROOT, name), path.join(appRoot, name), { recursive: true });
    for (const name of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(PROJECT_ROOT, name), path.join(appRoot, name));
    fs.cpSync(path.join(PROJECT_ROOT, 'tools', 'windows'), path.join(stageRoot, 'tools', 'windows'), { recursive: true });
    for (const directory of ['config', 'runtime', 'data', 'logs', 'run', 'certs']) {
        fs.mkdirSync(path.join(stageRoot, 'persistent', directory), { recursive: true });
    }
}

function writePortableLaunchers(stageRoot) {
    const launchers = {
        'TermLink-Config.cmd': '@echo off\r\nstart "TermLink Configuration" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\\windows\\termlink-config-gui.ps1" -InstallRoot "%~dp0"\r\n',
        'Start-TermLink.cmd': '@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\\windows\\termlink-config.ps1" start -InstallRoot "%~dp0"\r\n',
        'Stop-TermLink.cmd': '@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\\windows\\termlink-config.ps1" stop -InstallRoot "%~dp0"\r\n',
        'TermLink-CLI.cmd': '@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\\windows\\termlink-config.ps1" %* -InstallRoot "%~dp0"\r\n'
    };
    for (const [name, content] of Object.entries(launchers)) fs.writeFileSync(path.join(stageRoot, name), content, 'ascii');
}

function extractEmbeddedNode(archivePath, stageRoot) {
    const extractRoot = path.join(WINDOWS_WORK_ROOT, 'node-extract');
    fs.rmSync(extractRoot, { recursive: true, force: true });
    fs.mkdirSync(extractRoot, { recursive: true });
    run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${extractRoot.replaceAll("'", "''")}' -Force`]);
    const sourceRoot = path.join(extractRoot, `node-v${NODE_VERSION}-win-x64`);
    const runtimeRoot = path.join(stageRoot, 'runtime');
    fs.mkdirSync(runtimeRoot, { recursive: true });
    for (const name of ['node.exe', 'LICENSE', 'README.md']) fs.copyFileSync(path.join(sourceRoot, name), path.join(runtimeRoot, name));
    fs.rmSync(extractRoot, { recursive: true, force: true });
}

function installProductionDependencies(stageRoot) {
    const dependencyRoot = path.join(WINDOWS_WORK_ROOT, 'dependency-work');
    fs.rmSync(dependencyRoot, { recursive: true, force: true });
    fs.mkdirSync(dependencyRoot, { recursive: true });
    for (const name of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(PROJECT_ROOT, name), path.join(dependencyRoot, name));
    run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd ci --omit=dev --ignore-scripts --no-audit --no-fund'], {
        cwd: dependencyRoot,
        env: { npm_config_platform: 'win32', npm_config_arch: 'x64' }
    });
    const nodeModules = path.join(dependencyRoot, 'node_modules');
    for (const file of walkFiles(nodeModules)) {
        const base = path.basename(file);
        if (file.toLowerCase().endsWith('.pdb') || /^readme(?:[-_.].*)?\.md$/i.test(base)) fs.rmSync(file, { force: true });
    }
    fs.cpSync(nodeModules, path.join(stageRoot, 'app', 'node_modules'), { recursive: true });
    fs.rmSync(dependencyRoot, { recursive: true, force: true });
}

function walkFiles(root) {
    if (!fs.existsSync(root)) return [];
    const files = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const absolute = path.join(root, entry.name);
        if (entry.isDirectory()) files.push(...walkFiles(absolute));
        else if (entry.isFile()) files.push(absolute);
    }
    return files;
}

function scanStaging(stageRoot) {
    const violations = [];
    for (const file of walkFiles(stageRoot)) {
        const relative = path.relative(stageRoot, file).replaceAll('\\', '/');
        const lower = relative.toLowerCase();
        const base = path.basename(lower);
        if (base === '.env' || base === 'sessions.json' || lower.endsWith('.log') || /\.(key|p12|pfx)$/.test(lower)) violations.push(relative);
        if (fs.statSync(file).size < 2_000_000) {
            const content = fs.readFileSync(file);
        if (content.includes(Buffer.from('-----BEGIN PRIVATE KEY-----')) || content.includes(Buffer.from('-----BEGIN RSA PRIVATE KEY-----'))) violations.push(`${relative} (private-key-content)`); // sensitive-scan:allow
        }
    }
    if (violations.length) throw new Error(`Sensitive/runtime files found in Windows staging:\n${[...new Set(violations)].join('\n')}`);
    return true;
}

function validateStaging(stageRoot) {
    const nodePath = path.join(stageRoot, 'runtime', 'node.exe');
    const result = run(nodePath, ['-e', "const p=require('./app/node_modules/node-pty'); if(process.arch!=='x64'||typeof p.spawn!=='function') process.exit(2); console.log(JSON.stringify({arch:process.arch,node:process.version,nodePty:true}));"], { cwd: stageRoot });
    return JSON.parse(result.stdout.trim());
}

async function stageWindowsRuntime() {
    const archivePath = await prepareNodeArchive();
    fs.rmSync(STAGING_ROOT, { recursive: true, force: true });
    fs.mkdirSync(STAGING_ROOT, { recursive: true });
    copyAllowedApplicationFiles(STAGING_ROOT);
    writePortableLaunchers(STAGING_ROOT);
    extractEmbeddedNode(archivePath, STAGING_ROOT);
    installProductionDependencies(STAGING_ROOT);
    scanStaging(STAGING_ROOT);
    const validation = validateStaging(STAGING_ROOT);
    const manifest = {
        schemaVersion: 1,
        nodeVersion: NODE_VERSION,
        nodeArchive: NODE_ARCHIVE,
        nodeSha256: NODE_SHA256,
        architecture: 'x64',
        nodePtyLoadVerified: validation.nodePty,
        fileCount: walkFiles(STAGING_ROOT).length + 1
    };
    fs.writeFileSync(path.join(STAGING_ROOT, 'release-runtime.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { stageRoot: STAGING_ROOT, manifest, validation };
}

function readVersion() {
    return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')).version;
}

function createPortableArchive(stageRoot) {
    fs.mkdirSync(ARTIFACT_ROOT, { recursive: true });
    const artifactPath = path.join(ARTIFACT_ROOT, `TermLink-Portable-win-x64-v${readVersion()}.zip`);
    fs.rmSync(artifactPath, { force: true });
    run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        `Compress-Archive -LiteralPath '${stageRoot.replaceAll("'", "''")}' -DestinationPath '${artifactPath.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`]);
    return artifactPath;
}

function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close((error) => error ? reject(error) : resolve(port));
        });
    });
}

async function smokePortable(artifactPath) {
    const smokeRoot = path.join(WINDOWS_WORK_ROOT, 'portable-smoke');
    const staleCli = path.join(smokeRoot, 'TermLink', 'tools', 'windows', 'termlink-config.ps1');
    if (fs.existsSync(staleCli)) {
        spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', staleCli, 'stop', '-InstallRoot', path.join(smokeRoot, 'TermLink'), '-Json'], { encoding: 'utf8' });
    }
    fs.rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    fs.mkdirSync(smokeRoot, { recursive: true });
    run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        `Expand-Archive -LiteralPath '${artifactPath.replaceAll("'", "''")}' -DestinationPath '${smokeRoot.replaceAll("'", "''")}' -Force`]);
    const packageRoot = path.join(smokeRoot, 'TermLink');
    const cli = path.join(packageRoot, 'tools', 'windows', 'termlink-config.ps1');
    const gui = path.join(packageRoot, 'tools', 'windows', 'termlink-config-gui.ps1');
    const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', cli];
    const port = await getAvailablePort();
    let started = false;
    try {
        run('powershell.exe', [...psArgs, 'port', 'set', '-Value', String(port), '-InstallRoot', packageRoot, '-Json']);
        // Do not pipe the start command: on Windows, a detached descendant can
        // keep an ancestor's captured pipe open even after PowerShell exits.
        run('powershell.exe', [...psArgs, 'start', '-InstallRoot', packageRoot, '-Json'], { stdio: 'ignore' });
        started = true;
        let health = null;
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const result = spawnSync('powershell.exe', [...psArgs, 'health', '-TimeoutSeconds', '2', '-InstallRoot', packageRoot, '-Json'], { encoding: 'utf8' });
            if (result.status === 0) { health = JSON.parse(result.stdout.trim()); break; }
        }
        if (!health?.Healthy) throw new Error('Portable health check did not become ready.');
        const guiSmoke = run('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', gui, '-SmokeTest', '-Json', '-InstallRoot', packageRoot]);
        const autostart = run('powershell.exe', [...psArgs, 'autostart', 'enable', '-WhatIf', '-InstallRoot', packageRoot, '-Json']);
        const configPath = path.join(packageRoot, 'persistent', 'config', 'termlink.json');
        if (!fs.existsSync(configPath)) throw new Error('Portable config was not created inside the extracted directory.');
        return {
            port,
            healthy: health.Healthy,
            guiSmoke: JSON.parse(guiSmoke.stdout.trim()).FormTitle,
            autostartBackend: JSON.parse(autostart.stdout.trim()).Backend,
            configLocal: true
        };
    } finally {
        if (started) run('powershell.exe', [...psArgs, 'stop', '-InstallRoot', packageRoot, '-Json'], { stdio: 'ignore' });
        fs.rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
}

async function buildPortable() {
    const staged = await stageWindowsRuntime();
    const artifactPath = createPortableArchive(staged.stageRoot);
    const smoke = await smokePortable(artifactPath);
    return { ...staged, artifactPath, smoke };
}

async function prepareInnoCompiler() {
    const installerPath = path.join(CACHE_ROOT, INNO_INSTALLER);
    if (!fs.existsSync(installerPath) || sha256(installerPath) !== INNO_SHA256) {
        fs.rmSync(installerPath, { force: true });
        await download(INNO_URL, installerPath);
    }
    const actual = sha256(installerPath);
    if (actual !== INNO_SHA256) throw new Error(`Inno Setup SHA-256 mismatch: expected ${INNO_SHA256}, got ${actual}.`);
    const signature = spawnSync('powershell.exe', ['-NoProfile', '-Command',
        `(Get-AuthenticodeSignature -LiteralPath '${installerPath.replaceAll("'", "''")}').Status.ToString()`], { encoding: 'utf8' });
    if (signature.status === 0) {
        if (signature.stdout.trim() !== 'Valid') throw new Error(`Inno Setup Authenticode signature is not valid: ${signature.stdout.trim()}`);
    } else {
        console.warn('Warning: Authenticode verification is unavailable on this build host; pinned SHA-256 verification passed.');
    }
    const installRoot = path.join(CACHE_ROOT, `inno-${INNO_VERSION}`);
    const compiler = path.join(installRoot, 'ISCC.exe');
    if (!fs.existsSync(compiler)) {
        fs.rmSync(installRoot, { recursive: true, force: true });
        run(installerPath, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CURRENTUSER', `/DIR=${installRoot}`]);
    }
    if (!fs.existsSync(compiler)) throw new Error('Inno Setup compiler was not installed into the build cache.');
    return compiler;
}

async function createSetup(stageRoot) {
    const compiler = await prepareInnoCompiler();
    fs.mkdirSync(ARTIFACT_ROOT, { recursive: true });
    const version = readVersion();
    const scriptPath = path.join(PROJECT_ROOT, 'installer', 'windows', 'TermLink.iss');
    run(compiler, [
        `/DStageRoot=${stageRoot}`,
        `/DOutputDir=${ARTIFACT_ROOT}`,
        `/DAppVersion=${version}`,
        scriptPath
    ]);
    const artifactPath = path.join(ARTIFACT_ROOT, `TermLink-Setup-win-x64-v${version}.exe`);
    if (!fs.existsSync(artifactPath)) throw new Error('Inno Setup did not create the expected Setup EXE.');
    return artifactPath;
}

async function smokeSetup(setupPath) {
    const smokeRoot = path.join(WINDOWS_WORK_ROOT, 'setup-smoke');
    const installRoot = path.join(smokeRoot, 'installed');
    const cli = path.join(installRoot, 'tools', 'windows', 'termlink-config.ps1');
    const cleanupExisting = () => {
        if (fs.existsSync(cli)) spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', cli, 'stop', '-InstallRoot', installRoot, '-Json'], { stdio: 'ignore' });
        const uninstaller = path.join(installRoot, 'unins000.exe');
        if (fs.existsSync(uninstaller)) spawnSync(uninstaller, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], { stdio: 'ignore' });
    };
    cleanupExisting();
    fs.rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    fs.mkdirSync(smokeRoot, { recursive: true });
    const port = await getAvailablePort();
    const configPath = path.join(installRoot, 'persistent', 'config', 'termlink.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify({
        schemaVersion: 1,
        serviceName: 'TermLink',
        port,
        auth: { enabled: true, user: 'admin', pass: crypto.randomBytes(24).toString('base64url') },
        tls: {
            enabled: false,
            clientCertPolicy: 'none',
            serverCert: 'persistent\\certs\\server\\server.crt',
            serverKey: 'persistent\\certs\\server\\server.key',
            caCert: 'persistent\\certs\\ca\\TermLink-CA.crt'
        }
    }, null, 2)}\n`, 'utf8');
    const installArgs = ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/NOICONS', `/DIR=${installRoot}`, '/MERGETASKS=!desktopicon,!autostart'];
    try {
        run(setupPath, installArgs, { stdio: 'ignore' });
        if (!fs.existsSync(cli) || !fs.existsSync(path.join(installRoot, 'unins000.exe'))) throw new Error('Setup did not install CLI or uninstaller.');
        const health = run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', cli, 'health', '-TimeoutSeconds', '3', '-InstallRoot', installRoot, '-Json']);
        if (!JSON.parse(health.stdout.trim()).Healthy) throw new Error('Installed TermLink health check failed.');
        const marker = path.join(installRoot, 'persistent', 'data', 'upgrade-marker.txt');
        fs.mkdirSync(path.dirname(marker), { recursive: true });
        fs.writeFileSync(marker, 'preserve-on-upgrade', 'utf8');
        run(setupPath, installArgs, { stdio: 'ignore' });
        if (fs.readFileSync(marker, 'utf8') !== 'preserve-on-upgrade') throw new Error('Setup upgrade did not preserve persistent data.');
        const uninstaller = path.join(installRoot, 'unins000.exe');
        run(uninstaller, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], { stdio: 'ignore' });
        const sourceRemoved = !fs.existsSync(path.join(installRoot, 'app', 'src'));
        const persistentPreserved = fs.existsSync(marker);
        if (!sourceRemoved || !persistentPreserved) throw new Error('Uninstall/persistent preservation contract failed.');
        return { installedHealthy: true, upgradePreserved: true, uninstallRemovedApplication: true, uninstallPreservedPersistent: true };
    } finally {
        cleanupExisting();
        fs.rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
}

async function buildSetup() {
    const staged = await stageWindowsRuntime();
    const artifactPath = await createSetup(staged.stageRoot);
    const smoke = await smokeSetup(artifactPath);
    return { ...staged, artifactPath, smoke };
}

function writeChecksums(artifactPaths) {
    const checksumPath = path.join(ARTIFACT_ROOT, 'SHA256SUMS.txt');
    const lines = artifactPaths.map((artifactPath) => `${sha256(artifactPath)}  ${path.basename(artifactPath)}`);
    fs.writeFileSync(checksumPath, `${lines.join('\n')}\n`, 'ascii');
    for (const line of lines) {
        const [expected, fileName] = line.split(/\s{2}/);
        const actual = sha256(path.join(ARTIFACT_ROOT, fileName));
        if (actual !== expected) throw new Error(`Final artifact checksum verification failed for ${fileName}.`);
    }
    return checksumPath;
}

async function buildWindowsRelease() {
    const staged = await stageWindowsRuntime();
    const portablePath = createPortableArchive(staged.stageRoot);
    const portableSmoke = await smokePortable(portablePath);
    const setupPath = await createSetup(staged.stageRoot);
    const setupSmoke = await smokeSetup(setupPath);
    const checksumPath = writeChecksums([setupPath, portablePath]);
    return { ...staged, portablePath, setupPath, checksumPath, portableSmoke, setupSmoke };
}

async function main() {
    const result = process.argv.includes('--portable')
        ? await buildPortable()
        : process.argv.includes('--setup') ? await buildSetup()
            : process.argv.includes('--all') ? await buildWindowsRelease() : await stageWindowsRuntime();
    console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = {
    NODE_VERSION, NODE_ARCHIVE, NODE_URL, NODE_SHA256,
    INNO_VERSION, INNO_INSTALLER, INNO_URL, INNO_SHA256, STAGING_ROOT,
    sha256, scanStaging, validateStaging, writePortableLaunchers, stageWindowsRuntime,
    createPortableArchive, smokePortable, buildPortable,
    prepareInnoCompiler, createSetup, smokeSetup, buildSetup,
    writeChecksums, buildWindowsRelease
};
