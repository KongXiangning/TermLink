use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use codex_rollout_collector::model::AnalysisEvent;
use codex_rollout_collector::{
    CompatibilityProfile, JsonlSourceBackend, SegmentAssembler, SegmentCompleteness,
    SegmentDescriptor, SnapshotBoundary, SourceBackend, SourceByteRange, SourceFixtureHash,
    SourceReadMode, SourceRecord, SourceRecordOracleResult, SourceSegment, SourceSpec,
    analyze_source, compare_source_records,
};

const COMMON_FIXTURE: &[u8] = b"{\"ordinal\":1,\"value\":\"one\"}\nnot-json\n{\"ordinal\":3,\"value\":\"three\"}\n{\"ordinal\":4,\"value\":\"four\"}\n";

struct TempSource {
    path: PathBuf,
}

impl TempSource {
    fn new(contents: &[u8]) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "termlink-rollout-stage2-oracle-{}-{nonce}.jsonl",
            std::process::id()
        ));
        fs::write(&path, contents).expect("write fixture");
        Self { path }
    }
}

impl Drop for TempSource {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

fn source_spec(path: &Path) -> SourceSpec {
    SourceSpec::bind("conversation-oracle", "fixture-source", path)
        .expect("source binding")
        .with_source_epoch("fixture-epoch")
        .expect("source epoch")
}

fn collect_plan(
    backend: &JsonlSourceBackend,
    plan: &codex_rollout_collector::SourceReadPlan,
) -> (
    Vec<SourceRecord>,
    codex_rollout_collector::PlannedReadReport,
) {
    let mut records = Vec::new();
    let report = plan
        .read(backend, &mut |record| {
            records.push(record);
            Ok(())
        })
        .expect("planned read");
    (records, report)
}

fn segment_completeness(
    report: &codex_rollout_collector::PlannedReadReport,
) -> SegmentCompleteness {
    if report.source().parse_gap_count == 0 && !report.source().budget_exceeded {
        SegmentCompleteness::Complete
    } else {
        SegmentCompleteness::Partial
    }
}

#[test]
fn full_read_and_tail_backfill_assembly_match_source_record_oracle() {
    let source = TempSource::new(COMMON_FIXTURE);
    let backend = JsonlSourceBackend;
    let spec = source_spec(&source.path);
    let snapshot = SnapshotBoundary::new(COMMON_FIXTURE.len() as u64);

    let mut full_records = Vec::new();
    let full_report = backend
        .read(&spec, &mut |record| {
            full_records.push(record);
            Ok(())
        })
        .expect("legacy full read");
    assert_eq!(full_report.source_bytes, COMMON_FIXTURE.len() as u64);
    assert_eq!(full_records.len(), 4);

    let tail_plan = backend.plan_tail(&spec, 1).expect("tail plan");
    let tail_start = tail_plan.byte_range().start();
    assert!(tail_start > 0);
    let (tail_records, tail_report) = collect_plan(&backend, &tail_plan);

    let backfill_range = SourceByteRange::new(0, tail_start).expect("backfill range");
    let backfill_plan = backend
        .plan_range(&spec, SourceReadMode::BackwardRange, backfill_range)
        .expect("backfill plan");
    let (backfill_records, backfill_report) = collect_plan(&backend, &backfill_plan);

    let tail_complete_range = tail_report.complete_range().expect("tail complete range");
    let tail_descriptor = SegmentDescriptor::from_records(
        "tail",
        &spec,
        snapshot,
        tail_complete_range,
        &tail_records,
        1,
        segment_completeness(&tail_report),
    )
    .expect("tail descriptor");
    let backfill_complete_range = backfill_report
        .complete_range()
        .expect("backfill complete range");
    let backfill_descriptor = SegmentDescriptor::from_records(
        "backfill",
        &spec,
        snapshot,
        backfill_complete_range,
        &backfill_records,
        2,
        segment_completeness(&backfill_report),
    )
    .expect("backfill descriptor");

    let mut assembler = SegmentAssembler::default();
    assembler
        .add_segment(
            SourceSegment::new(tail_descriptor, tail_records, Vec::new()).expect("tail segment"),
        )
        .expect("add tail");
    assembler
        .add_segment(
            SourceSegment::new(backfill_descriptor, backfill_records, Vec::new())
                .expect("backfill segment"),
        )
        .expect("add backfill");
    let assembled = assembler.assemble();

    let fixture_hash = SourceFixtureHash::from_file(&source.path, 0, COMMON_FIXTURE.len() as u64)
        .expect("fixture hash");
    let oracle: SourceRecordOracleResult = compare_source_records(
        fixture_hash,
        &full_records,
        assembled.records(),
        full_report.parse_gap_count == 0,
        assembled.completeness() == SegmentCompleteness::Complete,
    );

    assert!(oracle.matches(), "oracle mismatch: {:?}", oracle.mismatch());
    assert_eq!(oracle.full_record_count(), oracle.segmented_record_count());
    assert_eq!(oracle.fixture_hash().algorithm(), "sha256-v1");
    assert_eq!(
        oracle.fixture_hash().byte_length(),
        COMMON_FIXTURE.len() as u64
    );
    assert!(!oracle.fixture_hash().digest().is_empty());
    assert_eq!(assembled.records(), full_records.as_slice());
    assert_eq!(assembled.completeness(), SegmentCompleteness::Partial);
    assert!(
        assembled
            .gaps()
            .iter()
            .any(|gap| gap.reason() == "record_diagnostic")
    );
}

#[test]
fn existing_adapter_batch_entrypoint_keeps_profiles_unknowns_and_determinism() {
    let fixture_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures");
    let backend = JsonlSourceBackend;

    let legacy_spec = SourceSpec::new(fixture_root.join("legacy").join("alias-fields.jsonl"));
    let legacy =
        analyze_source(&backend, &legacy_spec, CompatibilityProfile::Legacy).expect("legacy batch");
    assert!(legacy.complete);
    assert_eq!(
        legacy.parser_provenance.compatibility_profile,
        CompatibilityProfile::Legacy
    );

    let current_path = fixture_root.join("current").join("minimal-rollout.jsonl");
    let current_spec = SourceSpec::new(&current_path);
    let current = analyze_source(&backend, &current_spec, CompatibilityProfile::Current)
        .expect("current batch");
    let repeated = analyze_source(&backend, &current_spec, CompatibilityProfile::Current)
        .expect("repeated current batch");
    assert_eq!(current, repeated);
    assert_eq!(
        current.parser_provenance.compatibility_profile,
        CompatibilityProfile::Current
    );
    assert!(
        current
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::UnknownEvent { .. }))
    );
    assert_eq!(
        serde_json::to_vec(&current).expect("serialize current"),
        serde_json::to_vec(&repeated).expect("serialize repeated")
    );
    assert_eq!(
        serde_json::to_vec(&legacy).expect("serialize legacy"),
        serde_json::to_vec(
            &analyze_source(&backend, &legacy_spec, CompatibilityProfile::Legacy)
                .expect("repeat legacy")
        )
        .expect("serialize repeated legacy")
    );
}
