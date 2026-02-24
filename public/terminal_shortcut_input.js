(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TerminalShortcutInput = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const MODIFIERS = ['Ctrl', 'Alt'];
    const DOUBLE_TAP_MS = 320;

    function createModifierState() {
        return {
            modifiers: {
                Ctrl: { mode: 'off', lastTapAt: 0 },
                Alt: { mode: 'off', lastTapAt: 0 }
            }
        };
    }

    function ensureState(state) {
        if (!state || typeof state !== 'object') {
            return createModifierState();
        }
        if (!state.modifiers || typeof state.modifiers !== 'object') {
            state.modifiers = {};
        }
        MODIFIERS.forEach((modifier) => {
            const current = state.modifiers[modifier];
            if (!current || typeof current !== 'object') {
                state.modifiers[modifier] = { mode: 'off', lastTapAt: 0 };
                return;
            }
            if (current.mode !== 'off' && current.mode !== 'armed' && current.mode !== 'locked') {
                current.mode = 'off';
            }
            if (typeof current.lastTapAt !== 'number' || !Number.isFinite(current.lastTapAt)) {
                current.lastTapAt = 0;
            }
        });
        return state;
    }

    function normalizeModifier(modifier) {
        return MODIFIERS.includes(modifier) ? modifier : '';
    }

    function mapVirtualKey(key) {
        switch (key) {
            case 'Enter': return '\r';
            case 'Newline': return '\n';
            case 'Tab': return '\t';
            case 'Esc': return '\x1b';
            case 'Home': return '\x1b[H';
            case 'End': return '\x1b[F';
            case 'PgUp': return '\x1b[5~';
            case 'PgDn': return '\x1b[6~';
            case 'Up': return '\x1b[A';
            case 'Down': return '\x1b[B';
            case 'Right': return '\x1b[C';
            case 'Left': return '\x1b[D';
            case 'Ctrl-C': return '\x03';
            default: return key || '';
        }
    }

    function applyCtrlModifier(payload, originalKey) {
        if (!payload) return '';
        let target = '';
        if (typeof originalKey === 'string' && originalKey.length === 1) {
            target = originalKey;
        } else if (payload.length === 1) {
            target = payload;
        }
        if (target.length === 1 && /[A-Za-z]/.test(target)) {
            const upperCode = target.toUpperCase().charCodeAt(0);
            return String.fromCharCode(upperCode - 64);
        }
        return payload;
    }

    function handleModifierTap(state, modifier, nowMs) {
        const safeState = ensureState(state);
        const name = normalizeModifier(modifier);
        if (!name) {
            return { changed: false, mode: 'off' };
        }
        const entry = safeState.modifiers[name];
        const timestamp = (typeof nowMs === 'number' && Number.isFinite(nowMs)) ? nowMs : Date.now();
        const previousMode = entry.mode;

        if (entry.mode === 'locked') {
            entry.mode = 'off';
            entry.lastTapAt = 0;
        } else if (entry.mode === 'armed') {
            if (timestamp - entry.lastTapAt <= DOUBLE_TAP_MS) {
                entry.mode = 'locked';
                entry.lastTapAt = 0;
            } else {
                entry.mode = 'off';
                entry.lastTapAt = timestamp;
            }
        } else {
            entry.mode = 'armed';
            entry.lastTapAt = timestamp;
        }

        return {
            changed: previousMode !== entry.mode,
            mode: entry.mode
        };
    }

    function resolveVirtualInput(state, key) {
        const safeState = ensureState(state);
        const normalizedKey = (typeof key === 'string') ? key : '';
        if (!normalizedKey) {
            return { payload: '', usedModifiers: [], isModifierKey: false };
        }
        if (normalizedKey === 'Ctrl' || normalizedKey === 'Alt') {
            return { payload: '', usedModifiers: [], isModifierKey: true };
        }

        const usedModifiers = [];
        let payload = mapVirtualKey(normalizedKey);

        if (safeState.modifiers.Ctrl.mode !== 'off') {
            payload = applyCtrlModifier(payload, normalizedKey);
            usedModifiers.push('Ctrl');
        }
        if (safeState.modifiers.Alt.mode !== 'off' && payload) {
            payload = `\x1b${payload}`;
            usedModifiers.push('Alt');
        }

        return {
            payload,
            usedModifiers,
            isModifierKey: false
        };
    }

    function consumeOneShot(state, usedModifiers) {
        const safeState = ensureState(state);
        if (!Array.isArray(usedModifiers) || usedModifiers.length === 0) {
            return false;
        }
        let changed = false;
        usedModifiers.forEach((modifier) => {
            const name = normalizeModifier(modifier);
            if (!name) return;
            if (safeState.modifiers[name].mode === 'armed') {
                safeState.modifiers[name].mode = 'off';
                safeState.modifiers[name].lastTapAt = 0;
                changed = true;
            }
        });
        return changed;
    }

    function getModifierMode(state, modifier) {
        const safeState = ensureState(state);
        const name = normalizeModifier(modifier);
        if (!name) return 'off';
        return safeState.modifiers[name].mode;
    }

    return {
        createModifierState,
        handleModifierTap,
        resolveVirtualInput,
        consumeOneShot,
        getModifierMode,
        DOUBLE_TAP_MS
    };
}));
