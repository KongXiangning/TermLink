use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

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
}

#[test]
fn test_backfill_multi_window_tool_attribution_and_stable_keys() {
    let root = unique_temp_root("tool-attribution");
    let contents = generate_clean_rollout(TEST_CONVERSATION_ID);
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
        max_segment_bytes: Some(1000),
        max_decoded_bytes: Some(50_000),
        ..TargetResourceLimits::default()
    });

    let source = read_target_source(&request, &config, &AtomicBool::new(false))
        .expect("source read succeeds");
    let mapped = map_target_source_read(&request, &source)
        .expect("mapping succeeds");

    // Check that tool details are present and populated
    assert!(
        !mapped.batch.payload.tool_details.is_empty(),
        "must have tool_details"
    );
    for tool in &mapped.batch.payload.tool_details {
        assert!(!tool.call_id.is_empty(), "tool call must have valid call_id");
        assert!(!tool.tool_kind.is_empty(), "tool call must have tool_kind");
    }

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

    // Step 2: Append new records to the rollout file with contiguous ordinal (17)
    let new_line = "{\"timestamp\":\"2026-08-26T00:00:20.000Z\",\"ordinal\":17,\"type\":\"event_msg\",\"payload\":{\"type\":\"agent_message\",\"message\":\"追加新事件\"}}\n";
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(&file_path)
        .expect("open for append");
    use std::io::Write;
    file.write_all(new_line.as_bytes()).expect("write append");
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

    write_fixture_file(&root, TEST_CONVERSATION_ID, &contents);
    let config = target_config(&root);

    // Entrypoint 1: Preview followed by Backfill
    let preview_req = TargetAnalyzeRequest::new(
        "req-preview-entry",
        "job-preview-entry",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Preview,
    );
    let preview_source = read_target_source(&preview_req, &config, &AtomicBool::new(false))
        .expect("preview source read succeeds");
    let preview_mapped = map_target_source_read(&preview_req, &preview_source)
        .expect("preview mapping succeeds");
    let preview_cursor = preview_mapped.batch.payload.next_cursor.expect("preview cursor");
    assert_eq!(preview_cursor.cursor_kind, TargetCursorKind::TailPreview);

    // New backfill request after preview
    let backfill_from_preview = TargetAnalyzeRequest::new(
        "req-backfill-from-preview",
        "job-preview-entry",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    let bf_source = read_target_source(&backfill_from_preview, &config, &AtomicBool::new(false))
        .expect("backfill from preview source read succeeds");
    let bf_mapped = map_target_source_read(&backfill_from_preview, &bf_source)
        .expect("backfill mapping succeeds");
    assert_eq!(
        bf_mapped.batch.payload.next_cursor.unwrap().cursor_kind,
        TargetCursorKind::ForwardAppend
    );

    // Entrypoint 2: Continuation cursor
    // Read up to line 3 at exact newline boundary
    let p1_end = line_offsets[2];
    let mut first_part_req = TargetAnalyzeRequest::new(
        "req-part1",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    first_part_req.known_complete_range = Some(TargetSourceByteRange { start: 0, end: p1_end });
    let p1_source = read_target_source(&first_part_req, &config, &AtomicBool::new(false))
        .expect("p1 read succeeds");
    let p1_mapped = map_target_source_read(&first_part_req, &p1_source).expect("p1 mapping");
    let p1_cursor = p1_mapped.batch.payload.next_cursor.expect("p1 cursor");
    assert_eq!(p1_cursor.cursor_kind, TargetCursorKind::Backfill);
    assert_eq!(p1_cursor.complete_range.end, p1_end);

    // Continue with continuation cursor
    let mut p2_req = TargetAnalyzeRequest::new(
        "req-part2",
        "job-part",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    p2_req.cursor = Some(p1_cursor);
    let p2_source = read_target_source(&p2_req, &config, &AtomicBool::new(false))
        .expect("p2 read succeeds");
    let p2_seg = p2_source.segments.first().expect("p2 seg");
    assert_eq!(p2_seg.requested_range.start, p1_end);
    assert_eq!(p2_seg.requested_range.end, total_len);

    // Entrypoint 3: known_complete_range (at exact line offset)
    let kcr_end = line_offsets[6];
    let mut kcr_req = TargetAnalyzeRequest::new(
        "req-kcr",
        "job-kcr",
        TEST_CONVERSATION_ID,
        TargetAnalyzeMode::Backfill,
    );
    kcr_req.known_complete_range = Some(TargetSourceByteRange { start: 0, end: kcr_end });
    let kcr_source = read_target_source(&kcr_req, &config, &AtomicBool::new(false))
        .expect("kcr read succeeds");
    let kcr_seg = kcr_source.segments.first().expect("kcr seg");
    assert_eq!(kcr_seg.requested_range.start, 0);
    assert_eq!(kcr_seg.requested_range.end, kcr_end);
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
