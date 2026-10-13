const test = require('node:test');
const assert = require('node:assert/strict');
const { ClientRegistrationManager } = require('../src/services/clientRegistrationManager');
const createClientRegistrationsRouter = require('../src/routes/clientRegistrations');

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(value) { this.body = value; return this; }
    };
}

test('client registration rejects missing records and invalid IDs', () => {
    const manager = new ClientRegistrationManager({ enabled: false });
    for (const id of ['missing-registration', '  missing-registration  ', '', '  ', null, undefined, 42, {}]) {
        assert.equal(manager.isActive(id), false);
    }
});

test('client registration normalizes active IDs and rejects revoked records including timestamp zero', () => {
    const manager = new ClientRegistrationManager({ enabled: false });
    const registration = manager.create('android');
    assert.equal(manager.isActive(`  ${registration.id}  `), true);
    assert.equal(manager.revoke(registration.id), true);
    assert.equal(manager.isActive(`  ${registration.id}  `), false);
    manager.registrations.set('revoked-at-zero', { id: 'revoked-at-zero', revokedAt: 0 });
    assert.equal(manager.isActive('revoked-at-zero'), false);
});

test('client registration creates opaque ids and revokes them', () => {
    const manager = new ClientRegistrationManager({ enabled: false });
    const registration = manager.create('android');
    assert.match(registration.id, /^[0-9a-f-]{36}$/i);
    assert.equal(manager.isActive(registration.id), true);
    assert.equal(manager.revoke(registration.id), true);
    assert.equal(manager.isActive(registration.id), false);
});

test('client registration routes revoke owned sessions without touching history cache', () => {
    const manager = new ClientRegistrationManager({ enabled: false });
    let marked = null;
    const router = createClientRegistrationsRouter({
        registrationManager: manager,
        sessionManager: { markRegistrationDeleted(id) { marked = id; } }
    });
    const post = router.stack.find((entry) => entry.route?.path === '/client-registrations' && entry.route.methods.post).route.stack[0].handle;
    const del = router.stack.find((entry) => entry.route?.path === '/client-registrations/:registrationId' && entry.route.methods.delete).route.stack[0].handle;
    const created = response();
    post({ body: { clientType: 'android' } }, created);
    const id = created.body.registrationId;
    const deleted = response();
    del({ params: { registrationId: id } }, deleted);
    assert.equal(deleted.body.revoked, true);
    assert.equal(marked, id);
});
