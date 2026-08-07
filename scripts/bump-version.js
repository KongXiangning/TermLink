#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {
    parseSemver,
    compareSemver,
    readVersionMetadata
} = require('./versioning');

const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const requestedVersion = args.find((arg) => !arg.startsWith('--'));
const codeFlagIndex = args.indexOf('--android-code');
const requestedCode = codeFlagIndex >= 0 ? args[codeFlagIndex + 1] : null;

function fail(message) {
    console.error(`[version-bump] ${message}`);
    process.exit(1);
}

if (!requestedVersion || args.includes('--help') || args.includes('-h')) {
    fail('usage: npm run version:bump -- 1.2.3 [--android-code N]');
}

let metadata;
let nextVersion;
try {
    metadata = readVersionMetadata(repoRoot);
    nextVersion = parseSemver(requestedVersion);
} catch (error) {
    fail(error.message);
}

const versionComparison = compareSemver(nextVersion, metadata.version);
if (versionComparison < 0) {
    fail(`new version ${nextVersion.text} must be greater than current version ${metadata.version.text}.`);
}
if (versionComparison === 0 && requestedCode == null) {
    fail('the product version is unchanged; provide --android-code for a new APK build.');
}

let nextCode = requestedCode == null
    ? metadata.androidVersionCode + 1
    : Number(requestedCode);
if (!Number.isSafeInteger(nextCode) || nextCode < 1 || nextCode > 2_100_000_000) {
    fail('Android version code must be an integer from 1 to 2100000000.');
}
if (nextCode <= metadata.androidVersionCode) {
    fail(`Android version code ${nextCode} must be greater than current code ${metadata.androidVersionCode}.`);
}

const packageJson = { ...metadata.packageJson, version: nextVersion.text, androidVersionCode: nextCode };
fs.writeFileSync(metadata.packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

if (fs.existsSync(metadata.lockPath)) {
    const lock = JSON.parse(fs.readFileSync(metadata.lockPath, 'utf8'));
    lock.version = nextVersion.text;
    if (lock.packages && lock.packages['']) lock.packages[''].version = nextVersion.text;
    fs.writeFileSync(metadata.lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

console.log(`[version-bump] ${metadata.version.text} (${metadata.androidVersionCode}) -> ${nextVersion.text} (${nextCode})`);
