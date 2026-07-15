'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function parseArgs(argv) {
    const result = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index];
        const value = argv[index + 1];
        if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument: ${key || '<empty>'}`);
        result[key.slice(2)] = value;
    }
    return result;
}

function writePrivateFile(filePath, content) {
    fs.writeFileSync(filePath, content, { encoding: Buffer.isBuffer(content) ? undefined : 'utf8', mode: 0o600 });
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.output || !args['app-root']) throw new Error('--output and --app-root are required.');
    const outputRoot = path.resolve(args.output);
    const appRoot = path.resolve(args['app-root']);
    const forge = require(path.join(appRoot, 'node_modules', 'node-forge'));
    const { pki } = forge;

    const caDir = path.join(outputRoot, 'ca');
    const serverDir = path.join(outputRoot, 'server');
    const clientDir = path.join(outputRoot, 'clients');
    for (const directory of [caDir, serverDir, clientDir]) fs.mkdirSync(directory, { recursive: true });

    const makeSerial = () => `01${forge.util.bytesToHex(forge.random.getBytesSync(15))}`;
    const now = new Date(Date.now() - 5 * 60 * 1000);
    const caExpiry = new Date(now); caExpiry.setUTCFullYear(caExpiry.getUTCFullYear() + 10);
    const leafExpiry = new Date(now); leafExpiry.setUTCFullYear(leafExpiry.getUTCFullYear() + 2);

    const caKeys = pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const caCert = pki.createCertificate();
    caCert.publicKey = caKeys.publicKey;
    caCert.serialNumber = makeSerial();
    caCert.validity.notBefore = now;
    caCert.validity.notAfter = caExpiry;
    const caSubject = [{ name: 'commonName', value: 'TermLink Local CA' }, { name: 'organizationName', value: 'TermLink' }];
    caCert.setSubject(caSubject);
    caCert.setIssuer(caSubject);
    caCert.setExtensions([
        { name: 'basicConstraints', cA: true, critical: true },
        { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true, critical: true },
        { name: 'subjectKeyIdentifier' }
    ]);
    caCert.sign(caKeys.privateKey, forge.md.sha256.create());

    function makeLeaf(commonName, usage, altNames) {
        const keys = pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
        const cert = pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = makeSerial();
        cert.validity.notBefore = now;
        cert.validity.notAfter = leafExpiry;
        cert.setSubject([{ name: 'commonName', value: commonName }, { name: 'organizationName', value: 'TermLink' }]);
        cert.setIssuer(caCert.subject.attributes);
        const extensions = [
            { name: 'basicConstraints', cA: false, critical: true },
            { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
            { name: 'extKeyUsage', [usage]: true },
            { name: 'subjectKeyIdentifier' },
            { name: 'authorityKeyIdentifier', keyIdentifier: caCert.generateSubjectKeyIdentifier().getBytes() }
        ];
        if (altNames) extensions.push({ name: 'subjectAltName', altNames });
        cert.setExtensions(extensions);
        cert.sign(caKeys.privateKey, forge.md.sha256.create());
        return { keys, cert };
    }

    const server = makeLeaf('localhost', 'serverAuth', [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '::1' }
    ]);
    const client = makeLeaf('TermLink Client', 'clientAuth');
    const p12Password = crypto.randomBytes(24).toString('base64url');
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        client.keys.privateKey,
        [client.cert, caCert],
        p12Password,
        { algorithm: '3des', friendlyName: 'TermLink Client', generateLocalKeyId: true }
    );
    const p12Bytes = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary');

    const caPem = pki.certificateToPem(caCert);
    const serverPem = pki.certificateToPem(server.cert);
    const clientPem = pki.certificateToPem(client.cert);
    fs.writeFileSync(path.join(caDir, 'TermLink-CA.crt'), caPem, 'utf8');
    writePrivateFile(path.join(caDir, 'TermLink-CA.key'), pki.privateKeyToPem(caKeys.privateKey));
    // Include the issuing CA after the leaf so Node/OpenSSL can send a complete
    // server chain without exposing any additional private material.
    fs.writeFileSync(
        path.join(serverDir, 'server.crt'),
        `${serverPem}${caPem}`,
        'utf8'
    );
    writePrivateFile(path.join(serverDir, 'server.key'), pki.privateKeyToPem(server.keys.privateKey));
    fs.writeFileSync(path.join(clientDir, 'client.crt'), clientPem, 'utf8');
    writePrivateFile(path.join(clientDir, 'client.key'), pki.privateKeyToPem(client.keys.privateKey));
    writePrivateFile(path.join(clientDir, 'client.p12'), p12Bytes);
    writePrivateFile(path.join(clientDir, 'client.p12.password.txt'), `${p12Password}\r\n`);

    if (!caCert.verify(server.cert) || !caCert.verify(client.cert)) throw new Error('Generated certificate chain verification failed.');
    if (server.cert.publicKey.n.compareTo(server.keys.publicKey.n) !== 0) throw new Error('Server key pair verification failed.');
    if (client.cert.publicKey.n.compareTo(client.keys.publicKey.n) !== 0) throw new Error('Client key pair verification failed.');
    const nativeCa = new crypto.X509Certificate(caPem);
    for (const [name, pem] of [['server', serverPem], ['client', clientPem]]) {
        const nativeLeaf = new crypto.X509Certificate(pem);
        if (!nativeLeaf.checkIssued(nativeCa) || !nativeLeaf.verify(nativeCa.publicKey)) {
            throw new Error(`Native X.509 verification failed for ${name} certificate.`);
        }
    }
    const parsedP12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Bytes.toString('binary')), p12Password);
    const keyBags = parsedP12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.length) throw new Error('Generated PKCS#12 does not contain a private key.');

    process.stdout.write(JSON.stringify({
        ok: true,
        caCertificate: 'ca/TermLink-CA.crt',
        serverCertificate: 'server/server.crt',
        clientCertificate: 'clients/client.crt',
        clientPackage: 'clients/client.p12'
    }));
}

try {
    main();
} catch (error) {
    process.stderr.write(`TermLink mTLS generation failed: ${error.message}\n`);
    process.exitCode = 1;
}
