'use strict';

const express = require('express');

function createCodexMediaRouter({ mediaStore }) {
    const router = express.Router();
    router.get('/codex/media/:sha256', async (req, res) => {
        const hash = req.params.sha256;
        if (!/^[0-9a-f]{64}$/i.test(hash)) return res.sendStatus(404);
        try {
            const metadata = await mediaStore.open(hash.toLowerCase());
            if (!metadata) return res.sendStatus(404);
            const etag = `"${metadata.contentHash}"`;
            res.setHeader('ETag', etag);
            res.setHeader('Content-Type', metadata.mimeType);
            res.setHeader('Content-Length', String(metadata.byteSize));
            if (req.headers['if-none-match'] === etag) return res.sendStatus(304);
            return res.sendFile(metadata.filePath);
        } catch (_) {
            return res.sendStatus(404);
        }
    });
    return router;
}

module.exports = createCodexMediaRouter;
