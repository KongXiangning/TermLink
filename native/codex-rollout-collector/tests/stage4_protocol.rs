use std::io::Write;
use std::process::{Command, Stdio};

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
            && (message["code"] == "cancelled" || message["code"] == "ack_timeout")
    }));
    assert!(
        !messages
            .iter()
            .any(|message| message["message_type"] == "complete")
    );
}
