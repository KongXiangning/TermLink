const path = require('path');

const VIEW_MODE_THRESHOLDS = {
    fullMaxBytes: 256 * 1024,
    truncatedMaxBytes: 1024 * 1024,
    truncatedInitialBytes: 128 * 1024,
    segmentedMaxBytes: 8 * 1024 * 1024,
    segmentedChunkBytes: 64 * 1024,
    limitedChunkBytes: 64 * 1024,
    binarySampleBytes: 8 * 1024,
    maxSegmentBytes: 256 * 1024,
    diffMaxBytes: 256 * 1024
};

const WORKSPACE_FEATURES = {
    contentPreview: true,
    diffPreview: true,
    segmentedView: true,
    limitedView: true
};

const WORKSPACE_ROOT_SOURCE = 'session_cwd';
const DEFAULT_ENTRY_CANDIDATES = ['DOCS', 'docs'];
const GIT_STATUS_CACHE_TTL_MS = 5000;

const BINARY_EXTENSIONS = new Set([
    '.7z',
    '.a',
    '.apk',
    '.avi',
    '.bin',
    '.bmp',
    '.class',
    '.db',
    '.dll',
    '.dylib',
    '.exe',
    '.gif',
    '.gz',
    '.ico',
    '.jar',
    '.jpeg',
    '.jpg',
    '.keystore',
    '.lockb',
    '.mov',
    '.mp3',
    '.mp4',
    '.o',
    '.obj',
    '.pdf',
    '.png',
    '.so',
    '.sqlite',
    '.tar',
    '.wav',
    '.webm',
    '.webp',
    '.woff',
    '.woff2',
    '.xls',
    '.xlsx',
    '.zip'
]);

function toPortableRelativePath(value) {
    if (!value) {
        return '';
    }
    return String(value).split(path.sep).join('/');
}

module.exports = {
    VIEW_MODE_THRESHOLDS,
    WORKSPACE_FEATURES,
    WORKSPACE_ROOT_SOURCE,
    DEFAULT_ENTRY_CANDIDATES,
    GIT_STATUS_CACHE_TTL_MS,
    BINARY_EXTENSIONS,
    toPortableRelativePath
};
