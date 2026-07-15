const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getReleasePlan,
    getMaterializedReleaseEntries
} = require('../scripts/release/release-layout');

function entryPaths(plan) {
    return plan.packageEntries.map((entry) => entry.path);
}

test('windows release plan uses repo-aligned install paths', () => {
    const plan = getReleasePlan('1.0.0', 'win');
    const paths = entryPaths(plan);

    assert.ok(paths.includes('scripts/install/termlink-install.config.example.json'));
    assert.ok(paths.includes('scripts/install/windows/install-service.ps1'));
    assert.ok(paths.includes('scripts/install/windows/common.ps1'));
    assert.ok(paths.includes('scripts/certs/generate-direct-mtls.js'));
    assert.ok(paths.includes('ecosystem.config.js'));
    assert.equal(paths.includes('deploy-scripts/install-service.ps1'), false);
    assert.equal(paths.includes('install.config.example.json'), false);
});

test('linux release plan keeps scripts/install paths and setup-service compatibility entry', () => {
    const plan = getReleasePlan('1.0.0', 'linux');
    const paths = entryPaths(plan);

    assert.ok(paths.includes('scripts/install/linux/install-service.sh'));
    assert.ok(paths.includes('install.sh'));
    assert.ok(paths.includes('scripts/install/linux/termlink.service.template'));
    assert.ok(paths.includes('setup-service.sh'));
    assert.equal(paths.includes('deploy-scripts/install-service.sh'), false);
});

test('materialized release entries copy only the declared repo paths', () => {
    const windowsEntries = getMaterializedReleaseEntries('win');
    const linuxEntries = getMaterializedReleaseEntries('linux');

    assert.deepEqual(
        windowsEntries.filter((entry) => entry.source).map((entry) => entry.target),
        [
            'src',
            'public',
            'package.json',
            'package-lock.json',
            '.env.example',
            'scripts/install/termlink-install.config.example.json',
            'scripts/certs',
            'ecosystem.config.js',
            'scripts/install/windows'
        ]
    );

    assert.deepEqual(
        linuxEntries.filter((entry) => entry.source).map((entry) => entry.target),
        [
            'src',
            'public',
            'package.json',
            'package-lock.json',
            '.env.example',
            'scripts/install/termlink-install.config.example.json',
            'scripts/certs',
            'install.sh',
            'setup-service.sh',
            'scripts/install/linux'
        ]
    );
});
