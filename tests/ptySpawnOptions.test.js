const test = require('node:test');
const assert = require('node:assert/strict');
const { withWindowsPtyOptions } = require('../src/services/ptySpawnOptions');

test('withWindowsPtyOptions enables ConPTY DLL by default on Windows', () => {
    const result = withWindowsPtyOptions({ cols: 80, rows: 30 }, 'win32');
    assert.equal(result.useConpty, true);
    assert.equal(result.useConptyDll, true);
    assert.equal(result.cols, 80);
    assert.equal(result.rows, 30);
});

test('withWindowsPtyOptions preserves explicit PTY flags', () => {
    const result = withWindowsPtyOptions(
        { useConpty: false, useConptyDll: false, name: 'xterm' },
        'win32'
    );
    assert.equal(result.useConpty, false);
    assert.equal(result.useConptyDll, false);
    assert.equal(result.name, 'xterm');
});

test('withWindowsPtyOptions leaves non-Windows options unchanged', () => {
    const result = withWindowsPtyOptions({ name: 'xterm-color' }, 'linux');
    assert.deepEqual(result, { name: 'xterm-color' });
});
