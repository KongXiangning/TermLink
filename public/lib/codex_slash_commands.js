(function slashCommandsModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexSlashCommands = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSlashCommandsApi() {
    const t = typeof globalThis !== 'undefined' && typeof globalThis.t === 'function' ? globalThis.t : (k) => k;
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
            reasoningEffort: normalizeReasoningEffort(source.reasoningEffort),
            sandbox: normalizeOptionalString(source.sandbox)
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
            sandboxMode: overrides.sandbox || (stored ? stored.sandboxMode : null)
        };
    }

    function createSlashRegistry() {
        return [
            {
                command: '/model',
                title: t('codex.slash.model'),
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
                title: t('codex.slash.plan'),
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'free_text',
                dispatchKind: 'interaction_state',
                capabilityBinding: 'client-side + turn/plan/updated',
                capabilityKey: 'slashPlan',
                statusText: ''
            },
            {
                command: '/skill',
                title: t('codex.slash.skill'),
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
                title: t('codex.slash.compact'),
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'open_panel',
                capabilityBinding: 'thread/compact/start + client-side',
                capabilityKey: 'compact',
                statusText: ''
            },
            {
                command: '/skills',
                title: t('codex.slash.skills'),
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'open_panel',
                capabilityBinding: 'skills/list + client-side',
                capabilityKey: 'skillsList',
                statusText: ''
            },
            {
                command: '/mention',
                title: t('codex.slash.mention'),
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'interaction_state',
                capabilityBinding: 'client-side file mention',
                capabilityKey: 'fileMentions',
                statusText: ''
            },
            {
                command: '/fast',
                title: t('codex.slash.fast'),
                availability: 'enabled',
                discoverability: ENABLED_DISCOVERABILITY,
                argumentShape: 'none',
                dispatchKind: 'next_turn_override',
                capabilityBinding: 'client-side reasoning_effort toggle',
                capabilityKey: '',
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

    function parseFileMentionInput(text) {
        if (typeof text !== 'string' || !text) {
            return null;
        }
        const trimmed = text.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex === -1) {
            return null;
        }
        if (atIndex > 0) {
            const charBefore = trimmed[atIndex - 1];
            if (!/[\s\n]/.test(charBefore)) {
                return null;
            }
        }
        const afterAt = trimmed.slice(atIndex + 1);
        const spaceMatch = afterAt.match(/[\s\n]/);
        const tokenEnd = spaceMatch ? atIndex + 1 + spaceMatch.index : trimmed.length;
        const query = afterAt.slice(0, tokenEnd - atIndex - 1);
        if (query.length === 0 && !spaceMatch) {
            return {
                kind: 'file-mention',
                query: '',
                tokenStart: atIndex,
                tokenEnd: trimmed.length
            };
        }
        if (query.length === 0) {
            return null;
        }
        return {
            kind: 'file-mention',
            query: query,
            tokenStart: atIndex,
            tokenEnd: tokenEnd
        };
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
        parseFileMentionInput,
        resolveSlashCommand
    };
}));
