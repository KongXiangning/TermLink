use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::AtomicBool;
use std::time::{SystemTime, UNIX_EPOCH};

use codex_rollout_collector::model::{AnalysisEvent, TurnStatus};
use codex_rollout_collector::protocol::{
    AnalyzeMode, AnalyzeRequest, AnalyzerRuntimeState, BatchMessage,
    LAST_TURN_REPLACEMENT_CAPABILITY, RolloutCatalogCandidateRequest, RolloutDiscoveryRequest,
    RolloutLineageRequest, SESSION_LINEAGE_CAPABILITY, SourceSpecRequest, analyze_request,
    analyze_request_with_state, checkpoint_for_batch,
};
use codex_rollout_collector::{
    CompatibilityProfile, LineageTransitionValidationState, ProjectionCoverage, SourceByteRange,
    SourceFixtureHash,
};
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

fn fixture_values(path: &str) -> Vec<Value> {
    fs::read_to_string(path)
        .expect("fixture reads")
        .lines()
        .map(|line| serde_json::from_str(line).expect("fixture line parses"))
        .collect()
}

fn fixture_conversation_id(path: &str) -> String {
    fixture_values(path)
        .first()
        .and_then(|line| line["payload"]["id"].as_str())
        .expect("fixture conversation id")
        .to_string()
}

fn fixture_history_parent(path: &str) -> String {
    fixture_values(path)
        .first()
        .and_then(|line| line["payload"]["history_base"]["thread_id"].as_str())
        .expect("fixture history parent")
        .to_string()
}

fn fixture_turn_id(path: &str) -> String {
    fixture_values(path)
        .iter()
        .find(|line| line["payload"]["type"] == "task_started")
        .and_then(|line| line["payload"]["turn_id"].as_str())
        .expect("fixture turn id")
        .to_string()
}

fn sanitized_session_fixture_root() -> String {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("sanitized-session-5")
        .to_string_lossy()
        .replace('\\', "/")
}

const SANITIZED_SESSION_FIXTURE_FILES: [(&str, u64, &str); 5] = [
    (
        "2026/08/22/rollout-2026-08-22T00-01-00-7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101.jsonl",
        1115,
        "6947576cbf145e033ebd7980e9841ece7f822888eab9173b291e6a46b5db2777",
    ),
    (
        "2026/08/22/rollout-2026-08-22T00-02-00-7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101_6a1b2c30-4d5e-4f6a-8b7c-9d0e1f2a3b40.jsonl",
        1115,
        "69a592fed3aa103532b74a6c63fe97d564ec253afe64eb8a071995f26d33619e",
    ),
    (
        "2026/08/22/rollout-2026-08-22T00-03-00-7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101_1a2b3c40-5d6e-4f7a-8b9c-0d1e2f3a4b50.jsonl",
        1258,
        "81fad02d157560bf6504290a752c2a65639e97a4391869884fc18da017e641b3",
    ),
    (
        "2026/08/22/rollout-2026-08-22T00-04-00-7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101_2b3c4d50-6e7f-4a8b-9c0d-1e2f3a4b5c60.jsonl",
        1258,
        "65cedc06cde291249805532e0441e372f055beb837337bda70fe61b8904696bb",
    ),
    (
        "2026/08/23/rollout-2026-08-23T00-05-00-7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101_3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70.jsonl",
        1492,
        "f030e72d36a8b079a889be12476583a7a6e8c405e686000787ef81ababbe901e",
    ),
];

fn sanitized_session_fixture_active_path() -> std::path::PathBuf {
    std::path::Path::new(&sanitized_session_fixture_root()).join(
        SANITIZED_SESSION_FIXTURE_FILES
            .last()
            .expect("sanitized fixture has an active file")
            .0,
    )
}

fn sanitized_session_fixture_request(request_id: &str, mode: AnalyzeMode) -> AnalyzeRequest {
    let conversation_id = "7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101";
    AnalyzeRequest::new(
        request_id,
        conversation_id,
        SourceSpecRequest::new(""),
        mode,
    )
    .with_lineage(RolloutLineageRequest::default())
    .with_discovery(RolloutDiscoveryRequest {
        sessions_root: sanitized_session_fixture_root(),
        conversation_id: conversation_id.to_string(),
        start_date: Some("2026-08-22".to_string()),
        end_date: Some("2026-08-23".to_string()),
        active_rollout_id: None,
        active_path: None,
        max_candidates: 8,
        max_date_partitions: 4,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY, SESSION_LINEAGE_CAPABILITY])
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

#[test]
fn discovery_budget_failure_precedes_batch_and_checkpoint_publication() {
    let mut request =
        sanitized_session_fixture_request("discovery-fingerprint-budget", AnalyzeMode::Replay);
    request.resource_limits.max_discovery_fingerprint_bytes = 1;
    let error = analyze_request(&request, &AtomicBool::new(false))
        .expect_err("discovery fingerprint budget must fail closed before analysis");
    assert!(error.to_string().contains("fingerprint_bytes"));
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

fn agent_item_completed_line(ordinal: u64, conversation_id: &str, turn_id: &str) -> Value {
    rollout_line(
        ordinal,
        "event_msg",
        serde_json::json!({
            "type": "item_completed",
            "thread_id": conversation_id,
            "turn_id": turn_id,
            "item": {
                "type": "AgentMessage",
                "id": format!("assistant-item-{turn_id}-{ordinal}"),
                "content": [{"type": "Text", "text": format!("answer-{ordinal}")}],
                "phase": "commentary"
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
    let conversation_id = "a1000000-0000-4000-8000-000000000001";
    let rollout_root = conversation_id;
    let rollout_a = "a1100000-0000-4000-8000-000000000002";
    let rollout_b = "a1120000-0000-4000-8000-000000000001";
    let turn_root = "a1200000-0000-4000-8000-000000000001";
    let turn_a = "a1210000-0000-4000-8000-000000000001";
    let turn_b = "a1220000-0000-4000-8000-000000000001";

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
    assert!(
        batch.lineage_transitions.iter().all(|transition| {
            transition.validation_state == LineageTransitionValidationState::Validated
        }),
        "unexpected transition validation states: {:?}",
        batch
            .lineage_transitions
            .iter()
            .map(|transition| transition.validation_state)
            .collect::<Vec<_>>()
    );
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
    assert!(preview_batch.lineage_transitions.iter().all(|transition| {
        transition.validation_state == LineageTransitionValidationState::ValidationUnavailable
    }));
    assert!(
        !preview_batch
            .lineage_coverage
            .as_ref()
            .expect("preview lineage coverage")
            .complete
    );

    let mut backfill = request.clone();
    backfill.header.request_id = "session-discovery-backfill".to_string();
    backfill.mode = AnalyzeMode::Backfill;
    backfill.known_complete_range = Some(
        SourceByteRange::new(0, line_start_after(&b_lines, 2)).expect("backfill range is ordered"),
    );
    let backfill_batch = analyze_request(&backfill, &AtomicBool::new(false))
        .expect("partial backfill crosses the parent suffix boundary");
    assert_eq!(backfill_batch.source_id, rollout_b);
    assert!(backfill_batch.lineage_transitions.iter().all(|transition| {
        transition.validation_state == LineageTransitionValidationState::ValidationUnavailable
    }));
    assert!(
        !backfill_batch
            .lineage_coverage
            .as_ref()
            .expect("backfill lineage coverage")
            .complete
    );

    let _ = fs::remove_dir_all(sessions_root);
}

#[test]
fn sanitized_five_file_fixture_matches_its_recorded_manifest() {
    let root_path = sanitized_session_fixture_root();
    let root = std::path::Path::new(&root_path);
    for (relative, expected_length, expected_digest) in SANITIZED_SESSION_FIXTURE_FILES {
        let path = root.join(relative);
        let metadata = fs::metadata(&path).expect("sanitized fixture file metadata");
        assert_eq!(
            metadata.len(),
            expected_length,
            "fixture length: {relative}"
        );
        let hash = SourceFixtureHash::from_file(&path, 0, expected_length)
            .expect("sanitized fixture file hash");
        assert_eq!(hash.digest(), expected_digest, "fixture digest: {relative}");
    }
}

#[test]
fn sanitized_five_file_fixture_rebuilds_cross_date_lineage_and_keeps_stale_root_provenance() {
    let request =
        sanitized_session_fixture_request("sanitized-five-file-replay", AnalyzeMode::Replay);
    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("sanitized five-file fixture replays through discovery");
    let coverage = batch
        .lineage_coverage
        .as_ref()
        .expect("real lineage coverage");

    assert_eq!(batch.source_id, "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70");
    assert_eq!(batch.discovered_sources.len(), 5);
    assert_eq!(
        coverage.chain_rollout_ids,
        vec![
            "6a1b2c30-4d5e-4f6a-8b7c-9d0e1f2a3b40".to_string(),
            "1a2b3c40-5d6e-4f7a-8b9c-0d1e2f3a4b50".to_string(),
            "2b3c4d50-6e7f-4a8b-9c0d-1e2f3a4b5c60".to_string(),
            "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70".to_string(),
        ]
    );
    assert_eq!(batch.lineage_transitions.len(), 3);
    let validation_states: Vec<_> = batch
        .lineage_transitions
        .iter()
        .map(|transition| transition.validation_state)
        .collect();
    assert_eq!(
        validation_states,
        vec![
            LineageTransitionValidationState::ValidationUnavailable,
            LineageTransitionValidationState::ValidationUnavailable,
            LineageTransitionValidationState::ValidationUnavailable,
        ]
    );
    assert!(batch.replacements.is_empty());
    assert!(!batch.mutations.iter().any(|mutation| matches!(
        mutation,
        codex_rollout_collector::protocol::BatchMutation::ReplaceLastTurn { .. }
    )));
    assert!(
        batch
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == "unknown_event")
    );
    assert!(!coverage.complete);
    assert!(!batch.history_items.is_empty());

    let discovered_ids: Vec<_> = batch
        .discovered_sources
        .iter()
        .map(|source| source.rollout_id.as_str())
        .collect();
    assert!(discovered_ids.contains(&"7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101"));
    assert!(discovered_ids.contains(&"6a1b2c30-4d5e-4f6a-8b7c-9d0e1f2a3b40"));
    assert!(discovered_ids.contains(&"3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70"));
}

#[test]
fn sanitized_five_file_fixture_window_modes_keep_validation_unavailable() {
    let request =
        sanitized_session_fixture_request("sanitized-five-file-preview", AnalyzeMode::Preview);
    let preview = analyze_request(&request, &AtomicBool::new(false))
        .expect("sanitized five-file preview reads the active tail");
    assert_eq!(preview.source_id, "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70");
    assert_eq!(preview.discovered_sources.len(), 5);
    assert_eq!(preview.lineage_transitions.len(), 3);
    assert!(preview.lineage_transitions.iter().all(|transition| {
        transition.validation_state == LineageTransitionValidationState::ValidationUnavailable
    }));
    assert!(preview.replacements.is_empty());
    assert!(preview.next_cursor.is_none());
    assert!(
        !preview
            .lineage_coverage
            .as_ref()
            .expect("preview lineage coverage")
            .complete
    );

    let active_length = fs::metadata(sanitized_session_fixture_active_path())
        .expect("sanitized active fixture metadata")
        .len();
    let mut backfill_request =
        sanitized_session_fixture_request("sanitized-five-file-backfill", AnalyzeMode::Backfill);
    backfill_request.known_complete_range = Some(
        SourceByteRange::new(0, active_length).expect("sanitized active fixture range is ordered"),
    );
    let backfill = analyze_request(&backfill_request, &AtomicBool::new(false))
        .expect("sanitized five-file backfill reads the active source");
    assert_eq!(backfill.source_id, "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70");
    assert_eq!(backfill.discovered_sources.len(), 5);
    assert_eq!(backfill.lineage_transitions.len(), 3);
    assert!(backfill.lineage_transitions.iter().all(|transition| {
        transition.validation_state == LineageTransitionValidationState::ValidationUnavailable
    }));
    assert!(backfill.replacements.is_empty());
    assert!(
        !backfill
            .lineage_coverage
            .as_ref()
            .expect("backfill lineage coverage")
            .complete
    );
}

#[test]
fn sanitized_five_file_fixture_restart_from_latest_path_recovers_all_known_sources() {
    let active_path = sanitized_session_fixture_active_path();
    let mut source_spec = SourceSpecRequest::new(active_path.to_string_lossy());
    source_spec.source_id = Some("3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70".to_string());
    source_spec.source_epoch = Some("persisted-before-restart".to_string());
    let request = AnalyzeRequest::new(
        "sanitized-five-file-restart-latest-only",
        "7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101",
        source_spec,
        AnalyzeMode::Replay,
    )
    .with_lineage(RolloutLineageRequest::default())
    .with_discovery(RolloutDiscoveryRequest {
        sessions_root: sanitized_session_fixture_root(),
        conversation_id: "7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101".to_string(),
        start_date: Some("2026-08-22".to_string()),
        end_date: Some("2026-08-23".to_string()),
        active_rollout_id: None,
        active_path: None,
        max_candidates: 8,
        max_date_partitions: 4,
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY, SESSION_LINEAGE_CAPABILITY]);

    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("latest-only restart discovers the complete bounded synthetic fixture");
    assert_eq!(batch.source_id, "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70");
    assert_eq!(batch.discovered_sources.len(), 5);
    assert_eq!(
        batch
            .lineage_coverage
            .as_ref()
            .expect("restart lineage coverage")
            .chain_rollout_ids,
        vec![
            "6a1b2c30-4d5e-4f6a-8b7c-9d0e1f2a3b40".to_string(),
            "1a2b3c40-5d6e-4f7a-8b9c-0d1e2f3a4b50".to_string(),
            "2b3c4d50-6e7f-4a8b-9c0d-1e2f3a4b5c60".to_string(),
            "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70".to_string(),
        ]
    );
    assert!(!batch.history_items.is_empty());
}

#[test]
fn session_discovery_treats_a_new_child_as_an_append_transition_after_restart() {
    let conversation_id = "a1000000-0000-4000-8000-000000000002";
    let rollout_root = conversation_id;
    let rollout_child = "a1100000-0000-4000-8000-000000000001";
    let turn_root = "a1200000-0000-4000-8000-000000000002";
    let turn_child = "a1210000-0000-4000-8000-000000000002";
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
fn session_discovery_replays_full_child_when_same_file_append_uses_cursor_after_restart() {
    let conversation_id = "a1000000-0000-4000-8000-000000000003";
    let rollout_root = conversation_id;
    let rollout_child = "a1100000-0000-4000-8000-000000000004";
    let turn_root = "a1200000-0000-4000-8000-000000000003";
    let turn_child = "a1210000-0000-4000-8000-000000000003";
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
    ];

    let sessions_root =
        temp_fixture_path("session-discovery-same-file-append").with_extension("sessions");
    let date = sessions_root.join("2026").join("08").join("22");
    fs::create_dir_all(&date).expect("same-file append date creates");
    let root_path = date.join(format!(
        "rollout-2026-08-22T00-38-57-{conversation_id}.jsonl"
    ));
    let child_path = date.join(format!(
        "rollout-2026-08-22T00-40-04-{conversation_id}_{rollout_child}.jsonl"
    ));
    fs::write(&root_path, encoded_lines(&root_lines)).expect("same-file root writes");
    fs::write(&child_path, encoded_lines(&child_lines)).expect("same-file child writes");

    let request = AnalyzeRequest::new(
        "session-discovery-same-file-initial",
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

    let checkpoint_anchor = |batch: &BatchMessage| {
        serde_json::json!({
            "source": {
                "source_id": batch.source_id,
                "source_epoch": batch.source_epoch,
                "fingerprint": batch.source_fingerprint.clone(),
                "prefix_anchor": batch.source_prefix_anchor.clone(),
            },
            "reducer_state": batch.reducer_state.clone(),
        })
    };

    let initial =
        analyze_request(&request, &AtomicBool::new(false)).expect("initial child replay succeeds");
    assert_eq!(initial.source_id, rollout_child);
    assert_eq!(initial.replacements.len(), 1);
    let initial_cursor = initial.next_cursor.clone().expect("initial child cursor");

    let first_append_line = agent_item_completed_line(3, conversation_id, turn_child);
    let mut child_file = fs::OpenOptions::new()
        .append(true)
        .open(&child_path)
        .expect("same-file child opens for first append");
    child_file
        .write_all(&encoded_lines(&[first_append_line]))
        .expect("first child append writes");

    let mut first_append = request.clone();
    first_append.header.request_id = "session-discovery-same-file-first-append".to_string();
    first_append.mode = AnalyzeMode::Append;
    first_append.cursor = Some(initial_cursor);
    first_append.persisted_anchor = Some(checkpoint_anchor(&initial));
    let first = analyze_request(&first_append, &AtomicBool::new(false))
        .expect("restart append rebuilds the complete child lineage");
    assert_eq!(first.source_id, rollout_child);
    assert_eq!(first.replacements.len(), 1);
    assert_eq!(first.replacements[0].replaced_turn_id, turn_root);
    assert_eq!(first.replacements[0].replacement_turn_id, turn_child);
    assert_eq!(
        first
            .history_items
            .iter()
            .filter_map(|item| match item {
                AnalysisEvent::UserMessage { metadata, .. } => metadata.turn_id.clone(),
                _ => None,
            })
            .collect::<Vec<_>>(),
        vec![turn_root.to_string(), turn_child.to_string()]
    );
    let first_cursor = first.next_cursor.clone().expect("first append cursor");

    let mut second_append_line = fs::OpenOptions::new()
        .append(true)
        .open(&child_path)
        .expect("same-file child opens for second append");
    second_append_line
        .write_all(&encoded_lines(&[task_complete_line(4, turn_child)]))
        .expect("second child append writes");

    let mut second_append = first_append.clone();
    second_append.header.request_id = "session-discovery-same-file-second-append".to_string();
    second_append.cursor = Some(first_cursor);
    second_append.persisted_anchor = Some(checkpoint_anchor(&first));
    let second = analyze_request(&second_append, &AtomicBool::new(false))
        .expect("second restart append rebuilds the complete child lineage");

    let mut full_after_second_append = request.clone();
    full_after_second_append.header.request_id =
        "session-discovery-same-file-full-after-second-append".to_string();
    let expected = analyze_request(&full_after_second_append, &AtomicBool::new(false))
        .expect("full replay after appends succeeds");
    assert_eq!(second.history_items, expected.history_items);
    assert_eq!(second.replacements, expected.replacements);
    assert_eq!(second.replacements.len(), 1);
    assert_eq!(second.replacements[0].replaced_turn_id, turn_root);
    assert_eq!(second.replacements[0].replacement_turn_id, turn_child);
    assert_eq!(second.lineage_coverage, expected.lineage_coverage);

    let second_retry = analyze_request(&second_append, &AtomicBool::new(false))
        .expect("repeating the same append request is idempotent");
    assert_eq!(second_retry.history_items, second.history_items);
    assert_eq!(second_retry.replacements, second.replacements);

    let _ = fs::remove_dir_all(sessions_root);
}

#[test]
fn lineage_replay_emits_a_linear_a_to_b_to_c_replacement_chain() {
    let conversation_id = "a1000000-0000-4000-8000-000000000001";
    let rollout_a = "a1100000-0000-4000-8000-000000000002";
    let rollout_b = "a1120000-0000-4000-8000-000000000001";
    let rollout_c = "a1140000-0000-4000-8000-000000000001";
    let turn_a = "a1210000-0000-4000-8000-000000000004";
    let turn_b = "a1220000-0000-4000-8000-000000000002";
    let turn_c = "a1240000-0000-4000-8000-000000000001";

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
    let conversation_id = "a1000000-0000-4000-8000-000000000001";
    let rollout_a = "a1100000-0000-4000-8000-000000000002";
    let rollout_b = "a1120000-0000-4000-8000-000000000001";
    let rollout_c = "a1140000-0000-4000-8000-000000000001";
    let turn_a = "a1210000-0000-4000-8000-000000000004";
    let turn_b = "a1220000-0000-4000-8000-000000000002";
    let turn_c = "a1240000-0000-4000-8000-000000000001";

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
        "rollout-2026-08-22T00-00-00-a1000000-0000-4000-8000-000000000001_a1100000-0000-4000-8000-000000000002.jsonl",
    );
    let path_b = root.join(
        "rollout-2026-08-22T00-01-00-a1000000-0000-4000-8000-000000000001_a1120000-0000-4000-8000-000000000001.jsonl",
    );
    let path_c = root.join(
        "rollout-2026-08-22T00-02-00-a1000000-0000-4000-8000-000000000001_a1140000-0000-4000-8000-000000000001.jsonl",
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
    let conversation_id = "a1000000-0000-4000-8000-000000000001";
    let rollout_parent = "a1100000-0000-4000-8000-000000000002";
    let rollout_child = "a1120000-0000-4000-8000-000000000001";
    let turn_parent = "a1210000-0000-4000-8000-000000000004";
    let turn_child = "a1220000-0000-4000-8000-000000000002";

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
    let parent_path = fixture_path("last-turn-replacement-real-parent.jsonl");
    let child_path = fixture_path("last-turn-replacement-real-child.jsonl");
    let conversation_id = fixture_conversation_id(&child_path);
    let rollout_parent = fixture_history_parent(&child_path);
    let rollout_child = "a1120000-0000-4000-8000-000000000001";
    let turn_parent = fixture_turn_id(&parent_path);
    let turn_child = fixture_turn_id(&child_path);

    let mut source_spec = SourceSpecRequest::new(child_path.clone());
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
            path: parent_path,
        }],
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);

    let batch = analyze_request(&request, &AtomicBool::new(false))
        .expect("synthetic-ID rollout event shapes should analyze");
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
fn lineage_replay_rejects_zstd_parent_with_explicit_compression_error() {
    let parent_fixture = fixture_path("last-turn-replacement-real-parent.jsonl");
    let child_fixture = fixture_path("last-turn-replacement-real-child.jsonl");
    let conversation_id = fixture_conversation_id(&child_fixture);
    let rollout_parent = fixture_history_parent(&child_fixture);
    let rollout_child = "a1120000-0000-4000-8000-000000000001";
    let parent_path = temp_fixture_path("zstd-lineage-parent").with_extension("jsonl.zst");
    let parent_bytes = fs::read(parent_fixture).expect("synthetic parent fixture reads");
    let compressed = zstd::stream::encode_all(parent_bytes.as_slice(), 0)
        .expect("real parent fixture compresses");
    fs::write(&parent_path, compressed).expect("compressed parent fixture writes");

    let mut source_spec = SourceSpecRequest::new(child_fixture);
    source_spec.source_id = Some(rollout_child.to_string());
    source_spec.source_epoch = Some("zstd-parent-epoch".to_string());
    let request = AnalyzeRequest::new(
        "zstd-parent-lineage-rejected",
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
    })
    .with_peer_capabilities([LAST_TURN_REPLACEMENT_CAPABILITY]);

    let error = analyze_request(&request, &AtomicBool::new(false))
        .expect_err("ordinary zstd parent lineage must fail closed");
    let message = error.to_string();
    assert!(message.contains("unsupported parent source compression"));
    assert!(message.contains("replacement_validation"));
    assert!(message.contains("compression=zstd"));
    assert!(message.contains("ordinary .zst parent lineage is fail-closed"));

    let _ = fs::remove_file(parent_path);
}

#[test]
fn lineage_replay_accepts_explicit_interrupted_parent_terminal() {
    let parent_path = fixture_path("last-turn-replacement-stopped-parent.jsonl");
    let child_path = fixture_path("last-turn-replacement-stopped-child.jsonl");
    let conversation_id = fixture_conversation_id(&child_path);
    let rollout_parent = fixture_history_parent(&child_path);
    let rollout_child = "a1120000-0000-4000-8000-000000000002";
    let turn_parent = fixture_turn_id(&parent_path);
    let turn_child = fixture_turn_id(&child_path);

    let mut source_spec = SourceSpecRequest::new(child_path.clone());
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
            path: parent_path,
        }],
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
