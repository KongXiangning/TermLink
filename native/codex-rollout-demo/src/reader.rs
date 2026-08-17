//! Full-rollout reader with an explicit decompressed input budget.

use std::collections::BTreeMap;
use std::path::Path;

use anyhow::{Context, Result};
use codex_protocol::protocol::{RolloutItem, RolloutLine};

#[derive(Clone)]
pub struct ParsedRolloutLine {
    pub source_ordinal: u64,
    /// Codex's logical rollout position. Legacy records omit this field and
    /// fall back to the physical source ordinal.
    pub rollout_ordinal: Option<u64>,
    pub line: RolloutLine,
}

impl ParsedRolloutLine {
    pub fn effective_ordinal(&self) -> u64 {
        self.rollout_ordinal.unwrap_or(self.source_ordinal)
    }
}

#[derive(Debug, Clone, Default)]
pub struct ReadStats {
    /// Bytes in the source file. For `.zst` this is the compressed size.
    pub bytes: u64,
    /// Bytes returned by the rollout line reader after decompression.
    pub decoded_bytes: u64,
    pub budget_bytes: u64,
    pub line_count: u64,
    pub parse_errors: u64,
    pub unmapped_types: BTreeMap<String, u64>,
    pub item_kinds: BTreeMap<String, u64>,
    pub event_payload_types: BTreeMap<String, u64>,
    pub first_parse_error: Option<String>,
}

/// Parse the complete source. Parse failures are reported in `ReadStats`; the
/// caller decides whether `--allow-partial` is acceptable. The default CLI
/// path fails closed rather than silently producing an incomplete projection.
pub async fn read_full(
    path: &Path,
    max_decoded_bytes: u64,
) -> Result<(Vec<ParsedRolloutLine>, ReadStats)> {
    let mut stats = ReadStats {
        budget_bytes: max_decoded_bytes,
        ..ReadStats::default()
    };
    let metadata =
        std::fs::metadata(path).with_context(|| format!("metadata for {}", path.display()))?;
    if !metadata.is_file() {
        anyhow::bail!("rollout path is not a file: {}", path.display());
    }
    stats.bytes = metadata.len();
    if stats.bytes > max_decoded_bytes {
        anyhow::bail!(
            "rollout {} is {} source bytes, exceeding the {} byte limit",
            path.display(),
            stats.bytes,
            max_decoded_bytes
        );
    }

    let mut reader = codex_rollout::open_rollout_line_reader(path)
        .await
        .with_context(|| format!("open rollout {}", path.display()))?;

    let mut lines = Vec::new();
    let mut ordinal = 0_u64;
    loop {
        let raw = match reader.next_line().await {
            Ok(Some(line)) => line,
            Ok(None) => break,
            Err(error) => {
                stats.parse_errors += 1;
                remember_first_error(&mut stats, format!("read error: {error}"));
                break;
            }
        };
        ordinal += 1;
        stats.line_count += 1;
        stats.decoded_bytes = stats
            .decoded_bytes
            .saturating_add(raw.len() as u64)
            .saturating_add(1);
        if stats.decoded_bytes > max_decoded_bytes {
            anyhow::bail!(
                "decoded rollout {} exceeds the {} byte limit",
                path.display(),
                max_decoded_bytes
            );
        }
        if raw.trim().is_empty() {
            continue;
        }
        match parse_rollout_line(&raw) {
            Ok(line) => {
                record_item_kinds(&mut stats, &line.item);
                lines.push(ParsedRolloutLine {
                    source_ordinal: ordinal,
                    rollout_ordinal: line.ordinal,
                    line,
                });
            }
            Err(error) => {
                stats.parse_errors += 1;
                remember_first_error(
                    &mut stats,
                    format!("line {ordinal}: {}", truncate(&error.to_string(), 300)),
                );
                if let Some(kind) = unmapped_type_from_raw(&raw) {
                    *stats.unmapped_types.entry(kind).or_insert(0) += 1;
                }
            }
        }
    }
    Ok((lines, stats))
}

pub fn parse_rollout_line(raw: &str) -> Result<RolloutLine> {
    // Deserialize through Value. This is required by the current Codex
    // protocol for some internally tagged payloads containing f64 values.
    let value: serde_json::Value = serde_json::from_str(raw)?;
    Ok(serde_json::from_value(value)?)
}

fn record_item_kinds(stats: &mut ReadStats, item: &RolloutItem) {
    let value = serde_json::to_value(item).unwrap_or(serde_json::Value::Null);
    let kind = value
        .get("type")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("unknown")
        .to_string();
    *stats.item_kinds.entry(kind.clone()).or_insert(0) += 1;
    if kind == "event_msg" {
        let payload = value
            .get("payload")
            .and_then(|payload| payload.get("type"))
            .and_then(serde_json::Value::as_str)
            .unwrap_or("<missing>")
            .to_string();
        *stats.event_payload_types.entry(payload).or_insert(0) += 1;
    }
}

fn unmapped_type_from_raw(raw: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(raw).ok()?;
    let top = value.get("type")?.as_str()?;
    if top == "event_msg" {
        let payload = value
            .get("payload")
            .and_then(|payload| payload.get("type"))
            .and_then(serde_json::Value::as_str)
            .unwrap_or("<missing>");
        return Some(format!("event_msg:{payload}"));
    }
    Some(format!("rollout:{top}"))
}

fn remember_first_error(stats: &mut ReadStats, message: String) {
    if stats.first_parse_error.is_none() {
        stats.first_parse_error = Some(message);
    }
}

fn truncate(value: &str, max: usize) -> String {
    if value.len() <= max {
        value.to_string()
    } else {
        format!("{}…", &value[..max])
    }
}
