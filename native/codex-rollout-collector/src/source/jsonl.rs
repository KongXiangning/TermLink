use std::fs::File;
use std::io::{BufRead, BufReader};

use anyhow::{Context, Result, bail};
use serde_json::Value;

use super::record::{SourceReadReport, SourceRecord, SourceSpec};
use super::zstd::is_compressed_rollout;

/// Source abstraction used by the formal analyzer. It only emits bounded
/// source records and does not know about Codex types or business events.
pub trait SourceBackend {
    fn read(
        &self,
        spec: &SourceSpec,
        visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    ) -> Result<SourceReadReport>;
}

#[derive(Debug, Default, Clone, Copy)]
pub struct JsonlSourceBackend;

impl JsonlSourceBackend {
    fn read_reader<R: BufRead>(
        &self,
        mut reader: R,
        spec: &SourceSpec,
        mut report: SourceReadReport,
        visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    ) -> Result<SourceReadReport> {
        let mut byte_offset = 0_u64;
        let mut physical_line_ordinal = 0_u64;

        loop {
            let remaining_decoded_bytes = spec
                .max_decoded_bytes()
                .saturating_sub(report.decoded_bytes);
            if remaining_decoded_bytes == 0 {
                if reader.fill_buf()?.is_empty() {
                    break;
                }
                physical_line_ordinal = physical_line_ordinal.saturating_add(1);
                report.physical_line_count = physical_line_ordinal;
                report.budget_exceeded = true;
                report.parse_gap_count = report.parse_gap_count.saturating_add(1);
                visit(SourceRecord {
                    source_identity: spec.source_identity().to_string(),
                    byte_start: byte_offset,
                    byte_end: byte_offset,
                    physical_line_ordinal,
                    rollout_ordinal: None,
                    timestamp: None,
                    raw: None,
                    parse_error: Some("source_limit_exceeded".to_string()),
                })?;
                break;
            }
            let decoded_limit = usize::try_from(remaining_decoded_bytes).unwrap_or(usize::MAX);
            let effective_line_limit = spec.max_line_bytes().min(decoded_limit);
            let line = read_bounded_line(&mut reader, effective_line_limit)?;
            let (line_bytes, line_len, oversized) = match line {
                BoundedLine::End => break,
                BoundedLine::Complete(bytes, len) => (bytes, len, false),
                BoundedLine::Oversized(len) => (Vec::new(), len, true),
            };

            physical_line_ordinal = physical_line_ordinal.saturating_add(1);
            report.physical_line_count = physical_line_ordinal;
            report.decoded_bytes = report.decoded_bytes.saturating_add(line_len as u64);
            let line_start = byte_offset;
            byte_offset = byte_offset.saturating_add(line_len as u64);

            if !oversized && line_bytes.iter().all(u8::is_ascii_whitespace) {
                report.blank_line_count = report.blank_line_count.saturating_add(1);
                continue;
            }

            let (raw, parse_error) = if oversized {
                let reason = if effective_line_limit < spec.max_line_bytes() {
                    "source_limit_exceeded"
                } else {
                    "line_exceeds_limit"
                };
                (None, Some(reason.to_string()))
            } else {
                match serde_json::from_slice::<Value>(trim_line_ending(&line_bytes)) {
                    Ok(value) => (Some(value), None),
                    Err(error) => (None, Some(format!("malformed_json: {error}"))),
                }
            };

            let timestamp = raw
                .as_ref()
                .and_then(Value::as_object)
                .and_then(|object| object.get("timestamp"))
                .and_then(Value::as_str)
                .map(ToOwned::to_owned);
            let rollout_ordinal = raw
                .as_ref()
                .and_then(Value::as_object)
                .and_then(|object| object.get("ordinal"))
                .and_then(Value::as_u64);
            let parse_gap = parse_error.is_some();
            if oversized {
                report.budget_exceeded = true;
            }
            let record = SourceRecord {
                source_identity: spec.source_identity().to_string(),
                byte_start: line_start,
                byte_end: byte_offset,
                physical_line_ordinal,
                rollout_ordinal,
                timestamp,
                raw,
                parse_error,
            };
            if parse_gap {
                report.parse_gap_count = report.parse_gap_count.saturating_add(1);
            } else {
                report.valid_record_count = report.valid_record_count.saturating_add(1);
            }
            visit(record)?;
            if oversized {
                break;
            }
        }

        Ok(report)
    }
}

impl SourceBackend for JsonlSourceBackend {
    fn read(
        &self,
        spec: &SourceSpec,
        visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    ) -> Result<SourceReadReport> {
        let metadata = std::fs::metadata(spec.path())
            .with_context(|| format!("metadata for {}", spec.path().display()))?;
        if !metadata.is_file() {
            bail!("rollout path is not a file: {}", spec.path().display());
        }

        let initial_report = SourceReadReport {
            source_bytes: metadata.len(),
            ..SourceReadReport::default()
        };

        if is_compressed_rollout(spec.path()) {
            let file = File::open(spec.path())
                .with_context(|| format!("open compressed rollout {}", spec.path().display()))?;
            let decoder = zstd::stream::read::Decoder::new(file)
                .with_context(|| format!("decode compressed rollout {}", spec.path().display()))?;
            self.read_reader(BufReader::new(decoder), spec, initial_report, visit)
        } else {
            if metadata.len() > spec.max_decoded_bytes() {
                // Plain JSONL has a cheap preflight, but still emit a bounded
                // diagnostic through the same callback shape as .zst.
                let record = SourceRecord {
                    source_identity: spec.source_identity().to_string(),
                    byte_start: 0,
                    // The preflight rejects the source before consuming any
                    // decoded bytes, so its diagnostic has a zero-length
                    // bounded range. `source_bytes` still reports the full
                    // physical file size through `initial_report`.
                    byte_end: 0,
                    physical_line_ordinal: 1,
                    rollout_ordinal: None,
                    timestamp: None,
                    raw: None,
                    parse_error: Some("source_limit_exceeded".to_string()),
                };
                let mut report = initial_report;
                report.budget_exceeded = true;
                report.physical_line_count = 1;
                report.parse_gap_count = 1;
                visit(record)?;
                return Ok(report);
            }
            let file = File::open(spec.path())
                .with_context(|| format!("open rollout {}", spec.path().display()))?;
            self.read_reader(BufReader::new(file), spec, initial_report, visit)
        }
    }
}

enum BoundedLine {
    End,
    Complete(Vec<u8>, usize),
    Oversized(usize),
}

/// Read one line while retaining at most `max_line_bytes` bytes.
fn read_bounded_line<R: BufRead>(reader: &mut R, max_line_bytes: usize) -> Result<BoundedLine> {
    if max_line_bytes == 0 {
        bail!("max_line_bytes must be greater than zero");
    }

    let mut retained = Vec::with_capacity(max_line_bytes.min(4096));
    let mut total = 0_usize;

    loop {
        let buffer = reader.fill_buf()?;
        if buffer.is_empty() {
            if total == 0 {
                return Ok(BoundedLine::End);
            }
            return Ok(BoundedLine::Complete(retained, total));
        }

        let newline_end = buffer
            .iter()
            .position(|byte| *byte == b'\n')
            .map(|pos| pos + 1);
        let consume_len = newline_end.unwrap_or(buffer.len());

        let remaining = max_line_bytes.saturating_sub(total);
        if consume_len > remaining {
            if remaining > 0 {
                retained.extend_from_slice(&buffer[..remaining]);
                reader.consume(remaining);
                total = total.saturating_add(remaining);
            }
            return Ok(BoundedLine::Oversized(total));
        }

        retained.extend_from_slice(&buffer[..consume_len]);
        reader.consume(consume_len);
        total = total.saturating_add(consume_len);

        if newline_end.is_some() {
            return Ok(BoundedLine::Complete(retained, total));
        }
    }
}

fn trim_line_ending(line: &[u8]) -> &[u8] {
    line.strip_suffix(b"\n")
        .unwrap_or(line)
        .strip_suffix(b"\r")
        .unwrap_or_else(|| line.strip_suffix(b"\n").unwrap_or(line))
}

#[cfg(test)]
mod tests {
    use std::io::{self, BufRead, Read};

    use super::{BoundedLine, JsonlSourceBackend, read_bounded_line};
    use crate::source::record::{SourceReadReport, SourceSpec};

    struct CountingBuf {
        bytes: Vec<u8>,
        position: usize,
        consumed: usize,
    }

    impl CountingBuf {
        fn new(bytes: Vec<u8>) -> Self {
            Self {
                bytes,
                position: 0,
                consumed: 0,
            }
        }
    }

    impl Read for CountingBuf {
        fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
            let available = self.bytes.len().saturating_sub(self.position);
            let count = available.min(target.len());
            target[..count].copy_from_slice(&self.bytes[self.position..self.position + count]);
            self.position += count;
            self.consumed += count;
            Ok(count)
        }
    }

    impl BufRead for CountingBuf {
        fn fill_buf(&mut self) -> io::Result<&[u8]> {
            Ok(&self.bytes[self.position..])
        }

        fn consume(&mut self, amount: usize) {
            let count = amount.min(self.bytes.len().saturating_sub(self.position));
            self.position += count;
            self.consumed += count;
        }
    }

    #[test]
    fn oversized_line_stops_consuming_at_configured_limit() {
        let mut reader = CountingBuf::new(vec![b'x'; 4096]);
        let line = read_bounded_line(&mut reader, 64).expect("bounded line reads");

        assert!(matches!(line, BoundedLine::Oversized(64)));
        assert_eq!(reader.consumed, 64);
        assert_eq!(reader.position, 64);
    }

    #[test]
    fn decoded_budget_stops_before_consuming_the_next_line() {
        let mut reader = CountingBuf::new(b"{}\n{\"ignored\":true}\n".to_vec());
        let spec = SourceSpec::new("bounded.jsonl").with_limits(3, 1024);
        let mut records = Vec::new();

        let report = JsonlSourceBackend
            .read_reader(
                &mut reader,
                &spec,
                SourceReadReport::default(),
                &mut |record| {
                    records.push(record);
                    Ok(())
                },
            )
            .expect("bounded reader completes");

        assert_eq!(reader.consumed, 3);
        assert_eq!(report.decoded_bytes, 3);
        assert!(report.budget_exceeded);
        assert_eq!(records.len(), 2);
        assert!(records[0].is_valid_json());
        assert_eq!(
            records[1].parse_error.as_deref(),
            Some("source_limit_exceeded")
        );
        assert_eq!(records[1].byte_start, 3);
        assert_eq!(records[1].byte_end, 3);
    }
}
