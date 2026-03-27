const test = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveConnectionSecurity,
    createConnectionSecurityMiddleware
} = require('../src/utils/connectionSecurity');

function createMockRes() {
    const headers = new Map();
    return {
        locals: undefined,
        setHeader(name, value) {
            headers.set(name, value);
        },
        getHeader(name) {
            return headers.get(name);
        }
    };
}

test('resolveConnectionSecurity reports plain HTTP when socket is not encrypted', () => {
    const summary = resolveConnectionSecurity(
        { socket: { remoteAddress: '127.0.0.1' } },
        { clientCertPolicy: 'require' }
    );

    assert.deepEqual(summary, {
        transport: 'http',
        tls: false,
        clientCertPolicy: 'require',
        clientCertPresented: false,
        clientCertAuthorized: false,
        clientCertError: null
    });
});

test('connection security middleware attaches TLS client-cert state and headers', () => {
    const middleware = createConnectionSecurityMiddleware({ clientCertPolicy: 'request' });
    const req = {
        socket: {
            encrypted: true,
            authorized: false,
            authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
            getPeerCertificate() {
                return { subject: { CN: 'device' } };
            }
        }
    };
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.connectionSecurity, {
        transport: 'https',
        tls: true,
        clientCertPolicy: 'request',
        clientCertPresented: true,
        clientCertAuthorized: false,
        clientCertError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    });
    assert.equal(res.locals.connectionSecurity, req.connectionSecurity);
    assert.equal(res.getHeader('X-TermLink-Transport'), 'https');
    assert.equal(res.getHeader('X-TermLink-Tls'), 'true');
    assert.equal(res.getHeader('X-TermLink-Mtls-Policy'), 'request');
    assert.equal(res.getHeader('X-TermLink-Client-Cert-Presented'), 'true');
    assert.equal(res.getHeader('X-TermLink-Client-Cert-Authorized'), 'false');
    assert.equal(res.getHeader('X-TermLink-Client-Cert-Error'), 'UNABLE_TO_VERIFY_LEAF_SIGNATURE');
});

test('resolveConnectionSecurity trusts nginx TLS headers only with configured shared secret', () => {
    const summary = resolveConnectionSecurity({
        headers: {
            'x-forwarded-proto': 'https',
            'x-ssl-client-verify': 'SUCCESS',
            'x-termlink-proxy-tls-secret': 'proxy-secret'
        },
        socket: {
            encrypted: false
        }
    }, {
        clientCertPolicy: 'require',
        proxyMode: 'nginx',
        proxySecret: 'proxy-secret'
    });

    assert.deepEqual(summary, {
        transport: 'https',
        tls: true,
        clientCertPolicy: 'require',
        clientCertPresented: true,
        clientCertAuthorized: true,
        clientCertError: null
    });
});

test('resolveConnectionSecurity ignores spoofed nginx TLS headers without matching secret', () => {
    const summary = resolveConnectionSecurity({
        headers: {
            'x-forwarded-proto': 'https',
            'x-ssl-client-verify': 'SUCCESS',
            'x-termlink-proxy-tls-secret': 'wrong-secret'
        },
        socket: {
            encrypted: false
        }
    }, {
        clientCertPolicy: 'require',
        proxyMode: 'nginx',
        proxySecret: 'proxy-secret'
    });

    assert.deepEqual(summary, {
        transport: 'http',
        tls: false,
        clientCertPolicy: 'require',
        clientCertPresented: false,
        clientCertAuthorized: false,
        clientCertError: null
    });
});
