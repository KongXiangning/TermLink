#!/usr/bin/env node
const path = require('path');
const {
    generateNginxMtlsArtifacts,
    resolveNginxMtlsOptions
} = require('./nginx-mtls');

function parseArgs(argv) {
    const options = {
        installRoot: process.cwd(),
        outputDir: './certs/nginx-mtls',
        clientName: 'termlink-nginx-client',
        clientP12Password: '',
        opensslPath: 'openssl',
        mode: 'generate'
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--install-root') {
            options.installRoot = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--output-dir') {
            options.outputDir = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--client-name') {
            options.clientName = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--client-p12-password') {
            options.clientP12Password = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--openssl-path') {
            options.opensslPath = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--mode') {
            options.mode = String(argv[index + 1] || '').trim().toLowerCase();
            index += 1;
        }
    }

    if (!options.installRoot) {
        throw new Error('--install-root is required.');
    }
    if (!options.outputDir) {
        throw new Error('--output-dir is required.');
    }
    if (!['generate', 'describe'].includes(options.mode)) {
        throw new Error('--mode must be one of: generate, describe.');
    }

    options.installRoot = path.resolve(options.installRoot);
    return options;
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const result = options.mode === 'describe'
        ? resolveNginxMtlsOptions(options)
        : generateNginxMtlsArtifacts(options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
