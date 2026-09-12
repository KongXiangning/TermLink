'use strict';

const path = require('node:path');
const { CodexRolloutCollector, FileAnalysisStore, FileCheckpointStore, FileAnalysisRunStore } =
    require('../../../src/services/codexRolloutCollector');

// Exit after staging is durable but before the corresponding run update/ACK.
// This is the cross-store crash window; no graceful Collector.stop() runs.
class CrashRunStore extends FileAnalysisRunStore {
    async update(id, patch) {
        if (patch.status === 'ack_pending') process.exit(83);
        return super.update(id, patch);
    }
}

const root = process.argv[2];
const collector = new CodexRolloutCollector({
    analyzerPath: process.execPath,
    analyzerArgs: [path.join(__dirname, 'fake-analyzer.js')],
    analyzerEnv: { CODEX_HOME: root },
    store: new FileAnalysisStore({ rootDir: path.join(root, 'staging') }),
    checkpointStore: new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') }),
    runStore: new CrashRunStore({ rootDir: path.join(root, 'runs') }),
    processRestartRetries: 2
});
collector.analyze({
    job_id: 'crash-job', conversation_id: 'crash-conversation', mode: 'backfill',
    priority: 'background', resource_limits: { timeout_ms: 30000, max_segment_bytes: 1024 }
}, { requestId: 'before-node-crash', timeoutMs: 30000 }).catch((error) => {
    process.stderr.write(error.stack);
    process.exit(1);
});
