//! Full-rollout reader with an explicit decompressed input budget.

use std::collections::BTreeMap;
use std::path::Path;

use anyhow::{Context, Result};
use codex_protocol::protocol::{RolloutItem, RolloutLine};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncSeekExt, BufReader};

const IO_CHUNK_BYTES: usize = 64 * 1024;

#[derive(Clone)]
pub struct ParsedRolloutLine {
    pub source_ordinal: u64,
    /// Codex's logical rollout position. Legacy records omit this field and
    /// fall back to the physical source ordinal.
    pub rollout_ordinal: Option<u64>,
    pub line: RolloutLine,
}

/// A bounded batch of parsed rollout records.
///
/// Records inside a segment stay in source order. The tail reader returns one
/// such segment before the older prefix is read; the caller can therefore
/// build a provisional tail projection without making the final reducer
/// consume records out of order.
#[derive(Clone)]
pub struct ParsedRolloutSegment {
    pub start_offset: u64,
    pub end_offset: u64,
    pub lines: Vec<ParsedRolloutLine>,
}

impl ParsedRolloutSegment {
    /// Tail records are initially assigned segment-local physical ordinals.
    /// Once the older prefix has been read, rebase them to the exact file
    /// ordinal before they enter the final reducer.
    pub fn rebase_source_ordinals(&mut self, first_source_ordinal: u64) {
        for line in &mut self.lines {
            line.source_ordinal =
                first_source_ordinal.saturating_add(line.source_ordinal.saturating_sub(1));
        }
    }
}

#[derive(Clone)]
pub struct TailSegment {
    pub segment: ParsedRolloutSegment,
    pub stats: ReadStats,
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
    pub segments: u64,
    pub last_source_ordinal: Option<u64>,
    pub parse_errors: u64,
    pub unmapped_types: BTreeMap<String, u64>,
    pub item_kinds: BTreeMap<String, u64>,
    pub event_payload_types: BTreeMap<String, u64>,
    pub first_parse_error: Option<String>,
}

impl ReadStats {
    /// Merge disjoint source ranges. `bytes` and `budget_bytes` describe the
    /// source as a whole and are intentionally not added.
    pub fn merge_range(&mut self, other: &ReadStats) {
        self.decoded_bytes = self.decoded_bytes.saturating_add(other.decoded_bytes);
        self.line_count = self.line_count.saturating_add(other.line_count);
        self.valid_records = self.valid_records.saturating_add(other.valid_records);
        self.segments = self.segments.saturating_add(other.segments);
        self.parse_errors = self.parse_errors.saturating_add(other.parse_errors);
        self.last_source_ordinal = (self.line_count > 0).then_some(self.line_count);
        merge_counts(&mut self.unmapped_types, &other.unmapped_types);
        merge_counts(&mut self.item_kinds, &other.item_kinds);
        merge_counts(&mut self.event_payload_types, &other.event_payload_types);
        if self.first_parse_error.is_none() {
            self.first_parse_error = other.first_parse_error.clone();
        }
    }
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
        if let Some(line) = parse_line_with_stats(&raw, ordinal, &mut stats) {
            visit(line)?;
        }
    }
    Ok(stats)
}

/// Read the newest complete JSONL segment without loading the source prefix.
///
/// `None` means the source is compressed and cannot be seeked by byte through
/// the Codex line-reader API. Callers should use `read_streaming` as the
/// bounded fallback for that case.
pub async fn read_tail_segment(
    path: &Path,
    max_decoded_bytes: u64,
    segment_bytes: u64,
) -> Result<Option<TailSegment>> {
    validate_source(path, max_decoded_bytes)?;
    if is_compressed_rollout(path) {
        return Ok(None);
    }
    if segment_bytes == 0 {
        anyhow::bail!("tail segment size must be greater than zero");
    }

    let metadata = std::fs::metadata(path)
        .with_context(|| format!("metadata for tail segment {}", path.display()))?;
    let end_offset = metadata.len();
    let candidate = end_offset.saturating_sub(segment_bytes);
    let mut file = tokio::fs::File::open(path)
        .await
        .with_context(|| format!("open tail segment {}", path.display()))?;
    let start_offset = previous_line_start(&mut file, candidate).await?;
    let bytes = read_exact_range(&mut file, start_offset, end_offset).await?;
    let (segment, mut stats) =
        parse_segment_bytes(&bytes, start_offset, end_offset, max_decoded_bytes, "tail")?;
    stats.bytes = end_offset;
    Ok(Some(TailSegment { segment, stats }))
}

/// Read the older prefix in bounded segments, newest older segment first.
///
/// The first segment is expected to end at a complete-line boundary, usually
/// the `start_offset` of the already-read tail segment. Records inside each
/// segment remain in source order, while callbacks receive segments in
/// newest-to-oldest order. The final history reducer must replay the source in
/// forward order; this API is for tail/backfill acquisition and preview.
pub async fn read_backward_range<F>(
    path: &Path,
    end_offset: u64,
    max_decoded_bytes: u64,
    segment_bytes: u64,
    mut visit: F,
) -> Result<Option<ReadStats>>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    let metadata = validate_source(path, max_decoded_bytes)?;
    if is_compressed_rollout(path) {
        return Ok(None);
    }
    if end_offset > metadata.len() {
        anyhow::bail!(
            "backward range end {} exceeds source size {}",
            end_offset,
            metadata.len()
        );
    }
    if segment_bytes == 0 {
        anyhow::bail!("backfill segment size must be greater than zero");
    }
    let mut stats = ReadStats {
        bytes: metadata.len(),
        budget_bytes: max_decoded_bytes,
        ..ReadStats::default()
    };
    if end_offset == 0 {
        return Ok(Some(stats));
    }

    let mut file = tokio::fs::File::open(path)
        .await
        .with_context(|| format!("open backward range {}", path.display()))?;
    let mut current_end = end_offset;
    while current_end > 0 {
        let candidate = current_end.saturating_sub(segment_bytes);
        let start_offset = previous_line_start(&mut file, candidate).await?;
        let bytes = read_exact_range(&mut file, start_offset, current_end).await?;
        let (segment, segment_stats) = parse_segment_bytes(
            &bytes,
            start_offset,
            current_end,
            max_decoded_bytes,
            "backfill",
        )?;
        stats.merge_range(&segment_stats);
        visit(segment)?;
        current_end = start_offset;
    }
    Ok(Some(stats))
}

/// Read the source prefix in bounded, source-order segments.
///
/// `end_offset` must be a complete-line boundary, such as the start offset
/// returned by [`read_tail_segment`]. The callback runs immediately for each
/// older segment and may reduce it before the next segment is read.
pub async fn read_forward_range<F>(
    path: &Path,
    end_offset: u64,
    max_decoded_bytes: u64,
    segment_bytes: u64,
    mut visit: F,
) -> Result<ReadStats>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    let metadata = validate_source(path, max_decoded_bytes)?;
    if end_offset > metadata.len() {
        anyhow::bail!(
            "forward range end {} exceeds source size {}",
            end_offset,
            metadata.len()
        );
    }
    if segment_bytes == 0 {
        anyhow::bail!("backfill segment size must be greater than zero");
    }
    if end_offset == 0 {
        return Ok(ReadStats {
            bytes: metadata.len(),
            budget_bytes: max_decoded_bytes,
            ..ReadStats::default()
        });
    }

    let file = tokio::fs::File::open(path)
        .await
        .with_context(|| format!("open forward range {}", path.display()))?;
    let mut reader = BufReader::new(file);
    let mut stats = ReadStats {
        bytes: metadata.len(),
        budget_bytes: max_decoded_bytes,
        ..ReadStats::default()
    };
    let mut offset = 0_u64;
    let mut ordinal = 0_u64;
    let mut segment_start = 0_u64;
    let mut segment_lines = Vec::new();
    let mut segment_decoded_bytes = 0_u64;

    while offset < end_offset {
        let mut raw_with_newline = String::new();
        let read = match reader.read_line(&mut raw_with_newline).await {
            Ok(read) => read,
            Err(error) => {
                stats.parse_errors += 1;
                remember_first_error(&mut stats, format!("read error at byte {offset}: {error}"));
                break;
            }
        };
        if read == 0 {
            anyhow::bail!(
                "forward range ended at {} before requested boundary {}",
                offset,
                end_offset
            );
        }
        let read = read as u64;
        if offset.saturating_add(read) > end_offset {
            anyhow::bail!(
                "forward range boundary {} splits a JSONL record",
                end_offset
            );
        }
        offset += read;
        ordinal += 1;
        stats.line_count += 1;
        stats.last_source_ordinal = Some(ordinal);
        stats.decoded_bytes = stats.decoded_bytes.saturating_add(read);
        if stats.decoded_bytes > max_decoded_bytes {
            anyhow::bail!(
                "decoded rollout {} exceeds the {} byte limit",
                path.display(),
                max_decoded_bytes
            );
        }
        let raw = trim_line_ending(&raw_with_newline);
        if !raw.trim().is_empty() {
            if let Some(line) = parse_line_with_stats(raw, ordinal, &mut stats) {
                segment_lines.push(line);
            }
        }
        segment_decoded_bytes = segment_decoded_bytes.saturating_add(read);
        if segment_decoded_bytes >= segment_bytes {
            emit_segment(
                &mut stats,
                &mut visit,
                segment_start,
                offset,
                &mut segment_lines,
            )?;
            segment_start = offset;
            segment_decoded_bytes = 0;
        }
    }
    emit_segment(
        &mut stats,
        &mut visit,
        segment_start,
        offset,
        &mut segment_lines,
    )?;
    Ok(stats)
}

fn emit_segment<F>(
    stats: &mut ReadStats,
    visit: &mut F,
    start_offset: u64,
    end_offset: u64,
    lines: &mut Vec<ParsedRolloutLine>,
) -> Result<()>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    if lines.is_empty() {
        return Ok(());
    }
    let segment = ParsedRolloutSegment {
        start_offset,
        end_offset,
        lines: std::mem::take(lines),
    };
    stats.segments += 1;
    visit(segment)
}

fn validate_source(path: &Path, max_decoded_bytes: u64) -> Result<std::fs::Metadata> {
    let metadata =
        std::fs::metadata(path).with_context(|| format!("metadata for {}", path.display()))?;
    if !metadata.is_file() {
        anyhow::bail!("rollout path is not a file: {}", path.display());
    }
    if metadata.len() > max_decoded_bytes {
        anyhow::bail!(
            "rollout {} is {} source bytes, exceeding the {} byte limit",
            path.display(),
            metadata.len(),
            max_decoded_bytes
        );
    }
    Ok(metadata)
}

fn is_compressed_rollout(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("zst"))
}

async fn previous_line_start(file: &mut tokio::fs::File, candidate: u64) -> Result<u64> {
    let mut cursor = candidate;
    let mut buffer = vec![0_u8; IO_CHUNK_BYTES];
    while cursor > 0 {
        let start = cursor.saturating_sub(buffer.len() as u64);
        let length = (cursor - start) as usize;
        file.seek(std::io::SeekFrom::Start(start)).await?;
        let mut read = 0_usize;
        while read < length {
            let count = file.read(&mut buffer[read..length]).await?;
            if count == 0 {
                anyhow::bail!("unexpected EOF while locating tail segment boundary");
            }
            read += count;
        }
        if let Some(index) = buffer[..length].iter().rposition(|byte| *byte == b'\n') {
            return Ok(start + index as u64 + 1);
        }
        cursor = start;
    }
    Ok(0)
}

async fn read_exact_range(
    file: &mut tokio::fs::File,
    start_offset: u64,
    end_offset: u64,
) -> Result<Vec<u8>> {
    let length = end_offset.saturating_sub(start_offset);
    file.seek(std::io::SeekFrom::Start(start_offset)).await?;
    let mut output = Vec::with_capacity(length.min(usize::MAX as u64) as usize);
    let mut buffer = vec![0_u8; IO_CHUNK_BYTES];
    let mut remaining = length;
    while remaining > 0 {
        let requested = remaining.min(buffer.len() as u64) as usize;
        let read = file.read(&mut buffer[..requested]).await?;
        if read == 0 {
            anyhow::bail!("unexpected EOF while reading tail segment");
        }
        output.extend_from_slice(&buffer[..read]);
        remaining -= read as u64;
    }
    Ok(output)
}

fn parse_segment_bytes(
    bytes: &[u8],
    start_offset: u64,
    end_offset: u64,
    max_decoded_bytes: u64,
    label: &str,
) -> Result<(ParsedRolloutSegment, ReadStats)> {
    let mut stats = ReadStats {
        bytes: 0,
        decoded_bytes: bytes.len() as u64,
        budget_bytes: max_decoded_bytes,
        ..ReadStats::default()
    };
    let mut lines = Vec::new();
    let mut ordinal = 0_u64;
    for raw_bytes in complete_jsonl_lines(bytes) {
        ordinal += 1;
        stats.line_count += 1;
        stats.last_source_ordinal = Some(ordinal);
        let raw = match std::str::from_utf8(raw_bytes) {
            Ok(raw) => raw,
            Err(error) => {
                stats.parse_errors += 1;
                remember_first_error(
                    &mut stats,
                    format!(
                        "line {ordinal}: invalid UTF-8: {}",
                        truncate(&error.to_string(), 300)
                    ),
                );
                continue;
            }
        };
        if raw.trim().is_empty() {
            continue;
        }
        if let Some(line) = parse_line_with_stats(raw, ordinal, &mut stats) {
            lines.push(line);
        }
    }
    if stats.decoded_bytes > max_decoded_bytes {
        anyhow::bail!(
            "decoded {} segment exceeds the {} byte limit",
            label,
            max_decoded_bytes
        );
    }
    stats.segments = 1;
    Ok((
        ParsedRolloutSegment {
            start_offset,
            end_offset,
            lines,
        },
        stats,
    ))
}

fn complete_jsonl_lines(bytes: &[u8]) -> Vec<&[u8]> {
    let mut lines = Vec::new();
    let mut start = 0_usize;
    for (index, byte) in bytes.iter().enumerate() {
        if *byte != b'\n' {
            continue;
        }
        lines.push(trim_line_ending_bytes(&bytes[start..index]));
        start = index + 1;
    }
    if start < bytes.len() {
        lines.push(trim_line_ending_bytes(&bytes[start..]));
    }
    lines
}

fn trim_line_ending_bytes(raw: &[u8]) -> &[u8] {
    raw.strip_suffix(b"\r").unwrap_or(raw)
}

fn trim_line_ending(raw: &str) -> &str {
    let raw = raw.strip_suffix('\n').unwrap_or(raw);
    raw.strip_suffix('\r').unwrap_or(raw)
}

fn parse_line_with_stats(
    raw: &str,
    ordinal: u64,
    stats: &mut ReadStats,
) -> Option<ParsedRolloutLine> {
    match parse_rollout_line(raw) {
        Ok(line) => {
            record_item_kinds(stats, &line.item);
            stats.valid_records += 1;
            Some(ParsedRolloutLine {
                source_ordinal: ordinal,
                rollout_ordinal: line.ordinal,
                line,
            })
        }
        Err(error) => {
            stats.parse_errors += 1;
            remember_first_error(
                stats,
                format!("line {ordinal}: {}", truncate(&error.to_string(), 300)),
            );
            if let Some(kind) = unmapped_type_from_raw(raw) {
                *stats.unmapped_types.entry(kind).or_insert(0) += 1;
            }
            None
        }
    }
}

fn merge_counts(target: &mut BTreeMap<String, u64>, source: &BTreeMap<String, u64>) {
    for (key, value) in source {
        *target.entry(key.clone()).or_insert(0) += value;
    }
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

    #[tokio::test]
    async fn tail_segment_is_complete_and_prefix_backfill_restores_source_order() {
        let path = std::env::temp_dir().join(format!(
            "codex-rollout-demo-tail-{}-{}.jsonl",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let mut file = std::fs::File::create(&path).unwrap();
        let mut encoded = Vec::new();
        for ordinal in 1..=5_u64 {
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
            let serialized = format!("{}\n", serde_json::to_string(&line).unwrap());
            encoded.push(serialized.clone());
            file.write_all(serialized.as_bytes()).unwrap();
        }
        file.sync_all().unwrap();

        let tail_size = (encoded[3].len() + encoded[4].len()) as u64;
        let tail = read_tail_segment(&path, 1024 * 1024, tail_size)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(tail.segment.lines.len(), 2);
        assert_eq!(
            tail.segment.lines[0].line.timestamp,
            "2026-08-15T00:00:04.000Z"
        );
        assert_eq!(
            tail.segment.lines[1].line.timestamp,
            "2026-08-15T00:00:05.000Z"
        );
        assert!(tail.segment.start_offset > 0);

        let mut backward_segment_first_ordinals = Vec::new();
        let backward_stats = read_backward_range(
            &path,
            tail.segment.start_offset,
            1024 * 1024,
            1,
            |segment| {
                backward_segment_first_ordinals.push(
                    segment
                        .lines
                        .first()
                        .map(ParsedRolloutLine::effective_ordinal),
                );
                Ok(())
            },
        )
        .await
        .unwrap()
        .unwrap();
        assert_eq!(backward_stats.line_count, 3);
        assert_eq!(
            backward_segment_first_ordinals,
            vec![Some(3), Some(2), Some(1)]
        );

        let mut prefix_lines = Vec::new();
        let prefix_stats = read_forward_range(
            &path,
            tail.segment.start_offset,
            1024 * 1024,
            1,
            |segment| {
                prefix_lines.extend(segment.lines);
                Ok(())
            },
        )
        .await
        .unwrap();
        let mut rebased_tail = tail.segment;
        rebased_tail.rebase_source_ordinals(prefix_stats.line_count + 1);
        prefix_lines.extend(rebased_tail.lines);

        assert_eq!(prefix_stats.line_count, 3);
        assert_eq!(prefix_lines.len(), 5);
        assert_eq!(
            prefix_lines
                .iter()
                .map(|line| line.effective_ordinal())
                .collect::<Vec<_>>(),
            vec![1, 2, 3, 4, 5]
        );
        assert_eq!(
            prefix_lines
                .iter()
                .map(|line| line.source_ordinal)
                .collect::<Vec<_>>(),
            vec![1, 2, 3, 4, 5]
        );
        std::fs::remove_file(path).unwrap();
    }
}
