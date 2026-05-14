#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { loadInstallConfig, resolveDirectMtlsOptions } = require('./direct-mtls');

function parseArgs(argv) {
    const options = {
        configPath: '',
        installRoot: '',
        timeoutSec: 8
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--config') {
            options.configPath = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--install-root') {
            options.installRoot = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--timeout') {
            options.timeoutSec = Number(argv[index + 1] || 8);
            index += 1;
        }
    }

    if (!options.configPath) {
        throw new Error('--config is required.');
    }
    if (!options.installRoot) {
        throw new Error('--install-root is required.');
    }
    if (!Number.isFinite(options.timeoutSec) || options.timeoutSec <= 0) {
        throw new Error('--timeout must be a positive number.');
    }

    options.configPath = path.resolve(options.configPath);
    options.installRoot = path.resolve(options.installRoot);
    return options;
}

function buildHealthUrl(config) {
    const tlsMode = String(config.tls?.mode || 'off').trim().toLowerCase();
    const scheme = tlsMode === 'direct' ? 'https' : 'http';
    const port = Number(config.port || 3010);
    return `${scheme}://localhost:${port}/api/health`;
}

function buildHeaders(config) {
    const authEnabled = config.auth?.enabled ?? true;
    if (authEnabled === false) {
        return {};
    }
    const user = config.auth?.user || 'admin';
    const pass = config.auth?.pass || 'admin';
    return {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
    };
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const config = loadInstallConfig(options.configPath);
    const directMtls = resolveDirectMtlsOptions({
        installRoot: options.installRoot,
        config
    });
    const url = new URL(buildHealthUrl(config));
    const transport = url.protocol === 'https:' ? https : http;
    const requestOptions = {
        headers: buildHeaders(config),
        timeout: options.timeoutSec * 1000
    };

    if (url.protocol === 'https:' && directMtls.enabled) {
        requestOptions.ca = fs.readFileSync(directMtls.caCertPath);
        requestOptions.pfx = fs.readFileSync(directMtls.clientP12Path);
        requestOptions.passphrase = fs.readFileSync(directMtls.clientPasswordPath, 'utf8').trim();
    }

    const request = transport.get(url, requestOptions, (response) => {
        response.resume();
        if (response.statusCode >= 200 && response.statusCode < 300) {
            process.stdout.write(`Health OK HTTP ${response.statusCode}\n`);
            return;
        }
        console.error(`Health failed HTTP ${response.statusCode}`);
        process.exitCode = 1;
    });

    request.on('timeout', () => {
        request.destroy(new Error('health check timed out'));
    });
    request.on('error', (error) => {
        console.error(error.message);
        process.exit(1);
    });
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
