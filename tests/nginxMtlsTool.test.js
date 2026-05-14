const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    generateNginxMtlsArtifacts,
    resolveNginxMtlsOptions
} = require('../scripts/certs/nginx-mtls');

function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-nginx-mtls-'));
}

function createStubRunner(calls) {
    return ({ command, args }) => {
        calls.push({ command, args });
        const outIndex = args.indexOf('-out');
        if (outIndex >= 0 && args[outIndex + 1]) {
            const target = args[outIndex + 1];
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, `stub:${path.basename(target)}\n`, 'utf8');
        }
        const serialIndex = args.indexOf('-CAserial');
        if (serialIndex >= 0 && args[serialIndex + 1]) {
            const target = args[serialIndex + 1];
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, '01\n', 'utf8');
        }
        return {
            status: 0,
            stdout: '',
            stderr: ''
        };
    };
}

test('resolveNginxMtlsOptions uses a dedicated nginx-mtls output path', () => {
    const installRoot = createTempDir();
    const result = resolveNginxMtlsOptions({ installRoot });

    assert.equal(result.enabled, true);
    assert.equal(result.clientName, 'termlink-nginx-client');
    assert.match(result.outputDir, /certs[\\/]nginx-mtls$/);
    assert.match(result.clientOutputDir, /certs[\\/]nginx-mtls[\\/]clients$/);
    assert.equal(result.outputDir, path.join(installRoot, 'certs', 'nginx-mtls'));
});

test('generateNginxMtlsArtifacts creates the expected nginx-side mTLS files', () => {
    const installRoot = createTempDir();
    const calls = [];
    const result = generateNginxMtlsArtifacts({
        installRoot,
        clientName: 'android-client',
        clientP12Password: 'fixed-password',
        runCommand: createStubRunner(calls)
    });

    assert.equal(result.generated, true);
    assert.equal(result.clientName, 'android-client');
    assert.equal(fs.readFileSync(result.clientPasswordPath, 'utf8').trim(), 'fixed-password');
    assert.ok(fs.existsSync(result.caKeyPath));
    assert.ok(fs.existsSync(result.caCertPath));
    assert.ok(fs.existsSync(result.clientKeyPath));
    assert.ok(fs.existsSync(result.clientCertPath));
    assert.ok(fs.existsSync(result.clientP12Path));
    assert.equal(fs.existsSync(path.join(result.clientOutputDir, 'android-client.csr')), false);
    assert.equal(fs.existsSync(path.join(result.clientOutputDir, 'android-client.ext')), false);
    assert.equal(fs.existsSync(path.join(result.outputDir, 'client-ca.srl')), false);
    assert.deepEqual(
        calls.map((entry) => entry.args[0]),
        ['version', 'genrsa', 'req', 'genrsa', 'req', 'x509', 'pkcs12']
    );
});

test('generateNginxMtlsArtifacts creates a password automatically when none is provided', () => {
    const installRoot = createTempDir();
    const result = generateNginxMtlsArtifacts({
        installRoot,
        runCommand: createStubRunner([])
    });

    assert.match(result.clientP12Password, /^[A-Za-z0-9_-]{10,}$/);
    assert.equal(fs.readFileSync(result.clientPasswordPath, 'utf8').trim(), result.clientP12Password);
});
