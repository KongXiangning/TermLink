const test = require('node:test');
const assert = require('node:assert/strict');
const {
    parseSemver,
    compareSemver,
    readVersionMetadata,
    collectVersionIssues,
    readLockfileRootVersion
} = require('../scripts/versioning');

test('release metadata is valid and lockfile root stays in sync', () => {
    const metadata = readVersionMetadata();
    assert.equal(collectVersionIssues(metadata).length, 0);
    const lockVersion = readLockfileRootVersion(metadata);
    assert.equal(lockVersion.topLevel, metadata.version.text);
    assert.equal(lockVersion.packageRoot, metadata.version.text);
    assert.ok(Number.isSafeInteger(metadata.androidVersionCode));
});

test('SemVer comparison handles prerelease ordering', () => {
    assert.equal(parseSemver('1.2.3').patch, 3);
    assert.equal(compareSemver('1.0.0-alpha', '1.0.0-beta'), -1);
    assert.equal(compareSemver('1.0.0', '1.0.0-rc.1'), 1);
    assert.equal(compareSemver('1.0.1', '1.0.0'), 1);
});
