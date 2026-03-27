const express = require('express');
const { version } = require('../../package.json');
const { resolveConnectionSecurity } = require('../utils/connectionSecurity');

function createHealthRouter(options = {}) {
    const router = express.Router();
    const privilegeConfig = options.privilegeConfig || { privilegeMode: 'standard' };
    const tlsConfig = options.tlsConfig || { enabled: false, mtlsEnabled: false };

    router.get('/health', (req, res) => {
        const requestSecurity = req.connectionSecurity || resolveConnectionSecurity(req, tlsConfig);
        const requestMtls = requestSecurity.tls && requestSecurity.clientCertAuthorized;
        res.json({
            status: 'ok',
            uptimeSec: Math.floor(process.uptime()),
            version,
            now: new Date().toISOString(),
            privilegeMode: privilegeConfig.privilegeMode,
            tls: requestSecurity.tls,
            mtls: requestMtls,
            listenerTls: !!tlsConfig.enabled,
            listenerMtls: !!tlsConfig.mtlsEnabled,
            clientCertPolicy: tlsConfig.clientCertPolicy || 'none',
            requestSecurity
        });
    });

    return router;
}

module.exports = createHealthRouter;
