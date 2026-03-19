const crypto = require('crypto');

function generateAuditTraceId() {
    return `trace_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

module.exports = {
    generateAuditTraceId
};
