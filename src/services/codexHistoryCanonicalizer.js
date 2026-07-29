'use strict';

const crypto = require('node:crypto');

const TRANSPORT_KEYS = new Set([
    'revision', 'baseRevision', 'sourceClientId', 'sourceEpoch', 'receivedAt', 'updatedAt',
    'recencyAt', 'createdAt', 'transportTimestamp', 'debug', 'debugMetadata', 'projection',
    'schedulerAt', 'raw', 'params'
]);

function canonicalize(value) {
    return JSON.stringify(sortCanonical(value));
}

function hashPayload(payloadJson) {
    return crypto.createHash('sha256').update(String(payloadJson), 'utf8').digest('hex');
}

function buildConversationRoot(items, schemaVersion = 1) {
    const chunks = [uint32(schemaVersion)];
    for (const item of [...(Array.isArray(items) ? items : [])].sort((a, b) => (a.position || 0) - (b.position || 0))) {
        const itemKey = String(item.itemKey || '');
        const keyBytes = Buffer.from(itemKey, 'utf8');
        chunks.push(uint32(keyBytes.length), keyBytes);
        chunks.push(Buffer.from(String(item.contentHash || '').padEnd(64, '0').slice(0, 64), 'hex'));
    }
    return crypto.createHash('sha256').update(Buffer.concat(chunks)).digest('hex');
}

function projectCanonicalHistory({ sourceKind, sourceData, positionOffset = 0 }) {
    const turns = normalizeTurns(sourceKind, sourceData);
    const result = [];
    for (const turn of turns) {
        const turnRecord = asRecord(turn) || {};
        const turnId = stringOrNull(turnRecord.turnId || turnRecord.id);
        const terminal = isTerminal(turnRecord.status || turnRecord.state);
        const rawItems = extractTurnItems(turnRecord);
        const seen = new Set();
        let ordinal = 0;
        for (const rawItem of rawItems) {
            const item = asRecord(rawItem) || {};
            const clientRequestId = resolveClientRequestId(item, turnRecord);
            const itemType = normalizeItemType(item);
            const role = normalizeRole(item, itemType);
            const explicitKey = resolveStableKey(item, clientRequestId, turnId, role, itemType);
            const identityStability = explicitKey ? 'stable' : terminal ? 'stable' : 'unstable';
            if (!explicitKey && !terminal) continue;
            const itemKey = explicitKey || `${turnId || 'turn'}:${itemType}:final:${ordinal}`;
            if (seen.has(itemKey)) continue;
            seen.add(itemKey);
            const payload = buildSemanticPayload(item, turnRecord, itemType, role, clientRequestId);
            const payloadJson = canonicalize(payload);
            result.push({
                itemKey,
                turnId,
                position: positionOffset + result.length,
                itemType,
                role,
                clientRequestId,
                payloadJson,
                contentHash: hashPayload(payloadJson),
                identityStability,
                provisional: false
            });
            ordinal += 1;
        }
    }
    return result;
}

function normalizeTurns(sourceKind, sourceData) {
    const source = asRecord(sourceData) || {};
    if (sourceKind === 'app_server_turns_page') {
        return Array.isArray(source) ? source : Array.isArray(source.data) ? source.data : [];
    }
    if (sourceKind === 'app_server_thread') return Array.isArray(source.turns) ? source.turns : [];
    const direct = Array.isArray(source.turns)
        ? source.turns
        : Array.isArray(source.conversationState?.turns) ? source.conversationState.turns : [];
    const history = source.turnHistory || source.conversationState?.turnHistory;
    const historical = historyTurns(history);
    if (historical.length === 0) return direct;
    const merged = historical.map((turn) => cloneValue(turn));
    const indexes = new Map(merged.map((turn, index) => [stringOrNull(turn?.turnId || turn?.id), index]));
    for (const turn of direct) {
        const id = stringOrNull(turn?.turnId || turn?.id);
        const index = id ? indexes.get(id) : undefined;
        if (index === undefined) {
            merged.push(turn);
            if (id) indexes.set(id, merged.length - 1);
        } else {
            merged[index] = turn;
        }
    }
    return merged;
}

function historyTurns(turnHistory) {
    const history = asRecord(turnHistory)?.history || asRecord(turnHistory);
    const entities = asRecord(history?.entitiesByKey);
    if (!entities) return [];
    const result = [];
    const seen = new Set();
    const append = (key) => {
        const turn = entities[key];
        const id = stringOrNull(turn?.turnId || turn?.id);
        if (!id || seen.has(id)) return;
        seen.add(id);
        result.push(turn);
    };
    for (const island of Array.isArray(history?.islands) ? history.islands : []) {
        for (const entry of Array.isArray(island?.entries) ? island.entries : []) append(entry?.value || entry?.key);
    }
    for (const key of Object.keys(entities)) append(key);
    return result;
}

function extractTurnItems(turn) {
    const items = Array.isArray(turn.items) ? turn.items : [];
    if (items.length > 0) return items;
    const input = Array.isArray(turn.params?.input) ? turn.params.input : [];
    return input.length > 0 ? [{ type: 'userMessage', id: turn.params?.clientUserMessageId, content: input }] : [];
}

function resolveClientRequestId(item, turn) {
    const value = item.clientRequestId ?? item.clientUserMessageId ?? item.clientId ?? turn.params?.clientUserMessageId;
    return value === undefined || value === null ? null : String(value);
}

function resolveStableKey(item, clientRequestId, turnId, role, itemType) {
    const explicit = item.id ?? item.itemId;
    if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
    if (clientRequestId) return clientRequestId;
    const requestId = item.requestId ?? item.rawRequestId;
    if ((typeof requestId === 'string' && requestId.trim()) || typeof requestId === 'number') return String(requestId);
    const callId = item.callId ?? item.toolCallId ?? item.mcpCallId;
    if (typeof callId === 'string' && callId.trim()) return callId.trim();
    if (item.protocolSlot !== undefined && turnId) return `${turnId}:message:${role || 'unknown'}:${item.protocolSlot}`;
    return null;
}

function buildSemanticPayload(item, turn, itemType, role, clientRequestId) {
    const payload = { ...item };
    for (const key of Object.keys(payload)) {
        if (TRANSPORT_KEYS.has(key) || key === 'id' || key === 'itemId' || key === 'clientId' || key === 'clientUserMessageId') delete payload[key];
    }
    if (clientRequestId !== null) payload.clientRequestId = clientRequestId;
    payload.itemType = itemType;
    if (role !== null) payload.role = role;
    if (turn.status !== undefined) payload.turnStatus = turn.status;
    return payload;
}

function normalizeItemType(item) {
    const value = String(item.itemType || item.type || item.kind || 'message');
    if (/user/i.test(value)) return 'user_message';
    if (/assistant|agent.?message/i.test(value)) return 'assistant_message';
    if (/plan/i.test(value)) return 'plan';
    if (/command|exec/i.test(value)) return 'command';
    if (/file/i.test(value)) return 'file_change';
    if (/mcp|tool/i.test(value)) return 'tool';
    if (/skill/i.test(value)) return 'skill';
    return value;
}

function normalizeRole(item, itemType) {
    if (typeof item.role === 'string') return item.role;
    if (itemType === 'user_message') return 'user';
    if (itemType === 'assistant_message') return 'assistant';
    return null;
}

function isTerminal(value) {
    const normalized = String(value || '').toLowerCase();
    return ['completed', 'complete', 'done', 'finished', 'failed', 'error', 'cancelled', 'canceled', 'interrupted'].includes(normalized);
}

function sortCanonical(value) {
    if (Array.isArray(value)) return value.map(sortCanonical);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    for (const key of Object.keys(value).filter((key) => value[key] !== undefined && !TRANSPORT_KEYS.has(key)).sort(compareCodePoints)) {
        output[key] = sortCanonical(value[key]);
    }
    return output;
}

function compareCodePoints(left, right) {
    const a = Array.from(left).map((value) => value.codePointAt(0));
    const b = Array.from(right).map((value) => value.codePointAt(0));
    for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return a.length - b.length;
}

function uint32(value) {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt32BE(Number(value) >>> 0, 0);
    return buffer;
}

function stringOrNull(value) {
    return value === undefined || value === null || String(value).trim() === '' ? null : String(value);
}

function asRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined; }
function cloneValue(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)); }

module.exports = {
    canonicalize,
    hashPayload,
    buildConversationRoot,
    projectCanonicalHistory,
    sortCanonical
};
