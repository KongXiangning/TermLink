const test = require('node:test');
const assert = require('node:assert/strict');

const {
    shouldShowRuntimePanel,
    buildRuntimeUpdate,
    buildRuntimeUpdateFromThreadItem
} = require('../public/lib/codex_runtime_view');

test('shouldShowRuntimePanel requires codex mode and diffPlanReasoning capability', () => {
    assert.equal(shouldShowRuntimePanel({
        sessionMode: 'codex',
        capabilities: { diffPlanReasoning: true }
    }), true);

    assert.equal(shouldShowRuntimePanel({
        sessionMode: 'codex',
        capabilities: { diffPlanReasoning: false }
    }), false);
});

test('buildRuntimeUpdate extracts diff and plan summaries', () => {
    assert.deepEqual(buildRuntimeUpdate('turn/diff/updated', {
        summary: 'Modified 2 files'
    }), {
        section: 'diff',
        mode: 'replace',
        text: 'Modified 2 files'
    });

    assert.deepEqual(buildRuntimeUpdate('turn/plan/updated', {
        plan: { summary: '1. Inspect\n2. Edit\n3. Verify' }
    }), {
        section: 'plan',
        mode: 'replace',
        text: '1. Inspect\n2. Edit\n3. Verify'
    });
});

test('buildRuntimeUpdate classifies reasoning and terminal stream notifications', () => {
    assert.deepEqual(buildRuntimeUpdate('item/reasoning/textDelta', {
        delta: 'Need to compare two files.'
    }), {
        section: 'reasoning',
        mode: 'append',
        text: 'Need to compare two files.'
    });

    assert.deepEqual(buildRuntimeUpdate('item/commandExecution/outputDelta', {
        delta: 'npm test\\n'
    }), {
        section: 'terminal',
        mode: 'append',
        text: 'npm test\\n'
    });
});

test('buildRuntimeUpdate extracts warnings', () => {
    assert.deepEqual(buildRuntimeUpdate('configWarning', {
        message: 'Workspace is world writable.'
    }), {
        section: 'warning',
        mode: 'replace',
        warningKind: 'configWarning',
        text: 'Workspace is world writable.'
    });
});

test('buildRuntimeUpdateFromThreadItem reconstructs runtime panels from snapshot items', () => {
    assert.deepEqual(buildRuntimeUpdateFromThreadItem({
        type: 'fileChange',
        summary: 'Updated app.ts'
    }), {
        section: 'diff',
        mode: 'replace',
        text: 'Updated app.ts'
    });

    assert.deepEqual(buildRuntimeUpdateFromThreadItem({
        type: 'reasoning',
        summary: 'Need to update the route handler.'
    }), {
        section: 'reasoning',
        mode: 'replace',
        text: 'Need to update the route handler.'
    });

    assert.deepEqual(buildRuntimeUpdateFromThreadItem({
        type: 'commandExecution',
        output: 'npm test\\nPASS'
    }), {
        section: 'terminal',
        mode: 'replace',
        text: 'npm test\\nPASS'
    });
});
