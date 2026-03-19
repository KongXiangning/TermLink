const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'android',
    '.gradle',
    '__pycache__',
    '.cache',
    '.idea',
    '.vscode'
]);

function shouldIgnoreDir(dirName) {
    return IGNORE_DIRS.has(dirName);
}

function walkDir(dir, maxDepth, currentDepth, results) {
    if (currentDepth > maxDepth) {
        return;
    }

    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!shouldIgnoreDir(entry.name)) {
                walkDir(fullPath, maxDepth, currentDepth + 1, results);
            }
        } else if (entry.isFile()) {
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isFile()) {
                    results.push(fullPath);
                }
            } catch (err) {
                // Skip files we can't stat
            }
        }
    }
}

function searchWorkspaceFiles(cwd, query, limit = 20) {
    if (!cwd || typeof cwd !== 'string') {
        return [];
    }

    const normalizedCwd = path.normalize(cwd);
    let allFiles = [];

    try {
        if (!fs.existsSync(normalizedCwd) || !fs.statSync(normalizedCwd).isDirectory()) {
            return [];
        }
        walkDir(normalizedCwd, 5, 0, allFiles);
    } catch (err) {
        return [];
    }

    const q = query.toLowerCase().trim();

    const scored = allFiles.map((filePath) => {
        const normalizedPath = path.normalize(filePath);
        const relativePath = path.relative(normalizedCwd, normalizedPath);
        const dirName = path.dirname(relativePath);
        const baseName = path.basename(filePath);
        const baseNameLower = baseName.toLowerCase();

        let score = 0;

        // Exact prefix match on basename
        if (q && baseNameLower.startsWith(q)) {
            score = 100;
        }
        // Basename contains query
        else if (q && baseNameLower.includes(q)) {
            score = 50;
        }
        // Directory name contains query
        else if (q && dirName.toLowerCase().includes(q)) {
            score = 20;
        }
        // Has query and no match
        else if (q) {
            score = -1;
        }

        return {
            label: baseName,
            path: normalizedPath,
            relativePathWithoutFileName: dirName === '.' ? '' : dirName,
            fsPath: normalizedPath,
            score,
            pathLength: relativePath.length
        };
    });

    const filtered = scored.filter((f) => f.score >= 0);

    filtered.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.pathLength - b.pathLength;
    });

    const results = filtered.slice(0, limit);

    return results.map((f) => ({
        label: f.label,
        path: f.path,
        relativePathWithoutFileName: f.relativePathWithoutFileName,
        fsPath: f.fsPath
    }));
}

module.exports = {
    searchWorkspaceFiles
};