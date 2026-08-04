'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const createCodexMediaRouter = require('../src/routes/codexMedia');

test('media router registers both original and thumbnail URLs on Express 5', async () => {
    const app = express();
    app.use('/api', createCodexMediaRouter({
        mediaStore: {
            async open() { return null; },
            async ensureThumbnail() { return null; }
        }
    }));
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
        const { port } = server.address();
        const hash = 'a'.repeat(64);
        const original = await fetch(`http://127.0.0.1:${port}/api/codex/media/${hash}`);
        const thumbnail = await fetch(`http://127.0.0.1:${port}/api/codex/media/${hash}/thumbnail`);
        assert.equal(original.status, 404);
        assert.equal(thumbnail.status, 404);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
