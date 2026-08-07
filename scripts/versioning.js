const fs = require('node:fs');
const path = require('node:path');

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseSemver(value) {
    const text = String(value ?? '').trim();
    const match = SEMVER_PATTERN.exec(text);
    if (!match) {
        throw new Error(`invalid product version "${text}"; expected SemVer such as 1.2.3`);
    }
    return {
        text,
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] ? match[4].split('.') : []
    };
}

function compareSemver(left, right) {
    const a = typeof left === 'string' ? parseSemver(left) : left;
    const b = typeof right === 'string' ? parseSemver(right) : right;
    for (const key of ['major', 'minor', 'patch']) {
        if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
    }
    if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
    if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;
    for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
        if (index >= a.prerelease.length) return -1;
        if (index >= b.prerelease.length) return 1;
        const x = a.prerelease[index];
        const y = b.prerelease[index];
        if (x === y) continue;
        const xNumeric = /^\d+$/.test(x);
        const yNumeric = /^\d+$/.test(y);
        if (xNumeric && yNumeric) return Number(x) > Number(y) ? 1 : -1;
        if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
        return x > y ? 1 : -1;
    }
    return 0;
}

function readVersionMetadata(repoRoot = path.resolve(__dirname, '..')) {
    const packagePath = path.join(repoRoot, 'package.json');
    const lockPath = path.join(repoRoot, 'package-lock.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = parseSemver(packageJson.version);
    return {
        repoRoot,
        packagePath,
        lockPath,
        packageJson,
        version,
        androidVersionCode: packageJson.androidVersionCode
    };
}

function collectVersionIssues(metadata) {
    const issues = [];
    const { packageJson, version, androidVersionCode } = metadata;
    if (!Number.isSafeInteger(androidVersionCode) || androidVersionCode < 1 || androidVersionCode > 2_100_000_000) {
        issues.push('package.json androidVersionCode must be an integer from 1 to 2100000000.');
    }
    if (packageJson.name !== 'termlink') {
        issues.push(`package.json name must remain "termlink" (got "${packageJson.name}").`);
    }
    if (version.major > 2_000_000) {
        issues.push('product version major is too large for the Android versionCode policy.');
    }
    return issues;
}

function readLockfileRootVersion(metadata) {
    if (!fs.existsSync(metadata.lockPath)) return null;
    const lock = JSON.parse(fs.readFileSync(metadata.lockPath, 'utf8'));
    return {
        topLevel: lock.version,
        packageRoot: lock.packages && lock.packages[''] ? lock.packages[''].version : undefined
    };
}

module.exports = {
    SEMVER_PATTERN,
    parseSemver,
    compareSemver,
    readVersionMetadata,
    collectVersionIssues,
    readLockfileRootVersion
};
