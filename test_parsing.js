const RealCodexService = require('./src/services/codex/realCodexService');

// Mock Spawn to avoid actual process creation failure
const originalSpawn = require('child_process').spawn;
require('child_process').spawn = () => ({
    stdout: { on: () => { } },
    stderr: { on: () => { } },
    stdin: { write: () => { } },
    on: () => { },
    kill: () => { }
});

async function test() {
    console.log('--- Testing RealCodexService Parsing ---');
    const service = new RealCodexService();

    // Listen for approvals
    service.on('approval_request', (approval) => {
        console.log(`[PASS] Approval Requested: ${approval.command} (Risk: ${approval.risk})`);
    });

    // Simulate Output with Command
    const mockOutput = `
    Here is the command you requested:
    \`\`\`bash
    ls -la /root
    \`\`\`
    Be careful.
    `;

    console.log('Simulating output with code block...');
    service.parseCommands('session-1', mockOutput);

    // Simulate Output with formatting
    const mockOutput2 = `
    Try this: \`\`\`bash
    rm -rf /tmp/junk
    \`\`\`
    `;
    console.log('Simulating output with formatting...');
    service.parseCommands('session-1', mockOutput2);

    console.log('--- Test Complete ---');
}

test();
