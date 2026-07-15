'use strict';

const fs = require('node:fs');
const https = require('node:https');

function parseArgs(argv) {
    const result = {};
    for (let index = 0; index < argv.length; index += 2) result[argv[index].replace(/^--/, '')] = argv[index + 1];
    return result;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    for (const required of ['url', 'timeout-ms']) {
        if (!args[required]) throw new Error(`--${required} is required.`);
    }
    const auth = Buffer.from(`${process.env.AUTH_USER || ''}:${process.env.AUTH_PASS || ''}`, 'utf8').toString('base64');
    const options = {
        rejectUnauthorized: true,
        headers: process.env.AUTH_ENABLED === 'false' ? {} : { Authorization: `Basic ${auth}` },
        timeout: Number(args['timeout-ms'])
    };
    if (args.ca) options.ca = fs.readFileSync(args.ca);
    if (args.p12 || args['password-file']) {
        if (!args.p12 || !args['password-file']) throw new Error('--p12 and --password-file must be provided together.');
        options.pfx = fs.readFileSync(args.p12);
        options.passphrase = fs.readFileSync(args['password-file'], 'utf8').trim();
    }
    const request = https.get(args.url, options, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
            let parsed = null;
            try { parsed = JSON.parse(body); } catch {}
            const healthy = response.statusCode === 200 && parsed?.status === 'ok';
            process.stdout.write(JSON.stringify({ healthy, statusCode: response.statusCode, body: parsed }));
            process.exitCode = healthy ? 0 : 2;
        });
    });
    request.on('timeout', () => request.destroy(new Error('Health check timed out.')));
    request.on('error', (error) => {
        process.stderr.write(`TermLink mTLS health check failed: ${error.message}\n`);
        process.exitCode = 1;
    });
}

try { main(); } catch (error) {
    process.stderr.write(`TermLink mTLS health check failed: ${error.message}\n`);
    process.exitCode = 1;
}
