const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getAuditService } = require('../src/services/auditService');

function freshAuditService(opts = {}) {
    // Force a new instance by reaching into module internals
    const mod = require('../src/services/auditService');
    const svc = new (Object.getPrototypeOf(mod.getAuditService()).constructor)();
    svc.configure({
        enabled: true,
        auditPath: opts.auditPath || path.join(os.tmpdir(), `termlink-audit-test-${Date.now()}-${Math.random().toString(36).slice(2)}.log`),
        ...opts
    });
    return svc;
}

test('AuditService writes structured JSON lines', () => {
    const svc = freshAuditService();
    svc.init();

    svc.logConnectionStart({ sessionId: 's1', clientIp: '10.0.0.1' });
    svc.logConnectionEnd({ sessionId: 's1', closeCode: 1000, durationMs: 5000 });

    const lines = fs.readFileSync(svc.auditPath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 2);

    const start = JSON.parse(lines[0]);
    assert.equal(start.event, 'connection_start');
    assert.equal(start.sessionId, 's1');

    const end = JSON.parse(lines[1]);
    assert.equal(end.event, 'connection_end');
    assert.equal(end.closeCode, 1000);
    assert.equal(end.durationMs, 5000);

    fs.unlinkSync(svc.auditPath);
});

test('AuditService does not write when disabled', () => {
    const auditPath = path.join(os.tmpdir(), `termlink-audit-disabled-${Date.now()}.log`);
    const svc = freshAuditService({ enabled: false, auditPath });
    svc.init();

    svc.logConnectionStart({ sessionId: 's1' });

    assert.equal(fs.existsSync(auditPath), false);
});

test('AuditService rotates when file exceeds maxFileSize', () => {
    const auditPath = path.join(os.tmpdir(), `termlink-audit-rotate-${Date.now()}.log`);
    const svc = freshAuditService({
        auditPath,
        maxFileSize: 100, // very small: 100 bytes
        maxRotatedFiles: 3
    });
    svc.init();

    // Write enough data to trigger rotation
    for (let i = 0; i < 10; i++) {
        svc.log('test_event', { index: i, padding: 'x'.repeat(50) });
    }

    // Rotated files should exist
    assert.ok(fs.existsSync(auditPath), 'current log exists');
    assert.ok(fs.existsSync(`${auditPath}.1`), 'rotated .1 exists');

    // Current file should be small (not accumulated)
    const currentSize = fs.statSync(auditPath).size;
    assert.ok(currentSize < 500, `current file should be small, got ${currentSize}`);

    // Cleanup
    for (let i = 0; i <= 5; i++) {
        const f = i === 0 ? auditPath : `${auditPath}.${i}`;
        try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
});

test('AuditService respects maxRotatedFiles limit', () => {
    const auditPath = path.join(os.tmpdir(), `termlink-audit-maxrot-${Date.now()}.log`);
    const svc = freshAuditService({
        auditPath,
        maxFileSize: 50,
        maxRotatedFiles: 2
    });
    svc.init();

    // Write lots of data to trigger multiple rotations
    for (let i = 0; i < 20; i++) {
        svc.log('test_event', { index: i, padding: 'x'.repeat(40) });
    }

    // .1 and .2 should exist, .3 should not (maxRotatedFiles=2)
    assert.ok(fs.existsSync(`${auditPath}.1`), '.1 should exist');
    assert.ok(fs.existsSync(`${auditPath}.2`), '.2 should exist');
    assert.equal(fs.existsSync(`${auditPath}.3`), false, '.3 should not exist');

    // Cleanup
    for (let i = 0; i <= 3; i++) {
        const f = i === 0 ? auditPath : `${auditPath}.${i}`;
        try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
});
