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
        authEnabled: true,
        authUser: 'admin',
        authPass: 'admin',
        auditPath,
        requireMtls: false
    });

    assert.equal(gateResult.passed, false);
    assert.equal(gateResult.failedCheck.code, 'NON_DEFAULT_CREDENTIALS_REQUIRED');
});

test('runSecurityGates requires mtls enable flag when TERMLINK_ELEVATED_REQUIRE_MTLS=true', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-mtls-${Date.now()}.log`);
    const gateResult = withEnv({
        TERMLINK_MTLS_ENABLED: 'false'
    }, () => runSecurityGates({
        authEnabled: true,
        authUser: 'operator',
        authPass: 'StrongPass123',
        auditPath,
        requireMtls: true
    }));

    assert.equal(gateResult.passed, false);
    assert.equal(gateResult.failedCheck.code, 'MTLS_REQUIRED_CHECK');
});

test('runSecurityGates passes with strong credentials and writable audit path', () => {
    const { runSecurityGates } = require('../src/config/securityGates');
    const auditPath = path.join(os.tmpdir(), `termlink-audit-pass-${Date.now()}.log`);

    const gateResult = withEnv({
        TERMLINK_MTLS_ENABLED: 'true'
    }, () => runSecurityGates({
        authEnabled: true,
        authUser: 'operator',
        authPass: 'StrongPass123',
        auditPath,
        requireMtls: true
    }));

    assert.equal(gateResult.passed, true);
    assert.ok(fs.existsSync(auditPath));
});
