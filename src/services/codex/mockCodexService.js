const BaseCodexService = require('./baseCodexService');

/**
 * Mock implementation of a Codex Service.
 * Implements Risk Classification and Approval State Machine.
 */
class MockCodexService extends BaseCodexService {
    constructor() {
        super();
        this.history = []; // Key: threadId (But here we mock a single thread for now, or use list)

        // Ruleset
        this.MAX_PENDING = 1;
    }

    /**
     * Send a user message to Codex.
     * @param {string} content - The user's input.
     * @param {string} threadId - Context thread.
     */
    async sendMessage(content, threadId = 'main') {
        const userMsg = { role: 'user', content, timestamp: Date.now() };
        this.emit('message', { threadId, ...userMsg });

        this.thinking = true;
        this.emit('thinking', { threadId, state: true });

        // Simulate processing delay
        setTimeout(() => {
            this.handleResponse(content, threadId);
        }, 1500);
    }

    handleResponse(userInput, threadId) {
        this.thinking = false;
        this.emit('thinking', { threadId, state: false });

        const lowerMsg = userInput.toLowerCase();
        let analysis = { response: '', command: null, risk: 'safe' };

        // Mock Logic with Risk Classification
        if (lowerMsg.includes('list files')) {
            analysis.response = "I'll list the files in the current directory.";
            analysis.command = "ls -la";
            analysis.risk = "safe";
        } else if (lowerMsg.includes('disk usage')) {
            analysis.response = "Checking disk usage.";
            analysis.command = "df -h";
            analysis.risk = "safe";
        } else if (lowerMsg.includes('reboot')) {
            analysis.response = "Rebooting the system requires confirmation. This is a high-risk operation.";
            analysis.command = "sudo reboot";
            analysis.risk = "dangerous";
        } else if (lowerMsg.includes('remove')) {
            analysis.response = "Deletion is permanent. Please confirm.";
            analysis.command = "rm -rf ./temp";
            analysis.risk = "dangerous";
        } else {
            analysis.response = `I understood "${userInput}", but I don't have a command for it.`;
        }

        const asstMsg = { role: 'assistant', content: analysis.response, timestamp: Date.now() };
        this.emit('message', { threadId, ...asstMsg });

        if (analysis.command) {
            this.createApproval(threadId, analysis.command, analysis.risk);
        }
    }

    // createApproval and handleApprovalDecision are inherited from BaseCodexService
}

module.exports = MockCodexService;
