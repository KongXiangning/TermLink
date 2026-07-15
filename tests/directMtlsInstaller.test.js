const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    generateDirectMtlsArtifacts,
    resolveDirectMtlsOptions
} = require('../scripts/certs/direct-mtls');

function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-direct-mtls-'));
}

function createConfig(overrides = {}) {
    return {
        serviceName: 'termlink',
        tls: {
            mode: 'direct',
            clientCertPolicy: 'require',
            certDir: './certs',
            serverCert: './certs/server.crt',
            serverKey: './certs/server.key',
            caCert: './certs/client-ca.crt'
        },
        mtls: {
            deployment: 'direct-server',
            generateDirectServerCertificates: true,
            opensslPath: 'openssl',
            serverOutputDir: './certs',
            clientOutputDir: './certs/clients',
            clientP12Password: 'fixed-password'
        },
        ...overrides
    };
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

test('resolveDirectMtlsOptions stays disabled when direct-server mTLS is not selected', () => {
    const installRoot = createTempDir();
    const result = resolveDirectMtlsOptions({
        installRoot,
        config: createConfig({
            tls: {
                mode: 'off',
                clientCertPolicy: 'none'
            },
            mtls: {
                deployment: 'none',
                generateDirectServerCertificates: false
            }
        })
    });

    assert.equal(result.enabled, false);
    assert.equal(result.deployment, 'none');
});

test('resolveDirectMtlsOptions rejects direct-server mTLS without direct TLS mode', () => {
    const installRoot = createTempDir();
    assert.throws(() => resolveDirectMtlsOptions({
        installRoot,
        config: createConfig({
            tls: {
                mode: 'off',
                clientCertPolicy: 'require'
            }
        })
    }), /tls\.mode="direct" or tls\.mode="nginx"/);
});

test('resolveDirectMtlsOptions supports generated server and client artifacts for nginx', () => {
    const installRoot = createTempDir();
    const result = resolveDirectMtlsOptions({
        installRoot,
        config: createConfig({
            tls: {
                mode: 'nginx',
                clientCertPolicy: 'require',
                certDir: './certs'
            },
            mtls: {
                deployment: 'nginx',
                generateServerCertificates: true,
                clientP12Password: 'fixed-password'
            }
        })
    });

    assert.equal(result.enabled, true);
    assert.equal(result.tlsMode, 'nginx');
    assert.equal(result.deployment, 'nginx');
});

test('generateDirectMtlsArtifacts creates the expected direct mTLS files', () => {
    const installRoot = createTempDir();
    const calls = [];
    const result = generateDirectMtlsArtifacts({
        installRoot,
        config: createConfig(),
        runCommand: createStubRunner(calls)
    });

    assert.equal(result.generated, true);
    assert.equal(result.enabled, true);
    assert.equal(fs.readFileSync(result.clientPasswordPath, 'utf8').trim(), 'fixed-password');
    assert.ok(fs.existsSync(result.caKeyPath));
    assert.ok(fs.existsSync(result.caCertPath));
    assert.ok(fs.existsSync(result.serverKeyPath));
    assert.ok(fs.existsSync(result.serverCertPath));
    assert.ok(fs.existsSync(result.clientKeyPath));
    assert.ok(fs.existsSync(result.clientCertPath));
    assert.ok(fs.existsSync(result.clientP12Path));
    assert.equal(fs.existsSync(path.join(result.serverOutputDir, 'server.csr')), false);
    assert.equal(fs.existsSync(path.join(result.clientOutputDir, 'client.csr')), false);
    assert.equal(fs.existsSync(path.join(result.serverOutputDir, 'server.ext')), false);
    assert.equal(fs.existsSync(path.join(result.clientOutputDir, 'client.ext')), false);
    assert.equal(fs.existsSync(path.join(result.serverOutputDir, 'local-ca.srl')), false);
    assert.deepEqual(
        calls.map((entry) => entry.args[0]),
        ['version', 'genrsa', 'req', 'genrsa', 'req', 'x509', 'genrsa', 'req', 'x509', 'pkcs12']
    );
});
