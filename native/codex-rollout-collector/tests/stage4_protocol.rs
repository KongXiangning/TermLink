use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::AtomicBool;
use std::time::{SystemTime, UNIX_EPOCH};

use codex_rollout_collector::model::{AnalysisEvent, TurnStatus};
use codex_rollout_collector::protocol::{
    AnalyzeMode, AnalyzeRequest, AnalyzerRuntimeState, LAST_TURN_REPLACEMENT_CAPABILITY,
    RolloutCatalogCandidateRequest, RolloutDiscoveryRequest, RolloutLineageRequest,
    SESSION_LINEAGE_CAPABILITY, SourceSpecRequest, analyze_request, analyze_request_with_state,
    checkpoint_for_batch,
};
use codex_rollout_collector::{CompatibilityProfile, ProjectionCoverage, SourceByteRange};
use serde_json::Value;

fn fixture_path(name: &str) -> String {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("current")
        .join(name)
        .to_string_lossy()
        .replace('\\', "/")
}

fn run_protocol(lines: &[Value]) -> Vec<Value> {
    let binary = env!("CARGO_BIN_EXE_codex-rollout-collector");
    let mut child = Command::new(binary)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("stage4 analyzer starts");
    {
        let mut stdin = child.stdin.take().expect("analyzer stdin");
        writeln!(
            stdin,
            "{}",
            serde_json::json!({
                "protocol_version": 1,
                "message_type": "hello",
                "request_id": "node-hello-stage4",
                "role": "node",
                "capabilities": ["analyze", "ack"]
            })
        )
        .expect("write analyzer hello");
        for line in lines {
            writeln!(
                stdin,
                "{}",
                serde_json::to_string(line).expect("line serializes")
            )
            .expect("write analyzer request");
        }
    }
    let output = child.wait_with_output().expect("stage4 analyzer completes");
    assert!(
        output.status.success(),
        "analyzer failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout)
        .expect("analyzer stdout is UTF-8")
        .lines()
        .map(|line| serde_json::from_str(line).expect("protocol line parses"))
        .collect()
}

#[test]
fn analyzer_emits_batch_checkpoint_and_complete_only_after_ack() {
    let request = serde_json::json!({
        "protocol_version": 1,
        "message_type": "analyze",
        "request_id": "req-stage4",
        "conversation_id": "conversation-stage4",
        "source_spec": {
            "path": fixture_path("minimal.jsonl"),
            "source_id": "minimal.jsonl",
            "source_epoch": "stage4-epoch-1"
        },
        "mode": "replay",
        "resource_limits": {
            "max_decoded_bytes": 33554432,
            "max_line_bytes": 524288,
            "max_segment_bytes": 4194304,
            "tail_bytes": 2097152,
            "timeout_ms": 30000
        }
    });
    let ack = serde_json::json!({
        "protocol_version": 1,
        "message_type": "ack",
        "request_id": "req-stage4",
        "batch_id": "req-stage4:batch-0",
        "accepted": true,
        "persisted": true
    });
    let messages = run_protocol(&[request, ack]);
    let kinds: Vec<_> = messages
        .iter()
        .filter_map(|message| message["message_type"].as_str())
        .collect();
    assert_eq!(kinds, vec!["hello", "batch", "complete"]);
    assert_eq!(messages[0]["role"], "analyzer");

    let batch = messages
        .iter()
        .find(|message| message["message_type"] == "batch")
        .expect("batch message");
    assert_eq!(batch["request_id"], "req-stage4");
    assert_eq!(batch["source_id"], "minimal.jsonl");
    assert!(
        batch["history_items"]
            .as_array()
            .is_some_and(|items| !items.is_empty())
    );
    assert_eq!(batch["completeness"], "canonical");
    assert_eq!(batch["projection"]["coverage"], "complete");
    assert_eq!(batch["replace_previous"], false);

    let complete = messages
        .iter()
        .find(|message| message["message_type"] == "complete")
        .expect("complete message");
    assert_eq!(complete["status"], "ok");
    assert_eq!(
        complete["checkpoint"]["source"]["source_id"],
        "minimal.jsonl"
    );
    assert_eq!(complete["checkpoint"]["completeness"], "canonical");
    assert!(complete["checkpoint"]["source"]["fingerprint"].is_object());
    assert!(complete["checkpoint"]["source"]["prefix_anchor"].is_object());
    assert!(complete["checkpoint"]["reducer_state"].is_object());
    assert!(
        batch["mutations"]
            .as_array()
            .is_some_and(|items| !items.is_empty())
    );
    assert!(batch["next_cursor"]["cursor_kind"] == "forward_append");
}

#[test]
fn malformed_json_is_reported_without_using_stdout_for_diagnostics() {
    let messages = run_protocol(&[Value::String("not-json".to_string())]);
    assert_eq!(messages[0]["message_type"], "hello");
    assert_eq!(messages[1]["message_type"], "error");
    assert_eq!(messages[1]["code"], "malformed_protocol");
}

#[test]
fn path_only_source_request_is_rejected_without_identity_inference() {
    let request = serde_json::json!({
        "protocol_version": 1,
        "message_type": "analyze",
        "request_id": "req-path-only",
        "conversation_id": "conversation-stage4",
        "source_spec": { "path": fixture_path("minimal.jsonl") },
        "mode": "replay"
    });
    let messages = run_protocol(&[request]);
    let error = messages
        .iter()
        .find(|message| message["message_type"] == "error")
        .expect("path-only request error");
    assert_eq!(error["code"], "analysis_failed");
    assert!(
        error["message"]
            .as_str()
            .is_some_and(|message| message.contains("source_spec.source_id"))
    );
}

#[test]
fn cancel_stops_an_active_request_without_emitting_complete() {
    let request = serde_json::json!({
        "protocol_version": 1,
        "message_type": "analyze",
        "request_id": "req-cancel-stage4",
        "conversation_id": "conversation-stage4",
        "source_spec": {
            "path": fixture_path("minimal.jsonl"),
            "source_id": "minimal.jsonl",
            "source_epoch": "stage4-cancel-epoch-1"
        },
        "mode": "preview"
    });
    let cancel = serde_json::json!({
        "protocol_version": 1,
        "message_type": "cancel",
        "request_id": "req-cancel-stage4",
        "reason": "test_cancel"
    });
    let messages = run_protocol(&[request, cancel]);
    assert!(messages.iter().any(|message| {
        message["message_type"] == "error"
            && (message["code"] == "cancelled"
                || message["code"] == "ack_timeout"
                || message["code"] == "resource_timeout")
    }));
    assert!(
        !messages
            .iter()
            .any(|message| message["message_type"] == "complete")
    );
}

fn temp_fixture_path(label: &str) -> std::path::PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock is after epoch")
        .as_nanos();
    std::env::temp_dir().join(format!(
        "termlink-stage4-{label}-{}-{stamp}.jsonl",
        std::process::id()
    ))
}

fn request_for(request_id: &str, path: &std::path::Path, mode: AnalyzeMode) -> AnalyzeRequest {
    let mut source_spec = SourceSpecRequest::new(path.to_string_lossy());
    source_spec.source_id = Some("stage4-recovery.jsonl".to_string());
    source_spec.source_epoch = Some("epoch-recovery-1".to_string());
    AnalyzeRequest::new(request_id, "conversation-recovery", source_spec, mode)
}

#[test]
fn replay_cursor_advances_and_rejects_truncation_or_replacement() {
    let path = temp_fixture_path("cursor");
    let first = fs::read_to_string(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("current")
            .join("minimal.jsonl"),
    )
    .expect("minimal fixture");
    fs::write(&path, &first).expect("write recovery fixture");

    let initial = analyze_request(
        &request_for("replay-recovery", &path, AnalyzeMode::Replay),
        &AtomicBool::new(false),
    )
    .expect("initial replay");
    let old_cursor = initial.next_cursor.clone().expect("initial append cursor");
    assert_eq!(old_cursor["cursor_kind"], "forward_append");
    let old_end = old_cursor["complete_range"]["end"]
        .as_u64()
        .expect("old cursor end");

    let appended = format!(
        "{}{}",
        first,
        "{\"timestamp\":\"2026-08-19T02:00:03.000Z\",\"ordinal\":4,\"type\":\"event_msg\",\"payload\":{\"type\":\"agent_message\",\"message\":\"continued\",\"phase\":\"commentary\"}}\n"
    );
    fs::write(&path, &appended).expect("append recovery fixture");
    let mut append_request = request_for("append-recovery", &path, AnalyzeMode::Append);
    append_request.cursor = Some(old_cursor.clone());
    let advanced =
        analyze_request(&append_request, &AtomicBool::new(false)).expect("append recovery");
    let new_cursor = advanced.next_cursor.expect("advanced append cursor");
    assert_eq!(new_cursor["cursor_kind"], "forward_append");
    assert!(new_cursor["complete_range"]["end"].as_u64().unwrap() > old_end);
    assert_ne!(new_cursor, old_cursor);

    let mut replaced = appended.into_bytes();
    replaced[0] = if replaced[0] == b'{' { b'[' } else { b'{' };
    fs::write(&path, &replaced).expect("replace recovery fixture");
    let mut replacement_request = request_for("replacement-recovery", &path, AnalyzeMode::Append);
    replacement_request.cursor = Some(new_cursor.clone());
    let replacement_error = analyze_request(&replacement_request, &AtomicBool::new(false))
        .expect_err("same-size source replacement must fail closed");
    assert!(replacement_error.to_string().contains("fingerprint"));

    fs::write(&path, &first).expect("truncate recovery fixture");
    let mut truncated_request = request_for("truncated-recovery", &path, AnalyzeMode::Append);
    truncated_request.cursor = Some(new_cursor);
    let truncated_error = analyze_request(&truncated_request, &AtomicBool::new(false))
        .expect_err("truncated source must fail closed");
    assert!(
        truncated_error.to_string().contains("snapshot")
            || truncated_error.to_string().contains("fingerprint")
    );
}

#[test]
fn replay_with_persisted_checkpoint_rejects_replacement_without_cursor() {
    let path = temp_fixture_path("replay-checkpoint");
    let original = fs::read(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("current")
            .join("minimal.jsonl"),
    )
    .expect("minimal fixture");
    fs::write(&path, &original).expect("write replay fixture");

    let initial = analyze_request(
        &request_for("replay-checkpoint-initial", &path, AnalyzeMode::Replay),
        &AtomicBool::new(false),
    )
    .expect("initial replay");
    let checkpoint = serde_json::json!({
        "source": {
            "source_id": initial.source_id,
            "source_epoch": initial.source_epoch,
            "fingerprint": initial.source_fingerprint,
            "prefix_anchor": initial.source_prefix_anchor
        }
    });

    let mut replaced = original;
    replaced[0] = if replaced[0] == b'{' { b'[' } else { b'{' };
    fs::write(&path, replaced).expect("replace replay fixture");

    let mut replay = request_for("replay-checkpoint-replaced", &path, AnalyzeMode::Replay);
    replay.persisted_anchor = Some(checkpoint);
    let error = analyze_request(&replay, &AtomicBool::new(false))
        .expect_err("replay must reject a replaced source without cursor");
    assert!(
        error.to_string().contains("fingerprint") || error.to_string().contains("prefix anchor")
    );
}

#[test]
fn request_resource_timeout_is_enforced_before_source_read() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("current")
        .join("minimal.jsonl");
    let mut request = request_for("resource-timeout", &path, AnalyzeMode::Replay);
    request.resource_limits.timeout_ms = 0;
    let error = analyze_request(&request, &AtomicBool::new(false))
        .expect_err("zero request timeout must fail closed");
    assert!(error.to_string().contains("resource timeout"));
}

fn rollout_line(ordinal: u64, payload_type: &str, payload: Value) -> Value {
    let mut value = serde_json::json!({
        "timestamp": format!("2026-08-22T00:00:{ordinal:02}Z"),
        "ordinal": ordinal,
        "type": payload_type
    });
    value["payload"] = payload;
    value
}

fn session_line(conversation_id: &str, history_base: Option<Value>) -> Value {
    let mut payload = serde_json::json!({
        "id": conversation_id,
        "timestamp": "2026-08-22T00:00:00Z",
        "cwd": "E:\\coding\\TermLink",
        "originator": "codex_cli",
        "cli_version": "0.148.0",
        "source": "cli",
        "model_provider": "openai",
        "git": {}
    });
    if let Some(history_base) = history_base {
        payload["history_mode"] = Value::String("paginated".to_string());
        payload["history_base"] = history_base;
    }
    rollout_line(0, "session_meta", payload)
}

fn task_started_line(ordinal: u64, turn_id: &str) -> Value {
    rollout_line(
        ordinal,
        "event_msg",
        serde_json::json!({
            "type": "task_started",
            "turn_id": turn_id,
            "model_context_window": 258400,
            "collaboration_mode_kind": "default"
        }),
    )
}

fn user_item_completed_line(ordinal: u64, conversation_id: &str, turn_id: &str) -> Value {
    rollout_line(
        ordinal,
        "event_msg",
        serde_json::json!({
            "type": "item_completed",
            "thread_id": conversation_id,
            "turn_id": turn_id,
            "item": {
                "type": "UserMessage",
                "id": format!("user-item-{turn_id}"),
                "content": [{"type": "text", "text": format!("question-{turn_id}")}]
            },
            "completed_at_ms": 1
        }),
    )
}

fn task_complete_line(ordinal: u64, turn_id: &str) -> Value {
    rollout_line(
        ordinal,
        "event_msg",
        serde_json::json!({
            "type": "task_complete",
            "turn_id": turn_id,
            "last_agent_message": "done",
            "duration_ms": 1
        }),
    )
}

fn encoded_lines(lines: &[Value]) -> Vec<u8> {
    lines
        .iter()
        .map(|line| {
            let mut encoded = serde_json::to_vec(line).expect("rollout line serializes");
            encoded.push(b'\n');
            encoded
        })
        .flatten()
        .collect()
}

fn line_start_after(lines: &[Value], count: usize) -> u64 {
    encoded_lines(&lines[..count]).len() as u64
}

#[test]
fn session_discovery_resolves_cross_date_chain_from_conversation_id_only() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let rollout_root = conversation_id;
    let rollout_a = "01a02531-9f57-76d0-89f7-9b5e12d04911";
    let rollout_b = "01a02532-e386-7892-8258-23dbea585370";
    let turn_root = "01a02530-a0c4-7b50-8246-95f2ef990000";
    let turn_a = "01a02531-a0c4-7b50-8246-95f2ef990001";
    let turn_b = "01a02532-a0c4-7b50-8246-95f2ef990002";

    let root_lines = vec![
        session_line(conversation_id, None),
        task_started_line(1, turn_root),
        user_item_completed_line(2, conversation_id, turn_root),
        task_complete_line(3, turn_root),
    ];
    let root_cut = line_start_after(&root_lines, 1);
    let a_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_root,
                "end_ordinal_exclusive": 1,
                "end_byte_offset": root_cut
            })),
        ),
        task_started_line(1, turn_a),
        user_item_completed_line(2, conversation_id, turn_a),
        task_complete_line(3, turn_a),
    ];
    let a_cut = line_start_after(&a_lines, 1);
    let b_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_a,
                "end_ordinal_exclusive": 1,
                "end_byte_offset": a_cut
            })),
        ),
        task_started_line(1, turn_b),
        user_item_completed_line(2, conversation_id, turn_b),
        task_complete_line(3, turn_b),
    ];

    let sessions_root = temp_fixture_path("session-discovery").with_extension("sessions");
    let date_22 = sessions_root.join("2026").join("08").join("22");
    let date_23 = sessions_root.join("2026").join("08").join("23");
    fs::create_dir_all(&date_22).expect("date 22 creates");
    fs::create_dir_all(&date_23).expect("date 23 creates");
    let root_path = date_22.join(format!(
        "rollout-2026-08-22T00-38-57-{conversation_id}.jsonl"
    ));
    let a_path = date_22.join(format!(
        "rollout-2026-08-22T00-40-04-{conversation_id}_{rollout_a}.jsonl"
    ));
    let b_path = date_23.join(format!(
        "rollout-2026-08-23T00-41-27-{conversation_id}_{rollout_b}.jsonl"
    ));
    fs::write(&root_path, encoded_lines(&root_lines)).expect("root rollout writes");
    fs::write(&a_path, encoded_lines(&a_lines)).expect("A rollout writes");
    fs::write(&b_path, encoded_lines(&b_lines)).expect("B rollout writes");

    let request = AnalyzeRequest::new(
        "session-discovery-cross-date",
        conversation_id,
        SourceSpecRequest::new(""),
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest::default())
    .with_discovery(RolloutDiscoveryRequest {
        sessions_root: sessions_root.to_string_lossy().to_string(),
        conversation_id: conversation_id.to_string(),
        start_date: Some("2026-08-22".to_string()),
        end_date: Some("2026-08-23".to_string()),
        active_rollout_id: None,
        active_path: None,
        max_candidates: 16,
        max_date_partitions: 8,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY, SESSION_LINEAGE_CAPABILITY]);

    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("conversation-only discovery resolves the active cross-date chain");
    assert_eq!(batch.source_id, rollout_b);
    assert_eq!(batch.discovered_sources.len(), 3);
    assert_eq!(batch.lineage_transitions.len(), 2);
    assert_eq!(
        batch
            .lineage_coverage
            .as_ref()
            .expect("lineage coverage")
            .chain_rollout_ids,
        vec![
            rollout_root.to_string(),
            rollout_a.to_string(),
            rollout_b.to_string()
        ]
    );
    assert!(
        batch
            .lineage_coverage
            .as_ref()
            .expect("lineage coverage")
            .complete
    );
    assert_eq!(batch.replacements.len(), 2);
    let checkpoint = checkpoint_for_batch(&request, &batch).expect("lineage checkpoint");
    assert!(checkpoint.lineage_checkpoint.is_some());
    let lineage_checkpoint = checkpoint
        .lineage_checkpoint
        .as_ref()
        .expect("lineage checkpoint payload");
    assert_eq!(
        lineage_checkpoint["discovered_sources"]
            .as_array()
            .expect("discovered source evidence"),
        &batch
            .discovered_sources
            .iter()
            .map(|source| serde_json::to_value(source).expect("source evidence serializes"))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        lineage_checkpoint["lineage_transitions"]
            .as_array()
            .expect("transition evidence")
            .len(),
        2
    );
    let user_turns: Vec<_> = batch
        .history_items
        .iter()
        .filter_map(|item| match item {
            AnalysisEvent::UserMessage { metadata, .. } => metadata.turn_id.clone(),
            _ => None,
        })
        .collect();
    assert_eq!(
        user_turns,
        vec![
            turn_root.to_string(),
            turn_a.to_string(),
            turn_b.to_string()
        ]
    );

    let mut preview = request.clone();
    preview.header.request_id = "session-discovery-preview".to_string();
    preview.mode = AnalyzeMode::Preview;
    preview.resource_limits.tail_bytes = 128;
    let preview_batch = analyze_request(&preview, &AtomicBool::new(false))
        .expect("preview crosses the parent suffix boundary");
    assert_eq!(preview_batch.source_id, rollout_b);
    assert_eq!(preview_batch.replacements.len(), 0);
    assert!(
        !preview_batch
            .lineage_coverage
            .as_ref()
            .expect("preview lineage coverage")
            .complete
    );

    let _ = fs::remove_dir_all(sessions_root);
}

#[test]
fn session_discovery_treats_a_new_child_as_an_append_transition_after_restart() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ef";
    let rollout_root = conversation_id;
    let rollout_child = "01a02531-9f57-76d0-89f7-9b5e12d04910";
    let turn_root = "01a02530-a0c4-7b50-8246-95f2ef990010";
    let turn_child = "01a02531-a0c4-7b50-8246-95f2ef990011";
    let root_lines = vec![
        session_line(conversation_id, None),
        task_started_line(1, turn_root),
        user_item_completed_line(2, conversation_id, turn_root),
        task_complete_line(3, turn_root),
    ];
    let root_cut = line_start_after(&root_lines, 1);
    let child_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_root,
                "end_ordinal_exclusive": 1,
                "end_byte_offset": root_cut
            })),
        ),
        task_started_line(1, turn_child),
        user_item_completed_line(2, conversation_id, turn_child),
        task_complete_line(3, turn_child),
    ];
    let sessions_root = temp_fixture_path("session-discovery-append").with_extension("sessions");
    let date = sessions_root.join("2026").join("08").join("22");
    fs::create_dir_all(&date).expect("append discovery date creates");
    let root_path = date.join(format!(
        "rollout-2026-08-22T00-38-57-{conversation_id}.jsonl"
    ));
    let child_path = date.join(format!(
        "rollout-2026-08-22T00-40-04-{conversation_id}_{rollout_child}.jsonl"
    ));
    fs::write(&root_path, encoded_lines(&root_lines)).expect("append root writes");

    let request = AnalyzeRequest::new(
        "session-discovery-append-initial",
        conversation_id,
        SourceSpecRequest::new(""),
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest::default())
    .with_discovery(RolloutDiscoveryRequest {
        sessions_root: sessions_root.to_string_lossy().to_string(),
        conversation_id: conversation_id.to_string(),
        start_date: Some("2026-08-22".to_string()),
        end_date: Some("2026-08-22".to_string()),
        active_rollout_id: None,
        active_path: None,
        max_candidates: 8,
        max_date_partitions: 4,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY, SESSION_LINEAGE_CAPABILITY]);
    let initial = analyze_request(&request, &AtomicBool::new(false)).expect("initial root replay");
    let cursor = initial.next_cursor.clone().expect("root append cursor");
    assert_eq!(initial.source_id, rollout_root);

    fs::write(&child_path, encoded_lines(&child_lines)).expect("append child writes");
    let mut transition = request.clone();
    transition.header.request_id = "session-discovery-append-child".to_string();
    transition.mode = AnalyzeMode::Append;
    // Simulate a restarted service whose persisted source identity still
    // points at the parent rollout.  Discovery must treat it as a hint and
    // promote the request to the newly discovered child head.
    transition.source_spec = SourceSpecRequest {
        path: root_path.to_string_lossy().to_string(),
        source_id: Some(rollout_root.to_string()),
        target_conversation_id: None,
        source_epoch: Some(initial.source_epoch.clone()),
        fingerprint: None,
        prefix_anchor: None,
        snapshot_boundary: None,
        max_decoded_bytes: None,
        max_line_bytes: None,
        max_segment_bytes: None,
    };
    transition.persisted_anchor = Some(serde_json::json!({
        "source": {
            "source_id": rollout_root,
            "source_epoch": initial.source_epoch.clone(),
        }
    }));
    transition.cursor = Some(cursor);
    let child = analyze_request(&transition, &AtomicBool::new(false))
        .expect("new child is recovered as a lineage append transition");
    assert_eq!(child.source_id, rollout_child);
    assert_ne!(child.source_epoch, initial.source_epoch);
    assert_eq!(child.replacements.len(), 1);
    assert_eq!(child.replacements[0].replaced_turn_id, turn_root);
    assert_eq!(child.replacements[0].replacement_turn_id, turn_child);
    assert_eq!(
        child.next_cursor.expect("child append cursor")["cursor_kind"],
        "forward_append"
    );

    let _ = fs::remove_dir_all(sessions_root);
}

#[test]
fn lineage_replay_emits_a_linear_a_to_b_to_c_replacement_chain() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let rollout_a = "01a02531-9f57-76d0-89f7-9b5e12d04911";
    let rollout_b = "01a02532-e386-7892-8258-23dbea585370";
    let rollout_c = "01a0254c-9bc1-7a72-bba0-5c5ff17c5987";
    let turn_a = "01a02531-a0c4-7b50-8246-95f2ef990ece";
    let turn_b = "01a02532-e4ce-7981-9d1c-2616d218617f";
    let turn_c = "01a0254c-9cf8-7a30-b17e-a42c467473b9";

    let parent_a_lines = vec![
        session_line(conversation_id, None),
        task_started_line(1, turn_a),
        user_item_completed_line(2, conversation_id, turn_a),
        task_complete_line(3, turn_a),
    ];
    let cut_a = line_start_after(&parent_a_lines, 1);
    let parent_b_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_a,
                "end_ordinal_exclusive": 1,
                "end_byte_offset": cut_a
            })),
        ),
        task_started_line(3, turn_b),
        user_item_completed_line(4, conversation_id, turn_b),
        task_complete_line(5, turn_b),
    ];
    let cut_b = line_start_after(&parent_b_lines, 1);
    let child_c_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_b,
                "end_ordinal_exclusive": 3,
                "end_byte_offset": cut_b
            })),
        ),
        task_started_line(5, turn_c),
        user_item_completed_line(6, conversation_id, turn_c),
        task_complete_line(7, turn_c),
    ];

    let path_a = temp_fixture_path("lineage-a");
    let path_b = temp_fixture_path("lineage-b");
    let path_c = temp_fixture_path("lineage-c");
    fs::write(&path_a, encoded_lines(&parent_a_lines)).expect("parent A writes");
    fs::write(&path_b, encoded_lines(&parent_b_lines)).expect("parent B writes");
    fs::write(&path_c, encoded_lines(&child_c_lines)).expect("child C writes");

    let mut source_spec = SourceSpecRequest::new(path_c.to_string_lossy());
    source_spec.source_id = Some(rollout_c.to_string());
    source_spec.source_epoch = Some("lineage-epoch-c".to_string());
    let request = AnalyzeRequest::new(
        "lineage-a-b-c",
        conversation_id,
        source_spec,
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest {
        catalog_root: None,
        candidates: vec![
            RolloutCatalogCandidateRequest {
                rollout_id: rollout_a.to_string(),
                path: path_a.to_string_lossy().to_string(),
            },
            RolloutCatalogCandidateRequest {
                rollout_id: rollout_b.to_string(),
                path: path_b.to_string_lossy().to_string(),
            },
        ],
        max_depth: 8,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);

    let batch =
        analyze_request(&request, &AtomicBool::new(false)).expect("linear lineage analyzes");
    assert_eq!(
        batch.completeness,
        codex_rollout_collector::protocol::BatchCompleteness::Canonical
    );
    assert_eq!(batch.projection.coverage, ProjectionCoverage::Complete);
    assert_eq!(batch.replacements.len(), 2);
    assert_eq!(batch.replacements[0].parent_rollout_id, rollout_a);
    assert_eq!(batch.replacements[0].child_rollout_id, rollout_b);
    assert_eq!(batch.replacements[0].replaced_turn_id, turn_a);
    assert_eq!(batch.replacements[0].replacement_turn_id, turn_b);
    assert_eq!(batch.replacements[1].parent_rollout_id, rollout_b);
    assert_eq!(batch.replacements[1].child_rollout_id, rollout_c);
    assert_eq!(batch.replacements[1].replaced_turn_id, turn_b);
    assert_eq!(batch.replacements[1].replacement_turn_id, turn_c);
    let replayed_user_turns: Vec<_> = batch
        .history_items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::UserMessage { metadata, .. } => metadata.turn_id.clone(),
            _ => None,
        })
        .collect();
    assert_eq!(
        replayed_user_turns,
        vec![turn_a.to_string(), turn_b.to_string(), turn_c.to_string()]
    );
    assert_eq!(
        batch
            .mutations
            .iter()
            .filter(|mutation| matches!(
                mutation,
                codex_rollout_collector::protocol::BatchMutation::ReplaceLastTurn { .. }
            ))
            .count(),
        2
    );

    let mut unsupported = request.clone();
    unsupported.peer_capabilities.clear();
    let error = analyze_request(&unsupported, &AtomicBool::new(false))
        .expect_err("replacement capability is required");
    assert!(error.to_string().contains("unsupported capability"));

    let _ = fs::remove_file(path_a);
    let _ = fs::remove_file(path_b);
    let _ = fs::remove_file(path_c);
}

#[test]
fn lineage_replay_recovers_latest_rollout_after_restart_without_intermediate_candidates() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let rollout_a = "01a02531-9f57-76d0-89f7-9b5e12d04911";
    let rollout_b = "01a02532-e386-7892-8258-23dbea585370";
    let rollout_c = "01a0254c-9bc1-7a72-bba0-5c5ff17c5987";
    let turn_a = "01a02531-a0c4-7b50-8246-95f2ef990ece";
    let turn_b = "01a02532-e4ce-7981-9d1c-2616d218617f";
    let turn_c = "01a0254c-9cf8-7a30-b17e-a42c467473b9";

    let parent_a_lines = vec![
        session_line(conversation_id, None),
        task_started_line(1, turn_a),
        user_item_completed_line(2, conversation_id, turn_a),
        task_complete_line(3, turn_a),
    ];
    let cut_a = line_start_after(&parent_a_lines, 1);
    let parent_b_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_a,
                "end_ordinal_exclusive": 1,
                "end_byte_offset": cut_a
            })),
        ),
        task_started_line(3, turn_b),
        user_item_completed_line(4, conversation_id, turn_b),
        task_complete_line(5, turn_b),
    ];
    let cut_b = line_start_after(&parent_b_lines, 1);
    let child_c_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_b,
                "end_ordinal_exclusive": 3,
                "end_byte_offset": cut_b
            })),
        ),
        task_started_line(5, turn_c),
        user_item_completed_line(6, conversation_id, turn_c),
        task_complete_line(7, turn_c),
    ];

    let root = temp_fixture_path("lineage-restart-catalog").with_extension("catalog");
    fs::create_dir_all(&root).expect("restart catalog creates");
    let path_a = root.join(
        "rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed_01a02531-9f57-76d0-89f7-9b5e12d04911.jsonl",
    );
    let path_b = root.join(
        "rollout-2026-08-22T00-01-00-01a02530-9975-7df2-a3b3-6bb214ad47ed_01a02532-e386-7892-8258-23dbea585370.jsonl",
    );
    let path_c = root.join(
        "rollout-2026-08-22T00-02-00-01a02530-9975-7df2-a3b3-6bb214ad47ed_01a0254c-9bc1-7a72-bba0-5c5ff17c5987.jsonl",
    );
    fs::write(&path_a, encoded_lines(&parent_a_lines)).expect("restart parent A writes");
    fs::write(&path_b, encoded_lines(&parent_b_lines)).expect("restart parent B writes");
    fs::write(&path_c, encoded_lines(&child_c_lines)).expect("restart child C writes");

    let mut source_spec = SourceSpecRequest::new(path_c.to_string_lossy());
    source_spec.source_id = Some(rollout_c.to_string());
    source_spec.source_epoch = Some("lineage-restart-epoch-c".to_string());
    let request = AnalyzeRequest::new(
        "lineage-restart-latest-only",
        conversation_id,
        source_spec,
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest {
        // An empty lineage request represents a restarted service that only
        // rediscovered the active child.  The collector must discover A/B
        // beside that active source rather than relying on in-memory
        // intermediate rollout state.
        catalog_root: None,
        candidates: Vec::new(),
        max_depth: 8,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);

    let mut restarted_runtime = AnalyzerRuntimeState::new(CompatibilityProfile::Current);
    let batch =
        analyze_request_with_state(&request, &AtomicBool::new(false), &mut restarted_runtime)
            .expect("latest-only restart replay resolves the parent chain");
    assert_eq!(batch.replacements.len(), 2);
    assert_eq!(batch.replacements[0].parent_rollout_id, rollout_a);
    assert_eq!(batch.replacements[0].child_rollout_id, rollout_b);
    assert_eq!(batch.replacements[1].parent_rollout_id, rollout_b);
    assert_eq!(batch.replacements[1].child_rollout_id, rollout_c);
    let replayed_user_turns: Vec<_> = batch
        .history_items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::UserMessage { metadata, .. } => metadata.turn_id.clone(),
            _ => None,
        })
        .collect();
    assert_eq!(
        replayed_user_turns,
        vec![turn_a.to_string(), turn_b.to_string(), turn_c.to_string()]
    );

    let _ = fs::remove_dir_all(root);
}

#[test]
fn lineage_replay_keeps_valid_replacement_when_parent_prefix_is_unknown_and_budgeted() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let rollout_parent = "01a02531-9f57-76d0-89f7-9b5e12d04911";
    let rollout_child = "01a02532-e386-7892-8258-23dbea585370";
    let turn_parent = "01a02531-a0c4-7b50-8246-95f2ef990ece";
    let turn_child = "01a02532-e4ce-7981-9d1c-2616d218617f";

    let mut parent_lines = vec![session_line(conversation_id, None)];
    let opaque_payload = "x".repeat(500);
    for ordinal in 1..=8 {
        parent_lines.push(rollout_line(
            ordinal,
            "future_event",
            serde_json::json!({"opaque": opaque_payload}),
        ));
    }
    let cut = line_start_after(&parent_lines, parent_lines.len());
    parent_lines.push(task_started_line(100, turn_parent));
    parent_lines.push(user_item_completed_line(101, conversation_id, turn_parent));
    parent_lines.push(task_complete_line(102, turn_parent));

    let child_lines = vec![
        session_line(
            conversation_id,
            Some(serde_json::json!({
                "thread_id": rollout_parent,
                "end_ordinal_exclusive": 100,
                "end_byte_offset": cut
            })),
        ),
        task_started_line(200, turn_child),
        user_item_completed_line(201, conversation_id, turn_child),
        task_complete_line(202, turn_child),
    ];

    let parent_path = temp_fixture_path("lineage-budgeted-parent");
    let child_path = temp_fixture_path("lineage-budgeted-child");
    fs::write(&parent_path, encoded_lines(&parent_lines)).expect("budgeted parent writes");
    fs::write(&child_path, encoded_lines(&child_lines)).expect("budgeted child writes");

    let mut source_spec = SourceSpecRequest::new(child_path.to_string_lossy());
    source_spec.source_id = Some(rollout_child.to_string());
    source_spec.source_epoch = Some("lineage-budgeted-epoch".to_string());
    let mut request = AnalyzeRequest::new(
        "lineage-budgeted-prefix",
        conversation_id,
        source_spec,
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest {
        catalog_root: None,
        candidates: vec![RolloutCatalogCandidateRequest {
            rollout_id: rollout_parent.to_string(),
            path: parent_path.to_string_lossy().to_string(),
        }],
        max_depth: 1,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);
    request.resource_limits.max_decoded_bytes = 2048;

    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("unknown parent prefix must not block valid replacement");
    assert_eq!(batch.replacements.len(), 1);
    assert_eq!(batch.replacements[0].parent_rollout_id, rollout_parent);
    assert_eq!(batch.replacements[0].child_rollout_id, rollout_child);
    assert_eq!(batch.replacements[0].replaced_turn_id, turn_parent);
    assert_eq!(batch.replacements[0].replacement_turn_id, turn_child);
    assert_eq!(batch.projection.coverage, ProjectionCoverage::Partial);
    assert!(!batch.projection.complete);
    assert!(!batch.mutations.iter().any(|mutation| matches!(
        mutation,
        codex_rollout_collector::protocol::BatchMutation::ReplaceLastTurn { .. }
    )));
    let replayed_user_turns: Vec<_> = batch
        .history_items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::UserMessage { metadata, .. } => metadata.turn_id.clone(),
            _ => None,
        })
        .collect();
    assert_eq!(
        replayed_user_turns,
        vec![turn_parent.to_string(), turn_child.to_string()]
    );

    let _ = fs::remove_file(parent_path);
    let _ = fs::remove_file(child_path);
}

#[test]
fn lineage_replay_emits_replacement_for_real_rollout_event_shapes() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let rollout_parent = "01a02531-9f57-76d0-89f7-9b5e12d04911";
    let rollout_child = "01a02532-e386-7892-8258-23dbea585370";
    let turn_parent = "01a02531-a0c4-7b50-8246-95f2ef990ece";
    let turn_child = "01a02532-e4ce-7981-9d1c-2616d218617f";

    let mut source_spec =
        SourceSpecRequest::new(fixture_path("last-turn-replacement-real-child.jsonl"));
    source_spec.source_id = Some(rollout_child.to_string());
    source_spec.source_epoch = Some("real-rollout-shape-epoch".to_string());
    let request = AnalyzeRequest::new(
        "real-rollout-shape-replacement",
        conversation_id,
        source_spec,
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest {
        catalog_root: None,
        candidates: vec![RolloutCatalogCandidateRequest {
            rollout_id: rollout_parent.to_string(),
            path: fixture_path("last-turn-replacement-real-parent.jsonl"),
        }],
        max_depth: 1,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);

    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("real rollout event shapes should analyze");
    assert!(batch.complete);
    assert_eq!(
        batch.completeness,
        codex_rollout_collector::protocol::BatchCompleteness::Canonical
    );
    assert_eq!(batch.projection.coverage, ProjectionCoverage::Complete);
    assert_eq!(batch.replacements.len(), 1);
    assert_eq!(batch.replacements[0].parent_rollout_id, rollout_parent);
    assert_eq!(batch.replacements[0].child_rollout_id, rollout_child);
    assert_eq!(batch.replacements[0].replaced_turn_id, turn_parent);
    assert_eq!(batch.replacements[0].replacement_turn_id, turn_child);
    assert!(batch.mutations.iter().any(|mutation| matches!(
        mutation,
        codex_rollout_collector::protocol::BatchMutation::ReplaceLastTurn { replacement }
            if replacement.replaced_turn_id == turn_parent
                && replacement.replacement_turn_id == turn_child
    )));
}

#[test]
fn lineage_replay_accepts_explicit_interrupted_parent_terminal() {
    let conversation_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let rollout_parent = "01a02531-9f57-76d0-89f7-9b5e12d04912";
    let rollout_child = "01a02532-e386-7892-8258-23dbea585371";
    let turn_parent = "01a02531-a0c4-7b50-8246-95f2ef990ed0";
    let turn_child = "01a02532-e4ce-7981-9d1c-2616d2186180";

    let mut source_spec =
        SourceSpecRequest::new(fixture_path("last-turn-replacement-stopped-child.jsonl"));
    source_spec.source_id = Some(rollout_child.to_string());
    source_spec.source_epoch = Some("stopped-rollout-shape-epoch".to_string());
    let request = AnalyzeRequest::new(
        "stopped-rollout-shape-replacement",
        conversation_id,
        source_spec,
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest {
        catalog_root: None,
        candidates: vec![RolloutCatalogCandidateRequest {
            rollout_id: rollout_parent.to_string(),
            path: fixture_path("last-turn-replacement-stopped-parent.jsonl"),
        }],
        max_depth: 1,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);

    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("explicit interrupted parent should analyze");
    assert!(batch.complete);
    assert_eq!(batch.replacements.len(), 1);
    assert_eq!(batch.replacements[0].replaced_turn_id, turn_parent);
    assert_eq!(batch.replacements[0].replacement_turn_id, turn_child);
    assert_eq!(
        batch.replacements[0].replaced_turn_terminal_status,
        TurnStatus::Interrupted
    );
    assert_eq!(batch.projection.coverage, ProjectionCoverage::Complete);
    assert!(batch.mutations.iter().any(|mutation| matches!(
        mutation,
        codex_rollout_collector::protocol::BatchMutation::ReplaceLastTurn { replacement }
            if replacement.replaced_turn_id == turn_parent
                && replacement.replacement_turn_id == turn_child
    )));
}

#[test]
fn checkpoint_restores_plan_pending_state_across_segment_requests() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("current")
        .join("plan-question-answer.jsonl");
    let bytes = fs::read(&path).expect("plan fixture");
    let lines: Vec<&[u8]> = bytes.split_inclusive(|byte| *byte == b'\n').collect();
    let first_end = lines[..2].iter().map(|line| line.len() as u64).sum::<u64>();
    let full_end = bytes.len() as u64;
    let mut runtime = AnalyzerRuntimeState::new(CompatibilityProfile::Current);

    let mut first = request_for("plan-segment-1", &path, AnalyzeMode::Backfill);
    first.known_complete_range = Some(SourceByteRange::new(0, first_end).expect("first range"));
    let first_batch = analyze_request_with_state(&first, &AtomicBool::new(false), &mut runtime)
        .expect("question segment");
    assert!(first_batch.history_items.iter().any(|item| matches!(
        item,
        codex_rollout_collector::model::AnalysisEvent::PlanQuestion { .. }
    )));
    let checkpoint_state = first_batch
        .reducer_state
        .clone()
        .expect("runtime checkpoint state");

    let mut second = request_for("plan-segment-2", &path, AnalyzeMode::Backfill);
    second.known_complete_range =
        Some(SourceByteRange::new(first_end, full_end).expect("second range"));
    second.persisted_anchor = Some(serde_json::json!({ "reducer_state": checkpoint_state }));
    let mut restarted_runtime = AnalyzerRuntimeState::new(CompatibilityProfile::Current);
    let second_batch =
        analyze_request_with_state(&second, &AtomicBool::new(false), &mut restarted_runtime)
            .expect("answer segment after checkpoint restore");
    let answer = second_batch
        .history_items
        .iter()
        .find_map(|item| match item {
            codex_rollout_collector::model::AnalysisEvent::PlanAnswer { metadata, .. } => {
                Some(metadata)
            }
            _ => None,
        });
    assert_eq!(
        answer.and_then(|metadata| metadata.related_item_key.as_deref()),
        Some("question:q-1")
    );
}
