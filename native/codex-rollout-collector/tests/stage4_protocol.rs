use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::AtomicBool;
use std::time::{SystemTime, UNIX_EPOCH};

use codex_rollout_collector::protocol::{
    AnalyzeMode, AnalyzeRequest, AnalyzerRuntimeState, SourceSpecRequest, analyze_request,
    analyze_request_with_state,
};
use codex_rollout_collector::{CompatibilityProfile, SourceByteRange};
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
        "source_spec": { "path": fixture_path("minimal.jsonl") },
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
fn cancel_stops_an_active_request_without_emitting_complete() {
    let request = serde_json::json!({
        "protocol_version": 1,
        "message_type": "analyze",
        "request_id": "req-cancel-stage4",
        "conversation_id": "conversation-stage4",
        "source_spec": { "path": fixture_path("minimal.jsonl") },
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
