const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readPublicFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', 'public', relativePath), 'utf8');
}

test('codex client shell includes history panel and shared codex scripts', () => {
    const html = readPublicFile('codex_client.html');

    assert.match(html, /id="codex-history-panel"/);
    assert.match(html, /id="btn-codex-history-refresh"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=1"/);
    assert.match(html, /src="terminal_client\.js\?v=27"/);
});

test('terminal client shell shares scripts but does not expose codex history panel markup', () => {
    const html = readPublicFile('terminal_client.html');

    assert.doesNotMatch(html, /id="codex-history-panel"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=1"/);
    assert.match(html, /src="terminal_client\.js\?v=27"/);
});
