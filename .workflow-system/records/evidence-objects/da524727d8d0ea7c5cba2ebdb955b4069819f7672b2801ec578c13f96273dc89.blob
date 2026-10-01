use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use codex_rollout_collector::codex_adapter::CodexEventAdapter;
use codex_rollout_collector::model::{AnalysisEvent, Availability, TurnStatus};
use codex_rollout_collector::{
    AnalysisProjection, AnalysisReducer, AppendReadReport, CompatibilityProfile, CursorError,
    ForwardAppendCursor, JsonlSourceBackend, PlannedReadReport, SegmentAssembler, SegmentAssembly,
    SegmentCompleteness, SegmentDescriptor, SnapshotBoundary, SourceBackend, SourceByteRange,
    SourceFixtureHash, SourceReadMode, SourceReadPlan, SourceRecord, SourceSegment, SourceSpec,
    analyze_records_with_adapter, analyze_source,
};
use serde::Deserialize;
use serde_json::Value;

struct TempJsonl {
    path: PathBuf,
}

impl TempJsonl {
    fn new(name: &str, contents: &[u8]) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "termlink-rollout-stage3-{name}-{}-{nonce}.jsonl",
            std::process::id()
        ));
        fs::write(&path, contents).expect("write lifecycle fixture");
        Self { path }
    }

    fn append(&self, contents: &[u8]) {
        let mut file = OpenOptions::new()
            .append(true)
            .open(&self.path)
            .expect("open lifecycle fixture");
        file.write_all(contents).expect("append lifecycle fixture");
        file.sync_all().expect("sync lifecycle fixture");
    }
}

impl Drop for TempJsonl {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

fn fixture(relative: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(relative)
}

struct ActualOracleRun {
    root: PathBuf,
    demo_report: Value,
    demo_projection: Value,
    spike_report: Value,
}

impl Drop for ActualOracleRun {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn explicit_oracle_binary(crate_name: &str) -> Option<PathBuf> {
    let variable = match crate_name {
        "codex-rollout-demo" => "TERMLINK_STAGE3_DEMO_BIN",
        "codex-rollout-compat-spike" => "TERMLINK_STAGE3_SPIKE_BIN",
        _ => return None,
    };
    let path = std::env::var_os(variable).map(PathBuf::from)?;
    assert!(
        path.is_absolute(),
        "{variable} must be an absolute oracle binary path: {path:?}"
    );
    assert!(
        path.is_file(),
        "{variable} must point to an existing oracle binary: {path:?}"
    );
    eprintln!("{variable}={}", path.display());
    Some(path)
}

fn oracle_binary(crate_name: &str, binary_name: &str) -> PathBuf {
    if let Some(path) = explicit_oracle_binary(crate_name) {
        return path;
    }

    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("native directory");
    let binary = root
        .join(crate_name)
        .join("target")
        .join("debug")
        .join(if cfg!(windows) {
            format!("{binary_name}.exe")
        } else {
            binary_name.to_string()
        });
    if binary.is_file() {
        return binary;
    }

    let manifest = root.join(crate_name).join("Cargo.toml");
    let status = Command::new("cargo")
        .args([
            "build",
            "--locked",
            "--offline",
            "--manifest-path",
            manifest.to_str().expect("manifest path is UTF-8"),
            "--bin",
            binary_name,
        ])
        .status()
        .expect("cargo is available for oracle build");
    assert!(status.success(), "oracle build failed: {manifest:?}");
    assert!(
        binary.is_file(),
        "oracle binary was not produced: {binary:?}"
    );
    binary
}

fn run_actual_oracles() -> ActualOracleRun {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let root = std::env::temp_dir().join(format!(
        "termlink-stage3-actual-oracles-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&root).expect("oracle temp directory creates");

    // The Demo intentionally derives its legacy session identity from a UUID
    // filename.  The formal adapter still receives its explicit caller ID
    // below; the comparison is therefore made on stable turn/tool/plan
    // semantics rather than on a filename-derived conversation identity.
    let rollout = root.join("019b2b40-beb6-7b23-bed0-37d570e76816.jsonl");
    fs::copy(fixture("current/minimal-rollout.jsonl"), &rollout).expect("oracle rollout copies");
    let demo_report_path = root.join("demo-report.json");
    let demo_binary = oracle_binary("codex-rollout-demo", "codex-rollout-demo");
    let demo = Command::new(&demo_binary)
        .args([
            "--rollout",
            rollout.to_str().expect("rollout path is UTF-8"),
            "--report",
            demo_report_path.to_str().expect("report path is UTF-8"),
            "--parser",
            "demo",
        ])
        .output()
        .expect("Demo reducer starts");
    assert!(
        demo.status.success(),
        "Demo reducer failed: {}",
        String::from_utf8_lossy(&demo.stderr)
    );
    let demo_report: Value = serde_json::from_slice(
        &fs::read(&demo_report_path).expect("Demo report is generated in the test"),
    )
    .expect("Demo report JSON parses");
    let demo_projection_path = demo_report_path.with_extension("projection.json");
    let demo_projection: Value = serde_json::from_slice(
        &fs::read(&demo_projection_path).expect("Demo projection is generated in the test"),
    )
    .expect("Demo projection JSON parses");

    let spike_output_path = root.join("spike-output.jsonl");
    let spike_binary = oracle_binary("codex-rollout-compat-spike", "codex-rollout-compat-spike");
    let spike = Command::new(&spike_binary)
        .args([
            "--rollout",
            rollout.to_str().expect("rollout path is UTF-8"),
            "--output",
            spike_output_path
                .to_str()
                .expect("spike output path is UTF-8"),
        ])
        .output()
        .expect("Spike parser starts");
    assert!(
        spike.status.success(),
        "Spike parser failed: {}",
        String::from_utf8_lossy(&spike.stderr)
    );
    assert!(
        fs::metadata(&spike_output_path)
            .expect("Spike output is generated")
            .len()
            > 0,
        "Spike parser must emit parsed records"
    );
    let spike_report: Value = serde_json::from_slice(&spike.stdout).expect("Spike report parses");

    ActualOracleRun {
        root,
        demo_report,
        demo_projection,
        spike_report,
    }
}

#[derive(Debug, Deserialize)]
struct DemoOracleGolden {
    demo_oracle: DemoOracleSurface,
    complete: bool,
    availability: Availability,
    turn_id: String,
    turn_status: String,
    turn_usage_total_tokens: i64,
    session_usage_total_tokens: i64,
    item_keys: Vec<String>,
    tool_keys: Vec<String>,
    plan_state: String,
    diagnostic_codes: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct DemoOracleSurface {
    partial: bool,
    turn_id: String,
    turn_status: String,
    turn_usage_total_tokens: i64,
    session_usage_total_tokens: i64,
    item_kinds: Vec<String>,
    tool_call_ids: Vec<String>,
    plan_state: String,
}

fn projected_fixture(
    relative: &str,
) -> (codex_rollout_collector::AnalysisBatch, AnalysisProjection) {
    let backend = JsonlSourceBackend;
    let spec = SourceSpec::bind("caller-conversation", "stable-rollout", fixture(relative))
        .expect("source binding")
        .with_source_epoch("fixture-epoch")
        .expect("source epoch");
    let batch =
        analyze_source(&backend, &spec, CompatibilityProfile::Current).expect("fixture analyzes");
    let projection = AnalysisReducer::reduce_batch(&batch);
    (batch, projection)
}

fn lifecycle_spec(path: &Path, bytes: &[u8]) -> SourceSpec {
    let hash = SourceFixtureHash::from_bytes(bytes);
    SourceSpec::bind("lifecycle-conversation", "lifecycle-source", path)
        .expect("source binding")
        .with_source_epoch("lifecycle-epoch")
        .expect("source epoch")
        .with_fingerprint(
            codex_rollout_collector::SourceFingerprint::new(
                hash.algorithm(),
                hash.digest(),
                hash.byte_length(),
            )
            .expect("source fingerprint"),
        )
        .with_prefix_anchor(
            codex_rollout_collector::SourcePrefixAnchor::new(
                hash.algorithm(),
                hash.digest(),
                hash.byte_length(),
            )
            .expect("source prefix anchor"),
        )
}

fn collect_plan(plan: &SourceReadPlan) -> (Vec<SourceRecord>, PlannedReadReport) {
    let backend = JsonlSourceBackend;
    let mut records = Vec::new();
    let report = plan
        .read(&backend, &mut |record| {
            records.push(record);
            Ok(())
        })
        .expect("planned lifecycle read");
    (records, report)
}

fn complete_lifecycle_assembly(source: &TempJsonl, bytes: &[u8]) -> (SourceSpec, SegmentAssembly) {
    let backend = JsonlSourceBackend;
    let spec = lifecycle_spec(&source.path, bytes);
    let tail_start = bytes
        .iter()
        .enumerate()
        .filter(|(_, byte)| **byte == b'\n')
        .nth(1)
        .map(|(index, _)| index + 1)
        .expect("at least three complete lifecycle lines");
    let tail_plan = backend
        .plan_tail(&spec, (bytes.len() - tail_start) as u64)
        .expect("tail plan");
    assert_eq!(tail_plan.byte_range().start(), tail_start as u64);
    let (tail_records, tail_report) = collect_plan(&tail_plan);
    assert_eq!(tail_report.pending_tail_bytes(), 0);
    let tail_range = tail_report.complete_range().expect("tail complete range");
    let tail_descriptor = SegmentDescriptor::from_records(
        "lifecycle-tail",
        &spec,
        tail_plan.snapshot_boundary(),
        tail_range,
        &tail_records,
        1,
        SegmentCompleteness::Complete,
    )
    .expect("tail descriptor");

    let backfill_range = SourceByteRange::new(0, tail_start as u64).expect("backfill range");
    let backfill_plan = backend
        .plan_range(&spec, SourceReadMode::BackwardRange, backfill_range)
        .expect("backfill plan");
    let (backfill_records, backfill_report) = collect_plan(&backfill_plan);
    assert_eq!(backfill_report.pending_tail_bytes(), 0);
    let backfill_complete_range = backfill_report
        .complete_range()
        .expect("backfill complete range");
    let backfill_descriptor = SegmentDescriptor::from_records(
        "lifecycle-backfill",
        &spec,
        backfill_plan.snapshot_boundary(),
        backfill_complete_range,
        &backfill_records,
        2,
        SegmentCompleteness::Complete,
    )
    .expect("backfill descriptor");

    let mut assembler = SegmentAssembler::default();
    assembler
        .add_segment(
            SourceSegment::new(tail_descriptor, tail_records, Vec::new()).expect("tail segment"),
        )
        .expect("add tail segment");
    assembler
        .add_segment(
            SourceSegment::new(backfill_descriptor, backfill_records, Vec::new())
                .expect("backfill segment"),
        )
        .expect("add backfill segment");
    let assembly = assembler.assemble();
    assert_eq!(assembly.completeness(), SegmentCompleteness::Complete);
    assert!(assembly.gaps().is_empty());
    (spec, assembly)
}

fn spec_for_cursor(path: &Path, cursor: &ForwardAppendCursor) -> SourceSpec {
    SourceSpec::bind(
        cursor.metadata().target_conversation_id(),
        cursor.metadata().source_id(),
        path,
    )
    .expect("cursor source binding")
    .with_source_epoch(cursor.metadata().source_epoch())
    .expect("cursor source epoch")
    .with_fingerprint(cursor.metadata().fingerprint().clone())
    .with_prefix_anchor(cursor.metadata().prefix_anchor().clone())
}

fn read_append(
    cursor: &ForwardAppendCursor,
    spec: &SourceSpec,
) -> (AppendReadReport, Vec<SourceRecord>) {
    let mut records = Vec::new();
    let report = JsonlSourceBackend
        .read_append(cursor, spec, &mut |record| {
            records.push(record);
            Ok(())
        })
        .expect("lifecycle append read");
    (report, records)
}

#[test]
fn formal_projection_matches_actual_demo_reducer_and_spike_parser() {
    let (batch, projection) = projected_fixture("current/minimal-rollout.jsonl");
    let actual = run_actual_oracles();

    // This is the strict dual-path evidence: the old Demo reducer and the
    // parser-only Spike are launched by this test, and their outputs are
    // generated under a fresh temporary directory for this run.
    assert_eq!(actual.demo_report["input"]["parser_backend"], "demo");
    assert_eq!(actual.demo_report["input"]["valid_records"], 14);
    assert_eq!(actual.demo_report["input"]["parse_errors"], 0);
    assert_eq!(actual.demo_report["reduction"]["plan_questions_seen"], 1);
    assert_eq!(actual.demo_report["partial"], true);
    let actual_turn = actual.demo_projection["turns"]
        .as_array()
        .and_then(|turns| {
            turns
                .iter()
                .find(|turn| turn["turn_id"].as_str() == Some("turn-1"))
        })
        .expect("actual Demo projection contains turn-1");
    assert_eq!(actual_turn["status"], "completed");
    assert_eq!(actual_turn["usage"]["total_tokens"], 70);
    assert_eq!(
        actual.demo_projection["conversation"]["usage_total"]["total_tokens"],
        120
    );
    let actual_tool_call_ids: Vec<_> = actual_turn["items"]
        .as_array()
        .expect("Demo turn items")
        .iter()
        .filter_map(|item| item["tool"]["call_id"].as_str())
        .collect();
    assert_eq!(actual_tool_call_ids, vec!["call-1", "call-2"]);
    assert_eq!(
        actual.demo_projection["task_outcome"]["plan_state"],
        "executing"
    );

    // The Spike output is also generated and consumed.  Its parser report
    // must retain the future variant as a parse diagnostic rather than
    // silently presenting a complete source.
    assert!(
        actual.spike_report["valid_records"]
            .as_u64()
            .is_some_and(|count| count > 0)
    );
    assert!(
        actual.spike_report["emitted_records"]
            .as_u64()
            .is_some_and(|count| count > 0)
    );
    assert!(
        actual.spike_report["parse_errors"]
            .as_u64()
            .is_some_and(|count| count > 0)
    );

    let formal_turn = projection
        .turns
        .iter()
        .find(|turn| turn.turn_id == "turn-1")
        .expect("formal turn-1");
    assert_eq!(
        formal_turn.status,
        codex_rollout_collector::AnalysisTurnStatus::Completed
    );
    assert_eq!(
        formal_turn
            .usage
            .as_ref()
            .and_then(|usage| usage.total_tokens),
        Some(70)
    );
    let formal_tool_call_ids: Vec<_> = formal_turn
        .items
        .iter()
        .filter_map(|item| item.tool.as_ref().map(|tool| tool.call_id.as_str()))
        .collect();
    assert_eq!(formal_tool_call_ids, actual_tool_call_ids);
    assert_eq!(
        formal_turn
            .items
            .iter()
            .find_map(|item| item.plan.as_ref().map(|plan| plan.state.as_str())),
        Some("in_progress")
    );

    // Keep the accepted static surface as a secondary regression oracle.  It
    // is intentionally below the real subprocess assertions above.
    let golden: DemoOracleGolden =
        serde_json::from_str(include_str!("fixtures/golden/demo-oracle-stage3.json"))
            .expect("Demo oracle golden parses");

    assert_eq!(projection.complete, golden.complete);
    assert_eq!(projection.availability, golden.availability);
    let turn = projection
        .turns
        .iter()
        .find(|turn| turn.turn_id == golden.turn_id)
        .expect("golden turn");
    assert_eq!(turn.availability, Availability::Present);
    assert_eq!(turn.turn_id, golden.demo_oracle.turn_id);
    assert_eq!(
        format!("{:?}", turn.status).to_lowercase(),
        golden.turn_status
    );
    assert_eq!(
        format!("{:?}", turn.status).to_lowercase(),
        golden.demo_oracle.turn_status
    );
    assert_eq!(
        turn.usage.as_ref().and_then(|usage| usage.total_tokens),
        Some(golden.turn_usage_total_tokens)
    );
    assert_eq!(
        turn.usage.as_ref().and_then(|usage| usage.total_tokens),
        Some(golden.demo_oracle.turn_usage_total_tokens)
    );
    assert_eq!(
        projection
            .usage_total
            .as_ref()
            .and_then(|usage| usage.total_tokens),
        Some(golden.session_usage_total_tokens)
    );
    assert_eq!(
        projection
            .usage_total
            .as_ref()
            .and_then(|usage| usage.total_tokens),
        Some(golden.demo_oracle.session_usage_total_tokens)
    );
    assert_eq!(
        turn.items
            .iter()
            .map(|item| item.item_key.clone())
            .collect::<Vec<_>>(),
        golden.item_keys
    );
    assert_eq!(
        turn.items
            .iter()
            .filter_map(|item| item.tool.as_ref().map(|_| item.item_key.clone()))
            .collect::<Vec<_>>(),
        golden.tool_keys
    );
    assert_eq!(
        turn.items
            .iter()
            .find_map(|item| item.plan.as_ref().map(|plan| plan.state.as_str())),
        Some(golden.plan_state.as_str())
    );
    assert_eq!(golden.demo_oracle.partial, !projection.complete);
    assert_eq!(golden.demo_oracle.plan_state, "executing");
    assert_eq!(
        turn.items
            .iter()
            .filter_map(|item| item.tool.as_ref().map(|tool| tool.call_id.clone()))
            .collect::<Vec<_>>(),
        golden.demo_oracle.tool_call_ids
    );
    assert_eq!(
        turn.items
            .iter()
            .filter(|item| item.visible)
            .filter_map(|item| match item.kind.as_str() {
                "assistant_message" => Some("assistant_message".to_string()),
                "tool" => None,
                "plan_question" => Some("plan_question".to_string()),
                "plan" => Some("plan".to_string()),
                _ => None,
            })
            .collect::<Vec<_>>(),
        vec![
            "assistant_message".to_string(),
            "plan_question".to_string(),
            "plan".to_string(),
        ]
    );
    assert!(
        golden
            .demo_oracle
            .item_kinds
            .contains(&"function_call".to_string())
    );
    assert!(
        golden
            .demo_oracle
            .item_kinds
            .contains(&"custom_tool".to_string())
    );
    assert_eq!(
        projection
            .diagnostics
            .iter()
            .map(|diagnostic| diagnostic.code.clone())
            .collect::<Vec<_>>(),
        golden.diagnostic_codes
    );
    assert_eq!(
        batch
            .items
            .iter()
            .filter(|event| matches!(
                event,
                AnalysisEvent::TurnCompleted {
                    status: TurnStatus::Completed,
                    ..
                }
            ))
            .count(),
        1
    );
}

#[test]
fn replay_and_real_segments_are_idempotent_at_projection_boundary() {
    let path = fixture("current/plan-question-answer.jsonl");
    let bytes = fs::read(&path).expect("plan fixture reads");
    let hash = SourceFixtureHash::from_bytes(&bytes);
    let spec = SourceSpec::bind("caller-conversation", "plan-source", &path)
        .expect("source binding")
        .with_source_epoch("plan-epoch")
        .expect("source epoch")
        .with_fingerprint(
            codex_rollout_collector::SourceFingerprint::new(
                hash.algorithm(),
                hash.digest(),
                hash.byte_length(),
            )
            .expect("source fingerprint"),
        )
        .with_prefix_anchor(
            codex_rollout_collector::SourcePrefixAnchor::new(
                hash.algorithm(),
                hash.digest(),
                hash.byte_length(),
            )
            .expect("source prefix anchor"),
        );
    let backend = JsonlSourceBackend;

    let mut full_records = Vec::new();
    backend
        .read(&spec, &mut |record| {
            full_records.push(record);
            Ok(())
        })
        .expect("full plan fixture read");
    let full_batch = analyze_records_with_adapter(
        &CodexEventAdapter::new_with_conversation_id(
            CompatibilityProfile::Current,
            Some("caller-conversation".to_string()),
        ),
        full_records.clone(),
        CompatibilityProfile::Current,
        codex_rollout_collector::BatchCompleteness::Canonical,
    );
    let expected = AnalysisReducer::reduce_batch(&full_batch);

    let tail_plan = backend
        .plan_tail(&spec, (bytes.len() as u64 / 2).max(1))
        .expect("tail plan");
    let tail_start = tail_plan.byte_range().start();
    assert!(tail_start > 0, "tail plan must be a real segment");
    let mut tail_records = Vec::new();
    tail_plan
        .read(&backend, &mut |record| {
            tail_records.push(record);
            Ok(())
        })
        .expect("tail segment read");
    let backfill_range = SourceByteRange::new(0, tail_start).expect("backfill range");
    let backfill_plan = backend
        .plan_range(&spec, SourceReadMode::BackwardRange, backfill_range)
        .expect("backfill plan");
    let mut backfill_records = Vec::new();
    backfill_plan
        .read(&backend, &mut |record| {
            backfill_records.push(record);
            Ok(())
        })
        .expect("backfill segment read");

    let tail_only = analyze_records_with_adapter(
        &CodexEventAdapter::new_with_conversation_id(
            CompatibilityProfile::Current,
            Some("caller-conversation".to_string()),
        ),
        tail_records.clone(),
        CompatibilityProfile::Current,
        codex_rollout_collector::BatchCompleteness::Provisional,
    );
    let backfill_adapter = CodexEventAdapter::new_with_conversation_id(
        CompatibilityProfile::Current,
        Some("caller-conversation".to_string()),
    );
    let backfill_batch = analyze_records_with_adapter(
        &backfill_adapter,
        backfill_records,
        CompatibilityProfile::Current,
        codex_rollout_collector::BatchCompleteness::Provisional,
    );
    let tail_batch = analyze_records_with_adapter(
        &backfill_adapter,
        tail_records.clone(),
        CompatibilityProfile::Current,
        codex_rollout_collector::BatchCompleteness::Canonical,
    );

    let question = backfill_batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::PlanQuestion { metadata, .. } => Some(metadata),
            _ => None,
        })
        .expect("question stays in backfill segment");
    let answer = tail_batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::PlanAnswer { metadata, .. } => Some(metadata),
            _ => None,
        })
        .expect("answer stays in tail segment");
    assert_eq!(
        answer.related_item_key.as_deref(),
        Some(question.item_key.as_str())
    );
    assert_eq!(
        answer.item_key,
        full_batch
            .items
            .iter()
            .find_map(|event| match event {
                AnalysisEvent::PlanAnswer { metadata, .. } => Some(metadata.item_key.clone()),
                _ => None,
            })
            .expect("full replay answer")
    );

    let tail_question = tail_only.items.iter().find_map(|event| {
        matches!(event, AnalysisEvent::PlanQuestion { .. })
            .then(|| event.metadata().item_key.clone())
    });
    assert!(
        tail_question.is_none(),
        "question is outside the tail range"
    );

    let mut reducer = AnalysisReducer::new(Some("caller-conversation".to_string()));
    reducer.apply_batch(&backfill_batch);
    reducer.apply_batch(&tail_batch);
    // A physically identical overlap is applied through the same reducer and
    // must remain a no-op by event_id/item_key identity.
    reducer.apply_batch(&tail_batch);
    assert_eq!(reducer.finish(), expected);
}

#[test]
fn partial_and_unknown_events_never_project_as_successful_terminal_facts() {
    let (batch, projection) = projected_fixture("partial/abort-compaction.jsonl");
    assert!(!batch.complete);
    assert!(!projection.complete);
    assert!(
        projection
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "compaction")
    );
    assert!(
        !projection
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "unknown_event")
    );
    assert!(projection.turns.iter().any(|turn| {
        turn.status == codex_rollout_collector::AnalysisTurnStatus::Interrupted
            && turn.availability == Availability::PartialRollout
    }));
    assert!(!projection.turns.iter().any(|turn| {
        turn.status == codex_rollout_collector::AnalysisTurnStatus::Completed
            && turn.availability == Availability::Present
    }));
}

#[test]
fn tail_backfill_promotion_append_restart_and_duplicate_reads_are_conformant() {
    const INITIAL: &[u8] = b"{\"ordinal\":1,\"value\":\"one\"}\n{\"ordinal\":2,\"value\":\"two\"}\n{\"ordinal\":3,\"value\":\"three\"}\n{\"ordinal\":4,\"value\":\"four\"}\n";
    let source = TempJsonl::new("promotion", INITIAL);
    let (spec, assembly) = complete_lifecycle_assembly(&source, INITIAL);
    let cursor = assembly
        .promote_to_forward_append(&spec)
        .expect("complete assembly promotes");
    assert_eq!(
        cursor.metadata().snapshot_boundary(),
        SnapshotBoundary::new(INITIAL.len() as u64)
    );
    assert_eq!(
        cursor.metadata().complete_range(),
        SourceByteRange::new(0, INITIAL.len() as u64).expect("cursor range")
    );

    let restored: ForwardAppendCursor =
        serde_json::from_slice(&serde_json::to_vec(&cursor).expect("serialize promoted cursor"))
            .expect("restore promoted cursor");
    source.append(b"{\"ordinal\":5,\"value\":\"five\"}\n");
    let (first, first_records) = read_append(&restored, &spec_for_cursor(&source.path, &restored));
    assert_eq!(first_records.len(), 1);
    assert_eq!(first_records[0].rollout_ordinal, Some(5));
    let next = first.next_cursor().cloned().expect("cursor after append");

    let restarted_next: ForwardAppendCursor =
        serde_json::from_slice(&serde_json::to_vec(&next).expect("serialize next cursor"))
            .expect("restore next cursor");
    let (duplicate, duplicate_records) = read_append(
        &restarted_next,
        &spec_for_cursor(&source.path, &restarted_next),
    );
    assert!(duplicate_records.is_empty());
    assert_eq!(duplicate.next_cursor(), Some(&restarted_next));

    source.append(b"{\"ordinal\":6,\"value\":\"six\"}\n");
    let (second, second_records) = read_append(
        &restarted_next,
        &spec_for_cursor(&source.path, &restarted_next),
    );
    assert_eq!(second_records.len(), 1);
    assert_eq!(second_records[0].rollout_ordinal, Some(6));
    assert!(second.next_cursor().is_some());
}

#[test]
fn promotion_fails_closed_for_pending_tail_gap_partial_and_mutation() {
    const INITIAL: &[u8] = b"{\"ordinal\":1,\"value\":\"one\"}\n{\"ordinal\":2,\"value\":\"two\"}\n{\"ordinal\":3,\"value\":\"three\"}\n{\"ordinal\":4,\"value\":\"four\"}\n";

    let mutated_source = TempJsonl::new("mutation", INITIAL);
    let (mutated_spec, mutated_assembly) = complete_lifecycle_assembly(&mutated_source, INITIAL);
    let mut replacement = INITIAL.to_vec();
    let marker = b"\"ordinal\":1";
    let marker_start = replacement
        .windows(marker.len())
        .position(|window| window == marker)
        .expect("mutation marker");
    replacement[marker_start + marker.len() - 1] = b'9';
    fs::write(&mutated_source.path, replacement).expect("mutate source");
    assert!(matches!(
        mutated_assembly.promote_to_forward_append(&mutated_spec),
        Err(CursorError::PromotionNotSafe { .. })
    ));

    let gap_source = TempJsonl::new("gap", INITIAL);
    let gap_spec = lifecycle_spec(&gap_source.path, INITIAL);
    let tail_plan = JsonlSourceBackend
        .plan_tail(&gap_spec, (INITIAL.len() / 2) as u64)
        .expect("gap tail plan");
    let (tail_records, tail_report) = collect_plan(&tail_plan);
    let tail_descriptor = SegmentDescriptor::from_records(
        "gap-tail",
        &gap_spec,
        tail_plan.snapshot_boundary(),
        tail_report.complete_range().expect("gap tail range"),
        &tail_records,
        1,
        SegmentCompleteness::Complete,
    )
    .expect("gap descriptor");
    let mut gap_assembler = SegmentAssembler::default();
    gap_assembler
        .add_segment(
            SourceSegment::new(tail_descriptor, tail_records, Vec::new()).expect("gap segment"),
        )
        .expect("add gap segment");
    let gap_assembly = gap_assembler.assemble();
    assert_eq!(gap_assembly.completeness(), SegmentCompleteness::Partial);
    assert!(matches!(
        gap_assembly.promote_to_forward_append(&gap_spec),
        Err(CursorError::PromotionNotSafe { .. })
    ));

    let partial_source = TempJsonl::new("partial", INITIAL);
    let partial_spec = lifecycle_spec(&partial_source.path, INITIAL);
    let full_plan = JsonlSourceBackend
        .plan_full(&partial_spec)
        .expect("partial full plan");
    let (full_records, full_report) = collect_plan(&full_plan);
    let partial_descriptor = SegmentDescriptor::from_records(
        "partial-full",
        &partial_spec,
        full_plan.snapshot_boundary(),
        full_report.complete_range().expect("partial full range"),
        &full_records,
        1,
        SegmentCompleteness::Partial,
    )
    .expect("partial descriptor");
    let mut partial_assembler = SegmentAssembler::default();
    partial_assembler
        .add_segment(
            SourceSegment::new(partial_descriptor, full_records, Vec::new())
                .expect("partial segment"),
        )
        .expect("add partial segment");
    let partial_assembly = partial_assembler.assemble();
    assert_eq!(
        partial_assembly.completeness(),
        SegmentCompleteness::Partial
    );
    assert!(matches!(
        partial_assembly.promote_to_forward_append(&partial_spec),
        Err(CursorError::PromotionNotSafe { .. })
    ));

    let pending_bytes = b"{\"ordinal\":1}\n{\"ordinal\":2";
    let pending_source = TempJsonl::new("pending", pending_bytes);
    let pending_spec = SourceSpec::bind(
        "pending-conversation",
        "pending-source",
        &pending_source.path,
    )
    .expect("pending source binding")
    .with_source_epoch("pending-epoch")
    .expect("pending source epoch");
    let pending_plan = JsonlSourceBackend
        .plan_full(&pending_spec)
        .expect("pending plan");
    let (pending_records, pending_report) = collect_plan(&pending_plan);
    assert!(pending_report.pending_tail_bytes() > 0);
    let complete_range = pending_report
        .complete_range()
        .expect("pending complete range");
    let complete_records = pending_records
        .into_iter()
        .filter(|record| record.byte_end <= complete_range.end())
        .collect::<Vec<_>>();
    let pending_descriptor = SegmentDescriptor::from_records(
        "pending-prefix",
        &pending_spec,
        pending_plan.snapshot_boundary(),
        complete_range,
        &complete_records,
        1,
        SegmentCompleteness::Complete,
    )
    .expect("pending descriptor");
    let mut pending_assembler = SegmentAssembler::default();
    pending_assembler
        .add_segment(
            SourceSegment::new(pending_descriptor, complete_records, Vec::new())
                .expect("pending segment"),
        )
        .expect("add pending segment");
    let pending_assembly = pending_assembler.assemble();
    assert_eq!(
        pending_assembly.completeness(),
        SegmentCompleteness::Partial
    );
    assert!(matches!(
        pending_assembly.promote_to_forward_append(&pending_spec),
        Err(CursorError::PromotionNotSafe { .. })
    ));
}
