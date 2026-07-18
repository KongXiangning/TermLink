const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { structuredPatch } = require('diff');
const { WorkspaceError, resolveWorkspaceTarget } = require('./workspacePathUtils');
const {
    decodeBuffer,
    detectBinaryFromSample,
    getWorkspaceFileKind,
    getWorkspaceMimeType
} = require('./workspaceFileService');
const { toPortableRelativePath } = require('./workspaceConstants');

const execFileAsync = promisify(execFile);
const MAX_COMPARE_BYTES = 1024 * 1024;
const MAX_COMPARE_LINES = 50000;
const DIFF_CONTEXT_LINES = 3;

function countLines(content) {
    if (!content) return 0;
    return content.split(/\r?\n/).length;
}

function assertComparableBuffer(filePath, buffer) {
    if (buffer.length > MAX_COMPARE_BYTES) {
        throw new WorkspaceError('WORKSPACE_COMPARE_TOO_LARGE', 'File is too large to compare.', 413);
    }
    const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
    if (detectBinaryFromSample(filePath, sample)) {
        throw new WorkspaceError('WORKSPACE_COMPARE_BINARY', 'Binary files cannot be compared as text.', 415);
    }
    const decoded = decodeBuffer(buffer);
    if (countLines(decoded.content) > MAX_COMPARE_LINES) {
        throw new WorkspaceError('WORKSPACE_COMPARE_TOO_MANY_LINES', 'File has too many lines to compare.', 413);
    }
    return decoded;
}

async function readExistingWorkspaceSide(workspaceRoot, requestedPath) {
    const target = await resolveWorkspaceTarget(workspaceRoot, requestedPath);
    if (!target.stats.isFile()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a file.', 400);
    }
    if (target.stats.size > MAX_COMPARE_BYTES) {
        throw new WorkspaceError('WORKSPACE_COMPARE_TOO_LARGE', 'File is too large to compare.', 413);
    }
    const buffer = await fs.readFile(target.realTargetPath);
    const decoded = assertComparableBuffer(target.realTargetPath, buffer);
    return {
        path: target.portablePath,
        label: target.portablePath,
        source: 'workspace',
        exists: true,
        size: target.stats.size,
        encoding: decoded.encoding,
        mimeType: getWorkspaceMimeType(target.realTargetPath),
        kind: getWorkspaceFileKind(target.realTargetPath, false),
        content: decoded.content
    };
}

async function resolveOptionalWorkspaceSide(workspaceRoot, requestedPath) {
    try {
        return await readExistingWorkspaceSide(workspaceRoot, requestedPath);
    } catch (error) {
        if (!(error instanceof WorkspaceError) || error.code !== 'WORKSPACE_FILE_NOT_FOUND') {
            throw error;
        }
        const parentPath = toPortableRelativePath(path.dirname(String(requestedPath || '')));
        await resolveWorkspaceTarget(workspaceRoot, parentPath === '.' ? '' : parentPath);
        const missingTarget = await resolveWorkspaceTarget(workspaceRoot, requestedPath, { requireExists: false });
        return {
            path: missingTarget.portablePath,
            label: missingTarget.portablePath,
            source: 'workspace',
            exists: false,
            size: 0,
            encoding: 'utf-8',
            mimeType: getWorkspaceMimeType(missingTarget.logicalTargetPath),
            kind: getWorkspaceFileKind(missingTarget.logicalTargetPath, false),
            content: ''
        };
    }
}

function consumeChangeBlock(lines, startIndex, oldLine, newLine) {
    const removed = [];
    const added = [];
    let index = startIndex;
    while (index < lines.length && (lines[index].startsWith('-') || lines[index].startsWith('+'))) {
        const line = lines[index];
        if (line.startsWith('-')) removed.push(line.slice(1));
        else added.push(line.slice(1));
        index += 1;
    }
    const rows = [];
    const length = Math.max(removed.length, added.length);
    for (let offset = 0; offset < length; offset += 1) {
        const hasOld = offset < removed.length;
        const hasNew = offset < added.length;
        rows.push({
            type: hasOld && hasNew ? 'change' : (hasOld ? 'delete' : 'add'),
            oldLine: hasOld ? oldLine++ : null,
            newLine: hasNew ? newLine++ : null,
            oldText: hasOld ? removed[offset] : null,
            newText: hasNew ? added[offset] : null
        });
    }
    return { rows, nextIndex: index, oldLine, newLine };
}

function normalizeStructuredPatch(patch) {
    let additions = 0;
    let deletions = 0;
    const hunks = patch.hunks.map((hunk) => {
        let oldLine = hunk.oldStart;
        let newLine = hunk.newStart;
        const rows = [];
        for (let index = 0; index < hunk.lines.length;) {
            const line = hunk.lines[index];
            if (line.startsWith('\\')) {
                index += 1;
                continue;
            }
            if (line.startsWith('-') || line.startsWith('+')) {
                const block = consumeChangeBlock(hunk.lines, index, oldLine, newLine);
                rows.push(...block.rows);
                additions += block.rows.filter((row) => row.newLine !== null && row.type !== 'context').length;
                deletions += block.rows.filter((row) => row.oldLine !== null && row.type !== 'context').length;
                oldLine = block.oldLine;
                newLine = block.newLine;
                index = block.nextIndex;
                continue;
            }
            rows.push({
                type: 'context',
                oldLine: oldLine++,
                newLine: newLine++,
                oldText: line.slice(1),
                newText: line.slice(1)
            });
            index += 1;
        }
        return {
            oldStart: hunk.oldStart,
            oldLines: hunk.oldLines,
            newStart: hunk.newStart,
            newLines: hunk.newLines,
            rows
        };
    });
    return { hunks, additions, deletions };
}

function compareSides(left, right, mode) {
    const patch = structuredPatch(
        left.label,
        right.label,
        left.content,
        right.content,
        left.source,
        right.source,
        { context: DIFF_CONTEXT_LINES, stripTrailingCr: true }
    );
    const normalized = normalizeStructuredPatch(patch);
    const withoutContent = ({ content, ...side }) => side;
    return {
        mode,
        left: withoutContent(left),
        right: withoutContent(right),
        identical: normalized.hunks.length === 0,
        hasChanges: normalized.hunks.length > 0,
        stats: {
            additions: normalized.additions,
            deletions: normalized.deletions,
            hunks: normalized.hunks.length
        },
        hunks: normalized.hunks,
        truncated: false,
        reason: null
    };
}

async function compareWorkspaceFiles(options) {
    const left = await readExistingWorkspaceSide(options.workspaceRoot, options.leftPath);
    const right = await readExistingWorkspaceSide(options.workspaceRoot, options.rightPath);
    return compareSides(left, right, 'files');
}

async function readHeadSide(gitRoot, workspaceRoot, workspaceSide) {
    const workspaceRootRealPath = await fs.realpath(workspaceRoot);
    const absoluteWorkspacePath = path.resolve(workspaceRootRealPath, workspaceSide.path.split('/').join(path.sep));
    const gitRelativePath = toPortableRelativePath(path.relative(gitRoot, absoluteWorkspacePath));
    if (!gitRelativePath || gitRelativePath.startsWith('../')) {
        throw new WorkspaceError('WORKSPACE_PATH_OUT_OF_RANGE', 'Requested path is outside Git root.', 400);
    }
    let headSize;
    try {
        const { stdout } = await execFileAsync(
            'git',
            ['-C', gitRoot, 'cat-file', '-s', `HEAD:${gitRelativePath}`],
            { windowsHide: true, maxBuffer: 64 * 1024 }
        );
        headSize = Number.parseInt(String(stdout).trim(), 10);
    } catch (error) {
        headSize = null;
    }
    if (!Number.isFinite(headSize)) {
        return {
            path: workspaceSide.path,
            label: `HEAD:${workspaceSide.path}`,
            source: 'head',
            exists: false,
            size: 0,
            encoding: 'utf-8',
            mimeType: getWorkspaceMimeType(workspaceSide.path),
            kind: getWorkspaceFileKind(workspaceSide.path, false),
            content: ''
        };
    }
    if (headSize > MAX_COMPARE_BYTES) {
        throw new WorkspaceError('WORKSPACE_COMPARE_TOO_LARGE', 'File is too large to compare.', 413);
    }
    try {
        const { stdout } = await execFileAsync(
            'git',
            ['-C', gitRoot, 'show', `HEAD:${gitRelativePath}`],
            { windowsHide: true, encoding: 'buffer', maxBuffer: MAX_COMPARE_BYTES + 64 * 1024 }
        );
        const buffer = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout || '');
        const decoded = assertComparableBuffer(gitRelativePath, buffer);
        return {
            path: workspaceSide.path,
            label: `HEAD:${workspaceSide.path}`,
            source: 'head',
            exists: true,
            size: buffer.length,
            encoding: decoded.encoding,
            mimeType: getWorkspaceMimeType(gitRelativePath),
            kind: getWorkspaceFileKind(gitRelativePath, false),
            content: decoded.content
        };
    } catch (error) {
        if (error instanceof WorkspaceError) throw error;
        throw new WorkspaceError('WORKSPACE_COMPARE_GIT_READ_FAILED', 'Unable to read the file from Git HEAD.', 500);
    }
}

async function compareWorkspaceFileWithHead(options) {
    if (!options.gitRoot) {
        return {
            mode: 'git',
            path: options.requestedPath,
            isGitRepo: false,
            hasChanges: false,
            identical: true,
            reason: 'not_git_repo',
            hunks: [],
            stats: { additions: 0, deletions: 0, hunks: 0 }
        };
    }
    const right = await resolveOptionalWorkspaceSide(options.workspaceRoot, options.requestedPath);
    const left = await readHeadSide(options.gitRoot, options.workspaceRoot, right);
    if (!left.exists && !right.exists) {
        throw new WorkspaceError('WORKSPACE_FILE_NOT_FOUND', 'Requested path was not found.', 404);
    }
    return {
        path: right.path,
        isGitRepo: true,
        ...compareSides(left, right, 'git')
    };
}

module.exports = {
    MAX_COMPARE_BYTES,
    MAX_COMPARE_LINES,
    compareWorkspaceFiles,
    compareWorkspaceFileWithHead,
    normalizeStructuredPatch
};
