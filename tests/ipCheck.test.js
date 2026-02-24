const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIp, isIpAllowed } = require('../src/utils/ipCheck');

test('normalizeIp strips IPv4-mapped IPv6 prefix', () => {
    assert.equal(normalizeIp('::ffff:127.0.0.1'), '127.0.0.1');
});

test('isIpAllowed supports exact match', () => {
    assert.equal(isIpAllowed('10.1.2.3', ['10.1.2.3']), true);
    assert.equal(isIpAllowed('10.1.2.4', ['10.1.2.3']), false);
});

test('isIpAllowed supports IPv4 CIDR match', () => {
    assert.equal(isIpAllowed('10.2.3.4', ['10.0.0.0/8']), true);
    assert.equal(isIpAllowed('172.16.0.1', ['10.0.0.0/8']), false);
});

test('isIpAllowed allows all when whitelist is empty', () => {
    assert.equal(isIpAllowed('203.0.113.9', []), true);
});
