const fs = require('fs/promises');
const path = require('path');
const {
    VIEW_MODE_THRESHOLDS,
    BINARY_EXTENSIONS,
    toPortableRelativePath
} = require('./workspaceConstants');
const {
    WorkspaceError,
    normalizePickerPath,
    resolveWorkspaceTarget
} = require('./workspacePathUtils');

function isHiddenName(name) {
    return typeof name === 'string' && name.startsWith('.');
}

function compareEntries(left, right) {
    if (left.type !== right.type) {
        return left.type === 'directory' ? -1 : 1;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function buildLanguageHint(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.md') return 'markdown';
    if (extension === '.json') return 'json';
    if (extension === '.js' || extension === '.cjs' || extension === '.mjs') return 'javascript';
    if (extension === '.ts') return 'typescript';
    if (extension === '.tsx') return 'tsx';
    if (extension === '.jsx') return 'jsx';
    if (extension === '.kt') return 'kotlin';
    if (extension === '.java') return 'java';
    if (extension === '.xml') return 'xml';
    if (extension === '.yml' || extension === '.yaml') return 'yaml';
    if (extension === '.ps1') return 'powershell';
    if (extension === '.css') return 'css';
    if (extension === '.html') return 'html';
    return 'text';
}

function decodeBuffer(buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        return { encoding: 'utf-8', content: buffer.slice(3).toString('utf8') };
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        return { encoding: 'utf-16le', content: buffer.slice(2).toString('utf16le') };
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        const swapped = Buffer.from(buffer.slice(2));
        if (typeof swapped.swap16 === 'function') {
            swapped.swap16();
        }
        return { encoding: 'utf-16be', content: swapped.toString('utf16le') };
    }
    return { encoding: 'utf-8', content: buffer.toString('utf8') };
}

function detectBinaryFromSample(filePath, sampleBuffer) {
    const extension = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(extension)) {
        return true;
    }
    if (!sampleBuffer || sampleBuffer.length === 0) {
        return false;
    }
    let controlChars = 0;
    for (const byte of sampleBuffer) {
        if (byte === 0) {
            return true;
        }
        if (byte < 7 || (byte > 13 && byte < 32)) {
            controlChars += 1;
        }
    }
    return controlChars / sampleBuffer.length > 0.2;
}

async function readBufferRange(filePath, start, length) {
    const handle = await fs.open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, start);
        return buffer.slice(0, bytesRead);
    } finally {
        await handle.close();
    }
}

async function readBinarySample(filePath) {
    return readBufferRange(filePath, 0, VIEW_MODE_THRESHOLDS.binarySampleBytes);
}

function buildFileDescriptor(target, stats) {
    return {
        path: target.portablePath,
        name: path.basename(target.realTargetPath),
        size: stats.size,
        languageHint: buildLanguageHint(target.realTargetPath)
    };
}

async function readTextPreview(target, stats) {
    const descriptor = buildFileDescriptor(target, stats);
    const sample = await readBinarySample(target.realTargetPath);
    if (detectBinaryFromSample(target.realTargetPath, sample)) {
        return {
            path: descriptor.path,
            name: descriptor.name,
            previewable: false,
            reason: 'binary_file'
        };
    }

    const size = stats.size;
    if (size <= VIEW_MODE_THRESHOLDS.fullMaxBytes) {
        const buffer = await fs.readFile(target.realTargetPath);
        const decoded = decodeBuffer(buffer);
        return {
            ...descriptor,
            encoding: decoded.encoding,
            viewMode: 'full',
            previewable: true,
            truncated: false,
            content: decoded.content
        };
    }

    if (size <= VIEW_MODE_THRESHOLDS.truncatedMaxBytes) {
        const buffer = await readBufferRange(
            target.realTargetPath,
            0,
            Math.min(size, VIEW_MODE_THRESHOLDS.truncatedInitialBytes)
        );
        const decoded = decodeBuffer(buffer);
        const returnedBytes = buffer.length;
        return {
            ...descriptor,
            encoding: decoded.encoding,
            viewMode: 'truncated',
            previewable: true,
            truncated: returnedBytes < size,
            returnedBytes,
            nextOffset: returnedBytes,
            hasMore: returnedBytes < size,
            content: decoded.content
        };
    }

    if (size <= VIEW_MODE_THRESHOLDS.segmentedMaxBytes) {
        const buffer = await readBufferRange(
            target.realTargetPath,
            0,
            Math.min(size, VIEW_MODE_THRESHOLDS.segmentedChunkBytes)
        );
        const decoded = decodeBuffer(buffer);
        return {
            ...descriptor,
            encoding: decoded.encoding,
            viewMode: 'segmented',
            previewable: true,
            offset: 0,
            returnedBytes: buffer.length,
            nextOffset: buffer.length,
            hasMore: buffer.length < size,
            content: decoded.content
        };
    }

    const buffer = await readBufferRange(
        target.realTargetPath,
        0,
        Math.min(size, VIEW_MODE_THRESHOLDS.limitedChunkBytes)
    );
    const decoded = decodeBuffer(buffer);
    return {
        ...descriptor,
        encoding: decoded.encoding,
        viewMode: 'limited',
        previewable: true,
        limitedModes: ['head', 'tail'],
        currentLimitedMode: 'head',
        returnedBytes: buffer.length,
        content: decoded.content,
        message: 'File is too large for full in-workspace reading. Use terminal for further inspection.'
    };
}

async function listWorkspaceDirectory(workspaceRoot, requestedPath, options = {}) {
    const target = await resolveWorkspaceTarget(workspaceRoot, requestedPath);
    if (!target.stats.isDirectory()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a directory.', 400);
    }

    const showHidden = options.showHidden !== false;
    const entries = await fs.readdir(target.realTargetPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        if (!showHidden && isHiddenName(entry.name)) {
            continue;
        }
        if (entry.name === '.git') {
            continue;
        }

        const childPath = path.join(target.realTargetPath, entry.name);
        let childStats;
        try {
            childStats = await fs.stat(childPath);
        } catch (error) {
            continue;
        }

        const relativePath = path.relative(target.workspaceRootRealPath, childPath);
        if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            continue;
        }

        const item = {
            name: entry.name,
            path: toPortableRelativePath(relativePath),
            type: childStats.isDirectory() ? 'directory' : 'file',
            hidden: isHiddenName(entry.name),
            gitStatus: null
        };

        if (childStats.isDirectory()) {
            try {
                const childEntries = await fs.readdir(childPath);
                item.hasChildren = childEntries.length > 0;
            } catch (error) {
                item.hasChildren = false;
            }
        } else {
            item.size = childStats.size;
        }
        results.push(item);
    }

    results.sort(compareEntries);
    return {
        path: target.portablePath,
        entries: results
    };
}

async function readWorkspaceFile(workspaceRoot, requestedPath) {
    const target = await resolveWorkspaceTarget(workspaceRoot, requestedPath);
    if (!target.stats.isFile()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a file.', 400);
    }
    return readTextPreview(target, target.stats);
}

async function readWorkspaceFileSegment(workspaceRoot, requestedPath, offset, length) {
    const target = await resolveWorkspaceTarget(workspaceRoot, requestedPath);
    if (!target.stats.isFile()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a file.', 400);
    }

    const nextOffset = Number.parseInt(offset, 10);
    const requestedLength = Number.parseInt(length, 10);
    const normalizedOffset = Number.isFinite(nextOffset) && nextOffset >= 0 ? nextOffset : 0;
    const normalizedLength = Number.isFinite(requestedLength) && requestedLength > 0
        ? Math.min(requestedLength, VIEW_MODE_THRESHOLDS.maxSegmentBytes)
        : VIEW_MODE_THRESHOLDS.segmentedChunkBytes;

    if (normalizedOffset >= target.stats.size) {
        throw new WorkspaceError('WORKSPACE_FILE_SEGMENT_INVALID', 'Requested offset is outside file bounds.', 400);
    }

    const sample = await readBinarySample(target.realTargetPath);
    if (detectBinaryFromSample(target.realTargetPath, sample)) {
        throw new WorkspaceError('WORKSPACE_FILE_NOT_PREVIEWABLE', 'File is not previewable as text.', 400);
    }

    const buffer = await readBufferRange(
        target.realTargetPath,
        normalizedOffset,
        Math.min(normalizedLength, target.stats.size - normalizedOffset)
    );
    const decoded = decodeBuffer(buffer);
    return {
        path: target.portablePath,
        viewMode: target.stats.size <= VIEW_MODE_THRESHOLDS.truncatedMaxBytes ? 'truncated' : 'segmented',
        offset: normalizedOffset,
        returnedBytes: buffer.length,
        nextOffset: normalizedOffset + buffer.length,
        hasMore: normalizedOffset + buffer.length < target.stats.size,
        content: decoded.content
    };
}

async function readWorkspaceLimitedSegment(workspaceRoot, requestedPath, mode) {
    const target = await resolveWorkspaceTarget(workspaceRoot, requestedPath);
    if (!target.stats.isFile()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a file.', 400);
    }

    const sample = await readBinarySample(target.realTargetPath);
    if (detectBinaryFromSample(target.realTargetPath, sample)) {
        throw new WorkspaceError('WORKSPACE_FILE_NOT_PREVIEWABLE', 'File is not previewable as text.', 400);
    }

    const normalizedMode = mode === 'tail' ? 'tail' : 'head';
    const chunkSize = Math.min(target.stats.size, VIEW_MODE_THRESHOLDS.limitedChunkBytes);
    const start = normalizedMode === 'tail'
        ? Math.max(0, target.stats.size - chunkSize)
        : 0;
    const buffer = await readBufferRange(target.realTargetPath, start, chunkSize);
    const decoded = decodeBuffer(buffer);

    return {
        path: target.portablePath,
        viewMode: 'limited',
        currentLimitedMode: normalizedMode,
        returnedBytes: buffer.length,
        content: decoded.content
    };
}

async function listPickerDirectories(requestedPath) {
    const pickerPath = normalizePickerPath(requestedPath);
    let realPath;
    try {
        realPath = await fs.realpath(pickerPath);
    } catch (error) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Picker path does not exist.', 400);
    }

    let stats;
    try {
        stats = await fs.stat(realPath);
    } catch (error) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Picker path is invalid.', 400);
    }
    if (!stats.isDirectory()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Picker path must be a directory.', 400);
    }

    const entries = await fs.readdir(realPath, { withFileTypes: true });
    const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            name: entry.name,
            path: path.join(realPath, entry.name),
            type: 'directory',
            hidden: isHiddenName(entry.name)
        }))
        .sort(compareEntries);

    const parentPath = path.dirname(realPath);
    return {
        path: realPath,
        parentPath: parentPath === realPath ? null : parentPath,
        entries: directories
    };
}

async function searchWorkspaceFiles(workspaceRoot, query, limit = 20) {
    const rootTarget = await resolveWorkspaceTarget(workspaceRoot, '');
    if (!rootTarget.stats.isDirectory()) {
        return [];
    }

    const normalizedQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const results = [];
    const maxDepth = 5;

    async function walk(currentPath, currentDepth) {
        if (results.length >= limit * 4 || currentDepth > maxDepth) {
            return;
        }
        let entries;
        try {
            entries = await fs.readdir(currentPath, { withFileTypes: true });
        } catch (error) {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '.git' || entry.name === 'node_modules') {
                    continue;
                }
                await walk(fullPath, currentDepth + 1);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }

            const relativePath = path.relative(rootTarget.workspaceRootRealPath, fullPath);
            const portablePath = toPortableRelativePath(relativePath);
            const baseName = path.basename(fullPath);
            const baseNameLower = baseName.toLowerCase();
            const dirName = path.dirname(portablePath);

            let score = 0;
            if (normalizedQuery) {
                if (baseNameLower.startsWith(normalizedQuery)) {
                    score = 100;
                } else if (baseNameLower.includes(normalizedQuery)) {
                    score = 50;
                } else if (dirName.toLowerCase().includes(normalizedQuery)) {
                    score = 20;
                } else {
                    score = -1;
                }
            }

            if (score >= 0) {
                results.push({
                    label: baseName,
                    path: fullPath,
                    relativePathWithoutFileName: dirName === '.' ? '' : dirName,
                    fsPath: fullPath,
                    score,
                    pathLength: portablePath.length
                });
            }
        }
    }

    await walk(rootTarget.realTargetPath, 0);

    return results
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            return left.pathLength - right.pathLength;
        })
        .slice(0, limit)
        .map((entry) => ({
            label: entry.label,
            path: entry.path,
            relativePathWithoutFileName: entry.relativePathWithoutFileName,
            fsPath: entry.fsPath
        }));
}

module.exports = {
    listWorkspaceDirectory,
    readWorkspaceFile,
    readWorkspaceFileSegment,
    readWorkspaceLimitedSegment,
    listPickerDirectories,
    searchWorkspaceFiles
};
