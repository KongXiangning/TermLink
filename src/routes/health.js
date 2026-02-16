const express = require('express');
const { version } = require('../../package.json');

function createHealthRouter() {
    const router = express.Router();

    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptimeSec: Math.floor(process.uptime()),
            version,
            now: new Date().toISOString()
        });
    });

    return router;
}

module.exports = createHealthRouter;
