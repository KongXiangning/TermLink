#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const releaseMode = args.has('--release');
const configPath = path.resolve(process.cwd(), 'capacitor.config.json');

function fail(message) {
    console.error(`[release-check] ${message}`);
}

if (!fs.existsSync(configPath)) {
    fail(`Missing capacitor config: ${configPath}`);
    process.exit(1);
}

let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    fail(`Invalid JSON in capacitor.config.json: ${e.message}`);
    process.exit(1);
}

if (!releaseMode) {
    console.log('[release-check] Skipped strict checks (run with --release for enforcement).');
    process.exit(0);
}

const server = config.server || {};
const issues = [];

if (server.cleartext === true) {
    issues.push('server.cleartext must be false for release builds.');
}

if (String(server.androidScheme || '').toLowerCase() === 'http') {
    issues.push('server.androidScheme must be "https" for release builds.');
}

if (typeof server.url === 'string' && server.url.trim().length > 0) {
    if (!server.url.toLowerCase().startsWith('https://')) {
        issues.push('server.url must start with https:// in release builds.');
    }
}

if (issues.length > 0) {
    issues.forEach((issue) => fail(issue));
    process.exit(1);
}

console.log('[release-check] OK: android release config passed security checks.');
