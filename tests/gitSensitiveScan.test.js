const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scanner = path.resolve(__dirname, '../scripts/git-sensitive-scan.ps1');
const shells = (process.platform === 'win32' ? ['powershell.exe', 'pwsh.exe'] : ['pwsh'])
    .filter(shell => spawnSync(shell, ['-NoProfile', '-Command', 'exit 0']).status === 0);

// Construct synthetic inputs at runtime: the source is not a credential dump,
// while the generated .blob still exercises every scanner rule without markers.
const attribute = (name, value, quote = '"') => `${name}=${quote}${value}${quote}`;

const cases = [
    {
        name: 'UI node boolean attributes pass in .blob evidence',
        xml: `<?xml version="1.0"?><hierarchy rotation="0"><node ${attribute('password', 'false')}><node ${attribute('password', 'true', "'")}/></node></hierarchy>`,
        status: 0
    },
    {
        name: 'multiline CRLF attributes preserve parser offsets',
        xml: `<?xml version="1.0"?>\r\n<hierarchy>\r\n  <node text="非 ASCII 😀"\r\n ${attribute('password', 'false').replace('=', ' = ')}><node\r\n ${attribute('password', 'true', "'")}/></node>\r\n</hierarchy>`,
        status: 0
    },
    {
        name: 'same node real credential is blocked after boolean attribute',
        xml: `<hierarchy><node ${attribute('password', 'false')} ${attribute('api_key', 'fixture-real-key')}/></hierarchy>`,
        status: 1
    },
    {
        name: 'same line real password is blocked before boolean attribute',
        xml: `<hierarchy><node ${attribute('password', 'fixture-real-password')}/><node ${attribute('password', 'false')}/></hierarchy>`,
        status: 1
    },
    {
        name: 'same XML real password on later line is blocked',
        xml: `<hierarchy>\n<node ${attribute('password', 'false')}/>\n<node ${attribute('password', 'fixture-real-password')}/>\n</hierarchy>`,
        status: 1,
        line: 3
    },
    {
        name: 'credential inside another attribute value is still scanned',
        xml: `<hierarchy><node ${attribute('password', 'false')} text="${attribute('password', 'fixture-real-password', "'")}"/></hierarchy>`,
        status: 1
    },
    {
        name: 'credential in XML text is still scanned',
        xml: `<hierarchy><node ${attribute('password', 'false')}>${attribute('secret', 'fixture-real-secret')}</node></hierarchy>`,
        status: 1
    },
    ...[
        ['comment', `<!-- ${attribute('password', 'false')} -->`],
        ['CDATA', `<![CDATA[${attribute('password', 'false')}]]>`],
        ['attribute lookalike', `<node text="${attribute('password', 'false', "'")}"/>`]
    ].map(([name, content]) => ({
        name: `${name} is not a UI boolean attribute`,
        xml: `<hierarchy><node ${attribute('password', 'false')}/>${content}</hierarchy>`,
        status: 1
    })),
    ...[
        ['non-UI root', `<config><node ${attribute('password', 'false')}/></config>`],
        ['non-node element', `<hierarchy><config ${attribute('password', 'false')}/></hierarchy>`],
        ['root attribute', `<hierarchy ${attribute('password', 'false')}><node/></hierarchy>`],
        ['namespaced node', `<hierarchy xmlns:x="urn:test"><x:node ${attribute('password', 'false')}/></hierarchy>`],
        ['namespaced attribute', `<hierarchy xmlns:x="urn:test"><node ${attribute('x:password', 'false')}/></hierarchy>`],
        ['non-boolean value', `<hierarchy><node ${attribute('password', 'FALSE')}/></hierarchy>`],
        ['entity-encoded value', `<hierarchy><node ${attribute('password', 'f&#97;lse')}/></hierarchy>`],
        ['invalid XML after node', `<hierarchy><node ${attribute('password', 'false')}/></broken>`],
        ['duplicate attribute', `<hierarchy><node ${attribute('password', 'false')} ${attribute('password', 'fixture-real-password')}/></hierarchy>`],
        ['DTD', `<!DOCTYPE hierarchy [<!ENTITY value "false">]><hierarchy><node ${attribute('password', 'false')}/></hierarchy>`],
        ['plain text .blob', attribute('password', 'false')]
    ].map(([name, xml]) => ({ name: `${name} has no exemption`, xml, status: 1 })),
    ...[
        ['Private key block', ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')],
        ['AWS access key', ['AKIA', '1234567890123456'].join('')],
        ['Bearer token literal', ['Authorization:', 'Bearer', 'fixture-token'].join(' ')],
        ['Credential in URL', ['https://', 'fixture-user', ':', 'fixture-password', '@example.invalid/'].join('')]
    ].map(([rule, content]) => ({
        name: `${rule} remains blocked in same XML`,
        xml: `<hierarchy><node ${attribute('password', 'false')} text="${content}"/></hierarchy>`,
        status: 1,
        rule
    }))
];

test('sensitive scanner UI XML regressions', { skip: shells.length === 0 && 'PowerShell is unavailable' }, async t => {
    const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-sensitive-scan-'));
    try {
        for (const shell of shells) {
            await t.test(`${shell}: test source passes scanning without exemptions`, () => {
                const result = spawnSync(shell, [
                    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scanner, '-Files', __filename
                ], { encoding: 'utf8', timeout: 15000 });
                assert.ifError(result.error);
                assert.equal(result.status, 0, result.stdout + result.stderr);
                assert.match(result.stdout, /\[sensitive-scan\] PASS/);
            });
            for (const fixture of cases) {
                await t.test(`${shell}: ${fixture.name}`, () => {
                    const fixturePath = path.join(fixtureDirectory, 'evidence.blob');
                    fs.writeFileSync(fixturePath, fixture.xml, 'utf8');
                    const result = spawnSync(shell, [
                        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scanner, '-Files', fixturePath
                    ], { encoding: 'utf8', timeout: 15000 });
                    assert.ifError(result.error);
                    assert.equal(result.status, fixture.status, result.stdout + result.stderr);
                    if (fixture.status === 0) {
                        assert.match(result.stdout, /\[sensitive-scan\] PASS/);
                    } else {
                        assert.ok(result.stdout.includes(`[${fixture.rule || 'Credential assignment'}]`), result.stdout);
                        if (fixture.line) assert.ok(result.stdout.includes(`:${fixture.line} [`), result.stdout);
                    }
                });
            }
        }
    } finally {
        fs.rmSync(fixtureDirectory, { recursive: true, force: true });
    }
});
