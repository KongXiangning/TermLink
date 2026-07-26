const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DiagnosticLog } = require('../src/services/diagnosticLog');

test('diagnostic logger writes sanitized JSONL and rotates bounded files', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-diagnostic-'));
    const filePath = path.join(directory, 'diagnostics.jsonl');
    const logger = new DiagnosticLog().configure({
        enabled: true,
        filePath,
        maxFileSize: 500,
        maxRotatedFiles: 2
    }).init();

    logger.event('test', 'diagnostic.sample', {
      password: 'do-not-write', // sensitive-scan:allow
        message: 'authorization=secret-value',
        count: 2
    });
    const firstContent = fs.readFileSync(filePath, 'utf8');
    assert.match(firstContent, /<redacted>/);
    logger.event('test', 'diagnostic.sample.2', { count: 3, filler: 'x'.repeat(500) });
    logger.event('test', 'diagnostic.sample.3', { count: 4, filler: 'y'.repeat(500) });

    const files = fs.readdirSync(directory).filter((name) => name.startsWith('diagnostics.jsonl'));
    assert.ok(files.length <= 3);
    const content = files.map((name) => fs.readFileSync(path.join(directory, name), 'utf8')).join('\n');
    assert.match(content, /diagnostic\.sample/);
    assert.doesNotMatch(content, /do-not-write|secret-value/);
    assert.ok(files.some((name) => fs.readFileSync(path.join(directory, name), 'utf8').includes('diagnostic.sample')));
});
