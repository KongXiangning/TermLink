const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Mock implementation of a Codex Service.
 * Implements Risk Classification and Approval State Machine.
 */
class CodexService extends EventEmitter {
    constructor() {
        super();
        this.thinking = false;
        this.history = []; // Key: threadId (But here we mock a single thread for now, or use list)
        this.approvals = new Map(); // approvalId -> { status, command ... }

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

    createApproval(threadId, command, risk) {
        // Enforce concurrency limit
        const pendingCount = Array.from(this.approvals.values()).filter(a => a.sessionId === this.sessionId && a.status === 'pending').length;
        // Optimization: In a real app we'd filter by session. Here CodexService is 1-to-1 with Session.

        const approvalId = uuidv4();
        const approval = {
            id: approvalId,
            threadId,
            command,
            risk,
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000 // 5 mins TTL
        };

        this.approvals.set(approvalId, approval);
        this.emit('approval_request', approval);

        // cleanup expired
        setTimeout(() => {
            if (this.approvals.get(approvalId)?.status === 'pending') {
                this.approvals.get(approvalId).status = 'expired';
                this.emit('approval_update', { id: approvalId, status: 'expired' });
            }
        }, 300000);
    }

    handleApprovalDecision(approvalId, decision) { // decision: 'approved' | 'rejected'
        const approval = this.approvals.get(approvalId);
        if (!approval) return { error: 'Approval not found' };
        if (approval.status !== 'pending') return { error: `Approval is ${approval.status}` };
        if (Date.now() > approval.expiresAt) {
            approval.status = 'expired';
            return { error: 'Approval expired' };
        }

        approval.status = decision;
        this.emit('approval_update', { id: approvalId, status: decision });
        return { success: true, command: decision === 'approved' ? approval.command : null };
    }
}

module.exports = CodexService;
