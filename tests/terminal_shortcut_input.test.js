const test = require('node:test');
const assert = require('node:assert/strict');
const shortcutInput = require('../public/terminal_shortcut_input');

test('default modifier state is off', () => {
    const state = shortcutInput.createModifierState();
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'off');
    assert.equal(shortcutInput.getModifierMode(state, 'Alt'), 'off');
});

test('Ctrl single tap applies once then resets', () => {
    const state = shortcutInput.createModifierState();
    shortcutInput.handleModifierTap(state, 'Ctrl', 1000);
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'armed');

    const resolved = shortcutInput.resolveVirtualInput(state, 'c');
    assert.equal(resolved.payload, '\x03');
    assert.deepEqual(resolved.usedModifiers, ['Ctrl']);

    shortcutInput.consumeOneShot(state, resolved.usedModifiers);
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'off');
});

test('Ctrl double tap enters locked mode until tapped again', () => {
    const state = shortcutInput.createModifierState();
    shortcutInput.handleModifierTap(state, 'Ctrl', 1000);
    shortcutInput.handleModifierTap(state, 'Ctrl', 1200);
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'locked');

    const first = shortcutInput.resolveVirtualInput(state, 'l');
    assert.equal(first.payload, '\x0c');
    shortcutInput.consumeOneShot(state, first.usedModifiers);
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'locked');

    const second = shortcutInput.resolveVirtualInput(state, 'c');
    assert.equal(second.payload, '\x03');
    shortcutInput.consumeOneShot(state, second.usedModifiers);
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'locked');

    shortcutInput.handleModifierTap(state, 'Ctrl', 2000);
    assert.equal(shortcutInput.getModifierMode(state, 'Ctrl'), 'off');
});

test('Alt one-shot adds ESC prefix then resets', () => {
    const state = shortcutInput.createModifierState();
    shortcutInput.handleModifierTap(state, 'Alt', 1000);
    assert.equal(shortcutInput.getModifierMode(state, 'Alt'), 'armed');

    const resolved = shortcutInput.resolveVirtualInput(state, 'f');
    assert.equal(resolved.payload, '\x1bf');
    assert.deepEqual(resolved.usedModifiers, ['Alt']);

    shortcutInput.consumeOneShot(state, resolved.usedModifiers);
    assert.equal(shortcutInput.getModifierMode(state, 'Alt'), 'off');
});

test('Alt + Ctrl sends ESC + control character', () => {
    const state = shortcutInput.createModifierState();
    shortcutInput.handleModifierTap(state, 'Ctrl', 1000);
    shortcutInput.handleModifierTap(state, 'Alt', 1100);

    const resolved = shortcutInput.resolveVirtualInput(state, 'c');
    assert.equal(resolved.payload, '\x1b\x03');
    assert.deepEqual(resolved.usedModifiers, ['Ctrl', 'Alt']);
});

test('Enter and Newline keep distinct payloads', () => {
    const state = shortcutInput.createModifierState();
    const enter = shortcutInput.resolveVirtualInput(state, 'Enter');
    const newline = shortcutInput.resolveVirtualInput(state, 'Newline');

    assert.equal(enter.payload, '\r');
    assert.equal(newline.payload, '\n');
});
