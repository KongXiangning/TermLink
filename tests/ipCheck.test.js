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

test('isIpAllowed supports exact IPv6 match', () => {
    assert.equal(isIpAllowed('::1', ['::1']), true);
    assert.equal(isIpAllowed('::1', ['::2']), false);
});

test('isIpAllowed supports IPv6 loopback and full form', () => {
    assert.equal(isIpAllowed('0000:0000:0000:0000:0000:0000:0000:0001', ['::1']), true);
});

test('isIpAllowed supports IPv6 CIDR match', () => {
    assert.equal(isIpAllowed('fe80::1', ['fe80::/10']), true);
    assert.equal(isIpAllowed('fe80::abcd', ['fe80::/10']), true);
    assert.equal(isIpAllowed('2001:db8::1', ['fe80::/10']), false);
});

test('isIpAllowed supports IPv6 /64 CIDR', () => {
    assert.equal(isIpAllowed('2001:db8:1::99', ['2001:db8:1::/48']), true);
    assert.equal(isIpAllowed('2001:db8:2::1', ['2001:db8:1::/48']), false);
});

test('isIpAllowed handles mixed IPv4 and IPv6 rules', () => {
    const rules = ['10.0.0.0/8', '::1', 'fe80::/10'];
    assert.equal(isIpAllowed('10.1.2.3', rules), true);
    assert.equal(isIpAllowed('::1', rules), true);
    assert.equal(isIpAllowed('fe80::abc', rules), true);
    assert.equal(isIpAllowed('192.168.1.1', rules), false);
});

test('isIpAllowed rejects malformed IPv6 addresses', () => {
    // Malformed addresses should not match even against themselves
    assert.equal(isIpAllowed('gggg::1', ['gggg::1']), false);
    assert.equal(isIpAllowed('1:2:3', ['1:2:3']), false);
    assert.equal(isIpAllowed('1:2:3:4:5:6:7:8:9', ['1:2:3:4:5:6:7:8:9']), false);
});
