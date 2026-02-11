const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

class BaseCodexService extends EventEmitter {
    constructor() {
        super();
        this.approvals = new Map(); // approvalId -> { status, command ... }
        this.thinking = false;
    }

    createApproval(threadId, command, risk) {
        // Enforce concurrency limit? 
        // For now, simple implementation.

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

        return approvalId;
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

    // Abstract methods
    async sendMessage(content, threadId) { throw new Error('Not implemented'); }
}

module.exports = BaseCodexService;
