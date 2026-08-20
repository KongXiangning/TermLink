use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use codex_rollout_collector::model::{AnalysisEvent, Availability, TurnStatus};
use codex_rollout_collector::{
    AnalysisProjection, AnalysisReducer, AppendReadReport, CompatibilityProfile, CursorError,
    ForwardAppendCursor, JsonlSourceBackend, PlannedReadReport, SegmentAssembler, SegmentAssembly,
    SegmentCompleteness, SegmentDescriptor, SnapshotBoundary, SourceByteRange, SourceFixtureHash,
    SourceReadMode, SourceReadPlan, SourceRecord, SourceSegment, SourceSpec, analyze_source,
};
use serde::Deserialize;

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
fn formal_projection_matches_demo_oracle_golden_surface() {
    let (batch, projection) = projected_fixture("current/minimal-rollout.jsonl");
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
fn replay_and_segment_overlap_are_idempotent_at_projection_boundary() {
    let (batch, expected) = projected_fixture("current/minimal-rollout.jsonl");
    let mut reducer = AnalysisReducer::new(Some("caller-conversation".to_string()));
    for event in &batch.items {
        reducer.apply(event);
    }
    for event in &batch.items {
        reducer.apply(event);
    }
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
