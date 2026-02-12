const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class CodexRuntimeValidator {
    async validate() {
        const result = {
            installed: false,
            authMode: 'none',
            loggedIn: false,
            details: ''
        };

        // 1. Check if installed
        try {
            await execAsync('which codex');
            result.installed = true;
        } catch (e) {
            result.details = 'Codex CLI not found in PATH.';
            return result;
        }

        // 2. Check Auth (Priority: Login Status > API Key)
        // Check Login Status
        try {
            console.log('[CodexRuntimeValidator] Checking login status...');
            const { stdout, stderr } = await execAsync('codex login status');
            console.log('[CodexRuntimeValidator] stdout:', stdout);
            console.log('[CodexRuntimeValidator] stderr:', stderr);

            if (stdout.toLowerCase().includes('logged in') || stderr.toLowerCase().includes('logged in')) {
                result.loggedIn = true;
                result.authMode = 'oauth';
                result.details = 'Logged in via Device Auth.';
            } else {
                console.log('[CodexRuntimeValidator] Not logged in (output mismatch)');
                result.details = 'Codex installed but not logged in.';
            }
        } catch (e) {
            console.error('[CodexRuntimeValidator] Validation Error:', e.message);
            // Check API Key Fallback
            if (process.env.OPENAI_API_KEY) {
                result.loggedIn = true; // Treated as logged in for usage
                result.authMode = 'apiKey';
                result.details = 'Authenticated via OPENAI_API_KEY.';
            } else {
                result.loggedIn = false;
                result.details = 'Not logged in and no API Key found.';
            }
        }

        return result;
    }
}

module.exports = new CodexRuntimeValidator();
