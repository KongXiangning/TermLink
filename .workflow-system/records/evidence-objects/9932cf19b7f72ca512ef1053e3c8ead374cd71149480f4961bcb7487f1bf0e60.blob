use std::{
    fmt,
    fs::File,
    io::{Read, Seek, SeekFrom},
};

use super::cursor::{CompleteLineAnchor, CursorError, ForwardAppendCursor};
use super::digest::{SHA256_ALGORITHM, digest_file_range};
use super::jsonl::JsonlSourceBackend;
use super::read_plan::{SourceByteRange, SourceReadMode, SourceReadPlanError};
use super::record::{
    SnapshotBoundary, SourceFingerprint, SourcePrefixAnchor, SourceRecord, SourceSpec,
};

const IO_CHUNK_BYTES: usize = 64 * 1024;

/// Errors raised before an append result can be published.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AppendError {
    Cursor(CursorError),
    Plan(SourceReadPlanError),
    Io {
        operation: String,
        message: String,
    },
    Digest {
        operation: String,
        message: String,
    },
    UnsupportedDigestAlgorithm {
        field: &'static str,
        algorithm: String,
    },
    Callback {
        message: String,
    },
}

impl fmt::Display for AppendError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Cursor(error) => write!(formatter, "append cursor validation failed: {error}"),
            Self::Plan(error) => write!(formatter, "append read plan failed: {error}"),
            Self::Io { operation, message } => write!(formatter, "{operation}: {message}"),
            Self::Digest { operation, message } => write!(formatter, "{operation}: {message}"),
            Self::UnsupportedDigestAlgorithm { field, algorithm } => write!(
                formatter,
                "append {field} uses unsupported digest algorithm {algorithm}"
            ),
            Self::Callback { message } => write!(formatter, "append visitor failed: {message}"),
        }
    }
}

impl std::error::Error for AppendError {}

/// Result of one append attempt. A mutation diagnostic never carries a new
/// cursor, and records are only delivered after the source stability checks.
#[derive(Debug, Clone, PartialEq)]
pub struct AppendReadReport {
    snapshot_boundary: SnapshotBoundary,
    scanned_range: Option<SourceByteRange>,
    complete_range: Option<SourceByteRange>,
    pending_tail_bytes: u64,
    source_grew_during_read: bool,
    source_shrank_during_read: bool,
    source_bytes_at_end: u64,
    accepted_record_count: usize,
    diagnostic: Option<SourceRecord>,
    next_cursor: Option<ForwardAppendCursor>,
}

impl AppendReadReport {
    pub const fn snapshot_boundary(&self) -> SnapshotBoundary {
        self.snapshot_boundary
    }

    pub const fn scanned_range(&self) -> Option<SourceByteRange> {
        self.scanned_range
    }

    pub const fn complete_range(&self) -> Option<SourceByteRange> {
        self.complete_range
    }

    pub const fn pending_tail_bytes(&self) -> u64 {
        self.pending_tail_bytes
    }

    pub const fn source_grew_during_read(&self) -> bool {
        self.source_grew_during_read
    }

    pub const fn source_shrank_during_read(&self) -> bool {
        self.source_shrank_during_read
    }

    pub const fn source_bytes_at_end(&self) -> u64 {
        self.source_bytes_at_end
    }

    pub const fn accepted_record_count(&self) -> usize {
        self.accepted_record_count
    }

    pub fn diagnostic(&self) -> Option<&SourceRecord> {
        self.diagnostic.as_ref()
    }

    pub fn next_cursor(&self) -> Option<&ForwardAppendCursor> {
        self.next_cursor.as_ref()
    }
}

impl JsonlSourceBackend {
    /// Read only the physical range after a validated forward cursor.
    ///
    /// The callback is intentionally invoked after the post-read prefix and
    /// growth-range checks. This keeps source replacement fail-closed even if
    /// the file changes while the plan is being read.
    pub fn read_append(
        &self,
        cursor: &ForwardAppendCursor,
        spec: &SourceSpec,
        visit: &mut dyn FnMut(SourceRecord) -> anyhow::Result<()>,
    ) -> Result<AppendReadReport, AppendError> {
        let metadata_before = std::fs::metadata(spec.path()).map_err(|error| AppendError::Io {
            operation: format!("metadata before append {}", spec.path().display()),
            message: error.to_string(),
        })?;
        if !metadata_before.is_file() {
            return Err(AppendError::Io {
                operation: "append source validation".to_string(),
                message: format!("source is not a file: {}", spec.path().display()),
            });
        }

        let original_snapshot = cursor.metadata().snapshot_boundary();
        let current_length = metadata_before.len();
        if current_length < original_snapshot.byte_length() {
            return self.mutation_report(
                spec,
                cursor,
                "source_replaced",
                format!(
                    "source shrank from {} to {} bytes",
                    original_snapshot.byte_length(),
                    current_length
                ),
                current_length,
                true,
                visit,
            );
        }

        cursor
            .validate_against(spec, SnapshotBoundary::new(current_length))
            .map_err(AppendError::Cursor)?;
        ensure_sha256(cursor.metadata().fingerprint().algorithm(), "fingerprint")?;
        ensure_sha256(
            cursor.metadata().prefix_anchor().algorithm(),
            "prefix_anchor",
        )?;

        let expected_old_digest = cursor.metadata().fingerprint().digest();
        let actual_old_digest = digest_file_range(spec.path(), 0, original_snapshot.byte_length())
            .map_err(|error| AppendError::Digest {
                operation: format!("hash append source prefix {}", spec.path().display()),
                message: error.to_string(),
            })?;
        if actual_old_digest != expected_old_digest
            || actual_old_digest != cursor.metadata().prefix_anchor().digest()
        {
            return self.mutation_report(
                spec,
                cursor,
                "source_replaced",
                "source fingerprint or prefix anchor changed".to_string(),
                current_length,
                false,
                visit,
            );
        }

        let captured_boundary = SnapshotBoundary::new(current_length);
        if current_length == original_snapshot.byte_length() {
            return self.finish_no_growth(
                spec,
                cursor,
                captured_boundary,
                actual_old_digest,
                visit,
            );
        }

        let append_range = SourceByteRange::new(original_snapshot.byte_length(), current_length)
            .map_err(AppendError::Plan)?;
        let captured_append_digest =
            digest_file_range(spec.path(), append_range.start(), append_range.end()).map_err(
                |error| AppendError::Digest {
                    operation: format!("hash append source growth {}", spec.path().display()),
                    message: error.to_string(),
                },
            )?;

        let append_spec = spec.clone().with_snapshot_boundary(captured_boundary);
        let plan = match self.plan_range(&append_spec, SourceReadMode::ForwardRange, append_range) {
            Ok(plan) => plan,
            Err(error @ SourceReadPlanError::SegmentLimitExceeded { .. })
            | Err(error @ SourceReadPlanError::RangeNotAtLineBoundary { .. }) => {
                return self.mutation_report(
                    spec,
                    cursor,
                    "source_gap",
                    error.to_string(),
                    current_length,
                    false,
                    visit,
                );
            }
            Err(error) => return Err(AppendError::Plan(error)),
        };

        let mut records = Vec::new();
        let planned_report = plan
            .read(self, &mut |record| {
                records.push(record);
                Ok(())
            })
            .map_err(|error| AppendError::Io {
                operation: format!("read append range {}", spec.path().display()),
                message: error.to_string(),
            })?;

        let metadata_after = std::fs::metadata(spec.path()).map_err(|error| AppendError::Io {
            operation: format!("metadata after append {}", spec.path().display()),
            message: error.to_string(),
        })?;
        let source_bytes_at_end = metadata_after.len();
        let source_grew_during_read = planned_report.source_grew_during_read()
            || source_bytes_at_end > captured_boundary.byte_length();
        let source_shrank_during_read = planned_report.source_shrank_during_read()
            || source_bytes_at_end < captured_boundary.byte_length();
        if source_shrank_during_read {
            return self.mutation_report(
                spec,
                cursor,
                "source_replaced",
                format!(
                    "source shrank during append read from {} to {} bytes",
                    captured_boundary.byte_length(),
                    source_bytes_at_end
                ),
                source_bytes_at_end,
                true,
                visit,
            );
        }

        let actual_old_digest_after =
            digest_file_range(spec.path(), 0, original_snapshot.byte_length()).map_err(
                |error| AppendError::Digest {
                    operation: format!("recheck append source prefix {}", spec.path().display()),
                    message: error.to_string(),
                },
            )?;
        let actual_append_digest_after =
            digest_file_range(spec.path(), append_range.start(), append_range.end()).map_err(
                |error| AppendError::Digest {
                    operation: format!("recheck append source growth {}", spec.path().display()),
                    message: error.to_string(),
                },
            )?;
        if actual_old_digest_after != actual_old_digest
            || actual_append_digest_after != captured_append_digest
        {
            return self.mutation_report(
                spec,
                cursor,
                "source_replaced",
                "source prefix or captured growth changed during append read".to_string(),
                source_bytes_at_end,
                false,
                visit,
            );
        }

        let complete_end = planned_report
            .complete_range()
            .map(|range| range.end())
            .unwrap_or(original_snapshot.byte_length());
        if complete_end < original_snapshot.byte_length()
            || complete_end > captured_boundary.byte_length()
        {
            return self.mutation_report(
                spec,
                cursor,
                "source_gap",
                format!(
                    "append complete boundary {complete_end} is outside captured range {}..{}",
                    original_snapshot.byte_length(),
                    captured_boundary.byte_length()
                ),
                source_bytes_at_end,
                false,
                visit,
            );
        }

        let next_cursor = if complete_end == original_snapshot.byte_length() {
            if planned_report.pending_tail_bytes() > 0
                || records.iter().any(|record| record.parse_error.is_some())
            {
                None
            } else {
                Some(cursor.clone())
            }
        } else {
            Some(self.build_cursor(spec, cursor, &records, complete_end)?)
        };

        if next_cursor.is_none() && records.iter().any(|record| record.parse_error.is_some()) {
            let diagnostic = records
                .iter()
                .find(|record| record.parse_error.is_some())
                .cloned();
            return self.publish_report(
                AppendReadReport {
                    snapshot_boundary: captured_boundary,
                    scanned_range: Some(planned_report.scanned_range()),
                    complete_range: planned_report.complete_range(),
                    pending_tail_bytes: planned_report.pending_tail_bytes(),
                    source_grew_during_read,
                    source_shrank_during_read,
                    source_bytes_at_end,
                    accepted_record_count: 0,
                    diagnostic,
                    next_cursor: None,
                },
                Vec::new(),
                visit,
            );
        }

        let accepted_record_count = records.len();
        self.publish_report(
            AppendReadReport {
                snapshot_boundary: captured_boundary,
                scanned_range: Some(planned_report.scanned_range()),
                complete_range: planned_report.complete_range(),
                pending_tail_bytes: planned_report.pending_tail_bytes(),
                source_grew_during_read,
                source_shrank_during_read,
                source_bytes_at_end,
                accepted_record_count,
                diagnostic: None,
                next_cursor,
            },
            records,
            visit,
        )
    }

    fn finish_no_growth(
        &self,
        spec: &SourceSpec,
        cursor: &ForwardAppendCursor,
        boundary: SnapshotBoundary,
        old_digest: String,
        visit: &mut dyn FnMut(SourceRecord) -> anyhow::Result<()>,
    ) -> Result<AppendReadReport, AppendError> {
        let metadata_after = std::fs::metadata(spec.path()).map_err(|error| AppendError::Io {
            operation: format!("metadata after no-growth append {}", spec.path().display()),
            message: error.to_string(),
        })?;
        if metadata_after.len() < boundary.byte_length() {
            return self.mutation_report(
                spec,
                cursor,
                "source_replaced",
                "source shrank during no-growth append preflight".to_string(),
                metadata_after.len(),
                true,
                visit,
            );
        }
        let actual_digest =
            digest_file_range(spec.path(), 0, boundary.byte_length()).map_err(|error| {
                AppendError::Digest {
                    operation: format!("recheck no-growth source {}", spec.path().display()),
                    message: error.to_string(),
                }
            })?;
        if actual_digest != old_digest {
            return self.mutation_report(
                spec,
                cursor,
                "source_replaced",
                "source prefix changed during no-growth append preflight".to_string(),
                metadata_after.len(),
                false,
                visit,
            );
        }

        Ok(AppendReadReport {
            snapshot_boundary: boundary,
            scanned_range: Some(cursor.metadata().complete_range()),
            complete_range: Some(cursor.metadata().complete_range()),
            pending_tail_bytes: 0,
            source_grew_during_read: metadata_after.len() > boundary.byte_length(),
            source_shrank_during_read: false,
            source_bytes_at_end: metadata_after.len(),
            accepted_record_count: 0,
            diagnostic: None,
            next_cursor: Some(cursor.clone()),
        })
    }

    fn build_cursor(
        &self,
        spec: &SourceSpec,
        cursor: &ForwardAppendCursor,
        records: &[SourceRecord],
        complete_end: u64,
    ) -> Result<ForwardAppendCursor, AppendError> {
        let line_start =
            last_line_start(spec.path(), complete_end).map_err(|error| AppendError::Io {
                operation: format!("find append line anchor {}", spec.path().display()),
                message: error.to_string(),
            })?;
        let physical_line_ordinal =
            count_newlines(spec.path(), complete_end).map_err(|error| AppendError::Io {
                operation: format!("count append line anchor {}", spec.path().display()),
                message: error.to_string(),
            })?;
        let line_digest =
            digest_file_range(spec.path(), line_start, complete_end).map_err(|error| {
                AppendError::Digest {
                    operation: format!("hash append line anchor {}", spec.path().display()),
                    message: error.to_string(),
                }
            })?;
        let last_line = CompleteLineAnchor::new(
            SHA256_ALGORITHM,
            line_digest,
            physical_line_ordinal,
            line_start,
            complete_end,
        )
        .map_err(AppendError::Cursor)?;
        let prefix_digest = digest_file_range(spec.path(), 0, complete_end).map_err(|error| {
            AppendError::Digest {
                operation: format!("hash append cursor prefix {}", spec.path().display()),
                message: error.to_string(),
            }
        })?;
        let fingerprint =
            SourceFingerprint::new(SHA256_ALGORITHM, prefix_digest.clone(), complete_end).map_err(
                |error| AppendError::Digest {
                    operation: "construct append fingerprint".to_string(),
                    message: error.to_string(),
                },
            )?;
        let anchor = SourcePrefixAnchor::new(SHA256_ALGORITHM, prefix_digest, complete_end)
            .map_err(|error| AppendError::Digest {
                operation: "construct append prefix anchor".to_string(),
                message: error.to_string(),
            })?;
        let next_spec = spec
            .clone()
            .with_snapshot_boundary(SnapshotBoundary::new(complete_end))
            .with_fingerprint(fingerprint)
            .with_prefix_anchor(anchor);
        let last_rollout_ordinal = records
            .iter()
            .rev()
            .find_map(|record| record.rollout_ordinal)
            .or(cursor.metadata().last_rollout_ordinal());
        ForwardAppendCursor::from_source(
            &next_spec,
            SnapshotBoundary::new(complete_end),
            SourceByteRange::new(0, complete_end).map_err(AppendError::Plan)?,
            Some(last_line),
            last_rollout_ordinal,
        )
        .map_err(AppendError::Cursor)
    }

    fn mutation_report(
        &self,
        spec: &SourceSpec,
        cursor: &ForwardAppendCursor,
        code: &'static str,
        message: String,
        observed_length: u64,
        source_shrank: bool,
        visit: &mut dyn FnMut(SourceRecord) -> anyhow::Result<()>,
    ) -> Result<AppendReadReport, AppendError> {
        let boundary = cursor
            .metadata()
            .complete_range()
            .end()
            .min(observed_length);
        let physical_line_ordinal = cursor
            .metadata()
            .last_complete_line()
            .map(|line| line.physical_line_ordinal().saturating_add(1))
            .unwrap_or(1);
        let diagnostic = SourceRecord {
            source_identity: spec.source_identity().to_string(),
            byte_start: boundary,
            byte_end: boundary,
            physical_line_ordinal,
            rollout_ordinal: None,
            timestamp: None,
            raw: None,
            parse_error: Some(format!("{code}: {message}")),
        };
        visit(diagnostic.clone()).map_err(|error| AppendError::Callback {
            message: error.to_string(),
        })?;
        Ok(AppendReadReport {
            snapshot_boundary: SnapshotBoundary::new(observed_length),
            scanned_range: None,
            complete_range: None,
            pending_tail_bytes: 0,
            source_grew_during_read: observed_length
                > cursor.metadata().snapshot_boundary().byte_length(),
            source_shrank_during_read: source_shrank,
            source_bytes_at_end: observed_length,
            accepted_record_count: 0,
            diagnostic: Some(diagnostic),
            next_cursor: None,
        })
    }

    fn publish_report(
        &self,
        report: AppendReadReport,
        records: Vec<SourceRecord>,
        visit: &mut dyn FnMut(SourceRecord) -> anyhow::Result<()>,
    ) -> Result<AppendReadReport, AppendError> {
        for record in records {
            visit(record).map_err(|error| AppendError::Callback {
                message: error.to_string(),
            })?;
        }
        Ok(report)
    }
}

fn ensure_sha256(algorithm: &str, field: &'static str) -> Result<(), AppendError> {
    if algorithm == SHA256_ALGORITHM {
        return Ok(());
    }
    Err(AppendError::UnsupportedDigestAlgorithm {
        field,
        algorithm: algorithm.to_string(),
    })
}

fn last_line_start(path: &std::path::Path, end: u64) -> std::io::Result<u64> {
    if end == 0 {
        return Ok(0);
    }
    let mut file = File::open(path)?;
    let mut cursor = end;
    let mut first_byte = true;
    let mut buffer = [0_u8; IO_CHUNK_BYTES];
    while cursor > 0 {
        let start = cursor.saturating_sub(buffer.len() as u64);
        let length = usize::try_from(cursor - start).unwrap_or(buffer.len());
        file.seek(SeekFrom::Start(start))?;
        file.read_exact(&mut buffer[..length])?;
        for index in (0..length).rev() {
            let absolute = start + index as u64;
            if first_byte && absolute == end - 1 {
                first_byte = false;
                continue;
            }
            if buffer[index] == b'\n' {
                return Ok(absolute + 1);
            }
            first_byte = false;
        }
        cursor = start;
    }
    Ok(0)
}

fn count_newlines(path: &std::path::Path, end: u64) -> std::io::Result<u64> {
    let mut file = File::open(path)?;
    file.seek(SeekFrom::Start(0))?;
    let mut remaining = end;
    let mut buffer = [0_u8; IO_CHUNK_BYTES];
    let mut count = 0_u64;
    while remaining > 0 {
        let requested = remaining.min(buffer.len() as u64) as usize;
        let read = file.read(&mut buffer[..requested])?;
        if read == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                "source ended while counting complete lines",
            ));
        }
        count = count
            .saturating_add(buffer[..read].iter().filter(|byte| **byte == b'\n').count() as u64);
        remaining -= read as u64;
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use std::{
        fs::{self, OpenOptions},
        io::Write,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{AppendReadReport, JsonlSourceBackend, SHA256_ALGORITHM, digest_file_range};
    use crate::source::{
        CompleteLineAnchor, ForwardAppendCursor, SnapshotBoundary, SourceByteRange,
        SourceFingerprint, SourcePrefixAnchor, SourceRecord, SourceSpec,
    };

    struct TempSource {
        path: PathBuf,
    }

    impl TempSource {
        fn new(name: &str, contents: &[u8]) -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "termlink-rollout-append-{name}-{}-{nonce}.jsonl",
                std::process::id()
            ));
            fs::write(&path, contents).expect("write temp source");
            Self { path }
        }

        fn append(&self, contents: &[u8]) {
            let mut file = OpenOptions::new()
                .append(true)
                .open(&self.path)
                .expect("open append source");
            file.write_all(contents).expect("append source");
            file.sync_all().expect("sync source");
        }
    }

    impl Drop for TempSource {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    fn spec(path: &Path, snapshot: u64) -> SourceSpec {
        let digest = digest_file_range(path, 0, snapshot).expect("source digest");
        SourceSpec::bind("conversation-append", "logical-rollout", path)
            .expect("binding")
            .with_source_epoch("epoch-append")
            .expect("epoch")
            .with_fingerprint(
                SourceFingerprint::new(SHA256_ALGORITHM, digest.clone(), snapshot)
                    .expect("fingerprint"),
            )
            .with_prefix_anchor(
                SourcePrefixAnchor::new(SHA256_ALGORITHM, digest, snapshot).expect("prefix anchor"),
            )
    }

    fn initial_cursor(path: &Path, snapshot: u64, last_line: u64) -> ForwardAppendCursor {
        let spec = spec(path, snapshot);
        let digest = digest_file_range(path, last_line, snapshot).expect("line digest");
        let line = CompleteLineAnchor::new(SHA256_ALGORITHM, digest, 1, last_line, snapshot)
            .expect("line anchor");
        ForwardAppendCursor::from_source(
            &spec,
            SnapshotBoundary::new(snapshot),
            SourceByteRange::new(0, snapshot).expect("range"),
            Some(line),
            Some(1),
        )
        .expect("cursor")
    }

    fn spec_for_cursor(path: &Path, cursor: &ForwardAppendCursor) -> SourceSpec {
        SourceSpec::bind(
            cursor.metadata().target_conversation_id(),
            cursor.metadata().source_id(),
            path,
        )
        .expect("binding")
        .with_source_epoch(cursor.metadata().source_epoch())
        .expect("epoch")
        .with_fingerprint(cursor.metadata().fingerprint().clone())
        .with_prefix_anchor(cursor.metadata().prefix_anchor().clone())
    }

    fn read_append(
        backend: &JsonlSourceBackend,
        cursor: &ForwardAppendCursor,
        spec: &SourceSpec,
    ) -> (AppendReadReport, Vec<SourceRecord>) {
        let mut records = Vec::new();
        let report = backend
            .read_append(cursor, spec, &mut |record| {
                records.push(record);
                Ok(())
            })
            .expect("append read");
        (report, records)
    }

    #[test]
    fn append_reads_only_new_complete_lines_and_keeps_pending_tail_for_retry() {
        let initial_bytes = b"{\"ordinal\":1}\n";
        let source = TempSource::new("pending", initial_bytes);
        let backend = JsonlSourceBackend;
        let cursor = initial_cursor(&source.path, initial_bytes.len() as u64, 0);
        source.append(b"{\"ordinal\":2");

        let (pending, records) =
            read_append(&backend, &cursor, &spec_for_cursor(&source.path, &cursor));
        assert!(records.is_empty());
        assert_eq!(pending.pending_tail_bytes(), 12);
        assert!(pending.next_cursor().is_none());

        source.append(b"}\n");
        let (complete, records) =
            read_append(&backend, &cursor, &spec_for_cursor(&source.path, &cursor));
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].rollout_ordinal, Some(2));
        assert!(complete.next_cursor().is_some());
        assert_eq!(complete.accepted_record_count(), 1);
    }

    #[test]
    fn append_is_idempotent_across_repeated_requests_and_new_backend_instances() {
        let initial_bytes = b"{\"ordinal\":1}\n";
        let source = TempSource::new("restart", initial_bytes);
        let initial = initial_cursor(&source.path, initial_bytes.len() as u64, 0);
        source.append(b"{\"ordinal\":2}\n");

        let backend = JsonlSourceBackend;
        let (first, first_records) =
            read_append(&backend, &initial, &spec_for_cursor(&source.path, &initial));
        let next = first.next_cursor().cloned().expect("next cursor");
        assert_eq!(first_records.len(), 1);

        let (repeat, repeat_records) = read_append(
            &JsonlSourceBackend,
            &next,
            &spec_for_cursor(&source.path, &next),
        );
        assert!(repeat_records.is_empty());
        assert_eq!(repeat.next_cursor(), Some(&next));

        source.append(b"{\"ordinal\":3}\n");
        let (again, again_records) = read_append(
            &JsonlSourceBackend,
            &next,
            &spec_for_cursor(&source.path, &next),
        );
        assert_eq!(again_records.len(), 1);
        assert_eq!(again_records[0].rollout_ordinal, Some(3));
        assert!(again.next_cursor().is_some());
    }

    #[test]
    fn same_content_rename_continues_logical_source_but_truncate_and_replace_fail_closed() {
        let initial_bytes = b"{\"ordinal\":1}\n";
        let source = TempSource::new("rename", initial_bytes);
        let initial = initial_cursor(&source.path, initial_bytes.len() as u64, 0);
        let renamed = source
            .path
            .with_file_name("termlink-rollout-append-renamed.jsonl");
        fs::rename(&source.path, &renamed).expect("rename source");
        let renamed_spec = spec_for_cursor(&renamed, &initial);
        let source_after_rename = TempSource {
            path: renamed.clone(),
        };
        let (renamed_result, renamed_records) =
            read_append(&JsonlSourceBackend, &initial, &renamed_spec);
        assert!(renamed_records.is_empty());
        assert!(renamed_result.next_cursor().is_some());

        {
            let mut file = OpenOptions::new()
                .append(true)
                .open(&renamed)
                .expect("open renamed source");
            file.write_all(b"{\"ordinal\":2}\n")
                .expect("append renamed source");
            file.sync_all().expect("sync renamed source");
        }
        let (renamed_growth, renamed_growth_records) = read_append(
            &JsonlSourceBackend,
            &initial,
            &spec_for_cursor(&renamed, &initial),
        );
        assert_eq!(renamed_growth_records.len(), 1);
        assert_eq!(renamed_growth_records[0].rollout_ordinal, Some(2));
        assert!(renamed_growth.next_cursor().is_some());

        fs::write(&renamed, b"{\"ordinal\":1}").expect("truncate source");
        let (truncated, truncated_records) = read_append(
            &JsonlSourceBackend,
            &initial,
            &spec_for_cursor(&renamed, &initial),
        );
        assert!(
            truncated_records[0]
                .parse_error
                .as_deref()
                .is_some_and(|error| error.starts_with("source_replaced"))
        );
        assert!(truncated.next_cursor().is_none());

        fs::write(&renamed, b"{\"ordinal\":9}\n").expect("replace source");
        let (replaced, replaced_records) = read_append(
            &JsonlSourceBackend,
            &initial,
            &spec_for_cursor(&renamed, &initial),
        );
        assert!(
            replaced_records[0]
                .parse_error
                .as_deref()
                .is_some_and(|error| error.starts_with("source_replaced"))
        );
        assert!(replaced.next_cursor().is_none());

        drop(source_after_rename);
    }

    #[test]
    fn prefix_change_with_same_length_is_detected_before_new_records_are_published() {
        let initial_bytes = b"{\"ordinal\":1}\n";
        let source = TempSource::new("prefix", initial_bytes);
        let initial = initial_cursor(&source.path, initial_bytes.len() as u64, 0);
        let mut replacement = b"{\"ordinal\":1}\n".to_vec();
        replacement[4] = b'9';
        fs::write(&source.path, replacement).expect("replace same length");

        let mut records = Vec::new();
        let report = JsonlSourceBackend
            .read_append(
                &initial,
                &spec_for_cursor(&source.path, &initial),
                &mut |record| {
                    records.push(record);
                    Ok(())
                },
            )
            .expect("controlled replacement report");
        assert_eq!(report.accepted_record_count(), 0);
        assert!(report.next_cursor().is_none());
        assert_eq!(records.len(), 1);
        assert!(
            records[0]
                .parse_error
                .as_deref()
                .is_some_and(|error| error.starts_with("source_replaced"))
        );
    }

    #[test]
    fn append_preflight_rejects_a_source_identity_or_epoch_mismatch() {
        let initial_bytes = b"{\"ordinal\":1}\n";
        let source = TempSource::new("identity", initial_bytes);
        let initial = initial_cursor(&source.path, initial_bytes.len() as u64, 0);
        let initial_spec = spec_for_cursor(&source.path, &initial);
        let wrong = SourceSpec::bind("conversation-other", "logical-rollout", &source.path)
            .expect("binding")
            .with_source_epoch("epoch-append")
            .expect("epoch")
            .with_fingerprint(
                SourceFingerprint::new(
                    SHA256_ALGORITHM,
                    digest_file_range(&source.path, 0, initial_bytes.len() as u64).expect("digest"),
                    initial_bytes.len() as u64,
                )
                .expect("fingerprint"),
            )
            .with_prefix_anchor(
                SourcePrefixAnchor::new(
                    SHA256_ALGORITHM,
                    digest_file_range(&source.path, 0, initial_bytes.len() as u64).expect("digest"),
                    initial_bytes.len() as u64,
                )
                .expect("anchor"),
            );
        let error = JsonlSourceBackend
            .read_append(&initial, &wrong, &mut |_| Ok(()))
            .expect_err("identity mismatch");
        assert!(matches!(error, super::AppendError::Cursor(_)));
        assert_eq!(initial_spec.source_id(), "logical-rollout");
    }

    #[test]
    fn append_reports_source_gap_for_unbounded_growth_without_emitting_records() {
        let initial_bytes = b"{\"ordinal\":1}\n";
        let source = TempSource::new("gap", initial_bytes);
        let initial = initial_cursor(&source.path, initial_bytes.len() as u64, 0);
        let large = vec![b'x'; SourceSpec::DEFAULT_MAX_SEGMENT_BYTES as usize + 1];
        source.append(&large);

        let mut records = Vec::new();
        let report = JsonlSourceBackend
            .read_append(
                &initial,
                &spec_for_cursor(&source.path, &initial),
                &mut |record| {
                    records.push(record);
                    Ok(())
                },
            )
            .expect("controlled gap report");
        assert_eq!(records.len(), 1);
        assert!(
            records[0]
                .parse_error
                .as_deref()
                .is_some_and(|error| error.starts_with("source_gap"))
        );
        assert!(report.next_cursor().is_none());
    }

    #[test]
    fn append_helper_digest_matches_known_prefix() {
        let source = TempSource::new("digest", b"abc");
        assert_eq!(
            digest_file_range(&source.path, 0, 3).expect("digest"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
