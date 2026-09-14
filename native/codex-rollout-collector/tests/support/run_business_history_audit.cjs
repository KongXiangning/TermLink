'use strict';
// This runner succeeds only at collecting a complete audit. It never labels a
// failed Rust business assertion "passed". Normal cargo test retains exit 101.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const outputArg = process.argv.indexOf('--output');
if (outputArg < 0 || !process.argv[outputArg + 1]) throw new Error('--output required');
const output = path.resolve(process.argv[outputArg + 1]);
const temp = fs.realpathSync(os.tmpdir());
const relative = path.relative(temp, output);
if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('output must be under OS TEMP');
fs.mkdirSync(output, { recursive: true });
// Preserve earlier attempts, including inputs and failures, before rerunning.
if (fs.existsSync(path.join(output, 'report.json'))) {
  const archive = path.join(output, 'attempts', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(archive, { recursive: true });
  for (const name of fs.readdirSync(output)) {
    if (name === 'report.json' || /^[\w-]+\.(stdout|stderr)\.txt$/.test(name)) {
      fs.copyFileSync(path.join(output, name), path.join(archive, name));
    }
  }
}
const target = path.join(temp, 'termlink-rust-issues-audit/current-target');
const manifest = 'native/codex-rollout-collector/Cargo.toml';
const base = ['test', '--locked', '--manifest-path', manifest, '--target-dir', target];
const report = { schema: 4, kind: 'current-rust-business-audit', productPass: false,
  collectionPass: false, cases: [], commands: [], hashes: {}, startedAt: new Date().toISOString() };
function hashFile(file) {
  report.hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
for (const file of [manifest, 'native/codex-rollout-collector/Cargo.lock',
  'native/codex-rollout-collector/tests/business_history_audit.rs',
  'native/codex-rollout-collector/tests/support/run_business_history_audit.cjs',
  'native/codex-rollout-collector/src/protocol/target_source.rs',
  'native/codex-rollout-collector/src/protocol/target_mapping.rs',
  'native/codex-rollout-collector/src/protocol/target_runtime.rs',
  'native/codex-rollout-collector/src/source/segment.rs',
  'native/codex-rollout-collector/src/source/cursor.rs',
  'docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md']) hashFile(file);
function run(label, args, timeout = 180000) {
  console.log(label);
  const result = spawnSync('cargo', args, { cwd: root, encoding: 'utf8',
    timeout, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(path.join(output, label + '.stdout.txt'), result.stdout || '');
  fs.writeFileSync(path.join(output, label + '.stderr.txt'), result.stderr || '');
  report.commands.push({ label, executable: 'cargo', args, exit: result.status,
    signal: result.signal, error: result.error?.message || null });
  if (result.error || result.signal || result.status === null) throw new Error(label + ': process failure');
  return result;
}
function requireSuccess(label, args, timeout) {
  const result = run(label, args, timeout);
  if (result.status !== 0) throw new Error(label + ': infrastructure/regression failed, exit ' + result.status);
  return result;
}
try {
  requireSuccess('build', [...base, '--test', 'business_history_audit', '--no-run'], 1200000);
  const listing = requireSuccess('list', [...base, '--test', 'business_history_audit', '--', '--list']);
  const names = listing.stdout.split(/\r?\n/).filter(s => /^r\d\d_\w+: test$/.test(s)).map(s => s.slice(0, -6));
  if (names.length !== 32 || new Set(names.map(n => n.slice(0, 3))).size !== 32) throw new Error('expected exactly 32 unique case IDs');
  for (let i = 1; i <= 32; i++) {
    if (!names.some(n => n.startsWith('r' + String(i).padStart(2, '0') + '_'))) throw new Error('missing case ' + i);
  }
  for (const name of names) {
    const result = run(name, [...base, '--test', 'business_history_audit', name, '--', '--exact', '--nocapture']);
    const id = name.slice(0, 3).toUpperCase();
    const parse = prefix => result.stdout.split(/\r?\n/).filter(s => s.startsWith(prefix))
      .map(s => JSON.parse(s.slice(prefix.length)));
    const differences = parse('AUDIT_ASSERT ');
    const observations = parse('AUDIT_OBSERVATION ');
    const inputs = parse('AUDIT_INPUT ');
    const windows = parse('AUDIT_WINDOW_INPUT ');
    const phases = parse('AUDIT_PHASE ');
    const limitations = parse('AUDIT_LIMITATION ');
    const actualWindows = parse('AUDIT_WINDOWS ');
    const fixtureHashes = inputs.map(input => ({
      path: input.path, bytes: Buffer.byteLength(input.contents), lines: input.lines,
      sha256: crypto.createHash('sha256').update(input.contents).digest('hex')
    }));
    const panicLines = result.stderr.split(/\r?\n/).filter(s => s.includes('panicked at'));
    let status;
    const boundaryDifferences = differences.filter(d => d.classification === 'typed-boundary');
    const validBoundary = d => ['R02', 'R06', 'R09'].includes(id)
      && d.field === 'internal_ordinal_boundary'
      && d.actual.api === 'SegmentDescriptor::from_records'
      && d.actual.variant === 'InvalidRolloutOrdinalRange' && d.actual.ordinal === 0
      && d.actual.range[0] === 0 && d.actual.range[1] > 0;
    if (boundaryDifferences.length > 0 && (!boundaryDifferences.every(validBoundary)
      || !['internal_terminal_consumed', 'independent_ordered_reference',
        'restored_incremental_reducer', 'public_independent_backfill'].every(phase => phases.some(p => p.phase === phase)))) {
      throw new Error(name + ': invalid boundary classification or independent phase not reached');
    }
    if (result.status === 0 && differences.length === 0 && observations.length > 0) status = limitations.length ? 'limited' : 'passed';
    else if (result.status === 101 && differences.length > 0
      && differences.every(d => d.case === id && (d.classification === 'business-oracle'
        || (d.classification === 'typed-boundary' && validBoundary(d)))
        && observations.some(o => o.case === id && o.field === d.field
          && JSON.stringify(o.actual) === JSON.stringify(d.actual)
          && JSON.stringify(o.expected) === JSON.stringify(d.expected)))
      && panicLines.length === 1 && !/infrastructure|invalid synthetic input/.test(result.stderr)
      && differences.some(d => result.stderr.includes('business assertion ' + id + '/' + d.field))) status = 'business-difference';
    else throw new Error(name + ': unclassified failure or incomplete observations');
    report.cases.push({ id, name, status, exit: result.status, observations, differences, boundaryDifferences, fixtureHashes, windows, actualWindows, phases, limitations });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  requireSuccess('existing-regression', [...base, '--test', 'conformance', '--test', 'stage4_target_protocol'], 600000);
  report.collectionPass = true;
  report.productPass = report.cases.every(c => c.status === 'passed');
} catch (error) {
  report.infrastructureFailure = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ collectionPass: report.collectionPass, productPass: report.productPass,
    passed: report.cases.filter(c => c.status === 'passed').length,
    businessDifferences: report.cases.filter(c => c.status === 'business-difference').length,
    infrastructureFailure: report.infrastructureFailure || null, output }));
}
