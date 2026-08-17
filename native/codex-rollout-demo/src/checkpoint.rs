//! Durable append-only rollout checkpoints.
//!
//! A checkpoint is valid only at a complete JSONL line boundary. It stores
//! the reducer fold state plus small source anchors so a later invocation can
//! process newly appended records without replaying the old prefix.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::reducer::ReducerCheckpoint;

pub const CHECKPOINT_SCHEMA: &str = "codex-rollout-incremental-checkpoint";
pub const CHECKPOINT_VERSION: u64 = 1;
const ANCHOR_BYTES: u64 = 64 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceAnchor {
    pub start_offset: u64,
    pub end_offset: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceAnchors {
    pub head: SourceAnchor,
    pub checkpoint_tail: SourceAnchor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncrementalCheckpoint {
    pub schema: String,
    pub schema_version: u64,
    pub conversation_id: String,
    pub source_path: String,
    /// Source length observed at the beginning of the checkpoint read.
    pub source_size: u64,
    /// Byte immediately after the last complete JSONL record.
    pub source_offset: u64,
    pub source_ordinal: u64,
    pub rollout_ordinal: Option<u64>,
    pub last_timestamp: Option<String>,
    pub anchors: SourceAnchors,
    pub details_path: String,
    pub pending_tail_bytes: u64,
    pub source_grew_during_read: bool,
    pub content_hash: String,
    pub snapshot_hash: String,
    pub reducer: ReducerCheckpoint,
}

impl IncrementalCheckpoint {
    pub fn new(
        conversation_id: String,
        source_path: String,
        source_size: u64,
        source_offset: u64,
        source_ordinal: u64,
        rollout_ordinal: Option<u64>,
        last_timestamp: Option<String>,
        details_path: String,
        pending_tail_bytes: u64,
        source_grew_during_read: bool,
        content_hash: String,
        snapshot_hash: String,
        reducer: ReducerCheckpoint,
        anchors: SourceAnchors,
    ) -> Self {
        Self {
            schema: CHECKPOINT_SCHEMA.to_string(),
            schema_version: CHECKPOINT_VERSION,
            conversation_id,
            source_path,
            source_size,
            source_offset,
            source_ordinal,
            rollout_ordinal,
            last_timestamp,
            anchors,
            details_path,
            pending_tail_bytes,
            source_grew_during_read,
            content_hash,
            snapshot_hash,
            reducer,
        }
    }
}

pub fn load(path: &Path) -> Result<IncrementalCheckpoint> {
    let file = File::open(path)
        .with_context(|| format!("open incremental checkpoint {}", path.display()))?;
    let checkpoint = serde_json::from_reader(file)
        .with_context(|| format!("decode incremental checkpoint {}", path.display()))?;
    Ok(checkpoint)
}

pub fn anchors_for_file(
    path: &Path,
    checkpoint_offset: u64,
    checkpoint_source_size: u64,
) -> Result<SourceAnchors> {
    let metadata = std::fs::metadata(path)
        .with_context(|| format!("metadata for checkpoint anchors {}", path.display()))?;
    if checkpoint_offset > metadata.len() {
        anyhow::bail!(
            "checkpoint offset {} exceeds source size {}",
            checkpoint_offset,
            metadata.len()
        );
    }
    if checkpoint_source_size > metadata.len() {
        anyhow::bail!(
            "checkpoint source snapshot {} exceeds current source size {}",
            checkpoint_source_size,
            metadata.len()
        );
    }
    let head_end = checkpoint_source_size.min(ANCHOR_BYTES);
    let tail_start = checkpoint_offset.saturating_sub(ANCHOR_BYTES);
    Ok(SourceAnchors {
        head: read_anchor(path, 0, head_end)?,
        checkpoint_tail: read_anchor(path, tail_start, checkpoint_offset)?,
    })
}

pub fn validate_source(path: &Path, checkpoint: &IncrementalCheckpoint) -> Result<u64> {
    let metadata = std::fs::metadata(path)
        .with_context(|| format!("metadata for checkpoint source {}", path.display()))?;
    if metadata.len() < checkpoint.source_offset {
        anyhow::bail!(
            "rollout was truncated below checkpoint offset: checkpoint {}, source {}",
            checkpoint.source_offset,
            metadata.len()
        );
    }
    if metadata.len() < checkpoint.source_size {
        anyhow::bail!(
            "rollout size regressed from checkpoint snapshot {} to {}",
            checkpoint.source_size,
            metadata.len()
        );
    }
    let anchors = anchors_for_file(path, checkpoint.source_offset, checkpoint.source_size)?;
    if anchors.head.sha256 != checkpoint.anchors.head.sha256
        || anchors.checkpoint_tail.sha256 != checkpoint.anchors.checkpoint_tail.sha256
        || anchors.head.end_offset != checkpoint.anchors.head.end_offset
        || anchors.checkpoint_tail.start_offset != checkpoint.anchors.checkpoint_tail.start_offset
    {
        anyhow::bail!(
            "rollout prefix changed before checkpoint offset {}; refusing incremental resume",
            checkpoint.source_offset
        );
    }
    Ok(metadata.len())
}

fn read_anchor(path: &Path, start_offset: u64, end_offset: u64) -> Result<SourceAnchor> {
    let length = end_offset.saturating_sub(start_offset);
    let mut file =
        File::open(path).with_context(|| format!("open source anchor {}", path.display()))?;
    file.seek(SeekFrom::Start(start_offset))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; 64 * 1024];
    let mut remaining = length;
    while remaining > 0 {
        let requested = remaining.min(buffer.len() as u64) as usize;
        let read = file.read(&mut buffer[..requested])?;
        if read == 0 {
            anyhow::bail!(
                "unexpected EOF while reading source anchor {}..{}",
                start_offset,
                end_offset
            );
        }
        hasher.update(&buffer[..read]);
        remaining -= read as u64;
    }
    Ok(SourceAnchor {
        start_offset,
        end_offset,
        sha256: crate::dto::hex::encode(&hasher.finalize()),
    })
}
