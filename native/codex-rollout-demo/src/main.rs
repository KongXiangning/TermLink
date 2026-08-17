//! Read-only Codex rollout history projection v5 demo.
//!
//! The binary is intentionally standalone. It reads one explicit rollout,
//! writes optional projection/detail/comparison files, and never touches the
//! TermLink server, IPC state, database, or the source rollout.

mod canonical;
mod checkpoint;
mod detail_store;
mod dto;
mod reader;
mod reducer;
mod report;
mod self_api;

#[cfg(test)]
mod reducer_tests;

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use codex_protocol::protocol::RolloutItem;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::detail_store::{DiscardDetailStore, JsonlDetailStore, read_details_jsonl};
use crate::dto::{ConversationDto, DetailPayloadDto, HistoryProjection, ParseProgressDto};
use crate::report::{DemoReport, DeterminismStats};

const DEFAULT_MAX_INPUT_BYTES: u64 = 70 * 1024 * 1024;
const DEFAULT_SEGMENT_BYTES: u64 = 2 * 1024 * 1024;
pub const CODEX_REVISION: &str = "bd2de422aa287b97b06ca6425a10935bcf1b3731";

struct Args {
    rollout: PathBuf,
    report: Option<PathBuf>,
    details: Option<PathBuf>,
    self_api_dir: Option<PathBuf>,
    checkpoint: Option<PathBuf>,
    verify_determinism: bool,
    full_oracle: bool,
    forward_stream: bool,
    allow_partial: bool,
    max_input_bytes: u64,
    segment_bytes: u64,
}

fn parse_args() -> Result<Args> {
    let mut rollout = None;
    let mut report = None;
    let mut details = None;
    let mut self_api_dir = None;
    let mut checkpoint = None;
    let mut verify_determinism = false;
    let mut full_oracle = false;
    let mut forward_stream = false;
    let mut allow_partial = false;
    let mut max_input_bytes = DEFAULT_MAX_INPUT_BYTES;
    let mut segment_bytes = DEFAULT_SEGMENT_BYTES;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--rollout" => {
                rollout = Some(PathBuf::from(
                    args.next().context("--rollout requires a value")?,
                ))
            }
            "--report" => {
                report = Some(PathBuf::from(
                    args.next().context("--report requires a value")?,
                ))
            }
            "--details" => {
                details = Some(PathBuf::from(
                    args.next().context("--details requires a value")?,
                ))
            }
            "--self-api-dir" => {
                self_api_dir = Some(PathBuf::from(
                    args.next().context("--self-api-dir requires a value")?,
                ))
            }
            "--checkpoint" => {
                checkpoint = Some(PathBuf::from(
                    args.next().context("--checkpoint requires a value")?,
                ))
            }
            "--verify-determinism" => verify_determinism = true,
            "--full-oracle" => full_oracle = true,
            "--forward-stream" => forward_stream = true,
            "--allow-partial" => allow_partial = true,
            "--max-input-mib" => {
                let mib = args
                    .next()
                    .context("--max-input-mib requires a positive integer")?
                    .parse::<u64>()
                    .context("--max-input-mib must be a positive integer")?;
                if mib == 0 {
                    anyhow::bail!("--max-input-mib must be greater than zero");
                }
                max_input_bytes = mib
                    .checked_mul(1024 * 1024)
                    .context("--max-input-mib is too large")?;
            }
            "--segment-mib" => {
                let mib = args
                    .next()
                    .context("--segment-mib requires a positive integer")?
                    .parse::<u64>()
                    .context("--segment-mib must be a positive integer")?;
                if mib == 0 {
                    anyhow::bail!("--segment-mib must be greater than zero");
                }
                segment_bytes = mib
                    .checked_mul(1024 * 1024)
                    .context("--segment-mib is too large")?;
            }
            "--help" | "-h" => {
                print_usage();
                std::process::exit(0);
            }
            other => anyhow::bail!("unknown argument: {other}"),
        }
    }
    let rollout = rollout.context("--rollout is required (no automatic session scanning)")?;
    if checkpoint.is_some() && (full_oracle || forward_stream) {
        anyhow::bail!("--checkpoint cannot be combined with --full-oracle or --forward-stream");
    }
    if checkpoint.is_some() && verify_determinism {
        anyhow::bail!("--checkpoint cannot be combined with --verify-determinism");
    }
    Ok(Args {
        rollout,
        report,
        details,
        self_api_dir,
        checkpoint,
        verify_determinism,
        full_oracle,
        forward_stream,
        allow_partial,
        max_input_bytes,
        segment_bytes,
    })
}

fn print_usage() {
    println!(
        "codex-rollout-demo\n\n\
         Usage:\n  codex-rollout-demo --rollout <rollout-jsonl-path> [--report <report-json-path>] [--details <details-jsonl-path>] [--self-api-dir <directory>] [--verify-determinism] [--allow-partial]\n\n\
         Options:\n  \
         --rollout  path to one Codex rollout*.jsonl or rollout*.jsonl.zst file (required)\n  \
         --report   write report plus .projection.json and .official.json sidecars\n  \
         --details  write retained full tool details as JSONL\n  \
         --self-api-dir  call the demo's in-process JSON API and persist request/response files\n  \
         --checkpoint  persist reducer state and resume from appended JSONL records\n  \
         --verify-determinism  run the projection twice and compare deterministic payloads\n  \
         --full-oracle  use the legacy all-records-in-memory reader and build the official comparison\n  \
         --forward-stream  use the bounded forward reader instead of tail-first/backfill\n  \
         --segment-mib  tail/backfill segment size (default 2 MiB)\n  \
         --allow-partial  permit parse gaps; the report remains marked partial\n  \
         --max-input-mib  explicitly raise the default 70 MiB input budget\n"
    );
}

struct RunOutputs {
    projection: HistoryProjection,
    details: Vec<DetailPayloadDto>,
    projection_json: String,
    details_json: String,
    details_bytes: u64,
    details_fingerprint: String,
    details_persisted: bool,
    official_json: String,
    official_built: bool,
    content_hash: String,
    snapshot_hash: String,
    reduce_stats: reducer::ReduceStats,
    read_stats: reader::ReadStats,
    read_elapsed: Duration,
    reduce_elapsed: Duration,
    project_elapsed: Duration,
    read_mode: String,
    tail_preview_json: String,
    tail_segment_start: Option<u64>,
    tail_segment_end: Option<u64>,
    backfill_segments: u64,
    checkpoint: CheckpointRunInfo,
}

#[derive(Debug, Clone, Default)]
struct CheckpointRunInfo {
    path: Option<String>,
    loaded: bool,
    source_offset: Option<u64>,
    scanned_end_offset: Option<u64>,
    complete_end_offset: Option<u64>,
    pending_tail_bytes: u64,
    source_grew_during_read: bool,
}

async fn run_once(args: &Args) -> Result<RunOutputs> {
    if args.checkpoint.is_some() {
        run_once_incremental_checkpoint(args).await
    } else if args.full_oracle {
        run_once_full(args).await
    } else if args.forward_stream {
        run_once_streaming(args, "forward_streaming").await
    } else {
        run_once_tail_first(args).await
    }
}

async fn run_once_full(args: &Args) -> Result<RunOutputs> {
    let target_session_id = target_session_id_from_rollout_path(&args.rollout)?;
    let read_start = Instant::now();
    let (lines, read_stats) = reader::read_full(&args.rollout, args.max_input_bytes).await?;
    let read_elapsed = read_start.elapsed();

    let reduce_start = Instant::now();
    let conversation = ConversationDto {
        conversation_id: target_session_id.clone(),
        source: "codex_rollout".to_string(),
        rollout_path: args.rollout.to_string_lossy().to_string(),
        cli_version: None,
        codex_revision: Some(CODEX_REVISION.to_string()),
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
        project_path: None,
        endpoint: None,
        profile: None,
        settings: None,
        settings_history: Vec::new(),
        usage_total: None,
        latest_rate_limit: None,
        latest_context_window: None,
        parse_progress: None,
    };
    let mut reducer = reducer::HistoryReducer::new(conversation, target_session_id);
    reducer.set_read_quality(
        read_stats.parse_errors > 0,
        !read_stats.unmapped_types.is_empty(),
    );
    let parse_status = if read_stats.parse_errors > 0 {
        "partial"
    } else if !read_stats.unmapped_types.is_empty() {
        "unsupported_schema"
    } else {
        "complete"
    };
    reducer.set_parse_progress(ParseProgressDto {
        status: parse_status.to_string(),
        source_bytes: read_stats.bytes,
        decoded_bytes: read_stats.decoded_bytes,
        budget_bytes: read_stats.budget_bytes,
        line_count: read_stats.line_count,
        valid_records: lines.len() as u64,
        parse_errors: read_stats.parse_errors,
        first_parse_error: read_stats.first_parse_error.clone(),
        last_source_ordinal: lines.last().map(|line| line.source_ordinal),
        unmapped_types: read_stats.unmapped_types.clone(),
    });
    for line in &lines {
        reducer.reduce(line);
    }
    let (projection, details, reduce_stats) = reducer.finish();
    let reduce_elapsed = reduce_start.elapsed();

    let project_start = Instant::now();
    let items: Vec<RolloutItem> = lines.iter().map(|line| line.line.item.clone()).collect();
    let official = canonical::build_official_turns(&items);
    let official_json =
        serde_json::to_string_pretty(&official).context("serialize official turns")?;
    let projection_json =
        serde_json::to_string_pretty(&projection).context("serialize projection")?;
    let content_hash = projection.content_hash();
    let snapshot_hash = projection.snapshot_hash();
    let mut details_json = String::new();
    for detail in &details {
        details_json.push_str(&serde_json::to_string(detail).context("serialize detail")?);
        details_json.push('\n');
    }
    let details_bytes = details_json.len() as u64;
    let details_fingerprint = fingerprint_bytes(details_json.as_bytes());
    let project_elapsed = project_start.elapsed();

    Ok(RunOutputs {
        projection,
        details,
        projection_json,
        details_json,
        details_bytes,
        details_fingerprint,
        details_persisted: false,
        official_json,
        official_built: true,
        content_hash,
        snapshot_hash,
        reduce_stats,
        read_stats,
        read_elapsed,
        reduce_elapsed,
        project_elapsed,
        read_mode: "full_oracle".to_string(),
        tail_preview_json: String::new(),
        tail_segment_start: None,
        tail_segment_end: None,
        backfill_segments: 0,
        checkpoint: CheckpointRunInfo::default(),
    })
}

async fn run_once_streaming(args: &Args, read_mode: &str) -> Result<RunOutputs> {
    let target_session_id = target_session_id_from_rollout_path(&args.rollout)?;
    let detail_path = args.details.clone().or_else(|| {
        args.self_api_dir
            .as_ref()
            .map(|directory| directory.join("streaming-details.input.jsonl"))
    });
    let temporary_detail_path = args.details.is_none() && detail_path.is_some();
    let detail_store: Box<dyn detail_store::DetailStore> = match detail_path.as_deref() {
        Some(path) => Box::new(
            JsonlDetailStore::create(path)
                .with_context(|| format!("create streaming detail store {}", path.display()))?,
        ),
        None => Box::new(DiscardDetailStore),
    };
    let conversation = ConversationDto {
        conversation_id: target_session_id.clone(),
        source: "codex_rollout".to_string(),
        rollout_path: args.rollout.to_string_lossy().to_string(),
        cli_version: None,
        codex_revision: Some(CODEX_REVISION.to_string()),
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
        project_path: None,
        endpoint: None,
        profile: None,
        settings: None,
        settings_history: Vec::new(),
        usage_total: None,
        latest_rate_limit: None,
        latest_context_window: None,
        parse_progress: None,
    };
    let mut reducer =
        reducer::HistoryReducer::with_detail_store(conversation, target_session_id, detail_store);

    let read_start = Instant::now();
    let read_stats = reader::read_streaming(&args.rollout, args.max_input_bytes, |line| {
        reducer.reduce(&line);
        Ok(())
    })
    .await?;
    let read_elapsed = read_start.elapsed();

    reducer.set_read_quality(
        read_stats.parse_errors > 0,
        !read_stats.unmapped_types.is_empty(),
    );
    let parse_status = if read_stats.parse_errors > 0 {
        "partial"
    } else if !read_stats.unmapped_types.is_empty() {
        "unsupported_schema"
    } else {
        "complete"
    };
    reducer.set_parse_progress(ParseProgressDto {
        status: parse_status.to_string(),
        source_bytes: read_stats.bytes,
        decoded_bytes: read_stats.decoded_bytes,
        budget_bytes: read_stats.budget_bytes,
        line_count: read_stats.line_count,
        valid_records: read_stats.valid_records,
        parse_errors: read_stats.parse_errors,
        first_parse_error: read_stats.first_parse_error.clone(),
        last_source_ordinal: read_stats.last_source_ordinal,
        unmapped_types: read_stats.unmapped_types.clone(),
    });

    let reduce_start = Instant::now();
    let (projection, mut details, reduce_stats) = reducer.finish();
    let reduce_elapsed = reduce_start.elapsed();
    if reduce_stats.detail_store_errors > 0 {
        anyhow::bail!(
            "streaming detail store failed {} time(s)",
            reduce_stats.detail_store_errors
        );
    }

    let project_start = Instant::now();
    let projection_json =
        serde_json::to_string_pretty(&projection).context("serialize projection")?;
    let content_hash = projection.content_hash();
    let snapshot_hash = projection.snapshot_hash();
    let details_bytes = detail_path
        .as_deref()
        .and_then(|path| std::fs::metadata(path).ok())
        .map_or(0, |metadata| metadata.len());
    let details_fingerprint = detail_path
        .as_deref()
        .map(fingerprint_file)
        .transpose()
        .context("fingerprint streaming details")?
        .unwrap_or_default();

    if args.self_api_dir.is_some() {
        if let Some(path) = detail_path.as_deref() {
            details = read_details_jsonl(path)
                .with_context(|| format!("read streaming details {}", path.display()))?;
        }
    }
    if temporary_detail_path {
        if let Some(path) = detail_path.as_deref() {
            let _ = std::fs::remove_file(path);
        }
    }
    let project_elapsed = project_start.elapsed();
    Ok(RunOutputs {
        projection,
        details,
        projection_json,
        details_json: String::new(),
        details_bytes,
        details_fingerprint,
        details_persisted: args.details.is_some(),
        official_json: String::new(),
        official_built: false,
        content_hash,
        snapshot_hash,
        reduce_stats,
        read_stats,
        read_elapsed,
        reduce_elapsed,
        project_elapsed,
        read_mode: read_mode.to_string(),
        tail_preview_json: String::new(),
        tail_segment_start: None,
        tail_segment_end: None,
        backfill_segments: 0,
        checkpoint: CheckpointRunInfo::default(),
    })
}

/// Tail-first mode reads one newest complete segment before it reads older
/// segments backward. The final reducer still receives every record in source
/// order; only the provisional preview is reduced from the tail.
async fn run_once_tail_first(args: &Args) -> Result<RunOutputs> {
    let target_session_id = target_session_id_from_rollout_path(&args.rollout)?;
    let read_start = Instant::now();
    let Some(tail_read) =
        reader::read_tail_segment(&args.rollout, args.max_input_bytes, args.segment_bytes).await?
    else {
        return run_once_streaming(args, "forward_streaming_compressed_fallback").await;
    };
    let tail_segment_start = tail_read.segment.start_offset;
    let tail_segment_end = tail_read.segment.end_offset;
    let tail_stats = tail_read.stats.clone();
    ensure_source_length(&args.rollout, tail_segment_end)?;

    let tail_preview_json =
        build_tail_preview(args, &target_session_id, &tail_read.segment, &tail_stats)?;
    if let Some(report_path) = &args.report {
        write_atomic(
            &report_path.with_extension("tail.json"),
            tail_preview_json.as_bytes(),
        )?;
    }

    let backfill_stats = reader::read_backward_range(
        &args.rollout,
        tail_segment_start,
        args.max_input_bytes,
        args.segment_bytes,
        |_| Ok(()),
    )
    .await?
    .context("plain rollout unexpectedly became unavailable for backward backfill")?;
    let backfill_segments = backfill_stats.segments;
    ensure_source_length(&args.rollout, tail_segment_end)?;

    let detail_path = args.details.clone().or_else(|| {
        args.self_api_dir
            .as_ref()
            .map(|directory| directory.join("streaming-details.input.jsonl"))
    });
    let temporary_detail_path = args.details.is_none() && detail_path.is_some();
    let detail_store: Box<dyn detail_store::DetailStore> = match detail_path.as_deref() {
        Some(path) => Box::new(
            JsonlDetailStore::create(path)
                .with_context(|| format!("create streaming detail store {}", path.display()))?,
        ),
        None => Box::new(DiscardDetailStore),
    };
    let mut reducer = reducer::HistoryReducer::with_detail_store(
        new_conversation(args, &target_session_id),
        target_session_id,
        detail_store,
    );

    // The reducer is intentionally replayed in source order. The backward
    // scan above is the acquisition path for tail/older segments; replaying
    // source-order segments here avoids applying begin/end events backwards.
    let read_stats = reader::read_forward_range(
        &args.rollout,
        tail_segment_end,
        args.max_input_bytes,
        args.segment_bytes,
        |segment| {
            for line in segment.lines {
                reducer.reduce(&line);
            }
            Ok(())
        },
    )
    .await?;
    ensure_source_length(&args.rollout, tail_segment_end)?;
    let read_elapsed = read_start.elapsed();

    reducer.set_read_quality(
        read_stats.parse_errors > 0,
        !read_stats.unmapped_types.is_empty(),
    );
    let parse_status = if read_stats.parse_errors > 0 {
        "partial"
    } else if !read_stats.unmapped_types.is_empty() {
        "unsupported_schema"
    } else {
        "complete"
    };
    reducer.set_parse_progress(ParseProgressDto {
        status: parse_status.to_string(),
        source_bytes: read_stats.bytes,
        decoded_bytes: read_stats.decoded_bytes,
        budget_bytes: read_stats.budget_bytes,
        line_count: read_stats.line_count,
        valid_records: read_stats.valid_records,
        parse_errors: read_stats.parse_errors,
        first_parse_error: read_stats.first_parse_error.clone(),
        last_source_ordinal: read_stats.last_source_ordinal,
        unmapped_types: read_stats.unmapped_types.clone(),
    });

    let reduce_start = Instant::now();
    let (projection, mut details, reduce_stats) = reducer.finish();
    let reduce_elapsed = reduce_start.elapsed();
    if reduce_stats.detail_store_errors > 0 {
        anyhow::bail!(
            "streaming detail store failed {} time(s)",
            reduce_stats.detail_store_errors
        );
    }

    let project_start = Instant::now();
    let projection_json =
        serde_json::to_string_pretty(&projection).context("serialize projection")?;
    let content_hash = projection.content_hash();
    let snapshot_hash = projection.snapshot_hash();
    let details_bytes = detail_path
        .as_deref()
        .and_then(|path| std::fs::metadata(path).ok())
        .map_or(0, |metadata| metadata.len());
    let details_fingerprint = detail_path
        .as_deref()
        .map(fingerprint_file)
        .transpose()
        .context("fingerprint streaming details")?
        .unwrap_or_default();

    if args.self_api_dir.is_some() {
        if let Some(path) = detail_path.as_deref() {
            details = read_details_jsonl(path)
                .with_context(|| format!("read streaming details {}", path.display()))?;
        }
    }
    if temporary_detail_path {
        if let Some(path) = detail_path.as_deref() {
            let _ = std::fs::remove_file(path);
        }
    }
    let project_elapsed = project_start.elapsed();
    Ok(RunOutputs {
        projection,
        details,
        projection_json,
        details_json: String::new(),
        details_bytes,
        details_fingerprint,
        details_persisted: args.details.is_some(),
        official_json: String::new(),
        official_built: false,
        content_hash,
        snapshot_hash,
        reduce_stats,
        read_stats,
        read_elapsed,
        reduce_elapsed,
        project_elapsed,
        read_mode: "tail_first_backward_backfill".to_string(),
        tail_preview_json,
        tail_segment_start: Some(tail_segment_start),
        tail_segment_end: Some(tail_segment_end),
        backfill_segments,
        checkpoint: CheckpointRunInfo::default(),
    })
}

/// Resume a reducer from a complete-line checkpoint and consume only the
/// append range. The first checkpointed run also emits the regular tail
/// preview, but uses one bounded forward pass for the durable fold instead of
/// scanning the old prefix backward and then replaying it again.
async fn run_once_incremental_checkpoint(args: &Args) -> Result<RunOutputs> {
    let checkpoint_path = args
        .checkpoint
        .as_deref()
        .context("--checkpoint path is missing")?;
    if checkpoint_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("zst"))
    {
        anyhow::bail!("--checkpoint supports plain .jsonl rollouts only");
    }
    let target_session_id = target_session_id_from_rollout_path(&args.rollout)?;
    let normalized_source = normalized_path(&args.rollout)?;
    let details_path = checkpoint_details_path(args)?;
    let normalized_details = normalized_path(&details_path)?;
    let loaded_checkpoint = if checkpoint_path.exists() {
        let checkpoint = checkpoint::load(checkpoint_path)?;
        if checkpoint.schema != checkpoint::CHECKPOINT_SCHEMA
            || checkpoint.schema_version != checkpoint::CHECKPOINT_VERSION
        {
            anyhow::bail!(
                "unsupported checkpoint schema {} v{}",
                checkpoint.schema,
                checkpoint.schema_version
            );
        }
        if checkpoint.conversation_id != target_session_id {
            anyhow::bail!(
                "checkpoint conversation {} does not match rollout target {}",
                checkpoint.conversation_id,
                target_session_id
            );
        }
        if !same_path(Path::new(&checkpoint.source_path), &normalized_source) {
            anyhow::bail!(
                "checkpoint source {} does not match rollout {}",
                checkpoint.source_path,
                normalized_source.display()
            );
        }
        if !same_path(Path::new(&checkpoint.details_path), &normalized_details) {
            anyhow::bail!(
                "checkpoint details {} does not match {}",
                checkpoint.details_path,
                normalized_details.display()
            );
        }
        checkpoint::validate_source(&args.rollout, &checkpoint)?;
        if !details_path.exists() {
            anyhow::bail!(
                "checkpoint detail store is missing: {}; refusing to resume",
                details_path.display()
            );
        }
        Some(checkpoint)
    } else {
        None
    };
    let loaded = loaded_checkpoint.is_some();

    let mut tail_preview_json = String::new();
    let mut tail_segment_start = None;
    let mut tail_segment_end = None;
    let current_size = std::fs::metadata(&args.rollout)
        .with_context(|| format!("metadata for {}", args.rollout.display()))?
        .len();
    let should_refresh_tail = loaded_checkpoint.as_ref().is_none_or(|checkpoint| {
        current_size > checkpoint.source_offset || checkpoint.pending_tail_bytes > 0
    });
    if should_refresh_tail {
        if let Some(tail_read) =
            reader::read_tail_segment(&args.rollout, args.max_input_bytes, args.segment_bytes)
                .await?
        {
            tail_segment_start = Some(tail_read.segment.start_offset);
            tail_segment_end = Some(tail_read.segment.end_offset);
            tail_preview_json = build_tail_preview(
                args,
                &target_session_id,
                &tail_read.segment,
                &tail_read.stats,
            )?;
            if let Some(report_path) = &args.report {
                write_atomic(
                    &report_path.with_extension("tail.json"),
                    tail_preview_json.as_bytes(),
                )?;
            }
        }
    }

    let detail_store: Box<dyn detail_store::DetailStore> = if loaded {
        Box::new(
            JsonlDetailStore::open_existing(&details_path)
                .with_context(|| format!("resume detail store {}", details_path.display()))?,
        )
    } else {
        Box::new(
            JsonlDetailStore::create(&details_path)
                .with_context(|| format!("create detail store {}", details_path.display()))?,
        )
    };
    let mut reducer = if let Some(checkpoint) = loaded_checkpoint.as_ref() {
        reducer::HistoryReducer::from_checkpoint(
            checkpoint.reducer.clone(),
            target_session_id.clone(),
            Some(detail_store),
        )?
    } else {
        reducer::HistoryReducer::with_detail_store(
            new_conversation(args, &target_session_id),
            target_session_id.clone(),
            detail_store,
        )
    };

    let previous_progress = reducer.projection.conversation.parse_progress.clone();
    let start_offset = loaded_checkpoint
        .as_ref()
        .map_or(0, |checkpoint| checkpoint.source_offset);
    let start_source_ordinal = loaded_checkpoint
        .as_ref()
        .map_or(0, |checkpoint| checkpoint.source_ordinal);
    let read_start = Instant::now();
    let append = reader::read_append_range(
        &args.rollout,
        start_offset,
        start_source_ordinal,
        args.max_input_bytes,
        args.segment_bytes,
        |segment| {
            for line in segment.lines {
                reducer.reduce(&line);
            }
            Ok(())
        },
    )
    .await?;
    let read_elapsed = read_start.elapsed();
    let source_size_after_read = std::fs::metadata(&args.rollout)
        .with_context(|| format!("metadata after checkpoint read {}", args.rollout.display()))?
        .len();
    let mut read_stats = append.stats.clone();
    read_stats.bytes = source_size_after_read;

    reducer.set_read_quality(
        read_stats.parse_errors > 0,
        !read_stats.unmapped_types.is_empty(),
    );
    let snapshot_provisional = append.source_grew_during_read || append.pending_tail_bytes > 0;
    reducer.set_parse_progress(merge_checkpoint_progress(
        previous_progress,
        &read_stats,
        source_size_after_read,
        args.max_input_bytes,
        append.last_source_ordinal,
        snapshot_provisional,
    ));

    // Capture the resumable state before finish() derives task_outcome and
    // changes an in-progress turn into an incomplete display snapshot.
    let reducer_checkpoint = reducer.checkpoint();
    let reduce_start = Instant::now();
    let (projection, mut details, reduce_stats) =
        reducer.finish_with_snapshot_status(snapshot_provisional);
    let reduce_elapsed = reduce_start.elapsed();
    if reduce_stats.detail_store_errors > 0 {
        anyhow::bail!(
            "checkpoint detail store failed {} time(s)",
            reduce_stats.detail_store_errors
        );
    }

    let project_start = Instant::now();
    let projection_json =
        serde_json::to_string_pretty(&projection).context("serialize checkpoint projection")?;
    let content_hash = projection.content_hash();
    let snapshot_hash = projection.snapshot_hash();
    let details_bytes = std::fs::metadata(&details_path)
        .with_context(|| format!("metadata for details {}", details_path.display()))?
        .len();
    let details_fingerprint = fingerprint_file(&details_path)?;

    if args.self_api_dir.is_some() {
        details = read_details_jsonl(&details_path)
            .with_context(|| format!("read checkpoint details {}", details_path.display()))?;
    }

    if read_stats.parse_errors == 0 || args.allow_partial {
        let anchors = checkpoint::anchors_for_file(
            &args.rollout,
            append.complete_end_offset,
            append.scanned_end_offset,
        )?;
        let checkpoint_document = checkpoint::IncrementalCheckpoint::new(
            target_session_id,
            normalized_source.display().to_string(),
            append.scanned_end_offset,
            append.complete_end_offset,
            append.last_source_ordinal,
            append.last_rollout_ordinal.or_else(|| {
                loaded_checkpoint
                    .as_ref()
                    .and_then(|value| value.rollout_ordinal)
            }),
            reducer_checkpoint.current_timestamp.clone(),
            normalized_details.display().to_string(),
            append.pending_tail_bytes,
            append.source_grew_during_read,
            content_hash.clone(),
            snapshot_hash.clone(),
            reducer_checkpoint,
            anchors,
        );
        let checkpoint_json =
            serde_json::to_vec_pretty(&checkpoint_document).context("serialize checkpoint")?;
        write_atomic(checkpoint_path, &checkpoint_json)?;
    }

    let project_elapsed = project_start.elapsed();
    Ok(RunOutputs {
        projection,
        details,
        projection_json,
        details_json: String::new(),
        details_bytes,
        details_fingerprint,
        details_persisted: true,
        official_json: String::new(),
        official_built: false,
        content_hash,
        snapshot_hash,
        reduce_stats,
        read_stats,
        read_elapsed,
        reduce_elapsed,
        project_elapsed,
        read_mode: if loaded {
            "incremental_checkpoint_append".to_string()
        } else {
            "incremental_checkpoint_initial".to_string()
        },
        tail_preview_json,
        tail_segment_start,
        tail_segment_end,
        backfill_segments: 0,
        checkpoint: CheckpointRunInfo {
            path: Some(checkpoint_path.display().to_string()),
            loaded,
            source_offset: Some(start_offset),
            scanned_end_offset: Some(append.scanned_end_offset),
            complete_end_offset: Some(append.complete_end_offset),
            pending_tail_bytes: append.pending_tail_bytes,
            source_grew_during_read: append.source_grew_during_read,
        },
    })
}

fn checkpoint_details_path(args: &Args) -> Result<PathBuf> {
    if let Some(details) = &args.details {
        return Ok(details.clone());
    }
    let checkpoint = args
        .checkpoint
        .as_deref()
        .context("checkpoint path is required for derived details path")?;
    Ok(checkpoint.with_extension("details.jsonl"))
}

fn merge_checkpoint_progress(
    previous: Option<ParseProgressDto>,
    current: &reader::ReadStats,
    source_bytes: u64,
    budget_bytes: u64,
    last_source_ordinal: u64,
    snapshot_provisional: bool,
) -> ParseProgressDto {
    let previous = previous.unwrap_or_default();
    let mut unmapped_types = previous.unmapped_types;
    merge_counts(&mut unmapped_types, &current.unmapped_types);
    let status = if current.parse_errors > 0 || snapshot_provisional {
        "partial"
    } else if !unmapped_types.is_empty() {
        "unsupported_schema"
    } else {
        "complete"
    };
    ParseProgressDto {
        status: status.to_string(),
        source_bytes,
        decoded_bytes: previous.decoded_bytes.saturating_add(current.decoded_bytes),
        budget_bytes,
        line_count: previous.line_count.saturating_add(current.line_count),
        valid_records: previous.valid_records.saturating_add(current.valid_records),
        parse_errors: previous.parse_errors.saturating_add(current.parse_errors),
        first_parse_error: previous
            .first_parse_error
            .or_else(|| current.first_parse_error.clone()),
        last_source_ordinal: (last_source_ordinal > 0)
            .then_some(last_source_ordinal)
            .or(previous.last_source_ordinal),
        unmapped_types,
    }
}

fn merge_counts(
    target: &mut std::collections::BTreeMap<String, u64>,
    source: &std::collections::BTreeMap<String, u64>,
) {
    for (key, value) in source {
        *target.entry(key.clone()).or_insert(0) += value;
    }
}

fn build_tail_preview(
    args: &Args,
    target_session_id: &str,
    segment: &reader::ParsedRolloutSegment,
    stats: &reader::ReadStats,
) -> Result<String> {
    let mut reducer = reducer::HistoryReducer::with_detail_store(
        new_conversation(args, target_session_id),
        target_session_id.to_string(),
        Box::new(DiscardDetailStore),
    );
    reducer.set_read_quality(true, !stats.unmapped_types.is_empty());
    reducer.set_parse_progress(ParseProgressDto {
        status: "partial".to_string(),
        source_bytes: stats.bytes,
        decoded_bytes: stats.decoded_bytes,
        budget_bytes: stats.budget_bytes,
        line_count: stats.line_count,
        valid_records: stats.valid_records,
        parse_errors: stats.parse_errors,
        first_parse_error: stats.first_parse_error.clone(),
        last_source_ordinal: stats.last_source_ordinal,
        unmapped_types: stats.unmapped_types.clone(),
    });
    for line in &segment.lines {
        reducer.reduce(line);
    }
    let (projection, _, _) = reducer.finish();
    serde_json::to_string_pretty(&projection).context("serialize tail preview")
}

fn new_conversation(args: &Args, target_session_id: &str) -> ConversationDto {
    ConversationDto {
        conversation_id: target_session_id.to_string(),
        source: "codex_rollout".to_string(),
        rollout_path: args.rollout.to_string_lossy().to_string(),
        cli_version: None,
        codex_revision: Some(CODEX_REVISION.to_string()),
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
        project_path: None,
        endpoint: None,
        profile: None,
        settings: None,
        settings_history: Vec::new(),
        usage_total: None,
        latest_rate_limit: None,
        latest_context_window: None,
        parse_progress: None,
    }
}

fn ensure_source_length(path: &Path, expected_bytes: u64) -> Result<()> {
    let actual_bytes = std::fs::metadata(path)
        .with_context(|| format!("metadata for source consistency check {}", path.display()))?
        .len();
    if actual_bytes != expected_bytes {
        anyhow::bail!(
            "rollout changed during tail-first read: expected {} bytes, found {}; retry the import",
            expected_bytes,
            actual_bytes
        );
    }
    Ok(())
}

/// The standalone demo's caller derives the target binding from the rollout
/// filename. The reducer itself receives the resulting ID explicitly and
/// never scans `SessionMeta` to decide which session it is reading.
fn target_session_id_from_rollout_path(path: &Path) -> Result<String> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .context("rollout path has no valid UTF-8 filename")?;
    let without_compression = file_name.strip_suffix(".zst").unwrap_or(file_name);
    let stem = without_compression
        .strip_suffix(".jsonl")
        .unwrap_or(without_compression);
    let start = stem
        .len()
        .checked_sub(36)
        .context("rollout filename does not end with a session UUID")?;
    let session_id = stem
        .get(start..)
        .context("rollout filename session UUID is not on a UTF-8 boundary")?;
    if (start > 0 && stem.as_bytes()[start - 1] != b'-') || !is_uuid(session_id) {
        anyhow::bail!(
            "cannot derive target session id from rollout filename {}; caller must provide a rollout filename ending in the bound session UUID",
            path.display()
        );
    }
    Ok(session_id.to_string())
}

fn is_uuid(value: &str) -> bool {
    let mut parts = value.split('-');
    [8_usize, 4, 4, 4, 12].into_iter().all(|length| {
        parts.next().is_some_and(|part| {
            part.len() == length && part.chars().all(|character| character.is_ascii_hexdigit())
        })
    }) && parts.next().is_none()
}

fn fingerprint_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    crate::dto::hex::encode(&hasher.finalize())
}

fn fingerprint_file(path: &Path) -> Result<String> {
    let mut file = std::fs::File::open(path)
        .with_context(|| format!("open file for fingerprint {}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(crate::dto::hex::encode(&hasher.finalize()))
}

#[cfg(test)]
mod main_tests {
    use super::target_session_id_from_rollout_path;
    use std::path::Path;

    #[test]
    fn target_session_id_is_derived_only_by_the_caller_from_the_filename() {
        assert_eq!(
            target_session_id_from_rollout_path(Path::new(
                "rollout-2026-08-15T00-00-00-000000-019ffbab-8906-7243-af24-cf7a9bf8c997.jsonl"
            ))
            .unwrap(),
            "019ffbab-8906-7243-af24-cf7a9bf8c997"
        );
        assert_eq!(
            target_session_id_from_rollout_path(Path::new(
                "rollout-2026-08-15T00-00-00-000000-019ffbab-8906-7243-af24-cf7a9bf8c997.jsonl.zst"
            ))
            .unwrap(),
            "019ffbab-8906-7243-af24-cf7a9bf8c997"
        );
    }

    #[test]
    fn target_session_id_derivation_fails_closed_for_ambiguous_names() {
        assert!(target_session_id_from_rollout_path(Path::new("rollout.jsonl")).is_err());
        assert!(
            target_session_id_from_rollout_path(Path::new(
                "rollout-019ffbab-8906-7243-af24-cf7a9bf8c99x.jsonl"
            ))
            .is_err()
        );
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = parse_args()?;
    let started = Instant::now();
    validate_output_paths(&args)?;

    let first = run_once(&args).await?;
    if first.read_stats.parse_errors > 0 && !args.allow_partial {
        anyhow::bail!(
            "rollout has {} parse/read error(s); refusing partial projection (first: {}). Use --allow-partial only for an explicitly partial import",
            first.read_stats.parse_errors,
            first
                .read_stats
                .first_parse_error
                .as_deref()
                .unwrap_or("unknown")
        );
    }

    let mut determinism = DeterminismStats {
        run_index: 1,
        same_keys: true,
        same_hashes: true,
        same_report: true,
        first_run_content_hash: Some(first.content_hash.clone()),
        second_run_content_hash: None,
        timing_excluded: true,
    };
    if args.verify_determinism {
        let second = run_once(&args).await?;
        let keys = |run: &RunOutputs| {
            run.projection
                .turns
                .iter()
                .flat_map(|turn| turn.items.iter().map(|item| item.item_key.clone()))
                .collect::<Vec<_>>()
        };
        let hashes = |run: &RunOutputs| {
            run.projection
                .turns
                .iter()
                .flat_map(|turn| {
                    turn.items
                        .iter()
                        .map(|item| item.content_hash.clone().unwrap_or_default())
                })
                .collect::<Vec<_>>()
        };
        determinism.same_keys = keys(&first) == keys(&second);
        determinism.same_hashes = hashes(&first) == hashes(&second);
        determinism.same_report = first.projection_json == second.projection_json
            && first.details_json == second.details_json
            && first.details_fingerprint == second.details_fingerprint
            && first.official_built == second.official_built
            && first.official_json == second.official_json
            && first.content_hash == second.content_hash
            && first.snapshot_hash == second.snapshot_hash
            && first.read_mode == second.read_mode
            && first.tail_preview_json == second.tail_preview_json
            && first.tail_segment_start == second.tail_segment_start
            && first.tail_segment_end == second.tail_segment_end
            && first.backfill_segments == second.backfill_segments;
        determinism.second_run_content_hash = Some(second.content_hash);
        determinism.run_index = 2;
        if !(determinism.same_keys && determinism.same_hashes && determinism.same_report) {
            anyhow::bail!(
                "determinism check failed: same_keys={} same_hashes={} same_payloads={}",
                determinism.same_keys,
                determinism.same_hashes,
                determinism.same_report
            );
        }
    }

    let api_verification = args
        .self_api_dir
        .as_ref()
        .map(|output_dir| self_api::verify_to_files(&first.projection, &first.details, output_dir))
        .transpose()?;
    let report_doc = build_demo_report(
        &args,
        &first,
        &determinism,
        api_verification.as_ref(),
        started,
    )?;
    let report_json = serde_json::to_string_pretty(&report_doc).context("serialize demo report")?;

    if let Some(details_path) = &args.details {
        if first.details_persisted {
            // The streaming detail store already finalized this path while
            // the reducer was running. Avoid materializing the full JSONL in
            // memory or rewriting it here.
        } else {
            write_atomic(details_path, first.details_json.as_bytes())?;
        }
    }
    if let Some(report_path) = &args.report {
        let projection_json = serde_json::to_string_pretty(&first.projection)
            .context("serialize projection sidecar")?;
        write_atomic(report_path, report_json.as_bytes())?;
        write_atomic(
            &report_path.with_extension("projection.json"),
            projection_json.as_bytes(),
        )?;
        if first.official_built {
            write_atomic(
                &report_path.with_extension("official.json"),
                first.official_json.as_bytes(),
            )?;
        }
    }

    println!("{report_json}");
    Ok(())
}

fn build_demo_report(
    args: &Args,
    run: &RunOutputs,
    determinism: &DeterminismStats,
    api_verification: Option<&self_api::SelfApiVerificationReport>,
    started: Instant,
) -> Result<DemoReport> {
    let reduction = report::reduction_stats_from(&run.reduce_stats, &run.projection);
    let official: Value = if run.official_built {
        serde_json::from_str(&run.official_json).context("parse official view")?
    } else {
        Value::Null
    };
    let official_turns = official.get("turns").and_then(Value::as_array);
    let official_turn_count = official_turns.map_or(0, |turns| turns.len() as u64);
    let official_item_count = official_turns
        .map(|turns| {
            turns
                .iter()
                .map(|turn| {
                    turn.get("items")
                        .and_then(Value::as_array)
                        .map_or(0, Vec::len)
                })
                .sum::<usize>() as u64
        })
        .unwrap_or(0);
    let comparison = report::ComparisonStats {
        official_built: run.official_built,
        official_turn_count,
        projection_turn_count: run.projection.turns.len() as u64,
        official_item_count,
        projection_item_count: reduction.retained_items,
        official_item_kinds: report::official_item_kinds(&official),
        official_missing_but_projection_has: vec![
            "tool.output_bytes/output_sha256".to_string(),
            "tool.exit_code/duration_ms".to_string(),
            "approval".to_string(),
            "settings_snapshot".to_string(),
            "rate_limit".to_string(),
            "usage".to_string(),
            "plan_question/answer".to_string(),
            "task_outcome".to_string(),
            "presentation_kind".to_string(),
            "display_command".to_string(),
            "task_outcome.final_metrics".to_string(),
            "task_outcome.provisional".to_string(),
            "source_ref/source_ordinal".to_string(),
        ],
    };
    let details_output_path = if args.details.is_some() {
        args.details.clone()
    } else if args.checkpoint.is_some() {
        Some(checkpoint_details_path(args)?)
    } else {
        None
    };
    let output = report::OutputStats {
        report_path: args
            .report
            .as_ref()
            .map_or_else(String::new, |path| path.display().to_string()),
        projection_path: args.report.as_ref().map_or_else(String::new, |path| {
            path.with_extension("projection.json").display().to_string()
        }),
        details_path: details_output_path.map(|path| path.display().to_string()),
        tail_preview_path: if run.tail_preview_json.is_empty() {
            None
        } else {
            args.report
                .as_ref()
                .map(|path| path.with_extension("tail.json").display().to_string())
        },
        official_path: if run.official_built {
            args.report
                .as_ref()
                .map(|path| path.with_extension("official.json").display().to_string())
        } else {
            None
        },
        projection_bytes: run.projection_json.len() as u64,
        details_bytes: run.details_bytes,
        official_bytes: run.official_json.len() as u64,
        content_hash: run.content_hash.clone(),
        snapshot_hash: run.snapshot_hash.clone(),
    };
    let timing = report::TimingStats {
        read_ms: run.read_elapsed.as_millis() as u64,
        reduce_ms: run.reduce_elapsed.as_millis() as u64,
        project_ms: run.project_elapsed.as_millis() as u64,
        total_ms: started.elapsed().as_millis() as u64,
        peak_memory_mb: peak_memory_mb(),
    };
    let outcome_provisional =
        run.projection.task_outcome.as_ref().is_some_and(|outcome| {
            outcome.provisional || outcome.availability == "partial_rollout"
        });
    Ok(report::build_report(
        CODEX_REVISION,
        report::InputStats {
            rollout_path: args.rollout.display().to_string(),
            read_mode: run.read_mode.clone(),
            segment_bytes: (!args.full_oracle && !args.forward_stream)
                .then_some(args.segment_bytes),
            tail_segment_start: run.tail_segment_start,
            tail_segment_end: run.tail_segment_end,
            backfill_segments: run.backfill_segments,
            bytes: run.read_stats.bytes,
            decoded_bytes: run.read_stats.decoded_bytes,
            budget_bytes: run.read_stats.budget_bytes,
            line_count: run.read_stats.line_count,
            valid_records: run.read_stats.valid_records,
            parse_errors: run.read_stats.parse_errors,
            first_parse_error: run.read_stats.first_parse_error.clone(),
            item_kinds: run.read_stats.item_kinds.clone(),
            event_payload_types: run.read_stats.event_payload_types.clone(),
            unmapped_types: run.read_stats.unmapped_types.clone(),
            checkpoint_path: run.checkpoint.path.clone(),
            checkpoint_loaded: run.checkpoint.loaded,
            checkpoint_source_offset: run.checkpoint.source_offset,
            checkpoint_scanned_end_offset: run.checkpoint.scanned_end_offset,
            checkpoint_complete_end_offset: run.checkpoint.complete_end_offset,
            checkpoint_pending_tail_bytes: run.checkpoint.pending_tail_bytes,
            checkpoint_source_grew_during_read: run.checkpoint.source_grew_during_read,
        },
        reduction,
        comparison,
        output,
        determinism.clone(),
        api_verification.cloned(),
        timing,
        outcome_provisional,
    ))
}

fn validate_output_paths(args: &Args) -> Result<()> {
    let input = normalized_path(&args.rollout)?;
    let mut outputs = Vec::new();
    if let Some(report) = &args.report {
        outputs.push(report.clone());
        outputs.push(report.with_extension("projection.json"));
        if !args.full_oracle && !args.forward_stream {
            outputs.push(report.with_extension("tail.json"));
        }
        if args.full_oracle {
            outputs.push(report.with_extension("official.json"));
        }
    }
    if let Some(details) = &args.details {
        outputs.push(details.clone());
    }
    if args.checkpoint.is_some() {
        let checkpoint = args
            .checkpoint
            .as_ref()
            .context("checkpoint path is missing")?;
        outputs.push(checkpoint.clone());
        let checkpoint_details = checkpoint_details_path(args)?;
        if !outputs
            .iter()
            .any(|path| same_path(path, &checkpoint_details))
        {
            outputs.push(checkpoint_details);
        }
    }
    let mut normalized_outputs = Vec::new();
    for output in outputs {
        let normalized = normalized_path(&output)?;
        if same_path(&normalized, &input) {
            anyhow::bail!(
                "output path would overwrite the input rollout: {}",
                output.display()
            );
        }
        if normalized_outputs
            .iter()
            .any(|path: &PathBuf| same_path(path, &normalized))
        {
            anyhow::bail!("output paths collide: {}", output.display());
        }
        normalized_outputs.push(normalized);
    }
    if let Some(self_api_dir) = &args.self_api_dir {
        let normalized = normalized_path(self_api_dir)?;
        if same_path(&normalized, &input) {
            anyhow::bail!(
                "self API output directory would overwrite the input rollout: {}",
                self_api_dir.display()
            );
        }
        if normalized_outputs
            .iter()
            .any(|path: &PathBuf| same_path(path, &normalized))
        {
            anyhow::bail!(
                "self API output directory collides with a file output: {}",
                self_api_dir.display()
            );
        }
    }
    Ok(())
}

fn same_path(left: &Path, right: &Path) -> bool {
    if cfg!(windows) {
        left.to_string_lossy()
            .eq_ignore_ascii_case(&right.to_string_lossy())
    } else {
        left == right
    }
}

fn normalized_path(path: &Path) -> Result<PathBuf> {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()?.join(path)
    };
    if absolute.exists() {
        return Ok(std::fs::canonicalize(&absolute).unwrap_or(absolute));
    }
    let parent = absolute.parent().unwrap_or_else(|| Path::new("."));
    let parent = std::fs::canonicalize(parent).unwrap_or_else(|_| parent.to_path_buf());
    Ok(parent.join(
        absolute
            .file_name()
            .context("output path has no filename")?,
    ))
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create output directory {}", parent.display()))?;
    }
    let file_name = path
        .file_name()
        .context("output path has no filename")?
        .to_string_lossy();
    let pid = std::process::id();
    let mut temporary = path.with_file_name(format!(".{file_name}.tmp.{pid}"));
    for index in 0..1000_u32 {
        if index > 0 {
            temporary = path.with_file_name(format!(".{file_name}.tmp.{pid}.{index}"));
        }
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
        {
            Ok(mut file) => {
                let result = (|| -> Result<()> {
                    file.write_all(bytes)?;
                    file.sync_all()?;
                    if path.exists() {
                        std::fs::remove_file(path)?;
                    }
                    std::fs::rename(&temporary, path)?;
                    Ok(())
                })();
                if result.is_err() {
                    let _ = std::fs::remove_file(&temporary);
                }
                return result.with_context(|| format!("write {}", path.display()));
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(error).with_context(|| format!("create {}", temporary.display()));
            }
        }
    }
    anyhow::bail!(
        "could not allocate a temporary output path next to {}",
        path.display()
    )
}

/// Peak working set of the current process in MiB (Windows), 0 elsewhere.
fn peak_memory_mb() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::c_void;
        #[repr(C)]
        struct ProcessMemoryCounters {
            cb: u32,
            page_fault_count: u32,
            peak_working_set_size: usize,
            working_set_size: usize,
            quota_peak_paged_pool_usage: usize,
            quota_paged_pool_usage: usize,
            quota_peak_non_paged_pool_usage: usize,
            quota_non_paged_pool_usage: usize,
            pagefile_usage: usize,
            peak_pagefile_usage: usize,
        }
        unsafe extern "system" {
            fn GetCurrentProcess() -> *mut c_void;
            fn GetProcessMemoryInfo(
                process: *mut c_void,
                counters: *mut ProcessMemoryCounters,
                size: u32,
            ) -> i32;
        }
        let mut counters = ProcessMemoryCounters {
            cb: std::mem::size_of::<ProcessMemoryCounters>() as u32,
            page_fault_count: 0,
            peak_working_set_size: 0,
            working_set_size: 0,
            quota_peak_paged_pool_usage: 0,
            quota_paged_pool_usage: 0,
            quota_peak_non_paged_pool_usage: 0,
            quota_non_paged_pool_usage: 0,
            pagefile_usage: 0,
            peak_pagefile_usage: 0,
        };
        unsafe {
            let process = GetCurrentProcess();
            if GetProcessMemoryInfo(process, &mut counters, counters.cb) != 0 {
                return counters.peak_working_set_size as u64 / (1024 * 1024);
            }
        }
    }
    0
}
