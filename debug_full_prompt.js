const RealCodexService = require('./src/services/codex/realCodexService');
const service = new RealCodexService();

console.log('--- Debugging Full Prompt (Persistent, Flattened) ---');

service.on('assistant', (evt) => console.log('[ASSISTANT]', evt));
service.on('done', () => console.log('[DONE]'));
service.on('raw', (d) => process.stdout.write(d));

const systemPromptRaw =
    `SYSTEM: You are TermLink agent. Output ONLY lines that start with '@@TERM_LINK/1 ' followed by a JSON object. ` +
    `Never output markdown. Never output extra text. ` +
    `If you want to propose a command, output type="proposal". ` +
    `If you want to answer, output type="assistant". ` +
    `After finishing, output type="done".`;

const userMessageRaw = "你好, 你是?";

// Flatten: Replace newlines with spaces
const systemPrompt = systemPromptRaw.replace(/\n/g, ' ');
const userMessage = userMessageRaw.replace(/\n/g, ' ');

// Turn 1
console.log('--- Turn 1: Sending Flattened Payload ---');
service.sendTurn({
    systemPrompt: systemPrompt,
    userMessage: userMessage
});

service.on('done', () => {
    console.log('Turn Complete. Killing.');
    service.stop();
    process.exit(0);
});

setTimeout(() => {
    console.log('[TIMEOUT] Test timed out after 30s');
    service.stop();
    process.exit(1);
}, 30000);
