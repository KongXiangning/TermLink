'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CodexRolloutCollector } = require('../../../src/services/codexRolloutCollector');
const { FileAnalysisStore } = require('../../../src/services/codexRolloutCollector/analysisBatchImporter');
const { FileCheckpointStore } = require('../../../src/services/codexRolloutCollector/analysisCheckpointStore');
const { FileAnalysisRunStore } = require('../../../src/services/codexRolloutCollector/analysisRunStore');
const { createAnalyzeRequest } = require('../../../src/services/codexRolloutCollector/analyzerProtocol');

async function main() {
    const [binary, root] = process.argv.slice(2);
    const collector = new CodexRolloutCollector({
        analyzerPath: binary,
        analyzerCwd: root,
        store: new FileAnalysisStore({ rootDir: path.join(root, 'analysis') }),
        checkpointStore: new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') }),
        runStore: new FileAnalysisRunStore({ rootDir: path.join(root, 'runs') }),
        requestTimeoutMs: 10000,
        processRestartRetries: 0
    });
    const sent = [];
    const received = [];
    collector.processManager.on('sent', (message) => sent.push(message.message_type));
    collector.processManager.on('message', (message) => received.push(message.message_type));
    let evidence;
    try {
        const result = await collector.analyze(createAnalyzeRequest({
            requestId: 'default-home-request',
            jobId: 'default-home-job',
            conversationId: '019b2b40-beb6-7b23-bed0-37d570e76816',
            mode: 'preview'
        }));
        const checkpoint = await collector.checkpointStore.load(result.scope);
        evidence = {
            codexHomePresent: Object.hasOwn(process.env, 'CODEX_HOME'),
            home: os.homedir(),
            sessionsRoot: collector.processManager.sessionsRoot,
            sent,
            received,
            items: result.state.items.length,
            receipts: result.state.receipts.length,
            checkpointSaved: checkpoint?.request_id === 'default-home-request',
            wrongRootCreated: fs.existsSync(path.join(os.homedir(), 'sessions'))
        };
    } finally {
        await collector.stop();
    }
    evidence.processStopped = collector.processManager.child === null;
    process.stdout.write(JSON.stringify(evidence) + '\n');
}

main().catch((error) => {
    process.stderr.write(String(error.stack || error) + '\n');
    process.exitCode = 1;
});
