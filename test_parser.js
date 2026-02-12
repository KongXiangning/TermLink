const ProtocolParser = require('./src/services/codex/protocolParser');

console.log('--- Testing ProtocolParser ---');

const parser = new ProtocolParser();

parser.on('assistant', (evt) => console.log('[Event: assistant]', evt));
parser.on('proposal', (evt) => console.log('[Event: proposal]', evt));
parser.on('status', (evt) => console.log('[Event: status]', evt));
parser.on('done', (evt) => console.log('[Event: done]', evt));
parser.on('raw', (data) => console.log('[Event: raw]', JSON.stringify(data)));
parser.on('error', (evt) => console.log('[Event: error]', evt));

// Test 1: Standard framed message
console.log('\nTest 1: Standard framed message');
parser.feed('@@TERM_LINK/1 {"type":"assistant","content":"Hello world"}\n');

// Test 2: Standard proposal
console.log('\nTest 2: Proposal');
parser.feed('@@TERM_LINK/1 {"type":"proposal","command":"ls -la","risk":"safe","summary":"list files"}\n');

// Test 3: Raw text (thinking)
console.log('\nTest 3: Raw text');
parser.feed('Thinking about the request...\n');

// Test 4: Split chunk (streaming)
console.log('\nTest 4: Split chunk');
parser.feed('@@TERM_LINK/1 {"type":"sta');
parser.feed('tus","status":"thinking"}\n');

// Test 5: Malformed JSON
console.log('\nTest 5: Malformed JSON');
parser.feed('@@TERM_LINK/1 {"type":"assistant", "content": "oops\n');

// Test 6: Done
console.log('\nTest 6: Done');
parser.feed('@@TERM_LINK/1 {"type":"done"}\n');
