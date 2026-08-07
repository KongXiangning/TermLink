#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
    readVersionMetadata,
    collectVersionIssues,
    readLockfileRootVersion
} = require('./versioning');

const repoRoot = path.resolve(__dirname, '..');
const issues = [];
let metadata;

try {
    metadata = readVersionMetadata(repoRoot);
    issues.push(...collectVersionIssues(metadata));
    const lockVersion = readLockfileRootVersion(metadata);
    if (lockVersion) {
        if (lockVersion.topLevel !== metadata.version.text) {
            issues.push(`package-lock.json top-level version (${lockVersion.topLevel}) does not match package.json (${metadata.version.text}).`);
        }
        if (lockVersion.packageRoot !== metadata.version.text) {
            issues.push(`package-lock.json packages[""].version (${lockVersion.packageRoot}) does not match package.json (${metadata.version.text}).`);
        }
    }

    const gradlePath = path.join(repoRoot, 'android', 'app', 'build.gradle');
    const gradle = fs.readFileSync(gradlePath, 'utf8');
    if (!gradle.includes("rootProject.file('../package.json')")) {
        issues.push('Android Gradle must read the root package.json instead of hardcoding the product version.');
    }
    if (!gradle.includes('versionCode androidVersionCode') || !gradle.includes('versionName releaseVersion')) {
        issues.push('Android Gradle must derive versionCode/versionName from the root release metadata.');
    }

    // If this is a working tree change, prevent a product-version edit from
    // silently reusing the previous Android code. Archives without Git are
    // still checked by all other rules above.
    try {
        const headPackage = JSON.parse(execFileSync('git', ['show', 'HEAD:package.json'], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }));
        const headCode = headPackage.androidVersionCode;
        if (headPackage.version !== metadata.version.text && Number.isSafeInteger(headCode)) {
            if (!Number.isSafeInteger(metadata.androidVersionCode) || metadata.androidVersionCode <= headCode) {
                issues.push(`product version changed from ${headPackage.version} but androidVersionCode did not increase from ${headCode}. Use npm run version:bump.`);
            }
        }
    } catch {
        // Git is optional for source archives and published package copies.
    }
} catch (error) {
    issues.push(error.message);
}

if (issues.length > 0) {
    console.error('[version-check] FAILED');
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
}

console.log(`[version-check] OK: TermLink ${metadata.version.text}, Android code ${metadata.androidVersionCode}`);
