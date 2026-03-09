(function runtimeViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexRuntimeView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createRuntimeViewApi() {
    function normalizeText(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        return '';
    }

    function readPath(source, path) {
        let current = source;
        for (let i = 0; i < path.length; i += 1) {
            if (!current || typeof current !== 'object') {
                return undefined;
            }
            current = current[path[i]];
        }
        return current;
    }

    function pickFirstText(source, paths) {
        for (let i = 0; i < paths.length; i += 1) {
            const value = readPath(source, paths[i]);
            const normalized = normalizeText(value);
            if (normalized) {
                return normalized;
            }
        }
        return '';
    }

    function summarizeObject(value) {
        if (!value || typeof value !== 'object') {
            return '';
        }
        const directText = pickFirstText(value, [
            ['text'],
            ['delta'],
            ['summary'],
            ['message'],
            ['description'],
            ['output'],
            ['content'],
            ['title']
        ]);
        if (directText) {
            return directText;
        }
        try {
            return JSON.stringify(value);
        } catch (_) {
            return '';
        }
    }

    function normalizeLines(value) {
        if (Array.isArray(value)) {
            return value
                .map((entry) => summarizeObject(entry))
                .filter(Boolean)
                .join('\n');
        }
        return summarizeObject(value);
    }

    function shouldShowRuntimePanel(input) {
        const state = input && typeof input === 'object' ? input : {};
        const sessionMode = typeof state.sessionMode === 'string' ? state.sessionMode.trim().toLowerCase() : '';
        const capabilities = state.capabilities && typeof state.capabilities === 'object'
            ? state.capabilities
            : {};
        return sessionMode === 'codex' && capabilities.diffPlanReasoning === true;
    }

    function buildRuntimeUpdate(method, params) {
        const normalizedMethod = typeof method === 'string' ? method.trim() : '';
        const payload = params && typeof params === 'object' ? params : {};

        if (normalizedMethod === 'turn/diff/updated') {
            return {
                section: 'diff',
                mode: 'replace',
                text: pickFirstText(payload, [
                    ['summary'],
                    ['diff'],
                    ['patch'],
                    ['text'],
                    ['content']
                ]) || summarizeObject(payload)
            };
        }

        if (normalizedMethod === 'turn/plan/updated') {
            return {
                section: 'plan',
                mode: 'replace',
                text: pickFirstText(payload, [
                    ['summary'],
                    ['text'],
                    ['plan', 'summary'],
                    ['plan', 'text'],
                    ['content']
                ]) || normalizeLines(payload.steps) || summarizeObject(payload)
            };
        }

        if (normalizedMethod.startsWith('item/reasoning/')) {
            return {
                section: 'reasoning',
                mode: normalizedMethod.endsWith('Delta') ? 'append' : 'replace',
                text: pickFirstText(payload, [
                    ['delta'],
                    ['text'],
                    ['summary'],
                    ['part', 'text'],
                    ['item', 'text']
                ]) || summarizeObject(payload)
            };
        }

        if (normalizedMethod === 'item/commandExecution/outputDelta') {
            return {
                section: 'terminal',
                mode: 'append',
                text: pickFirstText(payload, [
                    ['delta'],
                    ['output'],
                    ['text']
                ]) || summarizeObject(payload)
            };
        }

        if (normalizedMethod === 'item/commandExecution/terminalInteraction') {
            return {
                section: 'terminal',
                mode: 'append',
                text: pickFirstText(payload, [
                    ['message'],
                    ['prompt'],
                    ['text']
                ]) || summarizeObject(payload)
            };
        }

        if (normalizedMethod === 'item/fileChange/outputDelta') {
            return {
                section: 'diff',
                mode: 'append',
                text: pickFirstText(payload, [
                    ['delta'],
                    ['output'],
                    ['text']
                ]) || summarizeObject(payload)
            };
        }

        if (normalizedMethod === 'item/mcpToolCall/progress') {
            return {
                section: 'plan',
                mode: 'append',
                text: pickFirstText(payload, [
                    ['message'],
                    ['status'],
                    ['text'],
                    ['progress', 'message']
                ]) || summarizeObject(payload)
            };
        }

        if (normalizedMethod === 'configWarning' || normalizedMethod === 'deprecationNotice') {
            return {
                section: 'warning',
                mode: 'replace',
                warningKind: normalizedMethod,
                text: pickFirstText(payload, [
                    ['message'],
                    ['text'],
                    ['detail']
                ]) || summarizeObject(payload)
            };
        }

        return null;
    }

    function buildRuntimeUpdateFromThreadItem(item) {
        const current = item && typeof item === 'object' ? item : null;
        if (!current || typeof current.type !== 'string') {
            return null;
        }

        if (current.type === 'reasoning') {
            return {
                section: 'reasoning',
                mode: 'replace',
                text: pickFirstText(current, [
                    ['text'],
                    ['summary'],
                    ['content'],
                    ['part', 'text']
                ]) || summarizeObject(current)
            };
        }

        if (current.type === 'commandExecution') {
            return {
                section: 'terminal',
                mode: 'replace',
                text: pickFirstText(current, [
                    ['output'],
                    ['text'],
                    ['command']
                ]) || summarizeObject(current)
            };
        }

        if (current.type === 'fileChange') {
            return {
                section: 'diff',
                mode: 'replace',
                text: pickFirstText(current, [
                    ['output'],
                    ['text'],
                    ['summary'],
                    ['patch']
                ]) || summarizeObject(current)
            };
        }

        if (current.type === 'plan') {
            return {
                section: 'plan',
                mode: 'replace',
                text: pickFirstText(current, [
                    ['text'],
                    ['summary']
                ]) || normalizeLines(current.steps) || summarizeObject(current)
            };
        }

        if (current.type === 'mcpToolCall') {
            return {
                section: 'plan',
                mode: 'append',
                text: pickFirstText(current, [
                    ['message'],
                    ['status'],
                    ['text']
                ]) || summarizeObject(current)
            };
        }

        if (current.type === 'agentMessage') {
            const phase = typeof current.phase === 'string' ? current.phase.trim().toLowerCase() : '';
            if (phase === 'plan') {
                return {
                    section: 'plan',
                    mode: 'replace',
                    text: pickFirstText(current, [['text']]) || summarizeObject(current)
                };
            }
            if (phase === 'reasoning') {
                return {
                    section: 'reasoning',
                    mode: 'replace',
                    text: pickFirstText(current, [['text']]) || summarizeObject(current)
                };
            }
        }

        return null;
    }

    return {
        shouldShowRuntimePanel,
        buildRuntimeUpdate,
        buildRuntimeUpdateFromThreadItem
    };
}));
