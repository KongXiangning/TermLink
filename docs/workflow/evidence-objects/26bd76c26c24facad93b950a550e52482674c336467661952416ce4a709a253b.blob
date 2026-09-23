use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use codex_rollout_collector::model::AnalysisEvent;
use codex_rollout_collector::source::LineageError;
use codex_rollout_collector::protocol::{
    map_target_source_read, parse_startup_args, read_target_source,
    read_target_source_with_deadline, StartupMode, TargetAnalyzeMode, TargetAnalyzeRequest,
    TargetCompleteStatus, TargetCompleteness, TargetCursorCapabilities, TargetCursorKind,
    TargetMutation, TargetResourceLimits, TargetSnapshotBoundary, TargetSourceByteRange,
    TargetSourceReadError, TargetStartupConfig,
};

fn unique_temp_root(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock after epoch")
        .as_nanos();
    let dir = std::env::temp_dir().join(format!(
        "termlink-rollout-blockers-{label}-{}-{nanos}",
        std::process::id()
    ));
    fs::create_dir_all(&dir).expect("temp dir creates");
    dir
}

fn write_fixture_file(root: &Path, conversation_id: &str, contents: &str) -> PathBuf {
    let path = root.join("2026").join("08").join("26").join(format!(
        "rollout-2026-08-26T00-00-00-{conversation_id}.jsonl"
    ));
    fs::create_dir_all(path.parent().expect("fixture parent")).expect("parent creates");
    fs::write(&path, contents).expect("fixture writes");
    path
}

fn target_config(root: &Path) -> TargetStartupConfig {
    let args = vec![
        std::ffi::OsString::from("--startup-config-version"),
        std::ffi::OsString::from("1"),
        std::ffi::OsString::from("--sessions-root"),
        root.as_os_str().to_os_string(),
    ];
    match parse_startup_args(args).expect("startup args parse") {
        StartupMode::Target(config) => config,
        StartupMode::Legacy => panic!("must be target mode"),
    }
}

const TEST_CONVERSATION_ID: &str = "019b2b40-beb6-7b23-bed0-37d570e76816";

/// Generate a valid, clean rollout session with strictly contiguous ordinals
/// and no unsupported variants or redundant message carriers so that it maps
/// to canonical completeness without diagnostics.
fn generate_clean_rollout(conversation_id: &str) -> String {
    let mut lines = Vec::new();
    let mut ordinal = 0_u64;

    // Line 0: session_meta
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:00.000Z\",\"ordinal\":{ordinal},\"type\":\"session_meta\",\"payload\":{{\"id\":\"{conversation_id}\",\"timestamp\":\"2026-08-26T00:00:00.000Z\",\"cwd\":\"E:\\\\coding\\\\TermLink\",\"originator\":\"codex_cli\",\"cli_version\":\"0.70.0\",\"source\":\"cli\",\"model_provider\":\"openai\",\"git\":{{}}}}}}"
    ));

    // Turn 1
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:01.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_started\",\"turn_id\":\"turn-1\",\"model_context_window\":258400,\"collaboration_mode_kind\":\"default\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:02.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"user_message\",\"client_id\":\"client-1\",\"message\":\"检查分段读取与正序归约\",\"images\":[]}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:03.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"agent_message\",\"message\":\"我开始执行多窗口正序补齐和工具归属核验。\",\"phase\":\"commentary\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:04.000Z\",\"ordinal\":{ordinal},\"type\":\"response_item\",\"payload\":{{\"type\":\"function_call\",\"id\":\"fc-1\",\"name\":\"shell_command\",\"namespace\":\"functions\",\"arguments\":\"{{\\\"command\\\":\\\"cargo test\\\",\\\"workdir\\\":\\\"E:\\\\\\\\coding\\\\\\\\TermLink\\\"}}\",\"call_id\":\"call-1\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:05.000Z\",\"ordinal\":{ordinal},\"type\":\"response_item\",\"payload\":{{\"type\":\"function_call_output\",\"id\":\"fco-1\",\"call_id\":\"call-1\",\"output\":\"Exit code: 0\\npass\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:06.000Z\",\"ordinal\":{ordinal},\"type\":\"response_item\",\"payload\":{{\"type\":\"custom_tool_call\",\"id\":\"ctc-1\",\"status\":\"completed\",\"call_id\":\"call-2\",\"name\":\"memory_query\",\"namespace\":\"mcp\",\"input\":\"{{\\\"query\\\":\\\"compatibility\\\"}}\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:07.000Z\",\"ordinal\":{ordinal},\"type\":\"response_item\",\"payload\":{{\"type\":\"custom_tool_call_output\",\"id\":\"ctco-1\",\"call_id\":\"call-2\",\"name\":\"memory_query\",\"output\":[{{\"type\":\"input_text\",\"text\":\"structured result\"}}]}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:08.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"token_count\",\"info\":{{\"total_token_usage\":{{\"input_tokens\":100,\"cached_input_tokens\":50,\"output_tokens\":20,\"reasoning_output_tokens\":5,\"total_tokens\":120}},\"last_token_usage\":{{\"input_tokens\":60,\"cached_input_tokens\":30,\"output_tokens\":10,\"reasoning_output_tokens\":2,\"total_tokens\":70}},\"model_context_window\":258400}},\"rate_limits\":{{\"primary\":{{\"used_percent\":12.5,\"window_minutes\":60,\"resets_at\":1800000000}},\"secondary\":null}}}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:09.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"plan_update\",\"explanation\":\"已确认执行顺序\",\"plan\":[{{\"step\":\"读取兼容快照\",\"status\":\"completed\"}},{{\"step\":\"运行验证\",\"status\":\"in_progress\"}}]}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:10.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_complete\",\"turn_id\":\"turn-1\",\"last_agent_message\":\"第一轮验证完成。\",\"duration_ms\":7000}}}}"
    ));

    // Turn 2
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:11.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_started\",\"turn_id\":\"turn-2\",\"model_context_window\":258400,\"collaboration_mode_kind\":\"default\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:12.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"user_message\",\"client_id\":\"client-1\",\"message\":\"第二轮多段正序覆盖测试\",\"images\":[]}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:13.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"agent_message\",\"message\":\"第二轮正序归约中，验证跨段关联和稳定键。\",\"phase\":\"commentary\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:14.000Z\",\"ordinal\":{ordinal},\"type\":\"response_item\",\"payload\":{{\"type\":\"function_call\",\"id\":\"fc-2\",\"name\":\"shell_command\",\"namespace\":\"functions\",\"arguments\":\"{{\\\"command\\\":\\\"cargo check\\\",\\\"workdir\\\":\\\"E:\\\\\\\\coding\\\\\\\\TermLink\\\"}}\",\"call_id\":\"call-3\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:15.000Z\",\"ordinal\":{ordinal},\"type\":\"response_item\",\"payload\":{{\"type\":\"function_call_output\",\"id\":\"fco-2\",\"call_id\":\"call-3\",\"output\":\"Exit code: 0\\nok\"}}}}"
    ));
    ordinal += 1;
    lines.push(format!(
        "{{\"timestamp\":\"2026-08-26T00:00:16.000Z\",\"ordinal\":{ordinal},\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_complete\",\"turn_id\":\"turn-2\",\"last_agent_message\":\"第二轮验证完成。\",\"duration_ms\":5000}}}}"
    ));

    lines.join("\n") + "\n"
}

#[test]
fn test_backfill_multi_window_plain_jsonl_without_rejection() {
    let root = unique_temp_root("multi-window");
    let contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let total_len = contents.len() as u64;
    assert!(total_len > 3000, "fixture must be > 3000 bytes, got {total_len}");

    write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    // Set max_segment_bytes = 1000 so the ~3800-byte file must be partitioned into >= 4 segments
    let mut request = TargetAnalyzeRequest::new(
        "req-backfill-multi-window",
        "job-backfill-multi-window",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    request.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(1000),
        max_segment_bytes: Some(1000),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });

    let source = read_target_source(&request, &config, &AtomicBool::new(false))
        .expect("multi-window backfill source read succeeds");

    // 1. Must have multiple planned segments
    assert!(
        source.segments.len() >= 4,
        "expected >= 4 segments, got {}",
        source.segments.len()
    );

    // 2. Segments must be contiguous and bounded by max_segment_bytes
    let mut expected_start = 0_u64;
    for (i, segment) in source.segments.iter().enumerate() {
        assert_eq!(
            segment.requested_range.start, expected_start,
            "segment {i} start mismatch"
        );
        let seg_len = segment.requested_range.end - segment.requested_range.start;
        assert!(
            seg_len <= 1000,
            "segment {i} len {seg_len} exceeds max_segment_bytes 1000"
        );
        assert!(segment.complete, "segment {i} must be complete");
        assert_eq!(segment.parse_gap_count, 0, "segment {i} must have no gaps");
        expected_start = segment.requested_range.end;
    }
    assert_eq!(
        expected_start, total_len,
        "segments must cover up to total snapshot len"
    );
    // 2b. Resident raw records must be bounded by the final physical window.
    //     "Fewer than all records" would also hold if only one early window
    //     were dropped, so derive the expectation from the final window range
    //     and prove the handoff keeps only that window in TargetSourceRead.
    let final_window = source
        .segments
        .last()
        .expect("multi-window source has a final segment")
        .requested_range;
    let mut final_window_lines = 0_usize;
    let mut line_start = 0_u64;
    for line in contents.split_inclusive('\n') {
        let line_end = line_start + line.len() as u64;
        if line_start >= final_window.start && line_end <= final_window.end {
            final_window_lines += 1;
        }
        line_start = line_end;
    }
    assert!(
        final_window_lines > 0 && final_window_lines < contents.lines().count(),
        "final window must be a strict subset of the fixture: {final_window_lines} of {} lines",
        contents.lines().count()
    );
    assert!(
        source.records.len() <= final_window_lines,
        "resident raw records {} exceeded the final physical window bound {}",
        source.records.len(),
        final_window_lines
    );
    assert!(
        source.records.len() < contents.lines().count(),
        "multi-window source must not retain every raw record in TargetSourceRead"
    );

    // 3. Mapping succeeds and yields Canonical completeness and promoted ForwardAppend cursor
    let mapped = map_target_source_read(&request, &source)
        .expect("mapping multi-window source read succeeds");

    assert_eq!(
        mapped.batch.payload.completeness,
        TargetCompleteness::Canonical
    );
    let next_cursor = mapped
        .batch
        .payload
        .next_cursor
        .expect("must produce a next cursor");
    assert_eq!(
        next_cursor.cursor_kind,
        TargetCursorKind::ForwardAppend,
        "complete backfill must be promoted to ForwardAppend"
    );
    assert_eq!(next_cursor.complete_range.start, 0);
    assert_eq!(next_cursor.complete_range.end, total_len);

    assert_eq!(
        mapped.complete.checkpoint.cursor_kind,
        Some(TargetCursorKind::ForwardAppend)
    );
    assert_eq!(
        mapped.complete.status,
        TargetCompleteStatus::Completed
    );

    // 4. The bounded-residency handoff must not change what the caller sees.
    //    Reading the same unchanged fixture as one physical window is an
    //    independent oracle for deterministic chronological output and stable
    //    logical keys across a different window split; residency, not content,
    //    may differ.
    let mut single_window_req = TargetAnalyzeRequest::new(
        "req-backfill-single-window",
        "job-backfill-single-window",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    single_window_req.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(1000),
        max_segment_bytes: Some(50_000),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });
    let single_window_source =
        read_target_source(&single_window_req, &config, &AtomicBool::new(false))
            .expect("single-window backfill source read succeeds");
    assert_eq!(
        single_window_source.segments.len(),
        1,
        "single-window oracle must read the fixture as one physical window"
    );
    assert!(
        single_window_source.records.len() > source.records.len(),
        "single-window oracle must retain more raw records than the bounded handoff: {} vs {}",
        single_window_source.records.len(),
        source.records.len()
    );
    let single_window_mapped = map_target_source_read(&single_window_req, &single_window_source)
        .expect("mapping single-window source read succeeds");

    assert_eq!(
        mapped.batch.payload.history_items, single_window_mapped.batch.payload.history_items,
        "window split must not change reduced history events or their chronological order"
    );
    assert_eq!(
        mapped.batch.payload.tool_details, single_window_mapped.batch.payload.tool_details,
        "window split must not change tool details or their stable logical keys"
    );
    assert_eq!(
        mapped.batch.payload.mutations, single_window_mapped.batch.payload.mutations,
        "window split must not change projected mutations or their stable logical keys"
    );
    assert_eq!(
        mapped.batch.payload.completeness, single_window_mapped.batch.payload.completeness,
        "window split must not change the reported completeness"
    );
}

#[test]
fn test_backfill_multi_window_tool_attribution_and_stable_keys() {
    let root = unique_temp_root("tool-attribution");
    let contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let output_marker = "\"call_id\":\"call-1\",\"output\"";
    let output_offset = contents
        .find(output_marker)
        .expect("tool output marker exists");
    let output_line_start = contents[..output_offset]
        .rfind('\n')
        .map_or(0, |index| index + 1) as u64;
    let begin_offset = contents
        .find("\"call_id\":\"call-1\"")
        .expect("tool begin marker exists");
    assert!(output_line_start > begin_offset as u64);
    write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    let mut request = TargetAnalyzeRequest::new(
        "req-backfill-tool-attr",
        "job-backfill-tool-attr",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    request.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(1000),
        // End the first physical window exactly before the tool output so
        // begin/end attribution must cross the window boundary.
        max_segment_bytes: Some(output_line_start),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });

    let source = read_target_source(&request, &config, &AtomicBool::new(false))
        .expect("source read succeeds");
    assert!(source.segments.len() >= 2);
    let begin_line_start = contents[..begin_offset]
        .rfind('\n')
        .map_or(0, |index| index + 1) as u64;
    let begin_window = source
        .segments
        .iter()
        .position(|segment| {
            segment.requested_range.start <= begin_line_start
                && begin_line_start < segment.requested_range.end
        })
        .expect("tool begin belongs to a source window");
    let output_window = source
        .segments
        .iter()
        .position(|segment| {
            segment.requested_range.start <= output_line_start
                && output_line_start < segment.requested_range.end
        })
        .expect("tool output belongs to a source window");
    assert_ne!(begin_window, output_window, "tool begin/end must straddle windows");
    let mapped = map_target_source_read(&request, &source)
        .expect("mapping succeeds");

    let tool = mapped
        .batch
        .payload
        .tool_details
        .iter()
        .find(|tool| tool.call_id == "call-1")
        .expect("cross-window tool detail exists");
    assert_eq!(tool.tool_kind, "function_call");
    // The fixture declares workdir E:\coding\TermLink. The adapter's sanitize
    // policy replaces absolute local paths with REDACTED_LOCAL_PATH while
    // keeping the rest of the arguments; the window split must not change
    // either part.
    assert_eq!(
        tool.input.as_deref(),
        Some(r#"{"command":"cargo test","workdir":"<local-path-redacted>"}"#),
        "tool begin input must survive the window split with the sanitized fixture arguments"
    );
    assert!(
        !tool.input.as_deref().unwrap_or_default().contains("TermLink"),
        "tool begin input must not leak the local workspace path"
    );
    assert_eq!(tool.output.as_deref(), Some("Exit code: 0\npass"));

    let started = mapped
        .batch
        .payload
        .history_items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::ToolStarted {
                metadata, call_id, ..
            } if call_id == "call-1" => Some(metadata),
            _ => None,
        })
        .expect("tool start event exists");
    let completed = mapped
        .batch
        .payload
        .history_items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::ToolCompleted {
                metadata, call_id, ..
            } if call_id == "call-1" => Some(metadata),
            _ => None,
        })
        .expect("tool completion event exists");
    assert_eq!(started.item_key, completed.item_key);
    assert_eq!(started.item_key, tool.item_key);
    assert_eq!(started.turn_id.as_deref(), Some("turn-1"));
    assert_eq!(completed.turn_id.as_deref(), Some("turn-1"));

    // Check that carrier records without explicit turn_id in payload are attributed
    // to the active enclosing turn
    let items_with_turn = mapped
        .batch
        .payload
        .history_items
        .iter()
        .filter_map(|e| e.metadata().turn_id.as_deref())
        .collect::<Vec<_>>();
    assert!(
        items_with_turn.iter().any(|t| *t == "turn-1"),
        "events must be attributed to turn-1"
    );
    assert!(
        items_with_turn.iter().any(|t| *t == "turn-2"),
        "events must be attributed to turn-2"
    );

    // Verify logical keys from mutations are unique and non-empty
    let mutation_keys: Vec<&str> = mapped
        .batch
        .payload
        .mutations
        .iter()
        .filter_map(|m| match m {
            TargetMutation::UpsertItem { item }
            | TargetMutation::UpsertDetail { item }
            | TargetMutation::UpsertUsage { item }
            | TargetMutation::UpsertOutcome { item } => Some(item.item_key.as_str()),
            _ => None,
        })
        .collect();
    assert!(!mutation_keys.is_empty(), "must have mutation keys");
    for k in &mutation_keys {
        assert!(!k.is_empty(), "item key must not be empty");
    }

    // Re-delivery with an exact overlap must preserve the same logical keys
    // and projected tool association.
    let mut overlapped_source = source.clone();
    overlapped_source
        .records
        .push(source.records.first().cloned().expect("resident window record"));
    let retried = map_target_source_read(&request, &overlapped_source)
        .expect("exact overlap remains idempotent");
    assert_eq!(retried.batch.payload.history_items, mapped.batch.payload.history_items);
    assert_eq!(retried.batch.payload.tool_details, mapped.batch.payload.tool_details);
    assert_eq!(retried.batch.payload.mutations, mapped.batch.payload.mutations);

    // A conflicting record at an already accepted position is not a proven
    // duplicate: it must fail closed instead of being silently dropped and
    // promoted.
    let mut conflicting_source = source.clone();
    let mut conflicted = source
        .records
        .first()
        .cloned()
        .expect("resident window record");
    conflicted.timestamp = Some("2026-08-26T00:00:00.999Z".to_string());
    conflicting_source.records.push(conflicted);
    let conflicted_mapped = map_target_source_read(&request, &conflicting_source)
        .expect("conflicting overlap is still mapped with diagnostics");
    assert_eq!(
        conflicted_mapped.batch.payload.completeness,
        TargetCompleteness::Partial,
        "a conflicting overlap must not report canonical completeness"
    );
    assert!(
        conflicted_mapped
            .batch
            .payload
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "overlap_conflict"),
        "a conflicting overlap must emit an overlap_conflict diagnostic"
    );
    assert_ne!(
        conflicted_mapped
            .batch
            .payload
            .next_cursor
            .map(|cursor| cursor.cursor_kind),
        Some(TargetCursorKind::ForwardAppend),
        "a conflicting overlap must never promote to ForwardAppend"
    );

    // Regression: an altered overlap inserted *before* the accepted record is
    // the first match in the retained window. Identity must be proven by a
    // different accepted occurrence, never by the candidate itself, so this
    // stays a conflict instead of validating its own content.
    let mut self_match_source = source.clone();
    let mut tampered = source
        .records
        .first()
        .cloned()
        .expect("resident window record");
    tampered.timestamp = Some("2026-08-26T00:00:00.111Z".to_string());
    self_match_source.records.insert(0, tampered);
    let self_match_mapped = map_target_source_read(&request, &self_match_source)
        .expect("self-match overlap is mapped with diagnostics");
    assert_eq!(
        self_match_mapped.batch.payload.completeness,
        TargetCompleteness::Partial,
        "a self-matching overlap must not report canonical completeness"
    );
    assert!(
        self_match_mapped
            .batch
            .payload
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "overlap_conflict"),
        "a self-matching overlap must emit an overlap_conflict diagnostic"
    );
    assert_ne!(
        self_match_mapped
            .batch
            .payload
            .next_cursor
            .map(|cursor| cursor.cursor_kind),
        Some(TargetCursorKind::ForwardAppend),
        "a self-matching overlap must never promote to ForwardAppend"
    );

    // A conflicting overlap whose accepted original was replayed from the
    // spooled earlier windows: the two identical altered copies must not prove
    // each other, because only previously accepted content may prove identity.
    let first_line_end = contents
        .find('\n')
        .map(|index| index as u64 + 1)
        .expect("fixture first line ends with a newline");
    let mut altered = source
        .records
        .first()
        .cloned()
        .expect("resident window record");
    altered.byte_start = 0;
    altered.byte_end = first_line_end;
    altered.rollout_ordinal = Some(999);
    altered.timestamp = Some("2026-08-26T00:00:00.333Z".to_string());
    let mut spool_conflict_source = source.clone();
    spool_conflict_source.records.push(altered.clone());
    spool_conflict_source.records.push(altered);
    let spool_conflict_mapped = map_target_source_read(&request, &spool_conflict_source)
        .expect("spooled-original conflict is mapped with diagnostics");
    assert_eq!(
        spool_conflict_mapped.batch.payload.completeness,
        TargetCompleteness::Partial,
        "an unprovable overlap must not report canonical completeness"
    );
    assert!(
        spool_conflict_mapped
            .batch
            .payload
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "overlap_conflict"),
        "an unprovable overlap must emit an overlap_conflict diagnostic"
    );
    assert_ne!(
        spool_conflict_mapped
            .batch
            .payload
            .next_cursor
            .map(|cursor| cursor.cursor_kind),
        Some(TargetCursorKind::ForwardAppend),
        "an unprovable overlap must never promote to ForwardAppend"
    );
}

#[test]
fn test_backfill_formal_promotion_to_forward_append_and_subsequent_append() {
    let root = unique_temp_root("promotion-append");
    let contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let initial_len = contents.len() as u64;
    let file_path = write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    // Step 1: Execute complete backfill
    let mut backfill_req = TargetAnalyzeRequest::new(
        "req-backfill-promo",
        "job-promo-append",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    backfill_req.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(1200),
        max_segment_bytes: Some(1200),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });

    let backfill_source = read_target_source(&backfill_req, &config, &AtomicBool::new(false))
        .expect("backfill read succeeds");
    let backfill_mapped = map_target_source_read(&backfill_req, &backfill_source)
        .expect("backfill mapping succeeds");

    let append_cursor = backfill_mapped
        .batch
        .payload
        .next_cursor
        .expect("backfill must emit next_cursor");
    assert_eq!(
        append_cursor.cursor_kind,
        TargetCursorKind::ForwardAppend,
        "promoted cursor kind must be ForwardAppend"
    );

    let checkpoint = backfill_mapped.complete.checkpoint;

    // Step 2: Append a new incremental turn (task_started + agent_message +
    // task_complete) with contiguous ordinals 17..19, so the append result can
    // be checked for the appended turn itself and not only for cursor movement.
    let appended_turn = "turn-3";
    let appended_message = "追加新事件";
    let new_lines = format!(
        concat!(
            "{{\"timestamp\":\"2026-08-26T00:00:20.000Z\",\"ordinal\":17,\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_started\",\"turn_id\":\"{turn}\",\"model_context_window\":258400,\"collaboration_mode_kind\":\"default\"}}}}\n",
            "{{\"timestamp\":\"2026-08-26T00:00:21.000Z\",\"ordinal\":18,\"type\":\"event_msg\",\"payload\":{{\"type\":\"agent_message\",\"message\":\"{message}\",\"phase\":\"commentary\"}}}}\n",
            "{{\"timestamp\":\"2026-08-26T00:00:22.000Z\",\"ordinal\":19,\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_complete\",\"turn_id\":\"{turn}\",\"last_agent_message\":\"{message}\",\"duration_ms\":2000}}}}\n"
        ),
        turn = appended_turn,
        message = appended_message
    );
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(&file_path)
        .expect("open for append");
    use std::io::Write;
    file.write_all(new_lines.as_bytes()).expect("write append");
    drop(file);

    let new_len = fs::metadata(&file_path).expect("metadata").len();
    assert!(new_len > initial_len);

    // Step 3: Execute Append request using the cursor and checkpoint from Backfill
    let mut append_req = TargetAnalyzeRequest::new(
        "req-append-after-backfill",
        "job-promo-append",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Append,
    );
    append_req.cursor = Some(append_cursor);
    append_req.persisted_anchor = Some(checkpoint);

    let append_source = read_target_source(&append_req, &config, &AtomicBool::new(false))
        .expect("append source read succeeds");

    // Append should read only the new portion from initial_len to new_len
    let active_segment = append_source
        .segments
        .iter()
        .rev()
        .find(|s| s.source_id == append_source.source_id)
        .expect("active segment exists");
    assert_eq!(active_segment.requested_range.start, initial_len);
    assert_eq!(active_segment.requested_range.end, new_len);

    let append_mapped = map_target_source_read(&append_req, &append_source)
        .expect("append mapping succeeds");

    let next_append_cursor = append_mapped
        .batch
        .payload
        .next_cursor
        .expect("append emits next cursor");
    assert_eq!(next_append_cursor.cursor_kind, TargetCursorKind::ForwardAppend);
    assert_eq!(next_append_cursor.complete_range.end, new_len);

    // The append batch must carry the appended incremental turn itself;
    // cursor movement alone would not prove the appends were consumed.
    let appended_turn_ids: Vec<&str> = append_mapped
        .batch
        .payload
        .history_items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::TurnStarted { metadata, .. } => metadata.turn_id.as_deref(),
            _ => None,
        })
        .collect();
    assert!(
        appended_turn_ids.contains(&appended_turn),
        "append batch must reduce the appended turn start, got {appended_turn_ids:?}"
    );

    let appended_messages: Vec<(&str, Option<&str>)> = append_mapped
        .batch
        .payload
        .history_items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::AssistantMessage { metadata, text } if text == appended_message => {
                Some((text.as_str(), metadata.turn_id.as_deref()))
            }
            _ => None,
        })
        .collect();
    assert_eq!(
        appended_messages.len(),
        1,
        "exactly one appended assistant message must be reduced into the append batch"
    );
    assert_eq!(
        appended_messages[0].1,
        Some(appended_turn),
        "appended assistant message must be attributed to the appended turn"
    );

    // A conflicting overlap in an append read must not republish the persisted
    // ForwardAppend cursor, even though the append path returns it directly.
    let mut conflicting_append_source = append_source.clone();
    let mut conflicted_append = append_source
        .records
        .first()
        .cloned()
        .expect("append resident record");
    conflicted_append.timestamp = Some("2026-08-26T00:00:00.777Z".to_string());
    conflicting_append_source.records.push(conflicted_append);
    let conflicted_append_mapped =
        map_target_source_read(&append_req, &conflicting_append_source)
            .expect("conflicting append is mapped with diagnostics");
    assert_eq!(
        conflicted_append_mapped.batch.payload.completeness,
        TargetCompleteness::Partial,
        "a conflicting append must not report canonical completeness"
    );
    assert_ne!(
        conflicted_append_mapped
            .batch
            .payload
            .next_cursor
            .map(|cursor| cursor.cursor_kind),
        Some(TargetCursorKind::ForwardAppend),
        "a conflicting append must not publish ForwardAppend"
    );
}

#[test]
fn test_backfill_three_entrypoints() {
    let root = unique_temp_root("three-entrypoints");
    let contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let total_len = contents.len() as u64;
    let line_offsets: Vec<u64> = contents
        .match_indices('\n')
        .map(|(idx, _)| (idx + 1) as u64)
        .collect();
    assert!(line_offsets.len() >= 8);

    let fixture_path = write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    // Bound every physical window so the continuation branches have to prove
    // they stay bounded instead of rereading the snapshot as one plan.
    let windowed = |request: &mut TargetAnalyzeRequest| {
        request.resource_limits = Some(TargetResourceLimits {
            max_line_bytes: Some(1000),
            max_segment_bytes: Some(1000),
            max_decoded_bytes: Some(50_000),
            tail_bytes: Some(1000),
            ..TargetResourceLimits::default()
        });
    };

    // Entrypoint 1: Preview followed by Backfill
    let mut preview_req = TargetAnalyzeRequest::new(
        "req-preview-entry",
        "job-preview-entry",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Preview,
    );
    // The preview tail plan sizes its window from `tail_bytes`, so it keeps a
    // wider segment budget; only the continuation branches must stay bounded.
    preview_req.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(1000),
        max_segment_bytes: Some(50_000),
        max_decoded_bytes: Some(50_000),
        tail_bytes: Some(2000),
        ..TargetResourceLimits::default()
    });
    let preview_source = read_target_source(&preview_req, &config, &AtomicBool::new(false))
        .expect("preview source read succeeds");
    let preview_mapped = map_target_source_read(&preview_req, &preview_source)
        .expect("preview mapping succeeds");
    let preview_cursor = preview_mapped.batch.payload.next_cursor.expect("preview cursor");
    assert_eq!(preview_cursor.cursor_kind, TargetCursorKind::TailPreview);

    // New backfill request after preview
    let mut backfill_from_preview = TargetAnalyzeRequest::new(
        "req-backfill-from-preview",
        "job-preview-entry",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    windowed(&mut backfill_from_preview);
    let bf_source = read_target_source(&backfill_from_preview, &config, &AtomicBool::new(false))
        .expect("backfill from preview source read succeeds");
    let bf_mapped = map_target_source_read(&backfill_from_preview, &bf_source)
        .expect("backfill mapping succeeds");
    assert_eq!(
        bf_mapped.batch.payload.next_cursor.unwrap().cursor_kind,
        TargetCursorKind::ForwardAppend
    );

    // Entrypoint 2: a known complete prefix must advance to the missing
    // suffix instead of rereading 0..known_end.
    let p1_end = line_offsets[2];
    let mut first_part_req = TargetAnalyzeRequest::new(
        "req-part1",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    windowed(&mut first_part_req);
    first_part_req.known_complete_range = Some(TargetSourceByteRange { start: 0, end: p1_end });
    let p1_source = read_target_source(&first_part_req, &config, &AtomicBool::new(false))
        .expect("p1 read succeeds");
    assert_eq!(
        p1_source
            .segments
            .first()
            .expect("missing suffix segment")
            .requested_range
            .start,
        p1_end
    );
    assert_eq!(
        p1_source
            .segments
            .last()
            .expect("missing suffix segment")
            .requested_range
            .end,
        total_len
    );
    assert!(p1_source
        .segments
        .iter()
        .all(|segment| segment.requested_range.start >= p1_end));
    let p1_mapped = map_target_source_read(&first_part_req, &p1_source).expect("p1 mapping");
    let p1_cursor = p1_mapped.batch.payload.next_cursor.expect("p1 cursor");
    // The returned cursor must carry the accumulated coverage (known prefix
    // unioned with this read's suffix) instead of only this read's window.
    assert_eq!(p1_cursor.complete_range.start, 0);
    assert_eq!(p1_cursor.complete_range.end, total_len);

    // Continuing from a complete-coverage cursor has no gap left to fill, so
    // it rebuilds the full promotion proof. With max_segment_bytes = 1000 that
    // rebuild must still be read through bounded physical windows and must not
    // retain the whole raw history.
    let mut p1_continue = TargetAnalyzeRequest::new(
        "req-part1-continue",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    windowed(&mut p1_continue);
    p1_continue.cursor = Some(p1_cursor);
    let p1_continue_source = read_target_source(&p1_continue, &config, &AtomicBool::new(false))
        .expect("continuation promotion read succeeds");
    assert!(
        p1_continue_source.segments.len() >= 2,
        "the promotion read must be split into bounded physical windows"
    );
    assert!(
        p1_continue_source
            .segments
            .iter()
            .all(|segment| segment.requested_range.end - segment.requested_range.start <= 1000),
        "a promotion window exceeded max_segment_bytes"
    );
    assert_eq!(
        p1_continue_source
            .segments
            .first()
            .expect("promotion segment")
            .requested_range
            .start,
        0
    );
    assert_eq!(
        p1_continue_source
            .segments
            .last()
            .expect("promotion segment")
            .requested_range
            .end,
        total_len
    );
    assert!(
        p1_continue_source.records.len() < contents.lines().count(),
        "the promotion read must not retain the whole raw history"
    );
    let p1_continue_mapped =
        map_target_source_read(&p1_continue, &p1_continue_source).expect("continuation mapping");
    let p1_continue_cursor = p1_continue_mapped
        .batch
        .payload
        .next_cursor
        .clone()
        .expect("continuation must reach a terminal cursor");
    assert_eq!(
        p1_continue_cursor.cursor_kind,
        TargetCursorKind::ForwardAppend,
        "a completed continuation must promote instead of stalling at an empty read"
    );
    assert_eq!(p1_continue_cursor.complete_range.start, 0);
    assert_eq!(p1_continue_cursor.complete_range.end, total_len);

    // The bounded rebuild must reduce exactly the same complete history as a
    // single-window read, so the continuation is a proof rebuild rather than a
    // different result.
    let mut baseline_req = TargetAnalyzeRequest::new(
        "req-part1-baseline",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    baseline_req.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(1000),
        max_segment_bytes: Some(50_000),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });
    let baseline_source = read_target_source(&baseline_req, &config, &AtomicBool::new(false))
        .expect("baseline read succeeds");
    let baseline_mapped =
        map_target_source_read(&baseline_req, &baseline_source).expect("baseline mapping succeeds");
    assert_eq!(
        p1_continue_mapped.batch.payload.history_items,
        baseline_mapped.batch.payload.history_items,
        "the promotion rebuild must reduce the same complete history"
    );
    assert_eq!(
        p1_continue_mapped.batch.payload.tool_details,
        baseline_mapped.batch.payload.tool_details
    );
    assert_eq!(
        p1_continue_mapped.batch.payload.mutations,
        baseline_mapped.batch.payload.mutations
    );
    let continuation_checkpoint = p1_continue_mapped.complete.checkpoint;

    // Entrypoint 3: a caller-proved suffix cannot carry end-line evidence for
    // the snapshot tail, so it rebuilds the full proof in one bounded
    // promotion read and terminates instead of emitting no cursor at all.
    let mut p2_req = TargetAnalyzeRequest::new(
        "req-part2",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    windowed(&mut p2_req);
    p2_req.known_complete_range = Some(TargetSourceByteRange {
        start: p1_end,
        end: total_len,
    });
    let p2_source = read_target_source(&p2_req, &config, &AtomicBool::new(false))
        .expect("p2 read succeeds");
    assert_eq!(
        p2_source
            .segments
            .first()
            .expect("p2 seg")
            .requested_range
            .start,
        0
    );
    assert_eq!(
        p2_source
            .segments
            .last()
            .expect("p2 seg")
            .requested_range
            .end,
        total_len
    );
    assert!(
        p2_source.segments.len() >= 2,
        "the suffix promotion read must be split into bounded physical windows"
    );
    assert!(
        p2_source
            .segments
            .iter()
            .all(|segment| segment.requested_range.end - segment.requested_range.start <= 1000),
        "a suffix promotion window exceeded max_segment_bytes"
    );
    assert!(
        p2_source.records.len() < contents.lines().count(),
        "the suffix promotion read must not retain the whole raw history"
    );
    let p2_mapped = map_target_source_read(&p2_req, &p2_source).expect("p2 mapping");
    let p2_cursor = p2_mapped
        .batch
        .payload
        .next_cursor
        .expect("a suffix continuation must emit a terminal cursor");
    assert_eq!(
        p2_cursor.cursor_kind,
        TargetCursorKind::ForwardAppend,
        "a suffix continuation must terminate instead of dropping the cursor"
    );
    assert_eq!(p2_cursor.complete_range.start, 0);
    assert_eq!(p2_cursor.complete_range.end, total_len);

    // Entrypoint 3: an interior range is ambiguous and must fail closed; it
    // cannot be used as an excuse to replay the known bytes.
    let kcr_end = line_offsets[6];
    let mut kcr_req = TargetAnalyzeRequest::new(
        "req-kcr",
        "job-kcr",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    windowed(&mut kcr_req);
    kcr_req.known_complete_range = Some(TargetSourceByteRange {
        start: p1_end,
        end: kcr_end,
    });
    let kcr_error = read_target_source(&kcr_req, &config, &AtomicBool::new(false))
        .expect_err("interior known range must fail closed");
    assert!(matches!(kcr_error, TargetSourceReadError::InvalidRequest(_)));

    // The terminal cursor/checkpoint produced by the bounded continuation path
    // must be directly consumable by an append request for the appended range.
    let appended_line = "{\"timestamp\":\"2026-08-26T00:00:30.000Z\",\"ordinal\":17,\"type\":\"event_msg\",\"payload\":{\"type\":\"agent_message\",\"message\":\"continuation append\"}}\n";
    {
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&fixture_path)
            .expect("open fixture for append");
        file.write_all(appended_line.as_bytes()).expect("append line");
    }
    let appended_len = total_len + appended_line.len() as u64;
    let mut continuation_append = TargetAnalyzeRequest::new(
        "req-part1-append",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Append,
    );
    windowed(&mut continuation_append);
    continuation_append.cursor = Some(p1_continue_cursor);
    continuation_append.persisted_anchor = Some(continuation_checkpoint);
    let continuation_append_source =
        read_target_source(&continuation_append, &config, &AtomicBool::new(false))
            .expect("continuation append read succeeds");
    let continuation_append_segment = continuation_append_source
        .segments
        .iter()
        .rev()
        .find(|segment| segment.source_id == continuation_append_source.source_id)
        .expect("append active segment");
    assert_eq!(continuation_append_segment.requested_range.start, total_len);
    assert_eq!(continuation_append_segment.requested_range.end, appended_len);
    let continuation_append_mapped =
        map_target_source_read(&continuation_append, &continuation_append_source)
            .expect("continuation append mapping succeeds");
    assert_eq!(
        continuation_append_mapped
            .batch
            .payload
            .next_cursor
            .map(|cursor| cursor.cursor_kind),
        Some(TargetCursorKind::ForwardAppend),
        "the continuation cursor must keep the append path working"
    );
}

#[test]
fn test_backfill_fail_closed_negative_cases() {
    let root = unique_temp_root("negative-cases");
    let contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let total_len = contents.len() as u64;
    let file_path = write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    // Case A: Incompatible cursor kind (ForwardAppend passed to Backfill)
    let mut bad_cursor_req = TargetAnalyzeRequest::new(
        "req-bad-cursor",
        "job-bad-cursor",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    bad_cursor_req.cursor = Some(codex_rollout_collector::protocol::TargetAnalyzerCursor {
        schema_version: 1,
        reader_backend: "termlink-rollout-reader".to_string(),
        reader_version: "1.0.0".to_string(),
        cursor_kind: TargetCursorKind::ForwardAppend,
        conversation_id: TEST_CONVERSATION_ID.to_string(),
        source_id: "rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816".to_string(),
        source_epoch: "epoch-0".to_string(),
        source_kind: codex_rollout_collector::protocol::TargetSourceKind::Rollout,
        compression: codex_rollout_collector::protocol::TargetSourceCompression::PlainJsonl,
        snapshot_boundary: TargetSnapshotBoundary::physical_bytes(total_len),
        complete_range: TargetSourceByteRange { start: 0, end: total_len },
        last_complete_line: None,
        last_rollout_ordinal: None,
        capabilities: TargetCursorCapabilities::default(),
    });
    let bad_cursor_err = read_target_source(&bad_cursor_req, &config, &AtomicBool::new(false))
        .expect_err("incompatible cursor must fail closed");
    assert!(matches!(bad_cursor_err, TargetSourceReadError::InvalidRequest(_)));

    // Case B: Unfinished tail without newline (does NOT promote to ForwardAppend)
    let unfinished_contents = format!(
        "{contents}{{\"timestamp\":\"2026-08-26T00:00:20.000Z\",\"ordinal\":18,\"type\":\"event_msg\",\"payload\":{{\"type\":\"task_started\""
    );
    fs::write(&file_path, &unfinished_contents).expect("unfinished write");

    let tail_req = TargetAnalyzeRequest::new(
        "req-unfinished-tail",
        "job-unfinished-tail",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    let tail_source = read_target_source(&tail_req, &config, &AtomicBool::new(false))
        .expect("read succeeds with pending tail");
    let active_seg = tail_source.segments.iter().rev().find(|s| s.source_id == tail_source.source_id).unwrap();
    assert!(active_seg.pending_tail_bytes > 0);
    assert!(!active_seg.complete);

    let tail_mapped = map_target_source_read(&tail_req, &tail_source)
        .expect("tail mapping succeeds");
    assert_eq!(tail_mapped.batch.payload.completeness, TargetCompleteness::Partial);
    let tail_cursor = tail_mapped.batch.payload.next_cursor.expect("safe prefix cursor");
    assert_eq!(
        tail_cursor.cursor_kind,
        TargetCursorKind::Backfill,
        "unfinished tail must NOT promote to ForwardAppend"
    );

    // Restore clean contents
    fs::write(&file_path, &contents).expect("restore write");

    // Case C: Single line exceeds max_segment_bytes
    let mut tiny_seg_req = TargetAnalyzeRequest::new(
        "req-tiny-seg",
        "job-tiny-seg",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    // Minimal rollout lines are ~150-300 bytes; set max_segment_bytes = 50 and max_line_bytes = 50
    tiny_seg_req.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(50),
        max_segment_bytes: Some(50),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });
    let tiny_err = read_target_source(&tiny_seg_req, &config, &AtomicBool::new(false))
        .expect_err("line exceeding max_segment_bytes must fail");
    assert!(matches!(tiny_err, TargetSourceReadError::ResourceLimit(_)));

    // Case D: Aggregate bytes exceed max_decoded_bytes
    let mut small_budget_req = TargetAnalyzeRequest::new(
        "req-small-budget",
        "job-small-budget",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    small_budget_req.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(500),
        max_segment_bytes: Some(500),
        max_decoded_bytes: Some(1000), // file is > 3000 bytes
        ..TargetResourceLimits::default()
    });
    let budget_err = read_target_source(&small_budget_req, &config, &AtomicBool::new(false))
        .expect_err("budget overflow must fail");
    assert!(matches!(budget_err, TargetSourceReadError::ResourceLimit(_)));

    // Case E: Cancellation and deadline
    let cancel_flag = AtomicBool::new(true);
    let cancel_req = TargetAnalyzeRequest::new(
        "req-cancelled",
        "job-cancelled",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    let cancel_err = read_target_source(&cancel_req, &config, &cancel_flag)
        .expect_err("cancelled request must fail");
    assert_eq!(cancel_err, TargetSourceReadError::Cancelled);

    let expired_deadline = Instant::now() - Duration::from_millis(1);
    let timeout_err = read_target_source_with_deadline(
        &cancel_req,
        &config,
        &AtomicBool::new(false),
        expired_deadline,
    )
    .expect_err("expired deadline must fail");
    assert_eq!(timeout_err, TargetSourceReadError::Timeout);
}

/// The shared deadline must stop a large multi-window read while it is still
/// doing I/O (source discovery, planning and the backward boundary scan), not
/// only before the request starts. This is the public-boundary counterpart of
/// the removed production-source unit check.
#[test]
fn test_backfill_deadline_stops_io_in_flight() {
    let root = unique_temp_root("deadline-in-flight");
    let mut contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    // One oversized line makes every window boundary scan walk a long way
    // backwards before it can place a segment edge.
    contents.push_str(&"x".repeat(8 * 1024 * 1024));
    contents.push('\n');
    write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    let mut request = TargetAnalyzeRequest::new(
        "req-deadline-in-flight",
        "job-deadline-in-flight",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    request.resource_limits = Some(TargetResourceLimits {
        max_line_bytes: Some(512 * 1024),
        max_segment_bytes: Some(2 * 1024 * 1024),
        max_decoded_bytes: Some(32 * 1024 * 1024),
        ..TargetResourceLimits::default()
    });

    let result = read_target_source_with_deadline(
        &request,
        &config,
        &AtomicBool::new(false),
        Instant::now() + Duration::from_millis(1),
    );
    // The read must be interrupted while it is still doing I/O. The first
    // phase the shared deadline can catch on a large source is discovery,
    // then planning/boundary scanning; both outcomes prove the control is
    // checked in flight rather than only before the request starts.
    match result.err() {
        Some(TargetSourceReadError::Timeout)
        | Some(TargetSourceReadError::Discovery(LineageError::DiscoveryTimeout)) => {}
        other => panic!(
            "an in-flight multi-window read must stop on the shared deadline, got {other:?}"
        ),
    }
}

// S2 fixtures use the vendored wire shape, independent expected values, and
// the public target read/map path. All source writes stay in OS TEMP.
fn append_s2_event(contents: &mut String, payload: serde_json::Value) {
    let ordinal = contents.lines().count();
    contents.push_str(&serde_json::json!({
        "timestamp": "2026-08-26T00:00:40.000Z", "ordinal": ordinal,
        "type": "event_msg", "payload": payload
    }).to_string());
    contents.push('\n');
}

fn s2_completion(item: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "type": "item_completed", "thread_id": TEST_CONVERSATION_ID,
        "turn_id": "turn-2", "item": item
    })
}

fn s2_command(id: &str, status: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "CommandExecution", "id": id, "command": ["cargo", "test"],
        "cwd": "file:///synthetic/private/workspace", "parsed_cmd": [], "source": "agent",
        "status": status, "stdout": "stdout-only", "stderr": "stderr-only",
        "aggregated_output": "ok 3 passed\n", "exit_code": 0,
        "duration": { "secs": 1, "nanos": 500000000 }
    })
}

#[test]
fn test_item_completed_file_change_and_command_execution_mapping() {
    use serde_json::json;
    use codex_rollout_collector::analysis::AnalysisReducer;
    use codex_rollout_collector::model::IdentityOrigin;

    let root = unique_temp_root("item-completed");
    let mut contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let changes = json!({
        "src/app.rs": {"type": "update", "unified_diff": "@@ -1 +1 @@\n-old\n+new\n", "move_path": null},
        "src/new.rs": {"type": "add", "content": "new file\n"},
        "src/old.rs": {"type": "delete", "content": "old file\n"}
    });
    append_s2_event(&mut contents, json!({
        "type": "patch_apply_end", "call_id": "fc-item-1", "turn_id": "turn-2",
        "stdout": "Success", "stderr": "", "success": true, "status": "completed", "changes": changes
    }));
    let file = s2_completion(json!({"type": "FileChange", "id": "fc-item-1", "status": "completed", "changes": changes}));
    append_s2_event(&mut contents, file.clone());
    append_s2_event(&mut contents, file);
    // A subset carrier must preserve the same file identity even when its
    // sorted index changes, and two redacted paths must never collide.
    append_s2_event(&mut contents, s2_completion(json!({
        "type": "FileChange", "id": "fc-item-1", "status": "completed",
        "changes": {"src/old.rs": {"type": "delete", "content": "old file\n"}}
    })));
    append_s2_event(&mut contents, json!({
        "type": "exec_command_begin", "call_id": "cmd-item-1", "turn_id": "turn-2",
        "command": ["cargo", "test"], "cwd": "file:///synthetic/private/workspace",
        "parsed_cmd": [], "source": "agent"
    }));
    let command = s2_completion(s2_command("cmd-item-1", "completed"));
    append_s2_event(&mut contents, command.clone());
    append_s2_event(&mut contents, command);
    let path = write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);
    let request = TargetAnalyzeRequest::new("req-s2", "job-s2", TEST_CONVERSATION_ID, TargetAnalyzeMode::Backfill);
    let source = read_target_source(&request, &config, &AtomicBool::new(false)).expect("source");
    let mapped = map_target_source_read(&request, &source).expect("map");
    let batch = &mapped.batch.payload;
    assert!(batch.diagnostics.is_empty(), "{:?}", batch.diagnostics);
    assert_eq!(batch.completeness, TargetCompleteness::Canonical);
    let projection: codex_rollout_collector::analysis::AnalysisProjection =
        serde_json::from_value(batch.projection.clone()).expect("owned projection");
    let turn = projection.turns.iter().find(|turn| turn.turn_id == "turn-2").unwrap();
    let files: Vec<_> = turn.items.iter().filter(|item| item.kind == "file_change").collect();
    assert_eq!(files.len(), 3, "legacy/completed/repeated/subset carriers merge");
    for (path, content) in [("src/app.rs", "@@ -1 +1 @@\n-old\n+new\n"), ("src/new.rs", "new file\n"), ("src/old.rs", "old file\n")] {
        let item = files.iter().find(|item| item.path.as_deref() == Some(path)).unwrap();
        assert_eq!(item.content.as_deref(), Some(content));
        assert_eq!(item.correlation_id.as_deref(), Some("fc-item-1"));
        assert!(item.item_key.starts_with("file:fc-item-1:"));
        assert!(item.summary.as_deref().unwrap().starts_with("item_completed:completed:"));
    }
    let tools: Vec<_> = turn.items.iter().filter(|item| item.item_key == "tool:cmd-item-1").collect();
    assert_eq!(tools.len(), 1);
    let tool = tools[0].tool.as_ref().unwrap();
    assert!(tool.started && tool.completed);
    assert_eq!(tool.input.as_deref(), Some("cargo test")); // legacy carrier already supplied it
    assert_eq!(tool.outcome.as_deref(), Some("completed"));
    let detail = batch.tool_details.iter().find(|detail| detail.call_id == "cmd-item-1").unwrap();
    assert_eq!(detail.item_key, "tool:cmd-item-1");
    assert_eq!(detail.output.as_deref(), Some("status=completed; exit_code=0; duration_ms=1500; output=ok 3 passed\n"));
    let events: Vec<_> = batch.history_items.iter().filter(|event| event.metadata().correlation_id.as_deref() == Some("fc-item-1") || event.metadata().correlation_id.as_deref() == Some("cmd-item-1")).collect();
    assert!(events.iter().any(|event| event.metadata().correlation_id.as_deref() == Some("fc-item-1")));
    assert!(events.iter().any(|event| event.metadata().correlation_id.as_deref() == Some("cmd-item-1")));
    for event in &events {
        let meta = event.metadata();
        assert_eq!(meta.conversation_id.as_deref(), Some(TEST_CONVERSATION_ID));
        assert_eq!(meta.turn_id.as_deref(), Some("turn-2"));
        assert_eq!(meta.identity_origin, IdentityOrigin::NativeStableId);
        assert_eq!(meta.source_ref.source_identity, TEST_CONVERSATION_ID);
        assert!(meta.source_ref.byte_end > meta.source_ref.byte_start);
        assert_eq!(meta.source_ref.rollout_ordinal, Some(meta.source_ref.physical_line_ordinal - 1));
    }
    // Re-delivery/overlap of the same owned events must not change projection.
    let mut reducer = AnalysisReducer::new(Some(TEST_CONVERSATION_ID.to_string()));
    for event in &batch.history_items { reducer.apply(event); }
    let before = reducer.clone().finish();
    for event in &batch.history_items { reducer.apply(event); }
    assert_eq!(reducer.finish(), before);
    let reread = read_target_source(&request, &config, &AtomicBool::new(false)).unwrap();
    let remapped = map_target_source_read(&request, &reread).unwrap();
    assert_eq!(remapped.batch.payload.projection, batch.projection);
    assert!(path.starts_with(std::env::temp_dir()));
}

#[test]
fn test_item_completed_negative_and_retention_boundaries() {
    use serde_json::json;
    use codex_rollout_collector::model::Availability;
    let root = unique_temp_root("item-completed-negative");
    let mut contents = generate_clean_rollout(TEST_CONVERSATION_ID);
    let mut failed = s2_command("cmd-failed", "failed");
    failed["exit_code"] = json!(7);
    failed["aggregated_output"] = json!("");
    append_s2_event(&mut contents, s2_completion(failed));
    let mut absent = s2_command("cmd-absent", "completed");
    for field in ["stdout", "stderr", "aggregated_output", "exit_code", "duration"] { absent.as_object_mut().unwrap().remove(field); }
    append_s2_event(&mut contents, s2_completion(absent));
    append_s2_event(&mut contents, s2_completion(s2_command("cmd-running", "in_progress")));
    let mut missing = s2_command("cmd-missing", "completed");
    missing.as_object_mut().unwrap().remove("command");
    append_s2_event(&mut contents, s2_completion(missing));
    append_s2_event(&mut contents, s2_completion(json!({"type": "FutureItem", "id": "unknown"})));
    let mut long = s2_command("cmd-long", "completed");
    long["aggregated_output"] = json!("界".repeat(30_000));
    append_s2_event(&mut contents, s2_completion(long));
    append_s2_event(&mut contents, s2_completion(json!({
        "type": "FileChange", "id": "fc-private", "changes": {
            "/synthetic/private/a.rs": {"type": "add", "content": "read /synthetic/private/token"},
            "/synthetic/private/b.rs": {"type": "delete", "content": "allowed"}
        }
    })));
    write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);
    let request = TargetAnalyzeRequest::new("req-s2-negative", "job-s2-negative", TEST_CONVERSATION_ID, TargetAnalyzeMode::Backfill);
    let source = read_target_source(&request, &config, &AtomicBool::new(false)).unwrap();
    let mapped = map_target_source_read(&request, &source).unwrap();
    let batch = &mapped.batch.payload;
    assert_ne!(batch.completeness, TargetCompleteness::Canonical);
    assert!(!matches!(batch.next_cursor.as_ref().map(|cursor| cursor.cursor_kind), Some(TargetCursorKind::ForwardAppend)));
    assert_ne!(mapped.complete.completeness, TargetCompleteness::Canonical);
    assert!(!matches!(mapped.complete.next_cursor.as_ref().map(|cursor| cursor.cursor_kind), Some(TargetCursorKind::ForwardAppend)));
    assert!(!matches!(mapped.complete.checkpoint.cursor.as_ref().map(|cursor| cursor.cursor_kind), Some(TargetCursorKind::ForwardAppend)));
    let projection: codex_rollout_collector::analysis::AnalysisProjection =
        serde_json::from_value(batch.projection.clone()).expect("owned projection");
    let turn = projection.turns.iter().find(|turn| turn.turn_id == "turn-2").unwrap();
    let find = |id: &str| turn.items.iter().find(|item| item.item_key == format!("tool:{id}")).unwrap().tool.as_ref().unwrap();
    assert_eq!(find("cmd-failed").outcome.as_deref(), Some("failed"));
    assert_eq!(find("cmd-failed").output.as_deref(), Some("status=failed; exit_code=7; duration_ms=1500; output=stdout:\nstdout-only\nstderr:\nstderr-only"));
    assert_eq!(find("cmd-absent").output.as_deref(), Some("status=completed"));
    assert!(!find("cmd-running").completed);
    assert_eq!(find("cmd-running").availability, Availability::PartialRollout);
    let long_output = find("cmd-long").output.as_ref().unwrap();
    assert!(long_output.len() <= 64 * 1024);
    assert!(long_output.ends_with("…<truncated>"));
    let input: serde_json::Value = serde_json::from_str(find("cmd-absent").input.as_ref().unwrap()).unwrap();
    assert_eq!(input["command"], json!(["cargo", "test"]));
    assert!(!input["cwd"].as_str().unwrap().contains("private"));
    assert!(!turn.items.iter().any(|item| item.item_key == "tool:cmd-missing"));
    assert!(batch.history_items.iter().any(|event| matches!(event, AnalysisEvent::UnknownEvent { .. } | AnalysisEvent::ParseGap { .. })));
    let files: Vec<_> = turn.items.iter().filter(|item| item.correlation_id.as_deref() == Some("fc-private")).collect();
    assert_eq!(files.len(), 2);
    assert_ne!(files[0].item_key, files[1].item_key);
    assert!(files.iter().all(|item| item.path.as_deref() == Some("<local-path-redacted>")));
    assert!(files.iter().any(|item| item.content.as_deref() == Some("<local-path-redacted>")));
    assert!(files.iter().any(|item| item.content.as_deref() == Some("allowed")));
}
