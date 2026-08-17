//! Offline reducer tests. These fixtures are intentionally small and typed;
//! the real rollout files remain outside the repository.

use codex_protocol::protocol::{EventMsg, RolloutItem};
use serde_json::json;

use crate::dto::{AvailabilityStatus, ConversationDto, HistoryProjection};
use crate::reducer::HistoryReducer;

const TARGET_SESSION_ID: &str = "00000000-0000-0000-0000-000000000001";
const PARENT_SESSION_ID: &str = "00000000-0000-0000-0000-000000000002";
const TARGET_THREAD_ID: &str = "00000000-0000-0000-0000-000000000003";
const PARENT_THREAD_ID: &str = "00000000-0000-0000-0000-000000000004";

fn line(ordinal: u64, item: RolloutItem) -> crate::reader::ParsedRolloutLine {
    line_with_ordinals(ordinal, Some(ordinal), item)
}

fn line_with_ordinals(
    source_ordinal: u64,
    rollout_ordinal: Option<u64>,
    item: RolloutItem,
) -> crate::reader::ParsedRolloutLine {
    line_with_timestamp(
        source_ordinal,
        rollout_ordinal,
        "2026-08-15T00:00:00.000Z",
        item,
    )
}

fn line_with_timestamp(
    source_ordinal: u64,
    rollout_ordinal: Option<u64>,
    timestamp: &str,
    item: RolloutItem,
) -> crate::reader::ParsedRolloutLine {
    crate::reader::ParsedRolloutLine {
        source_ordinal,
        rollout_ordinal,
        line: codex_protocol::protocol::RolloutLine {
            timestamp: timestamp.to_string(),
            ordinal: rollout_ordinal,
            item,
        },
    }
}

fn event(event: EventMsg) -> RolloutItem {
    RolloutItem::EventMsg(event)
}

fn reduce(
    items: Vec<RolloutItem>,
) -> (
    HistoryProjection,
    Vec<crate::dto::DetailPayloadDto>,
    crate::reducer::ReduceStats,
) {
    let lines = items
        .into_iter()
        .enumerate()
        .map(|(index, item)| line(index as u64 + 1, item))
        .collect();
    reduce_lines(lines)
}

fn reduce_lines(
    lines: Vec<crate::reader::ParsedRolloutLine>,
) -> (
    HistoryProjection,
    Vec<crate::dto::DetailPayloadDto>,
    crate::reducer::ReduceStats,
) {
    reduce_lines_for_target(lines, TARGET_SESSION_ID)
}

fn reduce_lines_for_target(
    lines: Vec<crate::reader::ParsedRolloutLine>,
    target_session_id: &str,
) -> (
    HistoryProjection,
    Vec<crate::dto::DetailPayloadDto>,
    crate::reducer::ReduceStats,
) {
    let conversation = ConversationDto {
        conversation_id: target_session_id.to_string(),
        source: "codex_rollout".to_string(),
        rollout_path: "fixture".to_string(),
        cli_version: None,
        codex_revision: Some("test".to_string()),
        thread_id: None,
        forked_from_id: None,
        parent_thread_id: None,
        history_mode: None,
        history_base: None,
        subagent_history_start_ordinal: None,
        cwd: None,
        git_info: None,
        model: None,
        model_provider: None,
        redaction_policy: Some("none".to_string()),
        availability: None,
        created_at: None,
        updated_at: None,
    };
    let mut reducer = HistoryReducer::new(conversation, target_session_id.to_string());
    for line in &lines {
        reducer.reduce(line);
    }
    reducer.finish()
}

fn turn_started(turn_id: &str) -> EventMsg {
    EventMsg::TurnStarted(codex_protocol::protocol::TurnStartedEvent {
        turn_id: turn_id.to_string(),
        trace_id: None,
        started_at: Some(1000),
        model_context_window: Some(258400),
        collaboration_mode_kind: codex_protocol::config_types::ModeKind::Default,
    })
}

fn turn_complete(turn_id: &str) -> EventMsg {
    EventMsg::TurnComplete(codex_protocol::protocol::TurnCompleteEvent {
        turn_id: turn_id.to_string(),
        last_agent_message: None,
        error: None,
        started_at: Some(1000),
        completed_at: Some(2000),
        duration_ms: Some(1000),
        time_to_first_token_ms: Some(25),
    })
}

fn user_message(id: Option<&str>, text: &str) -> EventMsg {
    EventMsg::UserMessage(codex_protocol::protocol::UserMessageEvent {
        client_id: id.map(str::to_string),
        message: text.to_string(),
        images: None,
        image_details: Vec::new(),
        local_images: Vec::new(),
        local_image_details: Vec::new(),
        audio: None,
        local_audio: Vec::new(),
        text_elements: Vec::new(),
    })
}

fn exec_approval_request(call_id: &str) -> EventMsg {
    let payload: codex_protocol::protocol::ExecApprovalRequestEvent =
        serde_json::from_value(json!({
            "call_id": call_id,
            "turn_id": "turn-1",
            "started_at_ms": 1000,
            "command": ["npm", "test"],
            "cwd": "E:\\proj",
            "parsed_cmd": []
        }))
        .expect("exec approval request fixture");
    EventMsg::ExecApprovalRequest(payload)
}

fn paginated_session_meta(start_ordinal: Option<u64>) -> RolloutItem {
    paginated_session_meta_with_boundaries(None, start_ordinal)
}

fn paginated_session_meta_with_boundaries(
    history_base_end: Option<u64>,
    subagent_history_start_ordinal: Option<u64>,
) -> RolloutItem {
    let meta: codex_protocol::protocol::SessionMetaLine = serde_json::from_value(json!({
        "session_id": "00000000-0000-0000-0000-000000000001",
        "id": "00000000-0000-0000-0000-000000000001",
        "timestamp": "2026-08-15T00:00:00.000Z",
        "cwd": "E:\\proj",
        "originator": "test",
        "cli_version": "test",
        "source": "cli",
        "history_mode": "paginated",
        "history_base": history_base_end.map(|end_ordinal_exclusive| json!({
            "thread_id": "00000000-0000-0000-0000-000000000002",
            "end_ordinal_exclusive": end_ordinal_exclusive,
            "end_byte_offset": 123
        })),
        "subagent_history_start_ordinal": subagent_history_start_ordinal
    }))
    .expect("paginated session meta fixture");
    RolloutItem::SessionMeta(meta)
}

fn session_meta_with_ids(
    session_id: &str,
    thread_id: &str,
    forked_from_id: Option<&str>,
    cwd: &str,
) -> RolloutItem {
    let meta: codex_protocol::protocol::SessionMetaLine = serde_json::from_value(json!({
        "session_id": session_id,
        "id": thread_id,
        "forked_from_id": forked_from_id,
        "timestamp": "2026-08-15T00:00:00.000Z",
        "cwd": cwd,
        "originator": "test",
        "cli_version": "test",
        "source": "cli",
        "history_mode": "legacy",
        "history_base": null,
        "subagent_history_start_ordinal": null
    }))
    .expect("session meta fixture");
    RolloutItem::SessionMeta(meta)
}

fn token_count(total: i64, last: i64) -> EventMsg {
    let total_usage = codex_protocol::protocol::TokenUsage {
        input_tokens: total,
        cached_input_tokens: 2,
        cache_write_input_tokens: 3,
        output_tokens: 10,
        reasoning_output_tokens: 5,
        total_tokens: total + 10,
    };
    let last_usage = codex_protocol::protocol::TokenUsage {
        input_tokens: last,
        cached_input_tokens: 2,
        cache_write_input_tokens: 3,
        output_tokens: 10,
        reasoning_output_tokens: 5,
        total_tokens: last + 10,
    };
    EventMsg::TokenCount(codex_protocol::protocol::TokenCountEvent {
        info: Some(codex_protocol::protocol::TokenUsageInfo {
            total_token_usage: total_usage,
            last_token_usage: last_usage,
            model_context_window: Some(258400),
        }),
        rate_limits: None,
    })
}

fn first_item<'a>(projection: &'a HistoryProjection, kind: &str) -> &'a crate::dto::HistoryItemDto {
    projection
        .turns
        .iter()
        .flat_map(|turn| turn.items.iter())
        .find(|item| item.kind == kind)
        .unwrap_or_else(|| panic!("missing item kind {kind}"))
}

#[test]
fn lifecycle_preserves_visible_messages_and_final_usage() {
    let (projection, details, stats) = reduce(vec![
        event(turn_started("turn-1")),
        event(user_message(Some("client-1"), "hello")),
        event(EventMsg::AgentMessage(
            codex_protocol::protocol::AgentMessageEvent {
                message: "hi there".to_string(),
                phase: Some(codex_protocol::models::MessagePhase::FinalAnswer),
                memory_citation: None,
            },
        )),
        event(token_count(100, 100)),
        event(turn_complete("turn-1")),
    ]);
    let turn = &projection.turns[0];
    assert_eq!(turn.status, "completed");
    assert_eq!(turn.time_to_first_token_ms, Some(25));
    assert_eq!(turn.context_window, Some(258400));
    assert_eq!(turn.items.len(), 3);
    assert_eq!(turn.items[0].item_key, "message:client-1");
    assert_eq!(turn.items[0].content.as_deref(), Some("hello"));
    assert_eq!(turn.items[1].kind, "assistant_message");
    assert_eq!(turn.usage.as_ref().expect("usage").total_tokens, 110);
    assert_eq!(
        projection.task_outcome.as_ref().unwrap().status,
        "completed"
    );
    assert_eq!(
        projection
            .task_outcome
            .as_ref()
            .unwrap()
            .conclusion
            .as_deref(),
        Some("hi there")
    );
    let outcome = projection.task_outcome.as_ref().unwrap();
    assert!(!outcome.provisional);
    assert_eq!(
        outcome
            .final_metrics
            .as_ref()
            .and_then(|metrics| metrics.usage.as_ref())
            .map(|usage| usage.total_tokens),
        Some(110)
    );
    assert!(turn.items.iter().any(|item| item.kind == "task_outcome"));
    assert!(details.is_empty());
    assert_eq!(stats.retained_by_kind.get("user_message"), Some(&1));
    assert!(turn.items.iter().all(|item| item.content_hash.is_some()));
}

#[test]
fn retained_items_preserve_their_source_rollout_timestamp() {
    let (projection, _, _) = reduce_lines(vec![
        line_with_timestamp(
            1,
            Some(1),
            "2026-08-13T04:29:59.688Z",
            event(user_message(Some("client-1"), "hello")),
        ),
        line_with_timestamp(
            2,
            Some(2),
            "2026-08-13T04:30:01.000Z",
            event(EventMsg::AgentMessage(
                codex_protocol::protocol::AgentMessageEvent {
                    message: "hi there".to_string(),
                    phase: None,
                    memory_citation: None,
                },
            )),
        ),
    ]);
    let turn = &projection.turns[0];
    assert_eq!(
        turn.items
            .iter()
            .find(|item| item.kind == "user_message")
            .and_then(|item| item.timestamp.as_deref()),
        Some("2026-08-13T04:29:59.688Z")
    );
    assert_eq!(
        turn.items
            .iter()
            .find(|item| item.kind == "assistant_message")
            .and_then(|item| item.timestamp.as_deref()),
        Some("2026-08-13T04:30:01.000Z")
    );
}

#[test]
fn per_turn_usage_uses_last_snapshot_not_session_total() {
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        event(token_count(100, 100)),
        event(turn_complete("turn-1")),
        event(turn_started("turn-2")),
        event(token_count(1000, 200)),
        event(turn_complete("turn-2")),
    ]);
    assert_eq!(projection.turns.len(), 2);
    assert_eq!(
        projection.turns[0].usage.as_ref().unwrap().total_tokens,
        110
    );
    assert_eq!(
        projection.turns[1].usage.as_ref().unwrap().total_tokens,
        210
    );
}

#[test]
fn task_outcome_copies_the_final_turn_metrics_without_overwriting_each_turn() {
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        event(user_message(Some("client-1"), "first")),
        event(EventMsg::AgentMessage(
            codex_protocol::protocol::AgentMessageEvent {
                message: "first answer".to_string(),
                phase: Some(codex_protocol::models::MessagePhase::FinalAnswer),
                memory_citation: None,
            },
        )),
        event(token_count(100, 100)),
        event(turn_complete("turn-1")),
        event(turn_started("turn-2")),
        event(user_message(Some("client-2"), "second")),
        event(EventMsg::AgentMessage(
            codex_protocol::protocol::AgentMessageEvent {
                message: "second answer".to_string(),
                phase: Some(codex_protocol::models::MessagePhase::FinalAnswer),
                memory_citation: None,
            },
        )),
        event(token_count(1000, 200)),
        event(turn_complete("turn-2")),
    ]);
    assert_eq!(
        projection.turns[0].usage.as_ref().unwrap().total_tokens,
        110
    );
    assert_eq!(
        projection.turns[1].usage.as_ref().unwrap().total_tokens,
        210
    );
    let outcome = projection.task_outcome.as_ref().unwrap();
    assert_eq!(outcome.final_turn_id.as_deref(), Some("turn-2"));
    assert!(!outcome.provisional);
    let metrics = outcome.final_metrics.as_ref().expect("final metrics");
    assert_eq!(
        metrics.usage.as_ref().map(|usage| usage.total_tokens),
        Some(210)
    );
    assert_eq!(metrics.context_window, Some(258400));
    assert_eq!(metrics.duration_ms, Some(1000));
    assert_eq!(metrics.time_to_first_token_ms, Some(25));
}

#[test]
fn unfinished_final_turn_creates_a_provisional_outcome_even_with_visible_text() {
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        event(user_message(Some("client-1"), "keep working")),
        event(EventMsg::AgentMessage(
            codex_protocol::protocol::AgentMessageEvent {
                message: "progress update".to_string(),
                phase: Some(codex_protocol::models::MessagePhase::Commentary),
                memory_citation: None,
            },
        )),
        event(token_count(100, 100)),
    ]);
    let outcome = projection.task_outcome.as_ref().unwrap();
    assert_eq!(outcome.status, "incomplete");
    assert!(outcome.provisional);
    assert_eq!(outcome.availability, "partial_rollout");
    let outcome_item = first_item(&projection, "task_outcome");
    assert_eq!(
        outcome_item.availability.as_deref(),
        Some("partial_rollout")
    );
    assert!(
        outcome_item
            .summary
            .as_deref()
            .is_some_and(|summary| summary.contains("provisional=true"))
    );
}

#[test]
fn response_user_input_context_is_not_a_history_user_message() {
    let context = RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::Message {
        id: None,
        role: "user".to_string(),
        content: vec![codex_protocol::models::ContentItem::InputText {
            text: "<app-context>injected context</app-context>".to_string(),
        }],
        phase: None,
        internal_chat_message_metadata_passthrough: None,
    });
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        context,
        event(user_message(Some("real-user"), "real question")),
    ]);
    let users: Vec<_> = projection.turns[0]
        .items
        .iter()
        .filter(|item| item.kind == "user_message")
        .collect();
    assert_eq!(users.len(), 1);
    assert_eq!(users[0].content.as_deref(), Some("real question"));
}

#[test]
fn inherited_history_before_subagent_boundary_is_not_projected() {
    let (projection, _, stats) = reduce_lines(vec![
        line_with_ordinals(1, Some(0), paginated_session_meta(Some(3))),
        line_with_ordinals(2, Some(1), event(user_message(None, "inherited parent"))),
        line_with_ordinals(3, Some(3), event(turn_started("child-turn"))),
        line_with_ordinals(300, Some(4), event(user_message(None, "child question"))),
        line_with_ordinals(
            301,
            Some(5),
            event(EventMsg::AgentMessage(
                codex_protocol::protocol::AgentMessageEvent {
                    message: "child answer".to_string(),
                    phase: None,
                    memory_citation: None,
                },
            )),
        ),
        line_with_ordinals(302, Some(6), event(turn_complete("child-turn"))),
    ]);
    let contents: Vec<_> = projection
        .turns
        .iter()
        .flat_map(|turn| turn.items.iter())
        .filter_map(|item| item.content.as_deref())
        .collect();
    assert!(
        !contents
            .iter()
            .any(|content| *content == "inherited parent")
    );
    assert!(contents.iter().any(|content| *content == "child question"));
    let child_user = projection.turns[0]
        .items
        .iter()
        .find(|item| item.content.as_deref() == Some("child question"))
        .expect("child user message");
    let source_ref = child_user.source_ref.as_ref().expect("source ref");
    assert_eq!(source_ref.source_ordinal, 300);
    assert_eq!(source_ref.rollout_index, Some(4));
    assert_eq!(
        projection.conversation.history_mode.as_deref(),
        Some("paginated")
    );
    assert_eq!(stats.dropped_by_kind.get("inherited_history"), Some(&1));
}

#[test]
fn history_lineage_uses_maximum_boundary_and_preserves_metadata() {
    let (projection, _, _) = reduce_lines(vec![
        line_with_ordinals(
            1,
            Some(0),
            paginated_session_meta_with_boundaries(Some(5), Some(7)),
        ),
        line_with_ordinals(2, Some(4), event(user_message(None, "history base copy"))),
        line_with_ordinals(3, Some(5), event(user_message(None, "subagent prefix"))),
        line_with_ordinals(4, Some(7), event(user_message(None, "child message"))),
    ]);
    let contents: Vec<_> = projection
        .turns
        .iter()
        .flat_map(|turn| turn.items.iter())
        .filter_map(|item| item.content.as_deref())
        .collect();
    assert!(
        !contents
            .iter()
            .any(|content| *content == "history base copy")
    );
    assert!(!contents.iter().any(|content| *content == "subagent prefix"));
    assert!(contents.iter().any(|content| *content == "child message"));
    assert_eq!(
        projection
            .conversation
            .history_base
            .as_ref()
            .map(|base| base.end_ordinal_exclusive),
        Some(5)
    );
    assert_eq!(
        projection.conversation.subagent_history_start_ordinal,
        Some(7)
    );
}

#[test]
fn explicit_target_session_ignores_parent_metadata_before_and_after_target() {
    let (projection, _, stats) = reduce_lines_for_target(
        vec![
            line(
                1,
                session_meta_with_ids(PARENT_SESSION_ID, PARENT_THREAD_ID, None, "E:\\parent"),
            ),
            line(2, event(user_message(None, "copied parent context"))),
            line(
                3,
                session_meta_with_ids(
                    TARGET_SESSION_ID,
                    TARGET_THREAD_ID,
                    Some(PARENT_THREAD_ID),
                    "E:\\target",
                ),
            ),
            line(4, event(user_message(None, "target message"))),
            line(
                5,
                session_meta_with_ids(
                    PARENT_SESSION_ID,
                    PARENT_THREAD_ID,
                    None,
                    "E:\\parent-after-target",
                ),
            ),
        ],
        TARGET_SESSION_ID,
    );

    assert_eq!(projection.conversation.conversation_id, TARGET_SESSION_ID);
    assert_eq!(
        projection.conversation.thread_id.as_deref(),
        Some(TARGET_THREAD_ID)
    );
    assert_eq!(
        projection.conversation.forked_from_id.as_deref(),
        Some(PARENT_THREAD_ID)
    );
    assert_eq!(projection.conversation.cwd.as_deref(), Some("E:\\target"));
    assert_eq!(stats.dropped_by_kind.get("foreign_session_meta"), Some(&2));
    assert!(
        projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .any(|item| item.content.as_deref() == Some("copied parent context"))
    );
    assert!(
        projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .any(|item| item.content.as_deref() == Some("target message"))
    );
}

#[test]
fn explicit_target_identity_survives_a_prefix_without_target_metadata() {
    let (projection, _, stats) = reduce_lines_for_target(
        vec![
            line(
                1,
                session_meta_with_ids(PARENT_SESSION_ID, PARENT_THREAD_ID, None, "E:\\parent"),
            ),
            line(2, event(user_message(None, "partial parent prefix"))),
        ],
        TARGET_SESSION_ID,
    );

    assert_eq!(projection.conversation.conversation_id, TARGET_SESSION_ID);
    assert_eq!(projection.conversation.thread_id, None);
    assert_eq!(projection.conversation.cwd, None);
    assert_eq!(projection.conversation.updated_at, None);
    assert_eq!(stats.dropped_by_kind.get("foreign_session_meta"), Some(&1));
}

#[test]
fn legacy_physical_line_does_not_claim_a_native_rollout_ordinal() {
    let (projection, _, _) = reduce_lines(vec![
        line_with_ordinals(10, None, event(turn_started("legacy-turn"))),
        line_with_ordinals(11, None, event(user_message(None, "legacy message"))),
    ]);
    let user = first_item(&projection, "user_message");
    let source_ref = user.source_ref.as_ref().expect("source ref");
    assert_eq!(source_ref.source_ordinal, 11);
    assert_eq!(source_ref.rollout_index, None);
}

#[test]
fn turn_complete_last_message_is_a_wrapper_not_a_second_assistant_item() {
    let complete = EventMsg::TurnComplete(codex_protocol::protocol::TurnCompleteEvent {
        turn_id: "turn-1".to_string(),
        last_agent_message: Some("same final answer".to_string()),
        error: None,
        started_at: Some(1000),
        completed_at: Some(2000),
        duration_ms: Some(1000),
        time_to_first_token_ms: None,
    });
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        event(EventMsg::AgentMessage(
            codex_protocol::protocol::AgentMessageEvent {
                message: "same final answer".to_string(),
                phase: None,
                memory_citation: None,
            },
        )),
        event(complete),
    ]);
    let assistants = projection.turns[0]
        .items
        .iter()
        .filter(|item| item.kind == "assistant_message")
        .count();
    assert_eq!(assistants, 1);
}

#[test]
fn abort_is_turn_state_not_a_history_item() {
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        event(user_message(None, "stop this")),
        event(EventMsg::TurnAborted(
            codex_protocol::protocol::TurnAbortedEvent {
                turn_id: Some("turn-1".to_string()),
                reason: codex_protocol::protocol::TurnAbortReason::Interrupted,
                started_at: Some(1000),
                completed_at: Some(1500),
                duration_ms: Some(500),
            },
        )),
    ]);
    let turn = &projection.turns[0];
    assert_eq!(turn.status, "interrupted");
    assert_eq!(turn.outcome.as_deref(), Some("interrupted"));
    assert!(turn.items.iter().all(|item| item.kind != "abort"));
}

#[test]
fn rejected_approval_is_dropped_but_interrupted_turn_is_retained() {
    let (projection, details, stats) = reduce(vec![
        event(turn_started("turn-1")),
        event(exec_approval_request("exec-rejected")),
        event(EventMsg::TurnAborted(
            codex_protocol::protocol::TurnAbortedEvent {
                turn_id: Some("turn-1".to_string()),
                reason: codex_protocol::protocol::TurnAbortReason::Interrupted,
                started_at: Some(1000),
                completed_at: Some(1500),
                duration_ms: Some(500),
            },
        )),
    ]);
    let turn = &projection.turns[0];
    assert_eq!(turn.status, "interrupted");
    assert_eq!(
        projection.task_outcome.as_ref().unwrap().status,
        "interrupted"
    );
    assert!(turn.items.iter().all(|item| item.kind != "approval"));
    assert!(turn.items.iter().all(|item| item.kind != "command"));
    assert!(details.is_empty());
    assert_eq!(stats.approvals_seen, 1);
    assert_eq!(stats.dropped_by_kind.get("approval_request"), Some(&1));
}

#[test]
fn command_begin_end_is_one_item_with_external_detail() {
    let begin = codex_protocol::protocol::ExecCommandBeginEvent {
        call_id: "exec-1".to_string(),
        plugin_id: None,
        script_path: None,
        process_id: None,
        turn_id: "turn-1".to_string(),
        started_at_ms: 1000,
        command: vec!["npm".to_string(), "test".to_string()],
        cwd: codex_utils_path_uri::PathUri::parse("file:///E:/proj").unwrap(),
        parsed_cmd: Vec::new(),
        source: codex_protocol::protocol::ExecCommandSource::Agent,
        interaction_input: None,
    };
    let end = codex_protocol::protocol::ExecCommandEndEvent {
        call_id: "exec-1".to_string(),
        plugin_id: None,
        script_path: None,
        process_id: None,
        turn_id: "turn-1".to_string(),
        completed_at_ms: 2000,
        command: vec!["npm".to_string(), "test".to_string()],
        cwd: codex_utils_path_uri::PathUri::parse("file:///E:/proj").unwrap(),
        parsed_cmd: Vec::new(),
        source: codex_protocol::protocol::ExecCommandSource::Agent,
        interaction_input: None,
        stdout: "pass".to_string(),
        stderr: String::new(),
        aggregated_output: "pass".to_string(),
        exit_code: 0,
        duration: std::time::Duration::from_millis(800),
        formatted_output: "pass".to_string(),
        status: codex_protocol::protocol::ExecCommandStatus::Completed,
    };
    let (projection, details, stats) = reduce(vec![
        event(turn_started("turn-1")),
        event(exec_approval_request("exec-1")),
        event(EventMsg::ExecCommandBegin(begin)),
        event(EventMsg::ExecCommandEnd(end)),
        event(turn_complete("turn-1")),
    ]);
    let item = first_item(&projection, "command");
    let tool = item.tool.as_ref().expect("tool metadata");
    assert_eq!(tool.exit_code, Some(0));
    assert_eq!(tool.duration_ms, Some(800));
    assert_eq!(tool.approval, None);
    assert!(tool.output_bytes.unwrap_or(0) > 0);
    assert!(tool.output_sha256.is_some());
    assert!(item.detail_ref.is_some());
    assert!(
        projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .all(|item| item.kind != "approval")
    );
    assert_eq!(stats.approvals_seen, 1);
    assert_eq!(stats.dropped_by_kind.get("approval_request"), Some(&1));
    assert_eq!(details.len(), 1);
    assert_eq!(details[0].canonical_output.as_deref(), Some("pass"));
    assert_eq!(details[0].stdout, None);
    assert_eq!(details[0].aggregated_output, None);
    assert_eq!(details[0].formatted_output, None);
    let serialized_detail = serde_json::to_value(&details[0]).unwrap();
    assert!(serialized_detail.get("stdout").is_none());
    assert!(serialized_detail.get("aggregated_output").is_none());
    assert!(serialized_detail.get("formatted_output").is_none());
    assert_eq!(
        details[0].field_availability.get("stdout"),
        Some(&AvailabilityStatus::Present)
    );
    let command_index = projection.turns[0]
        .items
        .iter()
        .position(|item| item.kind == "command")
        .expect("command item index");
    assert_eq!(
        projection
            .field_availability
            .get(&format!("turns[0].items[{command_index}].tool.approval")),
        Some(&AvailabilityStatus::NotRecoverableFromRollout)
    );
    assert!(
        projection
            .task_outcome
            .as_ref()
            .unwrap()
            .validation_item_keys
            .iter()
            .any(|key| key == &item.item_key)
    );
}

#[test]
fn mcp_begin_end_keeps_name_status_and_result_detail() {
    let invocation = codex_protocol::protocol::McpInvocation {
        server: "fs".to_string(),
        tool: "read".to_string(),
        arguments: Some(json!({"path": "/tmp/x"})),
    };
    let begin = codex_protocol::protocol::McpToolCallBeginEvent {
        call_id: "mcp-1".to_string(),
        invocation: invocation.clone(),
        connector_id: None,
        mcp_app_resource_uri: None,
        link_id: None,
        app_name: None,
        action_name: None,
        plugin_id: None,
    };
    let end = codex_protocol::protocol::McpToolCallEndEvent {
        call_id: "mcp-1".to_string(),
        invocation,
        connector_id: None,
        mcp_app_resource_uri: None,
        link_id: None,
        app_name: None,
        action_name: None,
        plugin_id: None,
        duration: std::time::Duration::from_millis(120),
        result: Ok(codex_protocol::mcp::CallToolResult {
            content: vec![json!({"type": "text", "text": "file contents"})],
            structured_content: None,
            is_error: None,
            meta: None,
        }),
    };
    let (projection, details, _) = reduce(vec![
        event(turn_started("turn-1")),
        event(EventMsg::McpToolCallBegin(begin)),
        event(EventMsg::McpToolCallEnd(end)),
        event(turn_complete("turn-1")),
    ]);
    let item = first_item(&projection, "mcp_tool_call");
    let tool = item.tool.as_ref().expect("tool metadata");
    assert_eq!(tool.tool_name.as_deref(), Some("fs.read"));
    assert_eq!(tool.status.as_deref(), Some("completed"));
    assert_eq!(tool.duration_ms, Some(120));
    assert_eq!(details.len(), 1);
    assert!(item.detail_ref.is_some());
}

#[test]
fn response_agent_message_and_paginated_agent_message_are_retained() {
    let response = RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::AgentMessage {
        id: Some(codex_protocol::ResponseItemId::from_server(
            "response-agent".to_string(),
        )),
        author: "assistant".to_string(),
        recipient: "user".to_string(),
        content: vec![
            codex_protocol::models::AgentMessageInputContent::InputText {
                text: "from response item".to_string(),
            },
        ],
        internal_chat_message_metadata_passthrough: None,
    });
    let paginated = event(EventMsg::ItemCompleted(
        codex_protocol::protocol::ItemCompletedEvent {
            thread_id: codex_protocol::ThreadId::new(),
            turn_id: "turn-1".to_string(),
            item: codex_protocol::items::TurnItem::AgentMessage(
                codex_protocol::items::AgentMessageItem {
                    id: "paginated-agent".to_string(),
                    content: vec![codex_protocol::items::AgentMessageContent::Text {
                        text: "from paginated item".to_string(),
                    }],
                    phase: None,
                    memory_citation: None,
                },
            ),
            started_at_ms: None,
            completed_at_ms: 100,
        },
    ));
    let (projection, _, _) = reduce(vec![event(turn_started("turn-1")), response, paginated]);
    let messages: Vec<_> = projection.turns[0]
        .items
        .iter()
        .filter(|item| item.kind == "assistant_message")
        .filter_map(|item| item.content.as_deref())
        .collect();
    assert!(messages.contains(&"from response item"));
    assert!(messages.contains(&"from paginated item"));
}

#[test]
fn custom_tool_output_and_patch_end_are_persisted() {
    let call = RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::CustomToolCall {
        id: None,
        status: Some("in_progress".to_string()),
        call_id: "ctc-1".to_string(),
        name: "my_tool".to_string(),
        namespace: Some("ns".to_string()),
        input: r#"{"key":"value"}"#.to_string(),
        internal_chat_message_metadata_passthrough: None,
    });
    let output =
        RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::CustomToolCallOutput {
            id: None,
            call_id: "ctc-1".to_string(),
            name: Some("my_tool".to_string()),
            output: codex_protocol::models::FunctionCallOutputPayload::from_text(
                "tool result".to_string(),
            ),
            internal_chat_message_metadata_passthrough: None,
        });
    let mut changes = std::collections::HashMap::new();
    changes.insert(
        std::path::PathBuf::from("E:\\proj\\a.txt"),
        codex_protocol::protocol::FileChange::Add {
            content: "line".to_string(),
        },
    );
    let patch = event(EventMsg::PatchApplyEnd(
        codex_protocol::protocol::PatchApplyEndEvent {
            call_id: "patch-1".to_string(),
            turn_id: "turn-1".to_string(),
            stdout: "updated".to_string(),
            stderr: String::new(),
            success: true,
            changes,
            status: codex_protocol::protocol::PatchApplyStatus::Completed,
        },
    ));
    let (projection, details, _) = reduce(vec![event(turn_started("turn-1")), call, output, patch]);
    let custom = first_item(&projection, "custom_tool");
    assert_eq!(
        custom
            .tool
            .as_ref()
            .and_then(|tool| tool.tool_name.as_deref()),
        Some("ns.my_tool")
    );
    assert!(custom.detail_ref.is_some());
    assert!(
        projection.turns[0]
            .items
            .iter()
            .any(|item| item.kind == "file_change")
    );
    assert_eq!(details.len(), 2);
}

#[test]
fn tool_items_share_presentation_kind_and_exec_exposes_only_real_commands() {
    let function_call =
        RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::FunctionCall {
            id: None,
            name: "lookup".to_string(),
            namespace: Some("demo".to_string()),
            arguments: r#"{"query":"value"}"#.to_string(),
            call_id: "function-1".to_string(),
            internal_chat_message_metadata_passthrough: None,
        });
    let exec_call = RolloutItem::ResponseItem(
        codex_protocol::models::ResponseItem::CustomToolCall {
            id: None,
            status: Some("in_progress".to_string()),
            call_id: "exec-1".to_string(),
            name: "exec".to_string(),
            input: r#"const r = await tools.shell_command({command:"Get-Content src/main.rs",workdir:"E:\\proj"}); text(r);"#
                .to_string(),
            namespace: None,
            internal_chat_message_metadata_passthrough: None,
        },
    );
    let exec_output =
        RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::CustomToolCallOutput {
            id: None,
            call_id: "exec-1".to_string(),
            name: Some("shell_command".to_string()),
            output: codex_protocol::models::FunctionCallOutputPayload::from_text(
                "main.rs contents".to_string(),
            ),
            internal_chat_message_metadata_passthrough: None,
        });
    let (projection, _, _) = reduce(vec![
        event(turn_started("turn-1")),
        function_call,
        exec_call,
        exec_output,
    ]);
    let function_item = first_item(&projection, "function_call");
    assert_eq!(function_item.presentation_kind.as_deref(), Some("tool"));
    assert_eq!(
        function_item
            .tool
            .as_ref()
            .map(|tool| tool.tool_kind.as_str()),
        Some("function_call")
    );
    let exec_item = first_item(&projection, "custom_tool");
    assert_eq!(exec_item.presentation_kind.as_deref(), Some("tool"));
    let exec_tool = exec_item.tool.as_ref().expect("exec tool");
    assert_eq!(exec_tool.tool_name.as_deref(), Some("shell_command"));
    assert_eq!(
        exec_tool.commands.as_deref(),
        Some(["Get-Content src/main.rs".to_string()].as_slice())
    );
    assert_eq!(
        exec_tool.display_command.as_deref(),
        Some("Get-Content src/main.rs")
    );
    assert!(
        !exec_tool
            .display_command
            .as_deref()
            .unwrap_or_default()
            .contains("tools.shell_command")
    );
}

#[test]
fn questions_and_answers_are_structured() {
    let request = event(EventMsg::RequestUserInput(
        codex_protocol::request_user_input::RequestUserInputEvent {
            call_id: "question-call".to_string(),
            turn_id: "turn-1".to_string(),
            questions: vec![
                codex_protocol::request_user_input::RequestUserInputQuestion {
                    id: "choice".to_string(),
                    header: "Pick".to_string(),
                    question: "Which one?".to_string(),
                    is_other: false,
                    is_secret: false,
                    options: Some(vec![
                        codex_protocol::request_user_input::RequestUserInputQuestionOption {
                            label: "A".to_string(),
                            description: "Option A".to_string(),
                        },
                    ]),
                },
            ],
            auto_resolution_ms: None,
        },
    ));
    let answer =
        RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::FunctionCallOutput {
            id: None,
            call_id: "question-call".to_string(),
            output: codex_protocol::models::FunctionCallOutputPayload::from_text(
                r#"{"answers":{"choice":{"answers":["A"]}}}"#.to_string(),
            ),
            internal_chat_message_metadata_passthrough: None,
        });
    let (projection, _, stats) = reduce(vec![event(turn_started("turn-1")), request, answer]);
    let question = first_item(&projection, "plan_question");
    assert_eq!(question.question.as_ref().unwrap().options[0].label, "A");
    assert!(question.answer.is_none());
    let answer_item = first_item(&projection, "plan_answer");
    assert_eq!(answer_item.answer.as_ref().unwrap().answers, vec!["A"]);
    assert_eq!(
        answer_item.related_item_key.as_deref(),
        Some(question.item_key.as_str())
    );
    assert_eq!(
        question.related_item_key.as_deref(),
        Some(answer_item.item_key.as_str())
    );
    assert_eq!(answer_item.correlation_id.as_deref(), Some("question-call"));
    assert_eq!(stats.plan_questions_seen, 1);
    assert_eq!(stats.plan_answers_seen, 1);
}

#[test]
fn response_item_request_user_input_becomes_independent_question_and_answer_items() {
    let request_arguments = serde_json::json!({
        "questions": [{
            "id": "choice",
            "header": "Pick",
            "question": "Which one?",
            "options": [{"label": "A", "description": "Option A"}],
            "isOther": false,
            "isSecret": false
        }]
    })
    .to_string();
    let request = RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::FunctionCall {
        id: None,
        name: "request_user_input".to_string(),
        namespace: None,
        arguments: request_arguments,
        call_id: "response-question-call".to_string(),
        internal_chat_message_metadata_passthrough: None,
    });
    let answer =
        RolloutItem::ResponseItem(codex_protocol::models::ResponseItem::FunctionCallOutput {
            id: None,
            call_id: "response-question-call".to_string(),
            output: codex_protocol::models::FunctionCallOutputPayload::from_text(
                r#"{"answers":{"choice":{"answers":["A"]}}}"#.to_string(),
            ),
            internal_chat_message_metadata_passthrough: None,
        });
    let (projection, details, stats) = reduce(vec![event(turn_started("turn-1")), request, answer]);

    let question = first_item(&projection, "plan_question");
    let answer_item = first_item(&projection, "plan_answer");
    assert_eq!(question.question.as_ref().unwrap().id, "choice");
    assert_eq!(question.question.as_ref().unwrap().options[0].label, "A");
    assert_eq!(answer_item.answer.as_ref().unwrap().answers, vec!["A"]);
    assert_eq!(
        answer_item.related_item_key.as_deref(),
        Some(question.item_key.as_str())
    );
    assert_eq!(
        question.related_item_key.as_deref(),
        Some(answer_item.item_key.as_str())
    );
    assert_eq!(
        question.correlation_id.as_deref(),
        Some("response-question-call")
    );
    assert_eq!(
        answer_item.correlation_id.as_deref(),
        Some("response-question-call")
    );

    let function_item = first_item(&projection, "function_call");
    assert_eq!(
        function_item
            .tool
            .as_ref()
            .and_then(|tool| tool.status.as_deref()),
        Some("completed")
    );
    assert_eq!(stats.plan_questions_seen, 1);
    assert_eq!(stats.plan_answers_seen, 1);
    assert_eq!(stats.unresolved_tools, 0);
    assert_eq!(stats.unresolved_questions, 0);
    assert!(details.is_empty());
}

#[test]
fn compaction_reasoning_and_deltas_are_dropped() {
    let (projection, _, stats) = reduce(vec![
        event(turn_started("turn-1")),
        event(EventMsg::AgentReasoning(
            codex_protocol::protocol::AgentReasoningEvent {
                text: "hidden".to_string(),
            },
        )),
        event(EventMsg::ContextCompacted(
            codex_protocol::protocol::ContextCompactedEvent,
        )),
        event(EventMsg::PlanDelta(
            codex_protocol::protocol::PlanDeltaEvent {
                thread_id: "thread".to_string(),
                turn_id: "turn-1".to_string(),
                item_id: "plan".to_string(),
                delta: "stream".to_string(),
            },
        )),
        event(user_message(None, "keep")),
    ]);
    assert_eq!(projection.turns[0].items.len(), 2);
    assert_eq!(
        projection.task_outcome.as_ref().unwrap().status,
        "incomplete"
    );
    assert_eq!(
        projection.task_outcome.as_ref().unwrap().availability,
        "partial_rollout"
    );
    assert!(projection.task_outcome.as_ref().unwrap().provisional);
    assert_eq!(stats.hidden_reasoning_dropped, 1);
    assert_eq!(stats.compactions_seen, 1);
    assert_eq!(stats.delta_dropped, 1);
}

#[test]
fn same_input_has_same_projection_hash_and_v2_algorithm() {
    let items = vec![
        event(turn_started("turn-1")),
        event(user_message(Some("c1"), "hello")),
        event(EventMsg::AgentMessage(
            codex_protocol::protocol::AgentMessageEvent {
                message: "answer".to_string(),
                phase: None,
                memory_citation: None,
            },
        )),
        event(turn_complete("turn-1")),
    ];
    let (first, _, _) = reduce(items.clone());
    let (second, _, _) = reduce(items);
    assert_eq!(
        serde_json::to_string(&first).unwrap(),
        serde_json::to_string(&second).unwrap()
    );
    assert_eq!(first.content_hash(), second.content_hash());
    assert_eq!(first.snapshot_hash(), second.snapshot_hash());
    assert_eq!(first.root_hash(), second.root_hash());
    let mut moved_snapshot = first.clone();
    moved_snapshot.conversation.rollout_path = "other-machine/rollout.jsonl".to_string();
    moved_snapshot.conversation.updated_at = Some("2026-08-16T00:00:00.000Z".to_string());
    assert_eq!(first.content_hash(), moved_snapshot.content_hash());
    assert_ne!(first.snapshot_hash(), moved_snapshot.snapshot_hash());
    assert_eq!(first.root_hash(), first.content_hash());
    assert_eq!(first.hash_algorithm, crate::dto::HISTORY_HASH_ALGORITHM);
}

#[test]
fn reader_uses_value_path_for_rate_limit_float() {
    let raw = r#"{"timestamp":"2026-08-15T00:00:00.000Z","type":"event_msg","payload":{"type":"token_count","info":null,"rate_limits":{"limit_id":"codex","limit_name":null,"primary":{"used_percent":8.0,"window_minutes":10080,"resets_at":1787197453},"secondary":null,"credits":{"has_credits":true,"unlimited":false,"balance":"1761.0541880000"},"individual_limit":null,"spend_control_reached":null,"plan_type":"plus","rate_limit_reached_type":null}}}"#;
    let parsed = crate::reader::parse_rollout_line(raw).expect("parse fixture");
    match parsed.item {
        RolloutItem::EventMsg(EventMsg::TokenCount(event)) => assert!(event.rate_limits.is_some()),
        _ => panic!("expected token_count event"),
    }
}
