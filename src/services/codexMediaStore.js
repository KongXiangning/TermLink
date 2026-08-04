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
const DEFAULT_THUMBNAIL_MAX_BYTES = 256 * 1024;
const DEFAULT_THUMBNAIL_LONG_EDGE = 320;
const THUMBNAIL_SUFFIX = '.thumb.webp';

class CodexMediaStore {
    constructor({
        rootDir = path.resolve(process.cwd(), 'data', 'codex-media'),
        trustedTempRoots = [],
        maxBytes = DEFAULT_MAX_BYTES,
        thumbnailMaxBytes = DEFAULT_THUMBNAIL_MAX_BYTES,
        thumbnailLongEdge = DEFAULT_THUMBNAIL_LONG_EDGE
    } = {}) {
        this.rootDir = path.resolve(rootDir);
        this.trustedTempRoots = trustedTempRoots.map((root) => path.resolve(root));
        this.maxBytes = maxBytes;
        this.thumbnailMaxBytes = thumbnailMaxBytes;
        this.thumbnailLongEdge = thumbnailLongEdge;
        this._metadata = new Map();
        this._thumbnailJobs = new Map();
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        await this._rebuildMetadata();
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
        const previous = this._metadata.get(contentHash);
        const metadata = {
            ...(previous || {}),
            contentHash,
            mimeType: normalizedMime,
            byteSize: bytes.length,
            filePath: finalPath,
            mediaPath: `/api/codex/media/${contentHash}`,
            lastAccessedAt: Date.now()
        };
        this._metadata.set(contentHash, metadata);
        return metadata;
    }

    get(contentHash) {
        const normalized = normalizeHash(contentHash);
        if (!normalized) return null;
        const metadata = this._metadata.get(normalized);
        return metadata || null;
    }

    async open(contentHash, variant = 'original') {
        const metadata = this.get(contentHash);
        if (!metadata || !await exists(metadata.filePath)) return null;
        if (variant === 'thumbnail') {
            if (!metadata.thumbnailPath || !metadata.thumbnailHash) return null;
            if (!await exists(metadata.thumbnailPath)) return null;
            return {
                ...metadata,
                variant: 'thumbnail',
                contentHash: metadata.thumbnailHash,
                mimeType: 'image/webp',
                byteSize: metadata.thumbnailByteSize,
                filePath: metadata.thumbnailPath,
                mediaPath: `${metadata.mediaPath}/thumbnail`
            };
        }
        metadata.lastAccessedAt = Date.now();
        return { ...metadata, variant: 'original' };
    }

    /**
     * Generate the bounded WebP thumbnail for an original. The generated
     * bytes are kept content-addressed through the original hash filename;
     * the descriptor still exposes the thumbnail's own byte hash.
     */
    async ensureThumbnail(contentHash) {
        const normalized = normalizeHash(contentHash);
        if (!normalized) return null;
        const existing = this._metadata.get(normalized);
        if (!existing || !await exists(existing.filePath)) return null;
        if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(existing.mimeType)) {
            existing.thumbnailUnavailable = true;
            return null;
        }
        if (existing.thumbnailPath && existing.thumbnailHash && await exists(existing.thumbnailPath)) {
            return {
                contentHash: normalized,
                thumbnailHash: existing.thumbnailHash,
                mimeType: 'image/webp',
                byteSize: existing.thumbnailByteSize,
                filePath: existing.thumbnailPath,
                mediaPath: `${existing.mediaPath}/thumbnail`,
                variant: 'thumbnail'
            };
        }
        if (this._thumbnailJobs.has(normalized)) return this._thumbnailJobs.get(normalized);
        const job = this._generateThumbnail(normalized, existing)
            .finally(() => this._thumbnailJobs.delete(normalized));
        this._thumbnailJobs.set(normalized, job);
        return job;
    }

    async _generateThumbnail(originalHash, metadata) {
        let sharp;
        try {
            // Keep the native image dependency lazy so a server that only
            // serves text remains able to boot and report a clear capability.
            sharp = require('sharp');
        } catch (_) {
            metadata.thumbnailUnavailable = true;
            return null;
        }
        try {
            const sourceInfo = await sharp(metadata.filePath, {
                failOn: 'warning',
                limitInputPixels: 67_108_864,
                pages: 1
            }).metadata();
            metadata.width = Number.isInteger(sourceInfo.width) ? sourceInfo.width : null;
            metadata.height = Number.isInteger(sourceInfo.height) ? sourceInfo.height : null;
        } catch (_) {
            metadata.thumbnailUnavailable = true;
            return null;
        }
        const sizes = [this.thumbnailLongEdge, 280, 240, 200].filter((value, index, all) => value > 0 && all.indexOf(value) === index);
        const qualities = [72, 60, 48, 36];
        let bytes = null;
        for (const size of sizes) {
            for (const quality of qualities) {
                try {
                    const candidate = await sharp(metadata.filePath, {
                        failOn: 'warning',
                        limitInputPixels: 67_108_864,
                        pages: 1
                    })
                        .rotate()
                        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality, effort: 4 })
                        .toBuffer();
                    if (candidate.length > 0 && candidate.length <= this.thumbnailMaxBytes) {
                        bytes = candidate;
                        break;
                    }
                } catch (_) {
                    metadata.thumbnailUnavailable = true;
                    return null;
                }
            }
            if (bytes) break;
        }
        if (!bytes) {
            metadata.thumbnailUnavailable = true;
            return null;
        }
        const thumbnailHash = crypto.createHash('sha256').update(bytes).digest('hex');
        const thumbnailPath = path.join(this.rootDir, `${originalHash}${THUMBNAIL_SUFFIX}`);
        await writeAtomic(this.rootDir, thumbnailPath, bytes, `${originalHash}.thumb`);
        metadata.thumbnailHash = thumbnailHash;
        metadata.thumbnailByteSize = bytes.length;
        metadata.thumbnailPath = thumbnailPath;
        metadata.thumbnailMediaPath = `${metadata.mediaPath}/thumbnail`;
        metadata.thumbnailUnavailable = false;
        return {
            contentHash: originalHash,
            thumbnailHash,
            mimeType: 'image/webp',
            byteSize: bytes.length,
            filePath: thumbnailPath,
            mediaPath: metadata.thumbnailMediaPath,
            variant: 'thumbnail'
        };
    }

    async _rebuildMetadata() {
        const entries = await fs.promises.readdir(this.rootDir, { withFileTypes: true });
        const thumbnailEntries = [];
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            if (entry.name.endsWith(THUMBNAIL_SUFFIX)) {
                thumbnailEntries.push(entry.name);
                continue;
            }
            const match = /^([0-9a-f]{64})(\.[a-z0-9]+)$/i.exec(entry.name);
            if (!match || !Object.values(MIME_EXTENSIONS).includes(match[2].toLowerCase())) continue;
            const contentHash = match[1].toLowerCase();
            const filePath = path.join(this.rootDir, entry.name);
            try {
                const bytes = await fs.promises.readFile(filePath);
                const mimeType = detectMimeFromExtension(filePath);
                validateImageMagic(bytes, mimeType);
                const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
                if (actualHash !== contentHash) throw new Error('media_hash_mismatch');
                this._metadata.set(contentHash, {
                    contentHash,
                    mimeType,
                    byteSize: bytes.length,
                    filePath,
                    mediaPath: `/api/codex/media/${contentHash}`,
                    lastAccessedAt: Date.now()
                });
            } catch (_) {
                await quarantine(filePath);
            }
        }
        for (const name of thumbnailEntries) {
            const match = /^([0-9a-f]{64})\.thumb\.webp$/i.exec(name);
            if (!match) continue;
            const originalHash = match[1].toLowerCase();
            const metadata = this._metadata.get(originalHash);
            const thumbnailPath = path.join(this.rootDir, name);
            if (!metadata) {
                await quarantine(thumbnailPath);
                continue;
            }
            try {
                const bytes = await fs.promises.readFile(thumbnailPath);
                if (bytes.length === 0 || bytes.length > this.thumbnailMaxBytes) throw new Error('thumbnail_size_invalid');
                validateImageMagic(bytes, 'image/webp');
                metadata.thumbnailHash = crypto.createHash('sha256').update(bytes).digest('hex');
                metadata.thumbnailByteSize = bytes.length;
                metadata.thumbnailPath = thumbnailPath;
                metadata.thumbnailMediaPath = `${metadata.mediaPath}/thumbnail`;
                metadata.thumbnailUnavailable = false;
            } catch (_) {
                await quarantine(thumbnailPath);
            }
        }
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

async function writeAtomic(rootDir, targetPath, bytes, prefix) {
    await fs.promises.mkdir(rootDir, { recursive: true });
    const temporary = path.join(rootDir, `.${prefix}.${process.pid}.${Date.now()}.tmp`);
    const handle = await fs.promises.open(temporary, 'wx');
    try {
        await handle.writeFile(bytes);
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await fs.promises.rename(temporary, targetPath);
    } catch (error) {
        if (error.code !== 'EEXIST' && !await exists(targetPath)) throw error;
        await safeUnlink(temporary);
    }
}

async function quarantine(filePath) {
    const target = `${filePath}.corrupt.${Date.now()}`;
    try { await fs.promises.rename(filePath, target); } catch (_) { await safeUnlink(filePath); }
}

module.exports = {
    CodexMediaStore,
    DEFAULT_MAX_BYTES,
    DEFAULT_THUMBNAIL_MAX_BYTES,
    parseDataUrl,
    resolveTrustedPath,
    normalizeHash,
    sniffMime,
    validateImageMagic
};
