const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createDefaults,
    mergeConfig,
    validateConfig
} = require('../scripts/install/linux/installer-config');

test('Linux installer defaults use FHS paths and the invoking sudo user', () => {
    const config = createDefaults({ SUDO_USER: 'alice', USER: 'root' });
    assert.equal(config.runUser, 'alice');
    assert.equal(config.installDir, '/opt/termlink');
    assert.equal(config.configDir, '/etc/termlink');
    assert.equal(config.dataDir, '/var/lib/termlink');
    assert.equal(config.privilege.mode, 'standard');
    assert.equal(config.auth.enabled, true);
    assert.equal(config.auth.pass, '');
});

test('non-interactive HTTP configuration requires BasicAuth', () => {
    const config = mergeConfig(createDefaults({ USER: 'alice' }), {
        auth: { enabled: false },
        tls: { mode: 'off' },
        mtls: { deployment: 'none' }
    });
    assert.throws(() => validateConfig(config), /BasicAuth is mandatory/);
});

test('direct and nginx mTLS configurations validate', () => {
    for (const [mode, deployment] of [['direct', 'direct-server'], ['nginx', 'nginx']]) {
        const config = mergeConfig(createDefaults({ USER: 'alice' }), {
            tls: { mode, clientCertPolicy: 'require', serverSource: 'generate' },
            mtls: { deployment, generateServerCertificates: true },
            auth: { enabled: false }
        });
        assert.doesNotThrow(() => validateConfig(config));
    }
});

test('imported certificate mode requires PEM source paths', () => {
    const config = mergeConfig(createDefaults({ USER: 'alice' }), {
        tls: { mode: 'direct', serverSource: 'import', importCert: '', importKey: '' }
    });
    assert.throws(() => validateConfig(config), /tls\.importCert is required/);
});
