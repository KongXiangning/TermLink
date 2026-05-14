#!/usr/bin/env node
const path = require('path');
const {
    loadInstallConfig,
    generateDirectMtlsArtifacts,
    resolveDirectMtlsOptions
} = require('./direct-mtls');

function parseArgs(argv) {
    const options = {
        configPath: '',
        installRoot: '',
        mode: 'generate'
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--config') {
            options.configPath = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--install-root') {
            options.installRoot = String(argv[index + 1] || '').trim();
            index += 1;
        } else if (token === '--mode') {
            options.mode = String(argv[index + 1] || '').trim().toLowerCase();
            index += 1;
        }
    }

    if (!options.configPath) {
        throw new Error('--config is required.');
    }
    if (!options.installRoot) {
        throw new Error('--install-root is required.');
    }
    if (!['generate', 'describe'].includes(options.mode)) {
        throw new Error('--mode must be one of: generate, describe.');
    }

    options.configPath = path.resolve(options.configPath);
    options.installRoot = path.resolve(options.installRoot);
    return options;
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const config = loadInstallConfig(options.configPath);
    const result = options.mode === 'describe'
        ? resolveDirectMtlsOptions({ installRoot: options.installRoot, config })
        : generateDirectMtlsArtifacts({ installRoot: options.installRoot, config });
    process.stdout.write(`${JSON.stringify(result)}\n`);
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
