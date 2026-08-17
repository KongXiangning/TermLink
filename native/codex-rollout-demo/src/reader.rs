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
    pub valid_records: u64,
    pub last_source_ordinal: Option<u64>,
    pub parse_errors: u64,
    pub unmapped_types: BTreeMap<String, u64>,
    pub item_kinds: BTreeMap<String, u64>,
    pub event_payload_types: BTreeMap<String, u64>,
    pub first_parse_error: Option<String>,
}

/// Parse the complete source into memory.
///
/// This is intentionally kept as a correctness oracle for tests and
/// comparison runs. The production path must use [`read_streaming`] instead.
pub async fn read_full(
    path: &Path,
    max_decoded_bytes: u64,
) -> Result<(Vec<ParsedRolloutLine>, ReadStats)> {
    let mut lines = Vec::new();
    let stats = read_streaming(path, max_decoded_bytes, |line| {
        lines.push(line);
        Ok(())
    })
    .await?;
    Ok((lines, stats))
}

/// Parse a rollout one complete JSONL record at a time.
///
/// The callback is invoked immediately after a record is parsed. Once it
/// returns, the parsed record can be released, so memory use is independent of
/// the total rollout size (apart from state retained by the callback/reducer).
/// Parse failures are reported in `ReadStats`; the caller decides whether
/// `--allow-partial` is acceptable.
pub async fn read_streaming<F>(
    path: &Path,
    max_decoded_bytes: u64,
    mut visit: F,
) -> Result<ReadStats>
where
    F: FnMut(ParsedRolloutLine) -> Result<()>,
{
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
        stats.last_source_ordinal = Some(ordinal);
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
                stats.valid_records += 1;
                visit(ParsedRolloutLine {
                    source_ordinal: ordinal,
                    rollout_ordinal: line.ordinal,
                    line,
                })?;
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
    Ok(stats)
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

#[cfg(test)]
mod tests {
    use super::*;
    use codex_protocol::protocol::{CompactedItem, RolloutItem, RolloutLine};
    use std::io::Write;

    #[tokio::test]
    async fn streaming_reader_matches_full_reader_without_collecting_source_lines() {
        let path = std::env::temp_dir().join(format!(
            "codex-rollout-demo-reader-{}-{}.jsonl",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let mut file = std::fs::File::create(&path).unwrap();
        for ordinal in 1..=3_u64 {
            let line = RolloutLine {
                timestamp: format!("2026-08-15T00:00:0{ordinal}.000Z"),
                ordinal: Some(ordinal),
                item: RolloutItem::Compacted(CompactedItem {
                    message: format!("window {ordinal}"),
                    replacement_history: None,
                    window_number: Some(ordinal),
                    first_window_id: None,
                    previous_window_id: None,
                    window_id: None,
                }),
            };
            writeln!(file, "{}", serde_json::to_string(&line).unwrap()).unwrap();
        }
        file.sync_all().unwrap();

        let (full_lines, full_stats) = read_full(&path, 1024 * 1024).await.unwrap();
        let mut streamed_lines = Vec::new();
        let streaming_stats = read_streaming(&path, 1024 * 1024, |line| {
            streamed_lines.push(line);
            Ok(())
        })
        .await
        .unwrap();
        assert_eq!(streamed_lines.len(), full_lines.len());
        assert_eq!(streaming_stats.valid_records, full_stats.valid_records);
        assert_eq!(streaming_stats.line_count, full_stats.line_count);
        assert_eq!(streaming_stats.item_kinds, full_stats.item_kinds);
        assert_eq!(streamed_lines[2].effective_ordinal(), 3);
        std::fs::remove_file(path).unwrap();
    }
}
