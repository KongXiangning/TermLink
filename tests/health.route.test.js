const test = require('node:test');
const assert = require('node:assert/strict');

const createHealthRouter = require('../src/routes/health');

function getRouteHandler(router, pathName, method) {
    const layer = router.stack.find((entry) => (
        entry.route &&
        entry.route.path === pathName &&
        entry.route.methods &&
        entry.route.methods[method]
    ));
    return layer && layer.route && layer.route.stack[0] && layer.route.stack[0].handle;
}

function createMockRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

test('GET /health includes requestSecurity derived from the current TLS socket', () => {
    const router = createHealthRouter({
        privilegeConfig: { privilegeMode: 'standard' },
        tlsConfig: { enabled: true, mtlsEnabled: true, clientCertPolicy: 'require' }
    });
    const handler = getRouteHandler(router, '/health', 'get');
    const req = {
        socket: {
            encrypted: true,
            authorized: true,
            getPeerCertificate() {
                return { subject: { CN: 'trusted-client' } };
            }
        }
    };
    const res = createMockRes();

    handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tls, true);
    assert.equal(res.body.mtls, true);
    assert.equal(res.body.listenerTls, true);
    assert.equal(res.body.listenerMtls, true);
    assert.equal(res.body.clientCertPolicy, 'require');
    assert.deepEqual(res.body.requestSecurity, {
        transport: 'https',
        tls: true,
        clientCertPolicy: 'require',
        clientCertPresented: true,
        clientCertAuthorized: true,
        clientCertError: null
    });
});

test('GET /health resolves requestSecurity from trusted nginx TLS headers', () => {
    const router = createHealthRouter({
        privilegeConfig: { privilegeMode: 'standard' },
        tlsConfig: {
            enabled: false,
            mtlsEnabled: false,
            clientCertPolicy: 'request',
            proxyMode: 'nginx',
            proxySecret: 'proxy-secret'
        }
    });
    const handler = getRouteHandler(router, '/health', 'get');
    const req = {
        headers: {
            'x-forwarded-proto': 'https',
            'x-ssl-client-verify': 'FAILED:certificate has expired',
            'x-termlink-proxy-tls-secret': 'proxy-secret'
        },
        socket: {
            encrypted: false
        }
    };
    const res = createMockRes();

    handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tls, true);
    assert.equal(res.body.mtls, false);
    assert.equal(res.body.listenerTls, false);
    assert.equal(res.body.listenerMtls, false);
    assert.deepEqual(res.body.requestSecurity, {
        transport: 'https',
        tls: true,
        clientCertPolicy: 'request',
        clientCertPresented: true,
        clientCertAuthorized: false,
        clientCertError: 'FAILED:certificate has expired'
    });
});
