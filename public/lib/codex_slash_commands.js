(function slashCommandsModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexSlashCommands = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSlashCommandsApi() {
    const VALID_REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
    const ENABLED_DISCOVERABILITY = 'menu_visible_executable';

    function normalizeOptionalString(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }

    function normalizeReasoningEffort(value) {
        const normalized = normalizeOptionalString(value);
        if (!normalized) {
            return null;
        }
        const lowered = normalized.toLowerCase();
        return VALID_REASONING_EFFORTS.has(lowered) ? lowered : null;
    }

    function normalizeStoredCodexConfig(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        return {
            defaultModel: normalizeOptionalString(value.defaultModel),
            defaultReasoningEffort: normalizeReasoningEffort(value.defaultReasoningEffort),
            defaultPersonality: normalizeOptionalString(value.defaultPersonality),
            approvalPolicy: normalizeOptionalString(value.approvalPolicy),
            sandboxMode: normalizeOptionalString(value.sandboxMode)
        };
    }

    function normalizeNextTurnOverrides(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            model: normalizeOptionalString(source.model),
            reasoningEffort: normalizeReasoningEffort(source.reasoningEffort)
        };
    }

    function normalizeInteractionState(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            planMode: source.planMode === true,
            activeSkill: normalizeOptionalString(source.activeSkill)
        };
    }

    function buildNextTurnEffectiveCodexConfig(input) {
        const source = input && typeof input === 'object' ? input : {};
        const stored = normalizeStoredCodexConfig(source.storedCodexConfig);
        const overrides = normalizeNextTurnOverrides(source.nextTurnOverrides);
        return {
            model: overrides.model || (stored ? stored.defaultModel : null),
            reasoningEffort: overrides.reasoningEffort || (stored ? stored.defaultReasoningEffort : null),
            personality: stored ? stored.defaultPersonality : null,
            approvalPolicy: stored ? stored.approvalPolicy : null,
            sandboxMode: stored ? stored.sandboxMode : null
        };
    }

    function createSlashRegistry() {
        return [
            {
                command: '/model',
                title: '选择模型',
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'next_turn_override',
                capabilityBinding: 'model/list',
                capabilityKey: 'slashModel',
                statusText: ''
            },
            {
                command: '/plan',
                title: '计划模式',
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'free_text',
                dispatchKind: 'interaction_state',
                capabilityBinding: '客户端封装 + turn/plan/updated',
                capabilityKey: 'slashPlan',
                statusText: ''
            },
            {
                command: '/skill',
                title: '切换技能',
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'single_token',
                dispatchKind: 'interaction_state',
                capabilityBinding: 'skills/list',
                capabilityKey: 'skillsList',
                statusText: ''
            },
            {
                command: '/compact',
                title: '压缩上下文',
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'open_panel',
                capabilityBinding: 'thread/compact/start + 客户端封装',
                capabilityKey: 'compact',
                statusText: ''
            },
            {
                command: '/skills',
                title: '技能列表',
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'open_panel',
                capabilityBinding: 'skills/list + 客户端封装',
                capabilityKey: 'skillsList',
                statusText: ''
            }
        ];
    }

    function getCommandKeyword(text) {
        const value = typeof text === 'string' ? text.trim() : '';
        if (!value.startsWith('/')) {
            return '';
        }
        const spaceIndex = value.indexOf(' ');
        return spaceIndex >= 0 ? value.slice(0, spaceIndex) : value;
    }

    function parseComposerInput(text) {
        const raw = typeof text === 'string' ? text : '';
        const trimmed = raw.trim();
        if (!trimmed) {
            return { kind: 'empty', raw, text: '' };
        }
        if (!trimmed.startsWith('/')) {
            return { kind: 'text', raw, text: trimmed };
        }
        const keyword = getCommandKeyword(trimmed);
        const remainder = trimmed.slice(keyword.length).trim();
        return {
            kind: 'slash',
            raw,
            text: trimmed,
            command: keyword.toLowerCase(),
            argumentText: remainder
        };
    }

    function resolveSlashCommand(input) {
        const parsed = input && typeof input === 'object' ? input : {};
        const registry = Array.isArray(parsed.registry) ? parsed.registry : [];
        const command = typeof parsed.command === 'string' ? parsed.command.trim().toLowerCase() : '';
        return registry.find((entry) => entry.command === command) || null;
    }

    function getDiscoverableSlashCommands(input) {
        const source = input && typeof input === 'object' ? input : {};
        const registry = Array.isArray(source.registry) ? source.registry : [];
        const capabilities = source.capabilities && typeof source.capabilities === 'object' ? source.capabilities : {};
        const query = typeof source.query === 'string' ? source.query.trim().toLowerCase() : '';
        const hasExactCommandMatch = !!(query && query !== '/' && registry.some((entry) => entry.command === query));
        return registry.filter((entry) => {
            const matchesQuery = !query || query === '/'
                ? true
                : hasExactCommandMatch
                    ? entry.command === query
                    : (entry.command.includes(query) || entry.title.toLowerCase().includes(query.replace(/^\//, '')));
            if (entry.availability === 'enabled' && entry.discoverability === ENABLED_DISCOVERABILITY) {
                if (entry.capabilityKey && capabilities[entry.capabilityKey] !== true) {
                    return false;
                }
                return matchesQuery;
            }
            if (entry.discoverability === 'search_visible_notice') {
                if (!query || query === '/') {
                    return false;
                }
                return matchesQuery;
            }
            return false;
        });
    }

    return {
        buildNextTurnEffectiveCodexConfig,
        createSlashRegistry,
        getDiscoverableSlashCommands,
        normalizeInteractionState,
        normalizeNextTurnOverrides,
        parseComposerInput,
        resolveSlashCommand
    };
}));
