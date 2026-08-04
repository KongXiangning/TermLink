'use strict';

const express = require('express');

function createCodexMediaRouter({ mediaStore }) {
    const router = express.Router();
    const handleMedia = async (req, res) => {
        const hash = req.params.sha256;
        if (!/^[0-9a-f]{64}$/i.test(hash)) return res.sendStatus(404);
        const variant = req.params.variant || 'original';
        if (variant !== 'original' && variant !== 'thumbnail') return res.sendStatus(404);
        try {
            const metadata = variant === 'thumbnail'
                ? await mediaStore.ensureThumbnail(hash.toLowerCase()).then(() => mediaStore.open(hash.toLowerCase(), 'thumbnail'))
                : await mediaStore.open(hash.toLowerCase(), 'original');
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
    };
    // Express 5's path-to-regexp no longer accepts the legacy `:param?`
    // optional-segment syntax. Keep both URLs explicit so existing original
    // links and the new thumbnail variant remain compatible.
    router.get('/codex/media/:sha256', handleMedia);
    router.get('/codex/media/:sha256/:variant', handleMedia);
    return router;
}

module.exports = createCodexMediaRouter;
