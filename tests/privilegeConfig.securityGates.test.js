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

function withTlsFiles(options, fn) {
    const includeCa = options?.includeCa !== false;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-tls-'));
    const certFile = path.join(tmpDir, 'server.crt');
    const keyFile = path.join(tmpDir, 'server.key');
    const caFile = includeCa ? path.join(tmpDir, 'client-ca.crt') : null;

    fs.writeFileSync(certFile, 'FAKE_CERT');
    fs.writeFileSync(keyFile, 'FAKE_KEY');
    if (caFile) {
        fs.writeFileSync(caFile, 'FAKE_CA');
    }

    try {
        return fn({ certFile, keyFile, caFile });
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

test('parsePrivilegeConfig uses TERMLINK_* keys and defaults to standard mode', () => {
    const { parsePrivilegeConfig } = require('../src/config/privilegeConfig');
    const config = withEnv({
        TERMLINK_PRIVILEGE_MODE: undefined,
        TERMLINK_ELEVATED_ENABLE: undefined,
        TERMLINK_ELEVATED_ALLOWED_IPS: undefined,
        TERMLINK_ELEVATED_AUDIT_PATH: undefined
    }, () => parsePrivilegeConfig());

    assert.equal(config.privilegeMode, 'standard');
    assert.equal(config.isElevated, false);
    assert.equal(config.elevatedEnabled, false);
    assert.deepEqual(config.allowedIps, []);
    assert.equal(config.auditPath, './logs/elevated-audit.log');
});

test('validateElevatedEnabled requires TERMLINK_ELEVATED_ENABLE when mode is elevated', () => {
    const { parsePrivilegeConfig, validateElevatedEnabled } = require('../src/config/privilegeConfig');
    const result = withEnv({
        TERMLINK_PRIVILEGE_MODE: 'elevated',
        TERMLINK_ELEVATED_ENABLE: 'false'
    }, () => {
        const config = parsePrivilegeConfig();
        return validateElevatedEnabled(config);
    });

    assert.equal(result.valid, false);
    assert.match(result.message, /TERMLINK_ELEVATED_ENABLE=true/);
});

test('runSecurityGates blocks elevated mode with default credentials', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-default-${Date.now()}.log`);
    const gateResult = runSecurityGates({
        hasRequiredPrivileges: true,
        authEnabled: true,
        authUser: 'admin',
        authPass: 'admin',
        auditPath,
        requireMtls: false
    });

    assert.equal(gateResult.passed, false);
    assert.equal(gateResult.failedCheck.code, 'NON_DEFAULT_CREDENTIALS_REQUIRED');
});

test('runSecurityGates blocks elevated mode when process lacks administrator privileges', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-privilege-${Date.now()}.log`);
    const gateResult = runSecurityGates({
        hasRequiredPrivileges: false,
        authEnabled: true,
        authUser: 'operator',
        authPass: 'StrongPass123',
        auditPath,
        requireMtls: false
    });

    assert.equal(gateResult.passed, false);
    assert.equal(gateResult.failedCheck.code, 'PROCESS_PRIVILEGE_REQUIRED');
});

test('runSecurityGates requires TLS enabled when TERMLINK_ELEVATED_REQUIRE_MTLS=true', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-mtls-${Date.now()}.log`);
    const gateResult = withEnv({
        TERMLINK_TLS_ENABLED: 'false',
        TERMLINK_TLS_CLIENT_CERT: undefined
    }, () => runSecurityGates({
        hasRequiredPrivileges: true,
        authEnabled: true,
        authUser: 'operator',
        authPass: 'StrongPass123',
        auditPath,
        requireMtls: true
    }));

    assert.equal(gateResult.passed, false);
    assert.equal(gateResult.failedCheck.code, 'MTLS_REQUIRED_CHECK');
});

test('runSecurityGates requires client cert policy when mTLS required', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-mtls-policy-${Date.now()}.log`);
    const gateResult = withEnv({
        TERMLINK_TLS_ENABLED: 'true',
        TERMLINK_TLS_CLIENT_CERT: 'none'
    }, () => runSecurityGates({
        hasRequiredPrivileges: true,
        authEnabled: true,
        authUser: 'operator',
        authPass: 'StrongPass123',
        auditPath,
        requireMtls: true
    }));

    assert.equal(gateResult.passed, false);
    assert.equal(gateResult.failedCheck.code, 'MTLS_REQUIRED_CHECK');
});

test('runSecurityGates rejects request policy when strict mTLS required', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-mtls-request-${Date.now()}.log`);

    withTlsFiles({}, ({ certFile, keyFile, caFile }) => {
        const gateResult = withEnv({
            TERMLINK_TLS_ENABLED: 'true',
            TERMLINK_TLS_CERT: certFile,
            TERMLINK_TLS_KEY: keyFile,
            TERMLINK_TLS_CA: caFile,
            TERMLINK_TLS_CLIENT_CERT: 'request'
        }, () => runSecurityGates({
            hasRequiredPrivileges: true,
            authEnabled: true,
            authUser: 'operator',
            authPass: 'StrongPass123',
            auditPath,
            requireMtls: true
        }));

        assert.equal(gateResult.passed, false);
        assert.equal(gateResult.failedCheck.code, 'MTLS_REQUIRED_CHECK');
        assert.match(gateResult.failedCheck.message, /TERMLINK_TLS_CLIENT_CERT=require/);
    });
});

test('runSecurityGates requires readable client CA when strict mTLS required', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-mtls-ca-${Date.now()}.log`);

    withTlsFiles({ includeCa: false }, ({ certFile, keyFile }) => {
        const gateResult = withEnv({
            TERMLINK_TLS_ENABLED: 'true',
            TERMLINK_TLS_CERT: certFile,
            TERMLINK_TLS_KEY: keyFile,
            TERMLINK_TLS_CA: undefined,
            TERMLINK_TLS_CLIENT_CERT: 'require'
        }, () => runSecurityGates({
            hasRequiredPrivileges: true,
            authEnabled: true,
            authUser: 'operator',
            authPass: 'StrongPass123',
            auditPath,
            requireMtls: true
        }));

        assert.equal(gateResult.passed, false);
        assert.equal(gateResult.failedCheck.code, 'MTLS_REQUIRED_CHECK');
        assert.match(gateResult.failedCheck.message, /TERMLINK_TLS_CA/);
    });
});

test('runSecurityGates passes with strong credentials and readable strict TLS+mTLS config', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-pass-${Date.now()}.log`);

    withTlsFiles({}, ({ certFile, keyFile, caFile }) => {
        const gateResult = withEnv({
            TERMLINK_TLS_ENABLED: 'true',
            TERMLINK_TLS_CERT: certFile,
            TERMLINK_TLS_KEY: keyFile,
            TERMLINK_TLS_CA: caFile,
            TERMLINK_TLS_CLIENT_CERT: 'require'
        }, () => runSecurityGates({
            hasRequiredPrivileges: true,
            authEnabled: true,
            authUser: 'operator',
            authPass: 'StrongPass123',
            auditPath,
            requireMtls: true
        }));

        assert.equal(gateResult.passed, true);
        assert.ok(fs.existsSync(auditPath));
    });
});
