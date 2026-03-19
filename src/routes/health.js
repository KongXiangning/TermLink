const express = require('express');
const { version } = require('../../package.json');

function createHealthRouter(options = {}) {
    const router = express.Router();
    const privilegeConfig = options.privilegeConfig || { privilegeMode: 'standard' };

    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptimeSec: Math.floor(process.uptime()),
            version,
            now: new Date().toISOString(),
            privilegeMode: privilegeConfig.privilegeMode
        });
    });

    return router;
}

module.exports = createHealthRouter;
