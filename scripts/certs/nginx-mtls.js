const fs = require('fs');
const path = require('path');

const {
    createPassword,
    defaultRunCommand,
    normalizeString,
    removeFile,
    resolveInstallPath,
    writeTextFile
} = require('./direct-mtls');

function normalizeClientName(value) {
    const normalized = normalizeString(value, 'termlink-nginx-client');
    if (!/^[A-Za-z0-9_.@-]+$/.test(normalized) || normalized.includes('..')) {
        throw new Error('client-name must match ^[A-Za-z0-9_.@-]+$ and must not contain "..".');
    }
    return normalized;
}

function resolveNginxMtlsOptions({
    installRoot,
    outputDir = './certs/nginx-mtls',
    clientName = 'termlink-nginx-client',
    clientP12Password = '',
    opensslPath = 'openssl'
}) {
    const resolvedInstallRoot = path.resolve(installRoot || process.cwd());
    const resolvedOutputDir = resolveInstallPath(resolvedInstallRoot, outputDir, './certs/nginx-mtls');
    const resolvedClientName = normalizeClientName(clientName);
    const clientOutputDir = path.join(resolvedOutputDir, 'clients');

    return {
        enabled: true,
        installRoot: resolvedInstallRoot,
        opensslPath: normalizeString(opensslPath, 'openssl'),
        outputDir: resolvedOutputDir,
        clientOutputDir,
        clientName: resolvedClientName,
        clientP12Password: normalizeString(clientP12Password) || createPassword(),
        caCertPath: path.join(resolvedOutputDir, 'client-ca.crt'),
        caKeyPath: path.join(resolvedOutputDir, 'client-ca.key'),
        clientKeyPath: path.join(clientOutputDir, `${resolvedClientName}.key`),
        clientCertPath: path.join(clientOutputDir, `${resolvedClientName}.crt`),
        clientP12Path: path.join(clientOutputDir, `${resolvedClientName}.p12`),
        clientPasswordPath: path.join(clientOutputDir, `${resolvedClientName}-password.txt`),
        caSubject: '/CN=TermLink Nginx Client CA',
        clientSubject: `/CN=${resolvedClientName}`
    };
}

function generateNginxMtlsArtifacts(optionsInput) {
    const options = resolveNginxMtlsOptions(optionsInput);
    const runCommand = optionsInput.runCommand || defaultRunCommand;

    [
        options.outputDir,
        options.clientOutputDir,
        path.dirname(options.caCertPath),
        path.dirname(options.caKeyPath),
        path.dirname(options.clientKeyPath),
        path.dirname(options.clientCertPath),
        path.dirname(options.clientP12Path),
        path.dirname(options.clientPasswordPath)
    ].forEach((dirPath) => fs.mkdirSync(dirPath, { recursive: true }));

    const clientCsrPath = path.join(options.clientOutputDir, `${options.clientName}.csr`);
    const clientExtPath = path.join(options.clientOutputDir, `${options.clientName}.ext`);
    const serialPath = path.join(options.outputDir, 'client-ca.srl');

    writeTextFile(clientExtPath, [
        'authorityKeyIdentifier=keyid,issuer',
        'basicConstraints=CA:FALSE',
        'keyUsage=digitalSignature,keyEncipherment',
        'extendedKeyUsage=clientAuth'
    ].join('\n'));

    runCommand({ command: options.opensslPath, args: ['version'] });
    runCommand({ command: options.opensslPath, args: ['genrsa', '-out', options.caKeyPath, '4096'] });
    runCommand({
        command: options.opensslPath,
        args: ['req', '-x509', '-new', '-nodes', '-key', options.caKeyPath, '-sha256', '-days', '3650', '-out', options.caCertPath, '-subj', options.caSubject]
    });
    runCommand({ command: options.opensslPath, args: ['genrsa', '-out', options.clientKeyPath, '2048'] });
    runCommand({
        command: options.opensslPath,
        args: ['req', '-new', '-key', options.clientKeyPath, '-out', clientCsrPath, '-subj', options.clientSubject]
    });
    runCommand({
        command: options.opensslPath,
        args: ['x509', '-req', '-in', clientCsrPath, '-CA', options.caCertPath, '-CAkey', options.caKeyPath, '-CAcreateserial', '-CAserial', serialPath, '-out', options.clientCertPath, '-days', '825', '-sha256', '-extfile', clientExtPath]
    });
    runCommand({
        command: options.opensslPath,
        args: ['pkcs12', '-export', '-out', options.clientP12Path, '-inkey', options.clientKeyPath, '-in', options.clientCertPath, '-certfile', options.caCertPath, '-passout', `pass:${options.clientP12Password}`]
    });

    writeTextFile(options.clientPasswordPath, `${options.clientP12Password}\n`, 0o600);

    try {
        fs.chmodSync(options.caKeyPath, 0o600);
        fs.chmodSync(options.clientKeyPath, 0o600);
    } catch {
        // chmod can be unsupported on some Windows filesystems.
    }

    [clientCsrPath, clientExtPath, serialPath].forEach(removeFile);

    return {
        ...options,
        generated: true
    };
}

module.exports = {
    generateNginxMtlsArtifacts,
    resolveNginxMtlsOptions
};
