const path = require('path');

const RELEASE_PLAN_VERSION = 1;

const SUPPORTED_PLATFORMS = Object.freeze({
    win: {
        key: 'win',
        label: 'windows',
        archiveExtension: '.zip',
        buildEntry: 'npm run release:build:win',
        deployStrategy: 'pm2-scheduled-task',
        existingFiles: ['ecosystem.config.js'],
        plannedFiles: [
            { path: 'deploy-scripts/install-service.ps1', status: 'implemented-step2', step: 2, reason: 'Windows install entry' },
            { path: 'deploy-scripts/uninstall-service.ps1', status: 'implemented-step2', step: 2, reason: 'Windows uninstall entry' },
            { path: 'deploy-scripts/enable-autostart.ps1', status: 'implemented-step2', step: 2, reason: 'Windows scheduled task enable entry' },
            { path: 'deploy-scripts/disable-autostart.ps1', status: 'implemented-step2', step: 2, reason: 'Windows scheduled task disable entry' },
            { path: 'deploy-scripts/start.ps1', status: 'implemented-step2', step: 2, reason: 'Windows start helper' },
            { path: 'deploy-scripts/test-health.ps1', status: 'implemented-step2', step: 2, reason: 'Windows health check helper' },
            { path: 'deploy-scripts/common.ps1', status: 'implemented-step2', step: 2, reason: 'Windows install config and health helper functions' },
            { path: 'deploy-scripts/pm2-admin-startup.cmd', status: 'implemented-step2', step: 2, reason: 'Windows auto-start bootstrap wrapper' }
        ],
        notes: [
            'Retain ecosystem.config.js and PM2 fork mode as the Windows runtime baseline.',
            'Release archive keeps the current root-level server layout to minimize migration risk.'
        ]
    },
    linux: {
        key: 'linux',
        label: 'linux',
        archiveExtension: '.tar.gz',
        buildEntry: 'npm run release:build:linux',
        deployStrategy: 'systemd',
        existingFiles: [],
        plannedFiles: [
            { path: 'deploy-scripts/install-service.sh', status: 'implemented-step3', step: 3, reason: 'Linux systemd install entry' },
            { path: 'deploy-scripts/uninstall-service.sh', status: 'implemented-step3', step: 3, reason: 'Linux systemd uninstall entry' },
            { path: 'deploy-scripts/enable-autostart.sh', status: 'implemented-step3', step: 3, reason: 'Linux systemd enable entry' },
            { path: 'deploy-scripts/disable-autostart.sh', status: 'implemented-step3', step: 3, reason: 'Linux systemd disable entry' },
            { path: 'deploy-scripts/start.sh', status: 'implemented-step3', step: 3, reason: 'Linux start helper' },
            { path: 'deploy-scripts/test-health.sh', status: 'implemented-step3', step: 3, reason: 'Linux health check helper' },
            { path: 'deploy-scripts/common.sh', status: 'implemented-step3', step: 3, reason: 'Linux install config and systemd helper functions' },
            { path: 'deploy-scripts/termlink.service.template', status: 'implemented-step3', step: 3, reason: 'Systemd unit template' }
        ],
        notes: [
            'Linux auto-start support is intentionally limited to systemd in this task.',
            'Non-systemd environments must receive unsupported/fallback guidance rather than alternative init adapters.'
        ]
    }
});

const SHARED_EXISTING_ENTRIES = Object.freeze([
    { path: 'src/', kind: 'directory', status: 'existing', reason: 'Server source' },
    { path: 'public/', kind: 'directory', status: 'existing', reason: 'Browser/WebView assets' },
    { path: 'package.json', kind: 'file', status: 'existing', reason: 'Runtime metadata and npm entrypoints' },
    { path: 'package-lock.json', kind: 'file', status: 'existing', reason: 'Dependency lockfile for deterministic installs' },
    { path: '.env.example', kind: 'file', status: 'existing', reason: 'Base runtime config template' }
]);

const SHARED_CERT_TOOL_ENTRIES = Object.freeze([
    { path: 'scripts/certs/', kind: 'directory', status: 'implemented-step5', step: 5, reason: 'Shared certificate tooling and installer helpers' },
    { path: 'scripts/certs/direct-mtls.js', kind: 'file', status: 'implemented-step4', step: 4, reason: 'Shared direct mTLS helper module' },
    { path: 'scripts/certs/generate-direct-mtls.js', kind: 'file', status: 'implemented-step4', step: 4, reason: 'Direct server-side mTLS generator' },
    { path: 'scripts/certs/installer-health-check.js', kind: 'file', status: 'implemented-step4', step: 4, reason: 'Installer-aware health check helper' },
    { path: 'scripts/certs/nginx-mtls.js', kind: 'file', status: 'implemented-step5', step: 5, reason: 'Shared nginx-side mTLS helper module' },
    { path: 'scripts/certs/generate-nginx-mtls.js', kind: 'file', status: 'implemented-step5', step: 5, reason: 'Standalone nginx-side mTLS certificate generator' }
]);

const SHARED_PLANNED_ENTRIES = Object.freeze([
    { path: 'install.config.example.json', kind: 'file', status: 'implemented-step2', step: 2, reason: 'Shared install configuration template' },
    { path: 'deploy-scripts/', kind: 'directory', status: 'planned', step: 2, reason: 'Cross-platform install and service helpers' },
    ...SHARED_CERT_TOOL_ENTRIES,
    { path: 'certs/', kind: 'directory', status: 'implemented-step4', step: 4, reason: 'Direct mTLS output and shared cert storage' },
    { path: 'data/', kind: 'directory', status: 'planned', step: 2, reason: 'Runtime state directory' },
    { path: 'logs/', kind: 'directory', status: 'planned', step: 2, reason: 'Runtime log directory' },
    { path: 'release-manifest.json', kind: 'file', status: 'generated-step1', step: 1, reason: 'Release structure manifest' },
    { path: 'release-contents.txt', kind: 'file', status: 'generated-step1', step: 1, reason: 'Human-readable package contents summary' }
]);

function assertSupportedPlatform(platformKey) {
    if (!Object.prototype.hasOwnProperty.call(SUPPORTED_PLATFORMS, platformKey)) {
        throw new Error(`Unsupported platform "${platformKey}". Expected one of: ${Object.keys(SUPPORTED_PLATFORMS).join(', ')}`);
    }
}

function normalizeVersion(version) {
    const normalized = String(version || '').trim();
    return normalized || '0.0.0';
}

function getArtifactBaseName(version, platformKey) {
    assertSupportedPlatform(platformKey);
    return `termlink-${platformKey}-v${normalizeVersion(version)}`;
}

function getArtifactName(version, platformKey) {
    assertSupportedPlatform(platformKey);
    return `${getArtifactBaseName(version, platformKey)}${SUPPORTED_PLATFORMS[platformKey].archiveExtension}`;
}

function buildPackageEntries(platformKey) {
    assertSupportedPlatform(platformKey);
    const platform = SUPPORTED_PLATFORMS[platformKey];

    return [
        ...SHARED_EXISTING_ENTRIES,
        ...platform.existingFiles.map((entryPath) => ({
            path: entryPath,
            kind: 'file',
            status: 'existing',
            reason: 'Platform-specific runtime baseline'
        })),
        ...SHARED_PLANNED_ENTRIES,
        ...platform.plannedFiles.map((entry) => ({
            path: entry.path,
            kind: entry.path.endsWith('/') ? 'directory' : 'file',
            status: entry.status || 'planned',
            step: entry.step,
            reason: entry.reason
        }))
    ];
}

function getReleasePlan(version, platformKey) {
    assertSupportedPlatform(platformKey);
    const platform = SUPPORTED_PLATFORMS[platformKey];
    const artifactBaseName = getArtifactBaseName(version, platformKey);
    const artifactName = getArtifactName(version, platformKey);

    return {
        planVersion: RELEASE_PLAN_VERSION,
        stepId: '20260513-001-step1',
        platform: platform.label,
        platformKey,
        artifactBaseName,
        artifactName,
        archiveRoot: artifactBaseName,
        buildEntry: platform.buildEntry,
        aggregatedBuildEntry: 'npm run release:build',
        deployStrategy: platform.deployStrategy,
        outputDirectory: path.posix.join('dist', 'release-layout', artifactBaseName),
        packageEntries: buildPackageEntries(platformKey),
        notes: platform.notes
    };
}

module.exports = {
    RELEASE_PLAN_VERSION,
    SUPPORTED_PLATFORMS,
    getArtifactBaseName,
    getArtifactName,
    getReleasePlan
};
