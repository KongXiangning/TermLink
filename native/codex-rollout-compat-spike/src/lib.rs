//! Parser-only Codex rollout Spike.
//!
//! The reader is the Demo's bounded stream/range implementation. Parsed
//! records remain Codex `RolloutLine` values; this crate deliberately has no
//! TermLink history DTO, reducer, retention policy, self-API, or persistence.

mod codex_decode;
pub mod reader;

use std::collections::BTreeMap;
use std::io::Write;
use std::path::Path;

use anyhow::{Context, Result};
use serde::Serialize;
use serde_json::{Value, json};

use crate::reader::{ParsedRolloutLine, ReadStats};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReadMode {
    Stream,
    Tail,
    Backward,
    Forward,
    Append,
}

impl ReadMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stream => "stream",
            Self::Tail => "tail",
            Self::Backward => "backward",
            Self::Forward => "forward",
            Self::Append => "append",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ParseOptions {
    pub mode: ReadMode,
    pub end_offset: Option<u64>,
    pub start_offset: Option<u64>,
    pub start_ordinal: u64,
    pub max_input_bytes: u64,
    pub segment_bytes: u64,
}

#[derive(Debug, Default, Serialize)]
pub struct ParseReport {
    pub mode: String,
    pub source_path: String,
    pub source_bytes: u64,
    pub decoded_bytes: u64,
    pub line_count: u64,
    pub valid_records: u64,
    pub emitted_records: u64,
    pub segments: u64,
    pub parse_errors: u64,
    pub last_source_ordinal: Option<u64>,
    pub first_parse_error: Option<String>,
    pub pending_tail_bytes: u64,
    pub scanned_end_offset: Option<u64>,
    pub complete_end_offset: Option<u64>,
    pub source_grew_during_read: bool,
    /// Byte range of the emitted tail segment, when `mode == tail`.
    /// Other modes expose range boundaries on each diagnostic record.
    pub segment_start_offset: Option<u64>,
    pub segment_end_offset: Option<u64>,
    pub unmapped_types: BTreeMap<String, u64>,
    pub item_kinds: BTreeMap<String, u64>,
    pub event_payload_types: BTreeMap<String, u64>,
}

struct ParseSink<W> {
    writer: W,
    emitted_records: u64,
}

impl<W> ParseSink<W>
where
    W: Write,
{
    fn new(writer: W) -> Self {
        Self {
            writer,
            emitted_records: 0,
        }
    }

    fn push(&mut self, line: ParsedRolloutLine, segment_range: Option<(u64, u64)>) -> Result<()> {
        // Serialization is only the diagnostic output of this Spike. The
        // parsed value itself is the Codex RolloutLine returned by the Codex
        // decoder, not a TermLink-defined envelope or payload DTO.
        let rollout = serde_json::to_value(&line.line)?;
        let (segment_start_offset, segment_end_offset) = segment_range
            .map_or((Value::Null, Value::Null), |(start, end)| {
                (json!(start), json!(end))
            });
        let record = json!({
            "source": {
                "physical_ordinal": line.source_ordinal,
                "rollout_ordinal": line.rollout_ordinal,
                "timestamp": line.line.timestamp,
                "segment_start_offset": segment_start_offset,
                "segment_end_offset": segment_end_offset,
            },
            "rollout": rollout,
        });
        serde_json::to_writer(&mut self.writer, &record)?;
        self.writer.write_all(b"\n")?;
        self.emitted_records += 1;
        Ok(())
    }

    fn finish(self) -> Result<(W, u64)> {
        Ok((self.writer, self.emitted_records))
    }
}

pub async fn parse_file<W>(
    path: &Path,
    options: &ParseOptions,
    writer: W,
) -> Result<(ParseReport, W)>
where
    W: Write,
{
    let mut sink = ParseSink::new(writer);
    let mut report = ParseReport {
        mode: options.mode.as_str().to_owned(),
        source_path: path.display().to_string(),
        ..ParseReport::default()
    };

    let stats = match options.mode {
        ReadMode::Stream => {
            reader::read_streaming(path, options.max_input_bytes, |line| sink.push(line, None))
                .await?
        }
        ReadMode::Tail => {
            let tail =
                reader::read_tail_segment(path, options.max_input_bytes, options.segment_bytes)
                    .await?
                    .context("tail mode requires a seekable plain JSONL rollout")?;
            for line in tail.segment.lines {
                sink.push(
                    line,
                    Some((tail.segment.start_offset, tail.segment.end_offset)),
                )?;
            }
            report.segment_start_offset = Some(tail.segment.start_offset);
            report.segment_end_offset = Some(tail.segment.end_offset);
            tail.stats
        }
        ReadMode::Backward => {
            let end_offset = options
                .end_offset
                .context("backward mode requires --end-offset")?;
            reader::read_backward_range(
                path,
                end_offset,
                options.max_input_bytes,
                options.segment_bytes,
                |segment| {
                    for line in segment.lines {
                        sink.push(line, Some((segment.start_offset, segment.end_offset)))?;
                    }
                    Ok(())
                },
            )
            .await?
            .context("backward mode requires a seekable plain JSONL rollout")?
        }
        ReadMode::Forward => {
            let end_offset = options
                .end_offset
                .context("forward mode requires --end-offset")?;
            reader::read_forward_range(
                path,
                end_offset,
                options.max_input_bytes,
                options.segment_bytes,
                |segment| {
                    for line in segment.lines {
                        sink.push(line, Some((segment.start_offset, segment.end_offset)))?;
                    }
                    Ok(())
                },
            )
            .await?
        }
        ReadMode::Append => {
            let start_offset = options
                .start_offset
                .context("append mode requires --start-offset")?;
            let append = reader::read_append_range(
                path,
                start_offset,
                options.start_ordinal,
                options.max_input_bytes,
                options.segment_bytes,
                |segment| {
                    for line in segment.lines {
                        sink.push(line, Some((segment.start_offset, segment.end_offset)))?;
                    }
                    Ok(())
                },
            )
            .await?;
            report.pending_tail_bytes = append.pending_tail_bytes;
            report.scanned_end_offset = Some(append.scanned_end_offset);
            report.complete_end_offset = Some(append.complete_end_offset);
            report.source_grew_during_read = append.source_grew_during_read;
            append.stats
        }
    };

    apply_stats(&mut report, &stats);
    let (writer, emitted_records) = sink.finish()?;
    report.emitted_records = emitted_records;
    Ok((report, writer))
}

fn apply_stats(report: &mut ParseReport, stats: &ReadStats) {
    report.source_bytes = stats.bytes;
    report.decoded_bytes = stats.decoded_bytes;
    report.line_count = stats.line_count;
    report.valid_records = stats.valid_records;
    report.segments = stats.segments;
    report.parse_errors = stats.parse_errors;
    report.last_source_ordinal = stats.last_source_ordinal;
    report.first_parse_error = stats.first_parse_error.clone();
    report.unmapped_types = stats.unmapped_types.clone();
    report.item_kinds = stats.item_kinds.clone();
    report.event_payload_types = stats.event_payload_types.clone();
}

pub fn report_json(report: &ParseReport) -> Result<Value> {
    Ok(serde_json::to_value(report)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use codex_history::RolloutItem;

    #[test]
    fn parser_returns_codex_rollout_line_without_a_termlink_wire_model() {
        let raw = include_str!("../fixtures/minimal-rollout.jsonl")
            .lines()
            .next()
            .expect("fixture has a first record");
        let line = reader::parse_rollout_line(raw).expect("Codex parser accepts fixture");
        let encoded = serde_json::to_value(line).expect("Codex line serializes");

        assert_eq!(encoded["timestamp"], "2026-08-18T10:00:00.000Z");
        assert_eq!(encoded["type"], "session_meta");
    }

    #[test]
    fn parser_accepts_token_usage_record_and_preserves_legacy_usage_carrier() {
        let lines: Vec<_> = include_str!("../fixtures/token-usage-record.jsonl")
            .lines()
            .collect();
        let parsed: Vec<_> = lines
            .iter()
            .copied()
            .map(reader::parse_rollout_line)
            .collect::<Result<_, _>>()
            .expect("sanitized current and legacy usage records parse");

        assert!(matches!(parsed[0].item, RolloutItem::TokenUsageRecord(_)));
        assert!(matches!(parsed[1].item, RolloutItem::EventMsg(_)));
        let expected: Value = serde_json::from_str(lines[0]).expect("fixture is JSON");
        let encoded = serde_json::to_value(&parsed[0]).expect("native line serializes");
        assert_eq!(encoded, expected);
        let restored: codex_history::RolloutLine =
            serde_json::from_value(encoded).expect("native payload envelope round-trips");
        let RolloutItem::TokenUsageRecord(record) = restored.item else {
            panic!("expected token usage record");
        };
        assert_eq!(record.usage.input_tokens, 101);
        assert_eq!(record.turn_token_usage.total_tokens, 122);
        assert_eq!(record.thread_token_usage.total_tokens, 122);
    }

    #[test]
    fn parser_rejects_malformed_token_usage_records() {
        let errors: Vec<_> = include_str!("../fixtures/token-usage-record-malformed.jsonl")
            .lines()
            .map(reader::parse_rollout_line)
            .map(|result| match result {
                Err(error) => error,
                Ok(_) => panic!("each malformed record must fail"),
            })
            .collect();

        assert_eq!(errors.len(), 3);
        assert!(errors[0].to_string().contains("missing field `usage`"));
        assert!(errors[1].to_string().contains("invalid type"));
        assert!(errors[2].to_string().contains("missing field `payload`"));
    }
}
