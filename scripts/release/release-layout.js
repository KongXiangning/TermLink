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
            { path: 'deploy-scripts/install-service.ps1', step: 2, reason: 'Windows install entry' },
            { path: 'deploy-scripts/uninstall-service.ps1', step: 2, reason: 'Windows uninstall entry' },
            { path: 'deploy-scripts/start.ps1', step: 2, reason: 'Windows foreground start helper' },
            { path: 'deploy-scripts/pm2-admin-startup.cmd', step: 2, reason: 'Windows auto-start bootstrap' }
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
            { path: 'deploy-scripts/install-service.sh', step: 3, reason: 'Linux install entry' },
            { path: 'deploy-scripts/uninstall-service.sh', step: 3, reason: 'Linux uninstall entry' },
            { path: 'deploy-scripts/start.sh', step: 3, reason: 'Linux foreground start helper' },
            { path: 'deploy-scripts/termlink.service', step: 3, reason: 'Systemd unit template or rendered unit file' }
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

const SHARED_PLANNED_ENTRIES = Object.freeze([
    { path: 'deploy-scripts/', kind: 'directory', status: 'planned', step: 2, reason: 'Cross-platform install and service helpers' },
    { path: 'certs/', kind: 'directory', status: 'planned', step: 4, reason: 'Direct mTLS output and shared cert storage' },
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
            status: 'planned',
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
