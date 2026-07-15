const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { X509Certificate, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'tools', 'windows', 'termlink-config.ps1');
const modulePath = path.join(repoRoot, 'tools', 'windows', 'TermLink.Windows.psm1');
const guiPath = path.join(repoRoot, 'tools', 'windows', 'termlink-config-gui.ps1');
const cleanHostVerifierPath = path.join(repoRoot, 'scripts', 'release', 'verify-windows-clean-host.ps1');
const mtlsGeneratorPath = path.join(repoRoot, 'tools', 'windows', 'generate-mtls.js');
const powershell = process.env.SystemRoot
    ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe';

function runPowerShell(args, options = {}) {
    return spawnSync(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', ...args], {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: options.timeout ?? 20_000
    });
}

function runCli(root, ...args) {
    return runPowerShell(['-File', cliPath, ...args, '-InstallRoot', root]);
}

function parseJson(result) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout.trim());
}

function makeRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-win-config-'));
}

test('Windows PowerShell 5.1 parses and imports the shared module and CLI', () => {
    for (const file of [modulePath, cliPath, guiPath, cleanHostVerifierPath]) {
        const escaped = file.replaceAll("'", "''");
        const result = runPowerShell(['-Command', `$errors = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${escaped}', [ref]$null, [ref]$errors); if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }`]);
        assert.equal(result.status, 0, result.stderr);
    }
    const escapedModule = modulePath.replaceAll("'", "''");
    const imported = runPowerShell(['-Command', `Import-Module '${escapedModule}' -Force; (Get-Command -Module TermLink.Windows).Count`]);
    assert.equal(imported.status, 0, imported.stderr);
    assert.ok(Number(imported.stdout.trim()) >= 15);
});

test('WinForms GUI launches in smoke mode, binds shared-core operations, and applies a port', (t) => {
    const root = makeRoot();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const exercisedPort = 41_000 + Math.floor(Math.random() * 1000);
    const result = runPowerShell(['-STA', '-File', guiPath, '-SmokeTest', '-ExercisePort', String(exercisedPort), '-Json', '-InstallRoot', root]);
    const smoke = parseJson(result);
    assert.equal(smoke.FormTitle, 'TermLink Configuration');
    assert.equal(smoke.InstallRoot, root);
    for (const control of ['ServiceStatusLabel', 'PortTextBox', 'ApplyPortButton', 'StartButton', 'StopButton', 'RestartButton', 'HealthButton', 'EnableAutostartButton', 'DisableAutostartButton', 'OpenPageButton', 'OpenLogsButton', 'EnableMtlsButton']) {
        assert.ok(smoke.ControlNames.includes(control), `missing GUI control ${control}`);
    }
    assert.deepEqual(smoke.BoundOperations, ['status', 'port', 'start', 'stop', 'restart', 'autostart-enable', 'autostart-disable', 'mtls-enable', 'health', 'open-page', 'open-logs']);
    assert.equal(smoke.MtlsEnabled, true);
    assert.match(smoke.StatusText, /^Status: stopped/);
    assert.equal(smoke.ExercisedPort, exercisedPort);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'persistent', 'config', 'termlink.json'), 'utf8')).port, exercisedPort);
    assert.equal(fs.existsSync(path.join(root, 'persistent', 'config', 'termlink.json')), true);
});

test('mTLS generator creates and validates private artifacts without leaking secrets', (t) => {
    const output = makeRoot();
    t.after(() => fs.rmSync(output, { recursive: true, force: true }));
    const generated = spawnSync(process.execPath, [mtlsGeneratorPath, '--output', output, '--app-root', repoRoot], {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 30_000
    });
    assert.equal(generated.status, 0, generated.stderr);
    const summary = JSON.parse(generated.stdout);
    assert.equal(summary.ok, true);
    assert.doesNotMatch(generated.stdout, /PRIVATE KEY|password/i);

    const expected = [
        'ca/TermLink-CA.crt', 'ca/TermLink-CA.key',
        'server/server.crt', 'server/server.key',
        'clients/client.crt', 'clients/client.key',
        'clients/client.p12', 'clients/client.p12.password.txt'
    ];
    for (const relative of expected) assert.equal(fs.existsSync(path.join(output, ...relative.split('/'))), true, relative);
    assert.equal(fs.existsSync(path.join(output, 'TermLink-CA.crt')), false);

    const forge = require('node-forge');
    const ca = forge.pki.certificateFromPem(fs.readFileSync(path.join(output, 'ca', 'TermLink-CA.crt'), 'utf8'));
    const server = forge.pki.certificateFromPem(fs.readFileSync(path.join(output, 'server', 'server.crt'), 'utf8'));
    const client = forge.pki.certificateFromPem(fs.readFileSync(path.join(output, 'clients', 'client.crt'), 'utf8'));
    assert.equal(ca.getExtension('basicConstraints').cA, true);
    assert.equal(server.getExtension('extKeyUsage').serverAuth, true);
    assert.equal(client.getExtension('extKeyUsage').clientAuth, true);
    assert.ok(server.getExtension('subjectAltName').altNames.some((entry) => entry.type === 2 && entry.value === 'localhost'));
    assert.equal(ca.verify(server), true);
    assert.equal(ca.verify(client), true);
    const nativeCa = new X509Certificate(fs.readFileSync(path.join(output, 'ca', 'TermLink-CA.crt')));
    const nativeServer = new X509Certificate(fs.readFileSync(path.join(output, 'server', 'server.crt')));
    assert.equal(nativeServer.checkIssued(nativeCa), true);
    assert.equal(nativeServer.verify(nativeCa.publicKey), true);

    const password = fs.readFileSync(path.join(output, 'clients', 'client.p12.password.txt'), 'utf8').trim();
    const p12Der = fs.readFileSync(path.join(output, 'clients', 'client.p12')).toString('binary');
    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), password);
    assert.ok(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag].length > 0);
});

test('config initialization is local, atomic, and redacts the generated password', (t) => {
    const root = makeRoot();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const shown = parseJson(runCli(root, 'config', '-Json'));
    assert.equal(shown.port, 3010);
    assert.equal(shown.auth.pass, '<redacted>');
    assert.equal(shown.tls.enabled, false);

    const configPath = path.join(root, 'persistent', 'config', 'termlink.json');
    const envPath = path.join(root, 'persistent', 'runtime', '.env');
    const stored = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const runtimeEnv = fs.readFileSync(envPath, 'utf8');
    assert.notEqual(stored.auth.pass, 'admin');
    assert.ok(stored.auth.pass.length >= 24);
    assert.match(runtimeEnv, /^PORT=3010\r?$/m);
    assert.match(runtimeEnv, /^SESSION_PERSIST_PATH=.*persistent\\data\\sessions\.json\r?$/m);
    assert.equal(fs.readdirSync(path.dirname(configPath)).some((name) => name.endsWith('.tmp')), false);
    assert.equal((runCli(root, 'config', '-Json').stdout).includes(stored.auth.pass), false);
});

test('port set validates before replacing config', (t) => {
    const root = makeRoot();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const changed = parseJson(runCli(root, 'port', 'set', '-Value', '41234', '-Json'));
    assert.equal(changed.Port, 41234);
    assert.equal(changed.RestartRequired, false);
    assert.equal(parseJson(runCli(root, 'port', 'get', '-Json')), 41234);
    const configPath = path.join(root, 'persistent', 'config', 'termlink.json');
    const before = fs.readFileSync(configPath, 'utf8');
    for (const invalid of ['0', '65536', 'abc']) {
        const result = runCli(root, 'port', 'set', '-Value', invalid, '-Json');
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /1 to 65535/);
        assert.equal(fs.readFileSync(configPath, 'utf8'), before);
    }
});

test('status, autostart dry-run, and open dry-run do not mutate the host', (t) => {
    const root = makeRoot();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    const status = parseJson(runCli(root, 'status', '-Json'));
    assert.equal(status.Status, 'stopped');
    assert.equal(status.Port, 3010);
    assert.equal(status.Autostart, false);

    const autostart = parseJson(runCli(root, 'autostart', 'enable', '-WhatIf', '-Json'));
    assert.equal(autostart.Enabled, true);
    assert.match(autostart.Action, /termlink-config\.ps1.*start.*-InstallRoot/i);
    assert.equal(parseJson(runCli(root, 'autostart', 'status', '-Json')).Enabled, false);
    assert.equal(parseJson(runCli(root, 'open', 'page', '-WhatIf', '-Json')), 'http://localhost:3010');
    assert.equal(parseJson(runCli(root, 'open', 'logs', '-WhatIf', '-Json')), path.join(root, 'persistent', 'logs'));
});

test('embedded Node service can start, pass health, enable mTLS, restart, and stop', { timeout: 120_000 }, (t) => {
    const root = makeRoot();
    let stopped = false;
    t.after(() => {
        if (!stopped) runCli(root, 'stop');
        fs.rmSync(root, { recursive: true, force: true });
    });

    fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
    fs.copyFileSync(process.execPath, path.join(root, 'runtime', 'node.exe'));
    fs.mkdirSync(path.join(root, 'app', 'src'), { recursive: true });
    fs.mkdirSync(path.join(root, 'app', 'node_modules'), { recursive: true });
    fs.cpSync(path.join(repoRoot, 'node_modules', 'node-forge'), path.join(root, 'app', 'node_modules', 'node-forge'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app', 'src', 'server.js'), `
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const expected = 'Basic ' + Buffer.from(process.env.AUTH_USER + ':' + process.env.AUTH_PASS).toString('base64');
const handler = (req, res) => {
  if (req.headers.authorization !== expected) { res.writeHead(401); return res.end(); }
  if (req.url === '/api/health') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ status: 'ok' })); }
  res.writeHead(404); res.end();
};
const server = process.env.TERMLINK_TLS_ENABLED === 'true'
  ? https.createServer({
      key: fs.readFileSync(process.env.TERMLINK_TLS_KEY),
      cert: fs.readFileSync(process.env.TERMLINK_TLS_CERT),
      ca: fs.readFileSync(process.env.TERMLINK_TLS_CA),
      requestCert: true,
      rejectUnauthorized: true
    }, handler)
  : http.createServer(handler);
server.listen(Number(process.env.PORT), '127.0.0.1');
`, 'utf8');

    const port = 42_000 + Math.floor(Math.random() * 1000);
    assert.equal(runCli(root, 'port', 'set', '-Value', String(port)).status, 0);
    const started = parseJson(runCli(root, 'start', '-Json'));
    assert.equal(started.Status, 'running');
    assert.ok(started.Pid > 0);

    let health;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        health = runCli(root, 'health', '-TimeoutSeconds', '2', '-Json');
        if (health.status === 0) break;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    const healthResult = parseJson(health);
    assert.equal(healthResult.Healthy, true);
    assert.equal(healthResult.Body.status, 'ok');

    const nextPort = port + 1;
    const portChange = parseJson(runCli(root, 'port', 'set', '-Value', String(nextPort), '-Json'));
    assert.equal(portChange.Port, nextPort);
    assert.equal(portChange.ActivePort, port);
    assert.equal(portChange.RestartRequired, true);
    const pendingRestart = parseJson(runCli(root, 'status', '-Json'));
    assert.equal(pendingRestart.Port, port);
    assert.equal(pendingRestart.ConfiguredPort, nextPort);
    assert.equal(pendingRestart.RestartRequired, true);
    assert.equal(parseJson(runCli(root, 'health', '-TimeoutSeconds', '2', '-Json')).Healthy, true);

    const restarted = parseJson(runCli(root, 'restart', '-Json'));
    assert.equal(restarted.Status, 'running');
    assert.notEqual(restarted.Pid, started.Pid);
    assert.equal(restarted.Port, nextPort);
    assert.equal(restarted.RestartRequired, false);

    const enabledMtls = parseJson(runPowerShell([
        '-File', cliPath, 'mtls', 'enable', '-InstallRoot', root,
        '-TimeoutSeconds', '20', '-Json'
    ], { timeout: 60_000 }));
    assert.equal(enabledMtls.Enabled, true);
    assert.equal(enabledMtls.Healthy, true);
    assert.equal(enabledMtls.Url, `https://127.0.0.1:${nextPort}/api/health`);
    assert.equal(fs.existsSync(path.join(root, 'TermLink-CA.crt')), true);
    assert.equal(fs.existsSync(path.join(root, 'persistent', 'certs', 'clients', 'client.p12')), true);
    assert.equal(fs.existsSync(path.join(root, 'TermLink-CA.key')), false);
    assert.equal(fs.existsSync(path.join(root, 'server.key')), false);
    assert.equal(
        fs.readFileSync(path.join(root, 'TermLink-CA.crt'), 'utf8'),
        fs.readFileSync(path.join(root, 'persistent', 'certs', 'ca', 'TermLink-CA.crt'), 'utf8')
    );
    const p12Password = fs.readFileSync(path.join(root, 'persistent', 'certs', 'clients', 'client.p12.password.txt'), 'utf8').trim();
    assert.equal(JSON.stringify(enabledMtls).includes(p12Password), false);
    const mtlsConfig = JSON.parse(fs.readFileSync(path.join(root, 'persistent', 'config', 'termlink.json'), 'utf8'));
    assert.equal(mtlsConfig.tls.enabled, true);
    assert.equal(mtlsConfig.tls.clientCertPolicy, 'require');
    const mtlsHealth = parseJson(runCli(root, 'health', '-TimeoutSeconds', '3', '-Json'));
    assert.equal(mtlsHealth.Healthy, true);
    assert.equal(mtlsHealth.Body.status, 'ok');

    const caPath = path.join(root, 'persistent', 'certs', 'ca', 'TermLink-CA.crt');
    const configPath = path.join(root, 'persistent', 'config', 'termlink.json');
    const beforeFailedRotation = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const caHash = createHash('sha256').update(fs.readFileSync(caPath)).digest('hex');
    fs.rmSync(path.join(root, 'app', 'node_modules', 'node-forge'), { recursive: true, force: true });
    const failedRotation = runPowerShell([
        '-File', cliPath, 'mtls', 'enable', '-InstallRoot', root,
        '-TimeoutSeconds', '10', '-Json'
    ], { timeout: 30_000 });
    assert.notEqual(failedRotation.status, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf8')), beforeFailedRotation);
    assert.equal(createHash('sha256').update(fs.readFileSync(caPath)).digest('hex'), caHash);
    assert.equal((failedRotation.stdout + failedRotation.stderr).includes(p12Password), false);
    assert.equal(parseJson(runCli(root, 'health', '-TimeoutSeconds', '3', '-Json')).Healthy, true);

    const stoppedResult = parseJson(runCli(root, 'stop', '-Json'));
    stopped = true;
    assert.equal(stoppedResult.Status, 'stopped');
    assert.equal(fs.existsSync(path.join(root, 'persistent', 'run', 'termlink.pid.json')), false);
    assert.equal(fs.existsSync(path.join(root, 'persistent', 'logs', 'service.out.log')), true);
    assert.equal(fs.existsSync(path.join(root, 'persistent', 'logs', 'service.error.log')), true);
});
