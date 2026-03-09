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
    assert.match(html, /id="codex-settings-panel"/);
    assert.match(html, /id="codex-runtime-panel"/);
    assert.match(html, /id="codex-alerts"/);
    assert.match(html, /id="btn-codex-history-refresh"/);
    assert.match(html, /id="btn-codex-settings-save"/);
    assert.match(html, /id="codex-settings-approval"[\s\S]*<option value="">Server default<\/option>/);
    assert.match(html, /id="codex-settings-sandbox"[\s\S]*<option value="">Server default<\/option>/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=1"/);
    assert.match(html, /src="terminal_client\.js\?v=32"/);
});

test('terminal client shell shares scripts but does not expose codex history panel markup', () => {
    const html = readPublicFile('terminal_client.html');

    assert.doesNotMatch(html, /id="codex-history-panel"/);
    assert.doesNotMatch(html, /id="codex-settings-panel"/);
    assert.doesNotMatch(html, /id="codex-runtime-panel"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=1"/);
    assert.match(html, /src="terminal_client\.js\?v=32"/);
});

test('terminal client stylesheet collapses the codex settings panel with the rest of the codex body', () => {
    const css = readPublicFile('terminal_client.css');

    assert.match(css, /#codex-panel\.collapsed #codex-settings-panel/);
    assert.match(css, /#codex-panel\.collapsed #codex-runtime-panel/);
    assert.match(css, /body\.codex-only\s*\{[\s\S]*overflow-y:\s*auto/);
    assert.match(css, /body\.codex-only #terminal-shell\s*\{[\s\S]*height:\s*auto/);
    assert.match(css, /body\.codex-only #codex-panel\s*\{[\s\S]*overflow:\s*visible/);
    assert.match(css, /body\.codex-only #codex-composer\s*\{[\s\S]*position:\s*sticky/);
});
