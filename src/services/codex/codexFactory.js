const MockCodexService = require('./mockCodexService');
const RealCodexService = require('./realCodexService');
const Validator = require('../codexRuntimeValidator');

class CodexFactory {
    static async create() {
        //Check Mode from Env
        const mode = process.env.CODEX_MODE || 'auto'; // mock, real, auto

        if (mode === 'mock') {
            console.log('[CodexFactory] Mode forced to MOCK');
            return new MockCodexService();
        }

        // Validate Runtime
        const status = await Validator.validate();
        console.log('[CodexFactory] Runtime Status:', status);

        if (mode === 'real') {
            if (!status.installed) {
                console.error('[CodexFactory] Real mode requested but Codex not installed. Falling back to Mock (warn).');
                // Or throw error? Let's fallback for stability but warn.
                return new MockCodexService();
            }
            return new RealCodexService();
        }

        // Auto Mode
        if (status.installed && status.loggedIn) {
            console.log('[CodexFactory] Auto: Using REAL Codex');
            return new RealCodexService();
        } else {
            console.log('[CodexFactory] Auto: Using MOCK Codex (Not installed/logged in)');
            return new MockCodexService();
        }
    }
}

module.exports = CodexFactory;
