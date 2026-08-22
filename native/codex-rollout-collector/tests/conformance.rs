use std::path::{Path, PathBuf};

use codex_rollout_collector::codex_wire::{DecodedRecord, UnknownReason, decode_value};
use codex_rollout_collector::model::{
    AnalysisEvent, Availability, IdentityOrigin, TerminalEvidence, TurnStatus,
};
use codex_rollout_collector::{
    CompatibilityProfile, JsonlSourceBackend, SourceSpec, analyze_source,
};
use serde_json::json;

fn fixture(relative: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(relative)
}

fn analyze(
    relative: &str,
    profile: CompatibilityProfile,
) -> codex_rollout_collector::AnalysisBatch {
    let backend = JsonlSourceBackend;
    analyze_source(&backend, &SourceSpec::new(fixture(relative)), profile)
        .expect("fixture analyzes")
}

#[test]
fn legacy_profile_decode_and_adapter_projection() {
    let batch = analyze("legacy/minimal.jsonl", CompatibilityProfile::Legacy);
    assert!(batch.complete);
    assert_eq!(
        batch.parser_provenance.compatibility_profile,
        CompatibilityProfile::Legacy
    );
    assert!(
        batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::TurnStarted { .. }))
    );
    assert!(batch.items.iter().any(
        |event| matches!(event, AnalysisEvent::UserMessage { text, .. } if text == "legacy input")
    ));
}

#[test]
fn current_profile_decode_and_adapter_projection() {
    let batch = analyze("current/minimal.jsonl", CompatibilityProfile::Current);
    assert!(batch.complete);
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::AssistantMessage { text, .. } if text == "current output")));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            status: TurnStatus::Completed,
            ..
        }
    )));
}

#[test]
fn explicit_turn_aborted_is_interrupted_terminal_evidence() {
    let batch = analyze(
        "current/last-turn-replacement-stopped-parent.jsonl",
        CompatibilityProfile::Current,
    );

    assert!(batch.complete);
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            metadata,
            status: TurnStatus::Interrupted,
            ..
        } if metadata.availability == Availability::PartialRollout
            && metadata.terminal_evidence == Some(TerminalEvidence::ExplicitAbort)
    )));
}

#[test]
fn turn_complete_error_aliases_fail_closed_and_preserve_error_identity() {
    let batch = analyze(
        "current/turn-complete-error.jsonl",
        CompatibilityProfile::Current,
    );

    assert!(!batch.complete);
    assert_eq!(
        batch
            .items
            .iter()
            .filter(|event| matches!(event, AnalysisEvent::TurnCompleted { .. }))
            .count(),
        2
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            metadata,
            status: TurnStatus::Interrupted,
            message: Some(message),
            ..
        } if metadata.turn_id.as_deref() == Some("legacy-error-turn")
            && metadata.availability == Availability::PartialRollout
            && message == "legacy terminal failure"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            metadata,
            status: TurnStatus::Interrupted,
            message: Some(message),
            ..
        } if metadata.turn_id.as_deref() == Some("current-error-turn")
            && metadata.availability == Availability::PartialRollout
            && message == "current terminal failure"
    )));
    assert!(!batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            status: TurnStatus::Completed,
            ..
        }
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::Diagnostic {
            code,
            message: Some(message),
            ..
        } if code == "error" && message == "generic event error"
    )));
}

#[test]
fn codex_wire_minimal_envelope_and_provenance() {
    let batch = analyze(
        "current/minimal-rollout.jsonl",
        CompatibilityProfile::Current,
    );
    assert_eq!(batch.parser_provenance.parser_backend, "analyzer");
    assert_eq!(
        batch.parser_provenance.wire_source_revision,
        "5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2"
    );
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::SessionContext { session_id: Some(id), .. } if id == "019b2b40-beb6-7b23-bed0-37d570e76816")));
    assert!(batch.items.iter().any(
        |event| matches!(event, AnalysisEvent::ToolCompleted { call_id, .. } if call_id == "call-2")
    ));
    assert!(
        batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::UnknownEvent { .. }))
    );
    assert_eq!(
        batch
            .items
            .iter()
            .filter(|event| matches!(event, AnalysisEvent::UserMessage { .. }))
            .count(),
        1,
        "only the explicit event_msg user carrier may become a UI UserMessage"
    );
    assert!(!batch.items.is_empty());
}

#[test]
fn history_base_requires_paginated_history_mode() {
    let session_id = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
    let parent_rollout_id = "01a02531-9f57-76d0-89f7-9b5e12d04911";
    let make_session = |history_mode: Option<&str>| {
        let mut payload = json!({
            "id": session_id,
            "timestamp": "2026-08-22T00:00:00Z",
            "cwd": "E:\\coding\\TermLink",
            "originator": "codex_cli",
            "cli_version": "0.148.0",
            "source": "cli",
            "model_provider": "openai",
            "history_base": {
                "thread_id": parent_rollout_id,
                "end_ordinal_exclusive": 14,
                "end_byte_offset": 179138
            },
            "git": {}
        });
        if let Some(history_mode) = history_mode {
            payload["history_mode"] = json!(history_mode);
        }
        json!({
            "timestamp": "2026-08-22T00:00:00Z",
            "ordinal": 0,
            "type": "session_meta",
            "payload": payload
        })
    };

    for history_mode in [None, Some("legacy")] {
        let decoded = decode_value(make_session(history_mode), CompatibilityProfile::Current);
        match decoded {
            DecodedRecord::Unknown(record) => {
                assert_eq!(record.reason, UnknownReason::UnsupportedSchema);
            }
            DecodedRecord::Known(_) => {
                panic!("history_base without paginated history_mode must fail closed")
            }
        }
    }

    let decoded = decode_value(
        make_session(Some("paginated")),
        CompatibilityProfile::Current,
    );
    match decoded {
        DecodedRecord::Known(record) => {
            assert_eq!(
                record.history_base,
                Some(
                    codex_rollout_collector::HistoryBaseRef::new(parent_rollout_id, 14, 179138)
                        .expect("history base fixture")
                )
            );
        }
        DecodedRecord::Unknown(_) => {
            panic!("paginated history_base must remain a known record")
        }
    }
}

#[test]
fn unknown_fields_are_diagnostic_and_do_not_corrupt_known_items() {
    let batch = analyze(
        "current/unknown-fields.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.complete);
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::SessionContext { session_id: Some(id), .. } if id == "019b2b40-beb6-7b23-bed0-37d570e76817")));
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::ToolStarted { call_id, .. } if call_id == "call-unknown-field")));
    assert!(
        batch.items.iter().any(
            |event| matches!(event, AnalysisEvent::Diagnostic { code, .. } if code == "warning")
        )
    );
    assert!(
        !batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::ParseGap { .. }))
    );
    let encoded = serde_json::to_string(&batch.items).expect("events serialize");
    assert!(!encoded.contains("new_response_field"));
    assert!(!encoded.contains("new_object"));
}

#[test]
fn legacy_alias_fields_map_to_analysis_events() {
    let batch = analyze("legacy/alias-fields.jsonl", CompatibilityProfile::Legacy);
    let turn = batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::TurnStarted {
                collaboration_mode_kind,
                ..
            } => Some(collaboration_mode_kind.as_deref()),
            _ => None,
        })
        .flatten();
    assert_eq!(turn, Some("default"));
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::UserMessage { text, .. } if text == "legacy alias input")));
}

#[test]
fn current_alias_fields_map_to_analysis_events() {
    let batch = analyze("current/alias-fields.jsonl", CompatibilityProfile::Current);
    assert!(batch.complete);
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::TurnStarted { collaboration_mode_kind: Some(mode), .. } if mode == "default")));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            status: TurnStatus::Completed,
            ..
        }
    )));
}

#[test]
fn adapter_identity_is_logical_and_explicit_conversation_binding_wins() {
    let path = fixture("current/minimal-rollout.jsonl");
    let backend = JsonlSourceBackend;
    let spec = SourceSpec::bind("caller-conversation", "stable-rollout", &path)
        .expect("source binding")
        .with_source_epoch("fixture-epoch")
        .expect("source epoch");
    let batch = analyze_source(&backend, &spec, CompatibilityProfile::Current)
        .expect("bound fixture analyzes");

    assert!(batch.items.iter().all(|event| {
        event.metadata().conversation_id.as_deref() == Some("caller-conversation")
            && !event.item_key().is_empty()
            && event.event_id().contains("stable-rollout")
    }));

    let turn_keys: Vec<_> = batch
        .items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::TurnStarted { .. } | AnalysisEvent::TurnCompleted { .. } => {
                Some(event.item_key())
            }
            _ => None,
        })
        .collect();
    assert_eq!(turn_keys.len(), 2);
    assert_eq!(turn_keys[0], turn_keys[1]);
    assert_eq!(turn_keys[0], "turn:turn-1");

    let tool_keys: Vec<_> = batch
        .items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::ToolStarted { call_id, .. }
            | AnalysisEvent::ToolCompleted { call_id, .. } => {
                if !matches!(call_id.as_str(), "call-1" | "call-2") {
                    return None;
                }
                Some(event.item_key())
            }
            _ => None,
        })
        .collect();
    assert_eq!(
        tool_keys,
        ["tool:call-1", "tool:call-1", "tool:call-2", "tool:call-2"]
    );

    let plan_path = fixture("current/plan-question-answer.jsonl");
    let plan_spec = SourceSpec::bind("caller-conversation", "stable-rollout", &plan_path)
        .expect("plan source binding")
        .with_source_epoch("fixture-epoch")
        .expect("plan source epoch");
    let plan_batch = analyze_source(&backend, &plan_spec, CompatibilityProfile::Current)
        .expect("plan fixture analyzes");
    let question_key = plan_batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::PlanQuestion { .. } => Some(event.item_key().to_string()),
            _ => None,
        })
        .expect("plan question key");
    let answer = plan_batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::PlanAnswer { .. } => Some(event),
            _ => None,
        })
        .expect("plan answer");
    assert_eq!(
        answer.metadata().related_item_key.as_deref(),
        Some(question_key.as_str())
    );
    assert_eq!(
        answer.metadata().identity_origin,
        IdentityOrigin::SourcePosition
    );
}

#[test]
fn unknown_alias_is_diagnostic() {
    let batch = analyze("current/unknown-alias.jsonl", CompatibilityProfile::Current);
    assert!(!batch.complete);
    assert!(batch.items.iter().any(|event| {
        matches!(
            event,
            AnalysisEvent::UnknownEvent { .. } | AnalysisEvent::ParseGap { .. }
        )
    }));
    assert!(
        !batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::TurnStarted { .. }))
    );
}

#[test]
fn tool_string_output_round_trip() {
    let batch = analyze(
        "current/tool-output-string.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::ToolStarted { call_id, .. } if call_id == "call-string")));
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::ToolCompleted { call_id, output: Some(output), .. } if call_id == "call-string" && output.contains("Exit code: 0"))));
}

#[test]
fn tool_structured_content_round_trip() {
    let batch = analyze(
        "current/tool-output-content.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::ToolCompleted { call_id, output: Some(output), .. } if call_id == "call-content" && output.contains("structured result") && output.contains("input_image"))));
}

#[test]
fn function_custom_tool_local_shell_round_trip() {
    let batch = analyze(
        "current/function_custom_tool_local_shell_round_trip.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.complete);
    assert!(!batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::UnknownEvent { .. } | AnalysisEvent::ParseGap { .. }
    )));
    let tool_order: Vec<_> = batch
        .items
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::ToolStarted { call_id, .. }
            | AnalysisEvent::ToolCompleted { call_id, .. } => Some(call_id.as_str()),
            _ => None,
        })
        .collect();
    assert_eq!(
        tool_order,
        vec![
            "call-function-round-trip",
            "call-function-round-trip",
            "call-custom-round-trip",
            "call-custom-round-trip",
            "call-local-shell-round-trip",
            "call-exec-round-trip",
            "call-exec-round-trip",
            "call-mcp-round-trip",
            "call-mcp-round-trip",
            "call-dynamic-round-trip",
            "call-dynamic-round-trip",
        ]
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "function_call" && call_id == "call-function-round-trip"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            tool_kind,
            call_id,
            output: Some(output),
            ..
        } if tool_kind == "function_call" && call_id == "call-function-round-trip" && output == "function result"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "custom_tool_call" && call_id == "call-custom-round-trip"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "local_shell" && call_id == "call-local-shell-round-trip"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            tool_kind,
            call_id,
            output: Some(output),
            ..
        } if tool_kind == "local_shell" && call_id == "call-exec-round-trip" && output.contains("exec result")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "mcp_tool" && call_id == "call-mcp-round-trip"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "mcp_tool" && call_id == "call-mcp-round-trip"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "dynamic_tool" && call_id == "call-dynamic-round-trip"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            tool_kind,
            call_id,
            ..
        } if tool_kind == "dynamic_tool" && call_id == "call-dynamic-round-trip"
    )));
}

#[test]
fn plan_question_answer_action_identity() {
    let batch = analyze(
        "current/plan-question-answer.jsonl",
        CompatibilityProfile::Current,
    );
    let question = batch.items.iter().find_map(|event| match event {
        AnalysisEvent::PlanQuestion {
            call_id,
            question_id,
            options,
            ..
        } => Some((
            call_id,
            question_id,
            options.len(),
            event.event_id().to_string(),
        )),
        _ => None,
    });
    assert_eq!(
        question.map(|value| (value.0.as_str(), value.1.as_str(), value.2)),
        Some(("call-question-1", "q-1", 2))
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::PlanUpdated { steps, .. }
            if steps.iter().map(|step| step.status.as_str()).collect::<Vec<_>>()
                == ["completed", "in_progress", "pending"]
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::PlanAnswer {
            metadata,
            call_id,
            question_id,
            answer,
            ..
        } if call_id == "call-question-1"
            && question_id == "q-1"
            && answer == "continue"
            && metadata.related_item_key.as_deref() == Some("question:q-1")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::PlanAction {
            metadata,
            action,
            ..
        } if action == "continue"
            && metadata.related_item_key.as_deref() == Some("question:q-1")
    )));
}

#[test]
fn plan_answer_and_action_require_pending_question_state() {
    let batch = analyze(
        "current/plan-action-without-question.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.complete);
    assert!(!batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::PlanAnswer { .. } | AnalysisEvent::PlanAction { .. }
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            call_id,
            ..
        } if call_id == "unrelated-call"
    )));
}

#[test]
fn response_item_non_ui_roles_are_not_user_messages() {
    let batch = analyze("current/message-roles.jsonl", CompatibilityProfile::Current);
    assert!(!batch.complete);
    assert_eq!(
        batch
            .items
            .iter()
            .filter(|event| matches!(event, AnalysisEvent::UserMessage { .. }))
            .count(),
        1,
        "only the explicit event_msg user carrier is a UI user message"
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::AssistantMessage { text, .. } if text == "assistant projection"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::UnknownEvent {
            raw_type: Some(raw_type),
            ..
        } if raw_type == "response_item/message/role:developer"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::Diagnostic { code, .. } if code == "response_user_message_carrier"
    )));
}

#[test]
fn real_last_turn_replacement_fixture_projects_known_non_history_items() {
    for fixture_name in [
        "current/last-turn-replacement-real-parent.jsonl",
        "current/last-turn-replacement-real-child.jsonl",
    ] {
        let batch = analyze(fixture_name, CompatibilityProfile::Current);
        assert!(batch.complete, "{fixture_name} should remain canonical");
        assert!(!batch.items.iter().any(|event| matches!(
            event,
            AnalysisEvent::UnknownEvent { .. } | AnalysisEvent::ParseGap { .. }
        )));
    }
}

#[test]
fn unsupported_plan_carrier_is_unknown_and_missing_plan_payload_is_parse_gap() {
    let batch = analyze(
        "current/unknown-plan-carrier.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(!batch.complete);
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::UnknownEvent {
            raw_type: Some(raw_type),
            ..
        } if raw_type == "event_msg/user_input_answer"
    )));
    assert!(batch
        .items
        .iter()
        .any(|event| matches!(event, AnalysisEvent::ParseGap { reason, .. } if reason.contains("request_user_input"))));
}

#[test]
fn usage_and_rate_limit_mapping() {
    let batch = analyze(
        "current/usage-rate-limit.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::UsageUpdated {
            total_tokens: Some(120),
            last_total_tokens: Some(70),
            ..
        }
    )));
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::RateLimitUpdated { primary_used_percent: Some(value), .. } if (*value - 12.5).abs() < f64::EPSILON)));
}

#[test]
fn file_search_artifact_mapping() {
    let batch = analyze(
        "current/file-search-artifact.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::WebSearchFound {
            query: Some(query),
            ..
        } if query == "TermLink compatibility"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::AttachmentFound {
            name: Some(name),
            media_type: Some(media_type),
            ..
        } if name == "ig-1" && media_type == "image"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::FileChanged {
            path: Some(path),
            summary: Some(summary),
            ..
        } if path == "src/lib.rs" && summary.starts_with("patch_apply_")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ArtifactFound {
            artifact_id: Some(artifact_id),
            name: Some(name),
            ..
        } if artifact_id == "ig-end-1" && name == "fixture artifact"
    )));
}

#[test]
fn analysis_batch_redacts_local_paths_at_the_boundary() {
    let marker = format!("termlink-f011-path-{}", std::process::id());
    let root = std::env::temp_dir().join(&marker);
    let source_path = root.join("rollout.jsonl");
    let absolute_file = root.join("src").join("absolute.rs");
    let absolute_artifact = root.join("artifacts").join("image.png");
    let mut changes = serde_json::Map::new();
    changes.insert(
        absolute_file.to_string_lossy().into_owned(),
        json!({"type": "add", "content": "fn absolute() {}"}),
    );
    changes.insert(
        "src/lib.rs".to_string(),
        json!({"type": "add", "content": "fn logical() {}"}),
    );
    let rows = vec![
        json!({
            "timestamp": "2026-08-19T03:00:00.000Z",
            "ordinal": 1,
            "type": "session_meta",
            "payload": {
                "id": "019b2b40-beb6-7b23-bed0-37d570e76819",
                "timestamp": "2026-08-19T03:00:00.000Z",
                "cwd": root.to_string_lossy(),
                "originator": "codex_cli",
                "cli_version": "0.70.0-alpha.4",
                "source": "cli",
                "model_provider": "openai",
                "git": {}
            }
        }),
        json!({
            "timestamp": "2026-08-19T03:00:01.000Z",
            "ordinal": 2,
            "type": "event_msg",
            "payload": {
                "type": "patch_apply_begin",
                "call_id": "patch-f011",
                "turn_id": "turn-f011",
                "auto_approved": true,
                "changes": changes
            }
        }),
        json!({
            "timestamp": "2026-08-19T03:00:02.000Z",
            "ordinal": 3,
            "type": "event_msg",
            "payload": {
                "type": "image_generation_end",
                "call_id": "artifact-f011",
                "status": "completed",
                "result": "fixture-media",
                "saved_path": absolute_artifact.to_string_lossy()
            }
        }),
        json!({
            "timestamp": "2026-08-19T03:00:03.000Z",
            "ordinal": 4,
            "type": "response_item",
            "payload": {
                "type": "function_call",
                "id": "function-f011",
                "name": "read_file",
                "namespace": "functions",
                "arguments": serde_json::to_string(&json!({
                    "workdir": root.to_string_lossy(),
                    "path": "src/lib.rs"
                })).expect("function arguments serialize"),
                "call_id": "call-function-f011"
            }
        }),
        json!({
            "timestamp": "2026-08-19T03:00:04.000Z",
            "ordinal": 5,
            "type": "response_item",
            "payload": {
                "type": "custom_tool_call",
                "id": "custom-f011",
                "status": "completed",
                "call_id": "call-custom-f011",
                "name": "lookup",
                "namespace": "functions",
                "input": serde_json::to_string(&json!({
                    "cwd": root.to_string_lossy(),
                    "logical": "src/lib.rs"
                })).expect("custom arguments serialize")
            }
        }),
        json!({
            "timestamp": "2026-08-19T03:00:05.000Z",
            "ordinal": 6,
            "type": "response_item",
            "payload": {
                "type": "tool_search_call",
                "id": "tool-search-f011",
                "call_id": "call-search-f011",
                "execution": "client",
                "arguments": {
                    "path": root.join("src").join("absolute.rs").to_string_lossy(),
                    "logical": "src/lib.rs"
                }
            }
        }),
    ];
    let contents = rows
        .into_iter()
        .map(|row| serde_json::to_string(&row).expect("fixture row serializes"))
        .collect::<Vec<_>>()
        .join("\n")
        + "\n";

    std::fs::create_dir_all(&root).expect("temporary fixture directory creates");
    std::fs::write(&source_path, contents).expect("temporary fixture writes");
    let backend = JsonlSourceBackend;
    let batch = analyze_source(
        &backend,
        &SourceSpec::new(&source_path),
        CompatibilityProfile::Current,
    )
    .expect("path fixture analyzes");
    let encoded = serde_json::to_string(&batch).expect("analysis batch serializes");
    let _ = std::fs::remove_dir_all(&root);

    assert!(batch.complete);
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::SessionContext {
            cwd: Some(cwd),
            ..
        } if cwd == "<local-path-redacted>"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::FileChanged {
            path: Some(path),
            ..
        } if path == "<local-path-redacted>"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::FileChanged {
            path: Some(path),
            ..
        } if path == "src/lib.rs"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ArtifactFound {
            name: Some(name),
            ..
        } if name == "<local-path-redacted>"
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            call_id,
            input: Some(input),
            ..
        } if call_id == "call-function-f011"
            && !input.contains(&marker)
            && input.contains("src/lib.rs")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            call_id,
            input: Some(input),
            ..
        } if call_id == "call-custom-f011"
            && !input.contains(&marker)
            && input.contains("src/lib.rs")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            call_id,
            input: Some(input),
            ..
        } if call_id == "call-search-f011"
            && !input.contains(&marker)
            && input.contains("src/lib.rs")
    )));
    assert!(encoded.contains("rollout.jsonl"));
    assert!(!encoded.contains(&marker));
    let drive_prefix = root.to_string_lossy().chars().take(2).collect::<String>();
    assert!(!encoded.contains(&format!("{drive_prefix}\\\\")));
    assert!(!encoded.contains(":/"));
    assert!(!encoded.contains("/tmp/"));
}

#[test]
fn structured_tool_payloads_redact_nested_values_and_object_keys() {
    let batch = analyze(
        "current/tool-path-redaction.jsonl",
        CompatibilityProfile::Current,
    );
    let encoded = serde_json::to_string(&batch).expect("tool path batch serializes");

    assert!(batch.complete);
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            call_id,
            input: Some(input),
            ..
        } if call_id == "call-function-f022"
            && input.contains("src/lib.rs")
            && input.contains("<local-path-redacted>")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            call_id,
            input: Some(input),
            ..
        } if call_id == "call-custom-f022"
            && input.contains("src/lib.rs")
            && input.contains("<local-path-redacted>")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolStarted {
            call_id,
            input: Some(input),
            ..
        } if call_id == "call-search-f022"
            && input.contains("src/lib.rs")
            && input.contains("<local-path-redacted>")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            call_id,
            output: Some(output),
            ..
        } if call_id == "call-function-f022"
            && output.contains("<local-path-redacted>")
    )));
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::ToolCompleted {
            call_id,
            output: Some(output),
            ..
        } if call_id == "call-custom-f022"
            && output.contains("<local-path-redacted>")
    )));
    for marker in [
        "/tmp/termlink-f022-value",
        "/tmp/termlink-f022-object-key",
        "/tmp/termlink-f022-custom-key",
        "/tmp/termlink-f022-nested",
        "/tmp/termlink-f022-search-key",
        "/tmp/termlink-f022-output",
        "/tmp/termlink-f022-custom-output",
    ] {
        assert!(!encoded.contains(marker), "raw path leaked: {marker}");
    }
    assert!(encoded.contains("src/lib.rs"));
    assert!(!batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::UnknownEvent { .. } | AnalysisEvent::ParseGap { .. }
    )));
}

#[test]
fn future_unknown_variant_becomes_diagnostic() {
    let batch = analyze(
        "future-compatible/unknown-variant.jsonl",
        CompatibilityProfile::FutureCompatible,
    );
    assert!(!batch.complete);
    assert!(batch.items.iter().any(|event| matches!(event, AnalysisEvent::UnknownEvent { raw_type: Some(raw_type), .. } if raw_type == "future_rollout_variant")));
    assert!(
        batch
            .items
            .iter()
            .any(|event| event.availability() == Availability::UnsupportedSchema)
    );
}

#[test]
fn missing_required_field_is_fail_closed() {
    let batch = analyze(
        "malformed/missing-required.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(!batch.complete);
    assert!(
        batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::ParseGap { .. }))
    );
    assert!(
        !batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::TurnCompleted { .. }))
    );
}

#[test]
fn partial_rollout_is_not_completed() {
    let batch = analyze(
        "partial/abort-compaction.jsonl",
        CompatibilityProfile::Current,
    );
    assert!(batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            status: TurnStatus::Interrupted,
            ..
        }
    )));
    assert!(
        batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::Compaction { .. }))
    );
    assert!(!batch.items.iter().any(|event| matches!(
        event,
        AnalysisEvent::TurnCompleted {
            status: TurnStatus::Completed,
            ..
        }
    )));
    assert!(!batch.complete);
}

#[test]
fn repeated_analysis_is_deterministic() {
    let first = analyze("current/minimal.jsonl", CompatibilityProfile::Current);
    let second = analyze("current/minimal.jsonl", CompatibilityProfile::Current);
    assert_eq!(
        serde_json::to_string(&first).unwrap(),
        serde_json::to_string(&second).unwrap()
    );
    assert!(
        first
            .items
            .windows(2)
            .all(|events| events[0].metadata().sequence < events[1].metadata().sequence)
    );
}

#[test]
fn golden_fixture_matches_empty_analysis_batch() {
    let first = analyze("golden/empty.jsonl", CompatibilityProfile::Current);
    let second = analyze("golden/empty.jsonl", CompatibilityProfile::Current);
    let expected: codex_rollout_collector::AnalysisBatch =
        serde_json::from_str(include_str!("fixtures/golden/analysis-batch.json"))
            .expect("golden batch parses");
    assert_eq!(first, expected);
    assert_eq!(second, expected);
    assert_eq!(
        serde_json::to_string(&first).unwrap(),
        serde_json::to_string(&second).unwrap()
    );
}

#[test]
fn zstd_source_is_bounded_and_projects_same_events() {
    let source = include_str!("fixtures/current/minimal.jsonl");
    let path =
        std::env::temp_dir().join(format!("termlink-rollout-{}.jsonl.zst", std::process::id()));
    let compressed = zstd::stream::encode_all(source.as_bytes(), 1).expect("compress fixture");
    std::fs::write(&path, compressed).expect("write temporary compressed fixture");
    let backend = JsonlSourceBackend;
    let batch = analyze_source(
        &backend,
        &SourceSpec::new(&path).with_limits(1024 * 1024, 64 * 1024),
        CompatibilityProfile::Current,
    )
    .expect("compressed fixture analyzes");
    let _ = std::fs::remove_file(path);
    assert!(batch.complete);
    assert!(
        batch
            .items
            .iter()
            .any(|event| matches!(event, AnalysisEvent::TurnCompleted { .. }))
    );
}

#[test]
fn payload_limits_are_fail_closed_and_keep_stable_reason() {
    let marker = format!("termlink-payload-limit-{}", std::process::id());
    let root = std::env::temp_dir().join(marker);
    std::fs::create_dir_all(&root).expect("payload-limit directory creates");
    let source = r#"{"timestamp":"2026-08-19T04:00:00.000Z","ordinal":1,"type":"event_msg","payload":{"type":"warning","message":"bounded source"}}
"#;
    let long_source = format!(
        "{{\"timestamp\":\"2026-08-19T04:00:00.000Z\",\"ordinal\":1,\"type\":\"event_msg\",\"payload\":{{\"type\":\"warning\",\"message\":\"{}\"}}}}\n",
        "x".repeat(256)
    );

    let assert_payload_limit = |path: &Path,
                                max_decoded_bytes: u64,
                                max_line_bytes: usize|
     -> codex_rollout_collector::AnalysisBatch {
        let backend = JsonlSourceBackend;
        let batch = analyze_source(
            &backend,
            &SourceSpec::new(path).with_limits(max_decoded_bytes, max_line_bytes),
            CompatibilityProfile::Current,
        )
        .expect("bounded source analyzes");
        assert!(!batch.complete);
        assert!(batch.items.iter().any(|event| matches!(
            event,
            AnalysisEvent::ParseGap { reason, .. } if reason == "source_limit_exceeded"
        )));
        assert!(
            batch
                .items
                .iter()
                .any(|event| { event.availability() == Availability::PartialRollout })
        );
        assert!(batch.diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "source_limit_exceeded"
                && diagnostic.availability == Availability::PartialRollout
        }));
        batch
    };

    let plain_line = root.join("plain-line.jsonl");
    std::fs::write(&plain_line, &long_source).expect("plain oversized line writes");
    assert_payload_limit(&plain_line, 1024 * 1024, 64);

    let zstd_line = root.join("zstd-line.jsonl.zst");
    let compressed_line =
        zstd::stream::encode_all(long_source.as_bytes(), 1).expect("oversized line compresses");
    std::fs::write(&zstd_line, compressed_line).expect("zstd oversized line writes");
    assert_payload_limit(&zstd_line, 1024 * 1024, 64);

    let plain_total = root.join("plain-total.jsonl");
    std::fs::write(&plain_total, source).expect("plain total source writes");
    let plain_total_batch = assert_payload_limit(&plain_total, 32, 512 * 1024);
    let plain_total_gap = plain_total_batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::ParseGap { metadata, .. } => Some(metadata),
            _ => None,
        })
        .expect("plain preflight emits a parse gap");
    assert_eq!(plain_total_gap.source_ref.byte_start, 0);
    assert_eq!(plain_total_gap.source_ref.byte_end, 0);

    let zstd_total = root.join("zstd-total.jsonl.zst");
    let compressed_total =
        zstd::stream::encode_all(source.as_bytes(), 1).expect("total source compresses");
    std::fs::write(&zstd_total, compressed_total).expect("zstd total source writes");
    assert_payload_limit(&zstd_total, 32, 512 * 1024);

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn batch_sequence_is_strictly_unique_past_one_hundred_events() {
    let root =
        std::env::temp_dir().join(format!("termlink-sequence-boundary-{}", std::process::id()));
    let path = root.join("rollout.jsonl");
    let questions: Vec<_> = (0..101)
        .map(|index| {
            json!({
                "id": format!("q-{index}"),
                "header": "确认",
                "question": format!("问题 {index}"),
                "options": []
            })
        })
        .collect();
    let rows = vec![
        json!({
            "timestamp": "2026-08-19T04:01:00.000Z",
            "ordinal": 1,
            "type": "event_msg",
            "payload": {
                "type": "request_user_input",
                "call_id": "call-sequence-boundary",
                "turn_id": "turn-sequence-boundary",
                "questions": questions,
                "isBlocking": true
            }
        }),
        json!({
            "timestamp": "2026-08-19T04:01:01.000Z",
            "ordinal": 2,
            "type": "event_msg",
            "payload": {
                "type": "user_message",
                "client_id": "sequence-after",
                "message": "after questions",
                "images": []
            }
        }),
    ];
    let contents = rows
        .into_iter()
        .map(|row| serde_json::to_string(&row).expect("sequence row serializes"))
        .collect::<Vec<_>>()
        .join("\n")
        + "\n";
    std::fs::create_dir_all(&root).expect("sequence directory creates");
    std::fs::write(&path, contents).expect("sequence fixture writes");
    let backend = JsonlSourceBackend;
    let first = analyze_source(
        &backend,
        &SourceSpec::new(&path),
        CompatibilityProfile::Current,
    )
    .expect("sequence fixture analyzes");
    let second = analyze_source(
        &backend,
        &SourceSpec::new(&path),
        CompatibilityProfile::Current,
    )
    .expect("sequence fixture re-analyzes");
    let _ = std::fs::remove_dir_all(&root);

    let sequences: Vec<_> = first
        .items
        .iter()
        .map(|event| event.metadata().sequence)
        .collect();
    assert!(first.complete);
    assert!(sequences.len() > 100);
    assert!(sequences.windows(2).all(|window| window[0] < window[1]));
    assert_eq!(
        serde_json::to_string(&first).expect("first sequence batch serializes"),
        serde_json::to_string(&second).expect("second sequence batch serializes")
    );
}
