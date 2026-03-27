const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function withEnv(overrides, fn) {
    const original = new Map();
    for (const [key, value] of Object.entries(overrides)) {
        original.set(key, process.env[key]);
        if (value === undefined || value === null) {
            delete process.env[key];
        } else {
            process.env[key] = String(value);
        }
    }

    try {
        return fn();
    } finally {
        for (const [key, value] of original.entries()) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}

const TLS_KEYS = [
    'TERMLINK_TLS_ENABLED',
    'TERMLINK_TLS_CERT',
    'TERMLINK_TLS_KEY',
    'TERMLINK_TLS_CA',
    'TERMLINK_TLS_CLIENT_CERT',
    'TERMLINK_TLS_PROXY_MODE',
    'TERMLINK_TLS_PROXY_SECRET',
    'TERMLINK_TLS_PASSPHRASE'
];

function clearTlsEnv() {
    const clear = {};
    for (const k of TLS_KEYS) clear[k] = undefined;
    return clear;
}

// ── parseTlsConfig ──────────────────────────────────────

test('parseTlsConfig defaults to disabled when no env vars set', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv(clearTlsEnv(), () => parseTlsConfig());

    assert.equal(config.enabled, false);
    assert.equal(config.certPath, null);
    assert.equal(config.keyPath, null);
    assert.equal(config.caPath, null);
    assert.equal(config.clientCertPolicy, 'none');
    assert.equal(config.clientCertPolicyError, null);
    assert.equal(config.proxyMode, 'off');
    assert.equal(config.proxyModeError, null);
    assert.equal(config.proxySecret, null);
    assert.equal(config.passphrase, null);
    assert.equal(config.mtlsEnabled, false);
});

test('parseTlsConfig reads TLS cert and key paths', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_ENABLED: 'true',
        TERMLINK_TLS_CERT: './certs/server.crt',
        TERMLINK_TLS_KEY: './certs/server.key'
    }, () => parseTlsConfig());

    assert.equal(config.enabled, true);
    assert.equal(config.certPath, path.resolve('./certs/server.crt'));
    assert.equal(config.keyPath, path.resolve('./certs/server.key'));
    assert.equal(config.mtlsEnabled, false);
});

test('parseTlsConfig detects mtlsEnabled when CA and client cert policy set', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_ENABLED: 'true',
        TERMLINK_TLS_CERT: './certs/server.crt',
        TERMLINK_TLS_KEY: './certs/server.key',
        TERMLINK_TLS_CA: './certs/client-ca.crt',
        TERMLINK_TLS_CLIENT_CERT: 'require'
    }, () => parseTlsConfig());

    assert.equal(config.mtlsEnabled, true);
    assert.equal(config.clientCertPolicy, 'require');
});

test('parseTlsConfig mtlsEnabled false when TLS disabled even with CA', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_ENABLED: 'false',
        TERMLINK_TLS_CA: './certs/client-ca.crt',
        TERMLINK_TLS_CLIENT_CERT: 'require'
    }, () => parseTlsConfig());

    assert.equal(config.mtlsEnabled, false);
});

test('parseTlsConfig preserves invalid client cert policy as validation error', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_ENABLED: 'true',
        TERMLINK_TLS_CLIENT_CERT: 'bogus'
    }, () => parseTlsConfig());

    assert.equal(config.clientCertPolicy, 'bogus');
    assert.match(config.clientCertPolicyError, /TERMLINK_TLS_CLIENT_CERT must be one of/);
    assert.equal(config.mtlsEnabled, false);
});

test('parseTlsConfig reads passphrase', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_ENABLED: 'true',
        TERMLINK_TLS_PASSPHRASE: 'secret123'
    }, () => parseTlsConfig());

    assert.equal(config.passphrase, 'secret123');
});

test('parseTlsConfig reads trusted proxy TLS settings', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_PROXY_MODE: 'nginx',
        TERMLINK_TLS_PROXY_SECRET: 'proxy-shared-secret'
    }, () => parseTlsConfig());

    assert.equal(config.proxyMode, 'nginx');
    assert.equal(config.proxyModeError, null);
    assert.equal(config.proxySecret, 'proxy-shared-secret');
});

test('parseTlsConfig preserves invalid proxy mode as validation error', () => {
    const { parseTlsConfig } = require('../src/config/tlsConfig');
    const config = withEnv({
        ...clearTlsEnv(),
        TERMLINK_TLS_PROXY_MODE: 'bogus'
    }, () => parseTlsConfig());

    assert.equal(config.proxyMode, 'bogus');
    assert.match(config.proxyModeError, /TERMLINK_TLS_PROXY_MODE must be one of/);
});

// ── validateTlsConfig ───────────────────────────────────

test('validateTlsConfig passes when TLS disabled', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const result = validateTlsConfig({ enabled: false });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test('validateTlsConfig fails when cert path missing', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const result = validateTlsConfig({
        enabled: true,
        certPath: null,
        keyPath: null,
        caPath: null,
        clientCertPolicy: 'none'
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 2);
    assert.ok(result.errors.some(e => e.includes('TERMLINK_TLS_CERT')));
    assert.ok(result.errors.some(e => e.includes('TERMLINK_TLS_KEY')));
});

test('validateTlsConfig fails when client cert policy is invalid', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const result = validateTlsConfig({
        enabled: true,
        certPath: null,
        keyPath: null,
        caPath: null,
        clientCertPolicy: 'bogus',
        clientCertPolicyError: 'TERMLINK_TLS_CLIENT_CERT must be one of: require, request, none. Received: bogus'
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('TERMLINK_TLS_CLIENT_CERT')));
});

test('validateTlsConfig fails when proxy mode is invalid', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const result = validateTlsConfig({
        enabled: false,
        proxyMode: 'bogus',
        proxyModeError: 'TERMLINK_TLS_PROXY_MODE must be one of: off, nginx. Received: bogus'
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('TERMLINK_TLS_PROXY_MODE')));
});

test('validateTlsConfig fails when trusted proxy mode is enabled without secret', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const result = validateTlsConfig({
        enabled: false,
        proxyMode: 'nginx',
        proxyModeError: null,
        proxySecret: null
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('TERMLINK_TLS_PROXY_SECRET')));
});

test('validateTlsConfig fails when CA missing but client cert required', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    // Create temp cert/key files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlstest-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    fs.writeFileSync(certFile, 'FAKE_CERT');
    fs.writeFileSync(keyFile, 'FAKE_KEY');

    try {
        const result = validateTlsConfig({
            enabled: true,
            certPath: certFile,
            keyPath: keyFile,
            caPath: null,
            clientCertPolicy: 'require'
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('TERMLINK_TLS_CA')));
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

test('validateTlsConfig passes with all files readable', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlstest-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    const caFile = path.join(tmpDir, 'client-ca.crt');
    fs.writeFileSync(certFile, 'FAKE_CERT');
    fs.writeFileSync(keyFile, 'FAKE_KEY');
    fs.writeFileSync(caFile, 'FAKE_CA');

    try {
    const result = validateTlsConfig({
        enabled: true,
        certPath: certFile,
        keyPath: keyFile,
        caPath: caFile,
        clientCertPolicy: 'require',
        proxyMode: 'off',
        proxySecret: null
    });

        assert.equal(result.valid, true);
        assert.deepEqual(result.errors, []);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

test('validateTlsConfig does not require CA when clientCertPolicy is none', () => {
    const { validateTlsConfig } = require('../src/config/tlsConfig');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlstest-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    fs.writeFileSync(certFile, 'FAKE_CERT');
    fs.writeFileSync(keyFile, 'FAKE_KEY');

    try {
        const result = validateTlsConfig({
            enabled: true,
            certPath: certFile,
            keyPath: keyFile,
            caPath: null,
            clientCertPolicy: 'none',
            proxyMode: 'off',
            proxySecret: null
        });

        assert.equal(result.valid, true);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

// ── buildHttpsOptions ───────────────────────────────────

test('buildHttpsOptions reads cert and key files', () => {
    const { buildHttpsOptions } = require('../src/config/tlsConfig');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlstest-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    fs.writeFileSync(certFile, 'CERT_CONTENT');
    fs.writeFileSync(keyFile, 'KEY_CONTENT');

    try {
        const opts = buildHttpsOptions({
            certPath: certFile,
            keyPath: keyFile,
            caPath: null,
            clientCertPolicy: 'none',
            passphrase: null
        });

        assert.equal(opts.cert.toString(), 'CERT_CONTENT');
        assert.equal(opts.key.toString(), 'KEY_CONTENT');
        assert.equal(opts.requestCert, undefined);
        assert.equal(opts.rejectUnauthorized, undefined);
        assert.equal(opts.passphrase, undefined);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

test('buildHttpsOptions sets requestCert and rejectUnauthorized for require', () => {
    const { buildHttpsOptions } = require('../src/config/tlsConfig');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlstest-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    const caFile = path.join(tmpDir, 'client-ca.crt');
    fs.writeFileSync(certFile, 'CERT');
    fs.writeFileSync(keyFile, 'KEY');
    fs.writeFileSync(caFile, 'CA');

    try {
        const opts = buildHttpsOptions({
            certPath: certFile,
            keyPath: keyFile,
            caPath: caFile,
            clientCertPolicy: 'require',
            passphrase: 'secret'
        });

        assert.equal(opts.requestCert, true);
        assert.equal(opts.rejectUnauthorized, true);
        assert.equal(opts.ca.toString(), 'CA');
        assert.equal(opts.passphrase, 'secret');
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

test('buildHttpsOptions sets rejectUnauthorized false for request policy', () => {
    const { buildHttpsOptions } = require('../src/config/tlsConfig');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlstest-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    const caFile = path.join(tmpDir, 'client-ca.crt');
    fs.writeFileSync(certFile, 'CERT');
    fs.writeFileSync(keyFile, 'KEY');
    fs.writeFileSync(caFile, 'CA');

    try {
        const opts = buildHttpsOptions({
            certPath: certFile,
            keyPath: keyFile,
            caPath: caFile,
            clientCertPolicy: 'request',
            passphrase: null
        });

        assert.equal(opts.requestCert, true);
        assert.equal(opts.rejectUnauthorized, false);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});
