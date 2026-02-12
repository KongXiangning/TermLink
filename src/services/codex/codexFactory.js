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
            // Wrap in TurnQueue?
            // Ideally, the factory returns the Service.
            // The Queue Logic might be better placed in SessionManager or as a wrapper.
            // Let's modify the return type conceptualy or return the TurnQueue as the 'Service' interface
            // For now, let's keep Factory returning the raw service, and SessionManager wraps it.
            // OR: Factory returns TurnQueue(new RealCodexService())
            // Given the plan: "CodexProcService" is the real one.

            const service = new RealCodexService();
            // service.start() is not needed for new architecture (spawn on demand)
            return service;
        } else {
            console.log('[CodexFactory] Auto: Using MOCK Codex (Not installed/logged in)');
            return new MockCodexService();
        }
    }
}

module.exports = CodexFactory;
