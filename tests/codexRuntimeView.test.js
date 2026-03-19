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

    assert.deepEqual(buildRuntimeUpdate('turn/plan/updated', {
        plan: [
            { step: 'Inspect package.json', status: 'completed' },
            { step: 'Summarize findings', status: 'inProgress' }
        ]
    }), {
        section: 'plan',
        mode: 'replace',
        text: '[completed] Inspect package.json\n[inProgress] Summarize findings'
    });

    assert.deepEqual(buildRuntimeUpdate('item/plan/delta', {
        delta: '1. Inspect files'
    }), {
        section: 'plan',
        mode: 'append',
        text: '1. Inspect files'
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

    assert.deepEqual(buildRuntimeUpdate('item/reasoning/summaryTextDelta', {
        summaryText: 'Summarized reasoning.'
    }), {
        section: 'reasoning',
        mode: 'append',
        text: 'Summarized reasoning.'
    });

    assert.deepEqual(buildRuntimeUpdate('item/reasoning/summaryPartAdded', {
        part: { summary: 'Reasoning chunk.' }
    }), {
        section: 'reasoning',
        mode: 'replace',
        text: 'Reasoning chunk.'
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

    assert.deepEqual(buildRuntimeUpdateFromThreadItem({
        type: 'commandExecution',
        result: { stdout: 'src\npackage.json' },
        command: 'Get-ChildItem -Name'
    }), {
        section: 'terminal',
        mode: 'replace',
        text: 'src\npackage.json'
    });

    assert.deepEqual(buildRuntimeUpdateFromThreadItem({
        type: 'commandExecution',
        aggregatedOutput: 'Path\n----\nE:\\coding\\TermLink'
    }), {
        section: 'terminal',
        mode: 'replace',
        text: 'Path\n----\nE:\\coding\\TermLink'
    });

    assert.equal(buildRuntimeUpdateFromThreadItem({
        type: 'commandExecution',
        command: 'Get-ChildItem -Name'
    }), null);

    assert.deepEqual(buildRuntimeUpdateFromThreadItem({
        type: 'commandExecution',
        prompt: 'Press y to continue'
    }), {
        section: 'terminal',
        mode: 'replace',
        text: 'Press y to continue'
    });
});
