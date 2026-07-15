const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cleanHostVerifierPath = path.join(__dirname, '..', 'scripts', 'release', 'verify-windows-clean-host.ps1');

const {
    NODE_VERSION,
    NODE_ARCHIVE,
    NODE_URL,
    NODE_SHA256,
    INNO_VERSION,
    INNO_INSTALLER,
    INNO_URL,
    INNO_SHA256,
    scanStaging,
    writePortableLaunchers
} = require('../scripts/release/windows-release');

test('Windows runtime manifest pins official Node win-x64 archive and SHA-256', () => {
    assert.equal(NODE_VERSION, '24.12.0');
    assert.equal(NODE_ARCHIVE, 'node-v24.12.0-win-x64.zip');
    assert.equal(NODE_URL, 'https://nodejs.org/dist/v24.12.0/node-v24.12.0-win-x64.zip');
    assert.match(NODE_SHA256, /^[a-f0-9]{64}$/);
    assert.equal(NODE_SHA256, '9c125f61ae947b52e779095830f9cac267846a043ef7192183c84016aaad2812');
});

test('Setup compiler manifest pins official Inno Setup release and checksum', () => {
    assert.equal(INNO_VERSION, '6.7.3');
    assert.equal(INNO_INSTALLER, 'innosetup-6.7.3.exe');
    assert.equal(INNO_URL, 'https://github.com/jrsoftware/issrc/releases/download/is-6_7_3/innosetup-6.7.3.exe');
    assert.equal(INNO_SHA256, '9c73c3bae7ed48d44112a0f48e66742c00090bdb5bef71d9d3c056c66e97b732');
});

test('Portable root launchers use bundled PowerShell tools and install-root-local paths', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-launchers-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    writePortableLaunchers(root);
    for (const name of ['TermLink-Config.cmd', 'Start-TermLink.cmd', 'Stop-TermLink.cmd', 'TermLink-CLI.cmd']) {
        const content = fs.readFileSync(path.join(root, name), 'ascii');
        assert.match(content, /%~dp0/);
        assert.doesNotMatch(content, /\bnpm\b|\bnode\b|\bpm2\b/i);
    }
    assert.match(fs.readFileSync(path.join(root, 'TermLink-Config.cmd'), 'ascii'), /-STA/);
});

test('Windows staging sensitive scan accepts empty persistent layout and rejects runtime secrets', (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-stage-scan-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'persistent', 'certs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'app'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app', 'safe.txt'), 'safe');
    assert.equal(scanStaging(root), true);

    for (const [relative, content] of [
        ['persistent/runtime/.env', 'AUTH_PASS=secret'],
        ['persistent/logs/service.log', 'log'],
        ['persistent/data/sessions.json', '{}'],
        ['persistent/certs/server.key', '-----BEGIN PRIVATE KEY-----\nsecret'] // sensitive-scan:allow
    ]) {
        const target = path.join(root, ...relative.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
        assert.throws(() => scanStaging(root), /Sensitive\/runtime files/);
        fs.rmSync(target, { force: true });
    }
});

test('clean-host verifier covers zero-system-Node, GUI/CLI, autostart, mTLS, upgrade, and uninstall gates', () => {
    const content = fs.readFileSync(cleanHostVerifierPath, 'utf8');
    assert.match(content, /RequireNoSystemNode/);
    assert.match(content, /FailAfterSetup/);
    assert.match(content, /system Node npm and PM2 are absent/);
    assert.match(content, /Invoke-GuiPortExercise/);
    assert.match(content, /Test-AutostartRoundTrip/);
    assert.match(content, /Assert-MtlsLayout/);
    assert.match(content, /Setup upgrade preserves data/);
    assert.match(content, /uninstall removes application files/);
    assert.match(content, /Setup-selected autostart task enables registration/);
    assert.match(content, /uninstall removes autostart registration/);
    assert.match(content, /logs exclude generated passwords and private keys/);
    assert.match(content, /failedSetupUninstalled/);
    assert.doesNotMatch(content, /ShowSecrets/);
});
