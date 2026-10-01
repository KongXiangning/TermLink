use crate::dto::{ConversationDto, HistoryProjection};
use crate::reader::ParsedRolloutLine;
use crate::reducer::HistoryReducer;
use crate::wire::parse_rollout_line;
use serde_json::json;

const SESSION_ID: &str = "00000000-0000-0000-0000-000000000001";

fn conversation() -> ConversationDto {
    ConversationDto {
        conversation_id: SESSION_ID.to_string(),
        source: "test".to_string(),
        rollout_path: "fixture.jsonl".to_string(),
        cli_version: None,
        codex_revision: None,
        thread_id: None,
        forked_from_id: None,
        parent_thread_id: None,
        history_mode: None,
        history_base: None,
        subagent_history_start_ordinal: None,
        cwd: None,
        project_path: None,
        git_info: None,
        model: None,
        model_provider: None,
        endpoint: None,
        profile: None,
        settings: None,
        settings_history: Vec::new(),
        usage_total: None,
        latest_rate_limit: None,
        latest_context_window: None,
        redaction_policy: Some("none".to_string()),
        availability: None,
        parse_progress: None,
        created_at: None,
        updated_at: None,
    }
}

fn line(ordinal: u64, type_name: &str, payload: serde_json::Value) -> ParsedRolloutLine {
    let value = json!({
        "timestamp": format!("2026-08-15T00:00:{ordinal:02}.000Z"),
        "ordinal": ordinal,
        "type": type_name,
        "payload": payload,
    });
    ParsedRolloutLine {
        source_ordinal: ordinal,
        rollout_ordinal: Some(ordinal),
        line: parse_rollout_line(value).unwrap(),
    }
}

fn reduce(lines: Vec<ParsedRolloutLine>) -> HistoryProjection {
    let mut reducer = HistoryReducer::new(conversation(), SESSION_ID.to_string());
    for line in &lines {
        reducer.reduce(line);
    }
    reducer.finish().0
}

#[test]
fn native_wire_model_projects_lifecycle_messages_and_usage() {
    let projection = reduce(vec![
        line(
            1,
            "session_meta",
            json!({
                "session_id": SESSION_ID,
                "id": SESSION_ID,
                "timestamp": "2026-08-15T00:00:00.000Z",
                "cwd": "E:/proj",
                "cli_version": "test",
                "source": "cli",
                "model_provider": "openai"
            }),
        ),
        line(
            2,
            "event_msg",
            json!({"type": "task_started", "turn_id": "turn-1", "started_at": 10, "model_context_window": 1000}),
        ),
        line(
            3,
            "event_msg",
            json!({"type": "user_message", "client_id": "user-1", "message": "run tests"}),
        ),
        line(
            4,
            "event_msg",
            json!({"type": "agent_message", "message": "I will run the tests.", "phase": "commentary"}),
        ),
        line(
            5,
            "event_msg",
            json!({
                "type": "token_count",
                "info": {
                    "total_token_usage": {"input_tokens": 30, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 20, "reasoning_output_tokens": 0, "total_tokens": 50},
                    "last_token_usage": {"input_tokens": 10, "cached_input_tokens": 0, "cache_write_input_tokens": 0, "output_tokens": 8, "reasoning_output_tokens": 0, "total_tokens": 18},
                    "model_context_window": 1000
                }
            }),
        ),
        line(
            6,
            "event_msg",
            json!({"type": "task_complete", "turn_id": "turn-1", "last_agent_message": "Done.", "started_at": 10, "completed_at": 20, "duration_ms": 10}),
        ),
    ]);
    assert_eq!(projection.conversation.conversation_id, SESSION_ID);
    assert_eq!(projection.conversation.cwd.as_deref(), Some("E:/proj"));
    assert_eq!(projection.turns.len(), 1);
    assert_eq!(projection.turns[0].status, "completed");
    assert_eq!(projection.turns[0].usage.as_ref().unwrap().total_tokens, 18);
    assert_eq!(
        projection.task_outcome.as_ref().unwrap().status,
        "completed"
    );
    assert!(!projection.task_outcome.as_ref().unwrap().provisional);
}

#[test]
fn native_wire_model_merges_command_begin_and_end() {
    let projection = reduce(vec![
        line(
            1,
            "session_meta",
            json!({"session_id": SESSION_ID, "id": SESSION_ID, "timestamp": "t", "cwd": "E:/proj", "cli_version": "test", "source": "cli"}),
        ),
        line(
            2,
            "event_msg",
            json!({"type": "task_started", "turn_id": "turn-1", "model_context_window": 1000}),
        ),
        line(
            3,
            "event_msg",
            json!({"type": "exec_command_begin", "call_id": "call-1", "turn_id": "turn-1", "command": ["cargo", "test"], "cwd": "E:/proj"}),
        ),
        line(
            4,
            "event_msg",
            json!({"type": "exec_command_end", "call_id": "call-1", "turn_id": "turn-1", "command": ["cargo", "test"], "cwd": "E:/proj", "stdout": "ok", "stderr": "", "aggregated_output": "ok", "formatted_output": "ok", "exit_code": 0, "duration_ms": 42, "status": "completed"}),
        ),
    ]);
    let tool = projection.turns[0]
        .items
        .iter()
        .find(|item| item.item_key == "tool:call-1")
        .unwrap()
        .tool
        .as_ref()
        .unwrap();
    assert_eq!(tool.cwd.as_deref(), Some("E:/proj"));
    assert_eq!(tool.exit_code, Some(0));
    assert_eq!(tool.duration_ms, Some(42));
    assert_eq!(tool.succeeded, Some(true));
}

#[test]
fn native_wire_model_pairs_plan_question_and_answer() {
    let projection = reduce(vec![
        line(
            1,
            "session_meta",
            json!({"session_id": SESSION_ID, "id": SESSION_ID, "timestamp": "t", "cwd": "E:/proj", "cli_version": "test", "source": "cli"}),
        ),
        line(
            2,
            "event_msg",
            json!({"type": "task_started", "turn_id": "turn-1"}),
        ),
        line(
            3,
            "event_msg",
            json!({"type": "request_user_input", "call_id": "question-call", "turn_id": "turn-1", "questions": [{"id": "choice", "header": "Mode", "question": "Run it?", "is_other": false, "is_secret": false, "options": [{"label": "Yes", "description": "Continue"}, {"label": "No", "description": "Stop"}]}]}),
        ),
        line(
            4,
            "response_item",
            json!({"type": "function_call_output", "call_id": "question-call", "output": "{\"answers\":{\"choice\":{\"answers\":[\"Yes\"]}}}"}),
        ),
    ]);
    let question = projection.turns[0]
        .items
        .iter()
        .find(|item| item.kind == "plan_question")
        .unwrap();
    let answer = projection.turns[0]
        .items
        .iter()
        .find(|item| item.kind == "plan_answer")
        .unwrap();
    assert_eq!(question.correlation_id.as_deref(), Some("question-call"));
    assert_eq!(
        question.related_item_key.as_deref(),
        Some(answer.item_key.as_str())
    );
    assert_eq!(
        answer.related_item_key.as_deref(),
        Some(question.item_key.as_str())
    );
    assert_eq!(answer.answer.as_ref().unwrap().answers, vec!["Yes"]);
}

#[test]
fn native_wire_model_drops_reasoning_and_compaction() {
    let projection = reduce(vec![
        line(
            1,
            "session_meta",
            json!({"session_id": SESSION_ID, "id": SESSION_ID, "timestamp": "t", "cwd": "E:/proj", "cli_version": "test", "source": "cli"}),
        ),
        line(
            2,
            "event_msg",
            json!({"type": "agent_reasoning", "text": "hidden"}),
        ),
        line(
            3,
            "response_item",
            json!({"type": "reasoning", "summary": [], "encrypted_content": "secret"}),
        ),
        line(4, "event_msg", json!({"type": "context_compacted"})),
        line(5, "compacted", json!({"message": "replacement"})),
    ]);
    assert!(
        projection
            .turns
            .iter()
            .all(|turn| turn.items.iter().all(|item| item.kind != "reasoning"))
    );
}
