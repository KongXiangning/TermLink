'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MIME_EXTENSIONS = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp',
    'image/bmp': '.bmp', 'image/tiff': '.tiff', 'image/heic': '.heic', 'image/heif': '.heif',
    'image/svg+xml': '.svg'
};
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

class CodexMediaStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-media'), trustedTempRoots = [], maxBytes = DEFAULT_MAX_BYTES } = {}) {
        this.rootDir = path.resolve(rootDir);
        this.trustedTempRoots = trustedTempRoots.map((root) => path.resolve(root));
        this.maxBytes = maxBytes;
        this._metadata = new Map();
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    async put(input) {
        const { bytes, mimeType } = await this._readInput(input);
        if (!bytes || bytes.length === 0) throw new Error('media_empty');
        if (bytes.length > this.maxBytes) throw new Error('media_too_large');
        const normalizedMime = normalizeMime(mimeType, bytes);
        if (!MIME_EXTENSIONS[normalizedMime]) throw new Error('media_mime_not_allowed');
        validateImageMagic(bytes, normalizedMime);
        const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
        const extension = MIME_EXTENSIONS[normalizedMime];
        const finalPath = path.join(this.rootDir, `${contentHash}${extension}`);
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        if (!await exists(finalPath)) {
            const temporary = path.join(this.rootDir, `.${contentHash}.${process.pid}.${Date.now()}.tmp`);
            const handle = await fs.promises.open(temporary, 'wx');
            try {
                await handle.writeFile(bytes);
                await handle.sync();
            } finally {
                await handle.close();
            }
            try { await fs.promises.rename(temporary, finalPath); } catch (error) {
                if (error.code !== 'EEXIST' && !await exists(finalPath)) throw error;
                await safeUnlink(temporary);
            }
        }
        const metadata = { contentHash, mimeType: normalizedMime, byteSize: bytes.length, filePath: finalPath, mediaPath: `/api/codex/media/${contentHash}` };
        this._metadata.set(contentHash, metadata);
        return metadata;
    }

    get(contentHash) {
        const normalized = normalizeHash(contentHash);
        if (!normalized) return null;
        const metadata = this._metadata.get(normalized);
        return metadata || null;
    }

    async open(contentHash) {
        const metadata = this.get(contentHash);
        if (!metadata || !await exists(metadata.filePath)) return null;
        return metadata;
    }

    async _readInput(input) {
        if (Buffer.isBuffer(input)) return { bytes: input, mimeType: undefined };
        if (input?.bytes) return { bytes: Buffer.from(input.bytes), mimeType: input.mimeType };
        if (typeof input?.dataUrl === 'string') {
            const parsed = parseDataUrl(input.dataUrl);
            if (!parsed) throw new Error('media_data_url_invalid');
            return parsed;
        }
        if (typeof input?.path === 'string') {
            const trusted = await resolveTrustedPath(input.path, [...this.trustedTempRoots, this.rootDir]);
            if (!trusted) throw new Error('media_path_not_allowed');
            return { bytes: await fs.promises.readFile(trusted.path), mimeType: input.mimeType || detectMimeFromExtension(trusted.path) };
        }
        throw new Error('media_input_invalid');
    }
}

function parseDataUrl(value) {
    const match = /^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i.exec(value.trim());
    if (!match) return null;
    return { mimeType: match[1].toLowerCase(), bytes: Buffer.from(match[2], 'base64') };
}

async function resolveTrustedPath(inputPath, roots) {
    if (inputPath.includes('..')) return null;
    const resolved = path.resolve(inputPath);
    let real;
    try { real = await fs.promises.realpath(resolved); } catch (_) { return null; }
    const trusted = roots.some((root) => isWithin(real, root));
    return trusted ? { path: real } : null;
}

function isWithin(candidate, root) {
    const relative = path.relative(path.resolve(root), path.resolve(candidate));
    return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeHash(value) {
    return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : null;
}

function normalizeMime(mimeType, bytes) {
    const normalized = typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : '';
    return normalized || sniffMime(bytes);
}

function sniffMime(bytes) {
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
    if (bytes.subarray(0, 6).toString('ascii') === 'GIF89a' || bytes.subarray(0, 6).toString('ascii') === 'GIF87a') return 'image/gif';
    if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
    return '';
}

function validateImageMagic(bytes, mimeType) {
    const detected = sniffMime(bytes);
    if (mimeType === 'image/svg+xml') {
        const text = bytes.subarray(0, 4096).toString('utf8').replace(/^\uFEFF/, '').trim().toLowerCase();
        if (!text.includes('<svg') || /<script\b|on[a-z]+\s*=/.test(text)) throw new Error('media_content_invalid');
        return;
    }
    if (detected && detected !== mimeType) throw new Error('media_mime_mismatch');
    if (!detected) throw new Error('media_content_invalid');
}

function detectMimeFromExtension(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return Object.entries(MIME_EXTENSIONS).find(([, value]) => value === extension)?.[0];
}
async function exists(filePath) { try { await fs.promises.access(filePath); return true; } catch (_) { return false; } }
async function safeUnlink(filePath) { try { await fs.promises.unlink(filePath); } catch (_) { /* best effort */ } }

module.exports = { CodexMediaStore, DEFAULT_MAX_BYTES, parseDataUrl, resolveTrustedPath, normalizeHash };
