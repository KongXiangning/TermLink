const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestI18n } = require('./_i18n_helper');
setupTestI18n();

const {
    buildSkillPathCandidates,
    buildSkillToken,
    buildNextTurnEffectiveCodexConfig,
    createSlashRegistry,
    extractSkillTokens,
    getDiscoverableSlashCommands,
    normalizeInteractionState,
    normalizeNextTurnOverrides,
    parseComposerInput,
    resolveSlashCommand,
    stripSkillTokens
} = require('../public/lib/codex_slash_commands');

test('parseComposerInput distinguishes text, empty, and slash commands', () => {
    assert.deepEqual(parseComposerInput(''), {
        kind: 'empty',
        raw: '',
        text: ''
    });

    assert.deepEqual(parseComposerInput('hello'), {
        kind: 'text',
        raw: 'hello',
        text: 'hello'
    });

    assert.deepEqual(parseComposerInput('/plan inspect repo'), {
        kind: 'slash',
        raw: '/plan inspect repo',
        text: '/plan inspect repo',
        command: '/plan',
        argumentText: 'inspect repo'
    });
});

test('slash registry resolves enabled commands and panel dispatch', () => {
    const registry = createSlashRegistry();
    assert.equal(resolveSlashCommand({ registry, command: '/plan' }).dispatchKind, 'interaction_state');
    assert.equal(resolveSlashCommand({ registry, command: '/skill' }).availability, 'enabled');
    assert.equal(resolveSlashCommand({ registry, command: '/skills' }).dispatchKind, 'open_panel');
    assert.equal(resolveSlashCommand({ registry, command: '/compact' }).dispatchKind, 'open_panel');
});

test('getDiscoverableSlashCommands only returns enabled commands allowed by capabilities', () => {
    const registry = createSlashRegistry();
    assert.deepEqual(
        getDiscoverableSlashCommands({
            registry,
            capabilities: {
                slashCommands: true,
                slashModel: true,
                slashPlan: false
            },
            query: '/'
        }).map((entry) => entry.command),
        ['/model', '/fast']
    );
});

test('getDiscoverableSlashCommands keeps /skill search scoped to the one-shot skill command', () => {
    const registry = createSlashRegistry();
    assert.deepEqual(
        getDiscoverableSlashCommands({
            registry,
            capabilities: {
                slashCommands: true,
                slashModel: true,
                slashPlan: true,
                skillsList: true
            },
            query: '/skill'
        }).map((entry) => `${entry.command}:${entry.availability}`),
        ['/skill:enabled']
    );
});

test('getDiscoverableSlashCommands includes /skills and /compact when capabilities are enabled', () => {
    const registry = createSlashRegistry();
    assert.deepEqual(
        getDiscoverableSlashCommands({
            registry,
            capabilities: {
                slashCommands: true,
                slashModel: true,
                slashPlan: true,
                skillsList: true,
                compact: true
            },
            query: '/'
        }).map((entry) => entry.command),
        ['/model', '/plan', '/skill', '/compact', '/skills', '/fast']
    );
});

test('normalize helpers and effective config keep interaction and config boundaries separate', () => {
    assert.deepEqual(normalizeInteractionState({ planMode: true, activeSkill: ' refactor ' }), {
        planMode: true,
        activeSkill: 'refactor'
    });

    assert.deepEqual(normalizeNextTurnOverrides({ model: ' gpt-5-codex ', reasoningEffort: 'HIGH' }), {
        model: 'gpt-5-codex',
        reasoningEffort: 'high',
        sandbox: null
    });

    assert.deepEqual(buildNextTurnEffectiveCodexConfig({
        storedCodexConfig: {
            defaultModel: 'gpt-5',
            defaultReasoningEffort: 'medium',
            defaultPersonality: 'pragmatic',
            approvalPolicy: 'never',
            sandboxMode: 'workspace-write'
        },
        nextTurnOverrides: {
            model: 'gpt-5-codex',
            reasoningEffort: 'high'
        }
    }), {
        model: 'gpt-5-codex',
        reasoningEffort: 'high',
        personality: 'pragmatic',
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    });
});

test('skill token helpers build Windows skill paths and strip tokens back out of composer text', () => {
    assert.deepEqual(buildSkillPathCandidates({
        cwd: 'E:/coding/TermLink/',
        skillName: 'adb-real-device-debug'
    }), [
        'E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md',
        'E:\\coding\\TermLink\\skills\\adb-real-device-debug\\SKILL.md',
        'E:\\coding\\TermLink\\.claude\\skills\\adb-real-device-debug\\SKILL.md'
    ]);

    const token = buildSkillToken({
        cwd: 'E:\\coding\\TermLink',
        skillName: 'adb-real-device-debug'
    });

    assert.equal(
        token,
        '[$adb-real-device-debug](E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md)'
    );

    assert.deepEqual(
        extractSkillTokens(`Investigate ${token} and [$git-sensitive-scan](E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md)`),
        [
            {
                raw: '[$adb-real-device-debug](E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md)',
                name: 'adb-real-device-debug',
                path: 'E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md'
            },
            {
                raw: '[$git-sensitive-scan](E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md)',
                name: 'git-sensitive-scan',
                path: 'E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md'
            }
        ]
    );

    assert.equal(
        stripSkillTokens(`Investigate ${token}\n\n[$git-sensitive-scan](E:\\coding\\TermLink\\.codex\\skills\\git-sensitive-scan\\SKILL.md) now`),
        'Investigate\n\nnow'
    );
});

