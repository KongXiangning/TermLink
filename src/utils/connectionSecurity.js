function readHeader(headers, name) {
    if (!headers || typeof headers !== 'object') {
        return null;
    }
    const raw = headers[name];
    if (Array.isArray(raw)) {
        return raw.length > 0 ? String(raw[0]) : null;
    }
    if (raw === undefined || raw === null) {
        return null;
    }
    return String(raw);
}

function parseForwardedProto(headers) {
    const raw = readHeader(headers, 'x-forwarded-proto');
    if (!raw) {
        return null;
    }
    const first = raw.split(',')[0].trim().toLowerCase();
    if (first === 'https') {
        return 'https';
    }
    if (first === 'http') {
        return 'http';
    }
    return null;
}

function parseNginxClientVerify(headers) {
    const raw = readHeader(headers, 'x-ssl-client-verify');
    if (!raw || raw.trim() === '') {
        return {
            clientCertPresented: false,
            clientCertAuthorized: false,
            clientCertError: null
        };
    }

    const verify = raw.trim();
    if (verify.toUpperCase() === 'SUCCESS') {
        return {
            clientCertPresented: true,
            clientCertAuthorized: true,
            clientCertError: null
        };
    }
    if (verify.toUpperCase() === 'NONE') {
        return {
            clientCertPresented: false,
            clientCertAuthorized: false,
            clientCertError: null
        };
    }
    return {
        clientCertPresented: true,
        clientCertAuthorized: false,
        clientCertError: verify
    };
}

function resolveTrustedProxyConnectionSecurity(source, tlsConfig = {}) {
    if (!source || typeof source !== 'object' || !source.headers || tlsConfig.proxyMode !== 'nginx') {
        return null;
    }
    const providedSecret = readHeader(source.headers, 'x-termlink-proxy-tls-secret');
    if (!tlsConfig.proxySecret || providedSecret !== tlsConfig.proxySecret) {
        return null;
    }

    const forwardedProto = parseForwardedProto(source.headers);
    if (!forwardedProto) {
        return null;
    }

    const mtls = parseNginxClientVerify(source.headers);
    return {
        transport: forwardedProto,
        tls: forwardedProto === 'https',
        clientCertPolicy: typeof tlsConfig.clientCertPolicy === 'string' && tlsConfig.clientCertPolicy.trim()
            ? tlsConfig.clientCertPolicy.trim()
            : 'none',
        clientCertPresented: mtls.clientCertPresented,
        clientCertAuthorized: mtls.clientCertAuthorized,
        clientCertError: mtls.clientCertError
    };
}

function resolveSocket(source) {
    if (!source || typeof source !== 'object') {
        return null;
    }
    if (source.socket && typeof source.socket === 'object') {
        return source.socket;
    }
    return source;
}

function readPeerCertificate(socket) {
    if (!socket || typeof socket.getPeerCertificate !== 'function') {
        return null;
    }
    const certificate = socket.getPeerCertificate();
    if (!certificate || typeof certificate !== 'object' || Object.keys(certificate).length === 0) {
        return null;
    }
    return certificate;
}

function resolveConnectionSecurity(source, tlsConfig = {}) {
    const trustedProxySecurity = resolveTrustedProxyConnectionSecurity(source, tlsConfig);
    if (trustedProxySecurity) {
        return trustedProxySecurity;
    }

    const socket = resolveSocket(source);
    const tls = !!(socket && socket.encrypted === true);
    const clientCertPolicy = typeof tlsConfig.clientCertPolicy === 'string' && tlsConfig.clientCertPolicy.trim()
        ? tlsConfig.clientCertPolicy.trim()
        : 'none';
    const peerCertificate = readPeerCertificate(socket);

    return {
        transport: tls ? 'https' : 'http',
        tls,
        clientCertPolicy,
        clientCertPresented: !!peerCertificate,
        clientCertAuthorized: !!(tls && socket && socket.authorized === true),
        clientCertError: tls && typeof socket.authorizationError === 'string' && socket.authorizationError.trim()
            ? socket.authorizationError
            : null
    };
}

function applyConnectionSecurityHeaders(res, connectionSecurity) {
    if (!res || typeof res.setHeader !== 'function') {
        return;
    }
    res.setHeader('X-TermLink-Transport', connectionSecurity.transport);
    res.setHeader('X-TermLink-Tls', String(connectionSecurity.tls));
    res.setHeader('X-TermLink-Mtls-Policy', connectionSecurity.clientCertPolicy);
    res.setHeader('X-TermLink-Client-Cert-Presented', String(connectionSecurity.clientCertPresented));
    res.setHeader('X-TermLink-Client-Cert-Authorized', String(connectionSecurity.clientCertAuthorized));
    if (connectionSecurity.clientCertError) {
        res.setHeader('X-TermLink-Client-Cert-Error', connectionSecurity.clientCertError);
    }
}

function createConnectionSecurityMiddleware(tlsConfig = {}) {
    return (req, res, next) => {
        const connectionSecurity = resolveConnectionSecurity(req, tlsConfig);
        req.connectionSecurity = connectionSecurity;
        if (res && typeof res === 'object') {
            res.locals = res.locals || {};
            res.locals.connectionSecurity = connectionSecurity;
        }
        applyConnectionSecurityHeaders(res, connectionSecurity);
        next();
    };
}

module.exports = {
    resolveConnectionSecurity,
    applyConnectionSecurityHeaders,
    createConnectionSecurityMiddleware
};
