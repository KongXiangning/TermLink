use std::{
    fmt,
    fs::File,
    io::{self, BufRead, BufReader, Read, Seek, SeekFrom},
    path::Path,
};

use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::jsonl::JsonlSourceBackend;
use super::record::{
    SnapshotBoundary, SourceCompression, SourceReadReport, SourceRecord, SourceSpec,
};

const IO_CHUNK_BYTES: usize = 64 * 1024;

/// A bounded input mode. Append is intentionally absent: step 2 can expose
/// the capability bit, but it must not manufacture a resumable append cursor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceReadMode {
    FullRead,
    ForwardStream,
    TailPreview,
    BackwardRange,
    ForwardRange,
}

impl SourceReadMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::FullRead => "full_read",
            Self::ForwardStream => "forward_stream",
            Self::TailPreview => "tail_preview",
            Self::BackwardRange => "backward_range",
            Self::ForwardRange => "forward_range",
        }
    }
}

/// A capability exposed by a source backend.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceCapability {
    ForwardStream,
    TailPreview,
    BackwardSegments,
    Append,
    RandomSeek,
}

impl SourceCapability {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ForwardStream => "forward_stream",
            Self::TailPreview => "tail_preview",
            Self::BackwardSegments => "backward_segments",
            Self::Append => "append",
            Self::RandomSeek => "random_seek",
        }
    }
}

/// Capabilities are explicit so callers cannot infer seek or append safety
/// from a successful forward decode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceCapabilities {
    pub forward_stream: bool,
    pub tail_preview: bool,
    pub backward_segments: bool,
    pub append: bool,
    pub random_seek: bool,
}

impl SourceCapabilities {
    pub const fn plain_jsonl() -> Self {
        Self {
            forward_stream: true,
            tail_preview: true,
            backward_segments: true,
            append: true,
            random_seek: true,
        }
    }

    pub const fn ordinary_zstd() -> Self {
        Self {
            forward_stream: true,
            tail_preview: false,
            backward_segments: false,
            append: false,
            random_seek: false,
        }
    }

    pub const fn for_compression(compression: SourceCompression) -> Self {
        match compression {
            SourceCompression::PlainJsonl => Self::plain_jsonl(),
            SourceCompression::Zstd => Self::ordinary_zstd(),
        }
    }

    pub const fn supports(self, capability: SourceCapability) -> bool {
        match capability {
            SourceCapability::ForwardStream => self.forward_stream,
            SourceCapability::TailPreview => self.tail_preview,
            SourceCapability::BackwardSegments => self.backward_segments,
            SourceCapability::Append => self.append,
            SourceCapability::RandomSeek => self.random_seek,
        }
    }

    pub const fn supports_mode(self, mode: SourceReadMode) -> bool {
        match mode {
            SourceReadMode::FullRead | SourceReadMode::ForwardStream => self.forward_stream,
            SourceReadMode::TailPreview => self.tail_preview,
            SourceReadMode::BackwardRange => self.backward_segments,
            SourceReadMode::ForwardRange => self.random_seek,
        }
    }
}

impl SourceSpec {
    pub fn capabilities(&self) -> SourceCapabilities {
        SourceCapabilities::for_compression(self.compression())
    }
}

/// An end-exclusive physical byte range.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceByteRange {
    start: u64,
    end: u64,
}

impl SourceByteRange {
    pub fn new(start: u64, end: u64) -> ReadPlanResult<Self> {
        if start > end {
            return Err(SourceReadPlanError::InvalidRange { start, end });
        }
        Ok(Self { start, end })
    }

    pub const fn start(self) -> u64 {
        self.start
    }

    pub const fn end(self) -> u64 {
        self.end
    }

    pub const fn len(self) -> u64 {
        self.end.saturating_sub(self.start)
    }

    pub const fn is_empty(self) -> bool {
        self.start == self.end
    }
}

/// Errors raised while constructing a snapshot-aware plan.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SourceReadPlanError {
    SourceNotFile {
        path: String,
    },
    Io {
        operation: String,
        message: String,
    },
    InvalidRange {
        start: u64,
        end: u64,
    },
    UnsupportedMode {
        mode: SourceReadMode,
        compression: SourceCompression,
    },
    InvalidRangeMode {
        mode: SourceReadMode,
    },
    SnapshotBeyondSource {
        snapshot: u64,
        actual: u64,
    },
    RangeExceedsSnapshot {
        end: u64,
        snapshot: u64,
    },
    RangeNotAtLineBoundary {
        offset: u64,
        boundary: &'static str,
    },
    SegmentLimitExceeded {
        requested: u64,
        max: u64,
    },
    ZeroLimit {
        name: &'static str,
    },
}

impl fmt::Display for SourceReadPlanError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SourceNotFile { path } => write!(formatter, "source is not a file: {path}"),
            Self::Io { operation, message } => write!(formatter, "{operation}: {message}"),
            Self::InvalidRange { start, end } => {
                write!(formatter, "invalid source range {start}..{end}")
            }
            Self::UnsupportedMode { mode, compression } => write!(
                formatter,
                "source mode {} is unsupported for {}",
                mode.as_str(),
                compression.as_str()
            ),
            Self::InvalidRangeMode { mode } => {
                write!(formatter, "{} is not a physical range mode", mode.as_str())
            }
            Self::SnapshotBeyondSource { snapshot, actual } => write!(
                formatter,
                "snapshot boundary {snapshot} exceeds current source size {actual}"
            ),
            Self::RangeExceedsSnapshot { end, snapshot } => {
                write!(formatter, "range end {end} exceeds snapshot {snapshot}")
            }
            Self::RangeNotAtLineBoundary { offset, boundary } => write!(
                formatter,
                "range {boundary} {offset} does not begin or end at a JSONL line boundary"
            ),
            Self::SegmentLimitExceeded { requested, max } => write!(
                formatter,
                "range length {requested} exceeds segment limit {max}"
            ),
            Self::ZeroLimit { name } => write!(formatter, "{name} must be greater than zero"),
        }
    }
}

impl std::error::Error for SourceReadPlanError {}

pub type ReadPlanResult<T> = std::result::Result<T, SourceReadPlanError>;

/// An immutable plan over one captured source boundary.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceReadPlan {
    source_spec: SourceSpec,
    mode: SourceReadMode,
    capabilities: SourceCapabilities,
    snapshot_boundary: SnapshotBoundary,
    byte_range: SourceByteRange,
}

impl SourceReadPlan {
    fn new(
        source_spec: &SourceSpec,
        mode: SourceReadMode,
        capabilities: SourceCapabilities,
        snapshot_boundary: SnapshotBoundary,
        byte_range: SourceByteRange,
    ) -> Self {
        Self {
            source_spec: source_spec
                .clone()
                .with_snapshot_boundary(snapshot_boundary),
            mode,
            capabilities,
            snapshot_boundary,
            byte_range,
        }
    }

    pub const fn mode(&self) -> SourceReadMode {
        self.mode
    }

    pub fn source_spec(&self) -> &SourceSpec {
        &self.source_spec
    }

    pub const fn capabilities(&self) -> SourceCapabilities {
        self.capabilities
    }

    pub const fn snapshot_boundary(&self) -> SnapshotBoundary {
        self.snapshot_boundary
    }

    pub const fn byte_range(&self) -> SourceByteRange {
        self.byte_range
    }

    pub fn read(
        &self,
        backend: &JsonlSourceBackend,
        visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    ) -> Result<PlannedReadReport> {
        backend.read_plan(self, visit)
    }
}

/// Diagnostics and the bounded source report produced by a plan execution.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlannedReadReport {
    mode: SourceReadMode,
    capabilities: SourceCapabilities,
    snapshot_boundary: SnapshotBoundary,
    scanned_range: SourceByteRange,
    complete_range: Option<SourceByteRange>,
    pending_tail_bytes: u64,
    source_grew_during_read: bool,
    source_shrank_during_read: bool,
    source_bytes_at_end: u64,
    source: SourceReadReport,
}

impl PlannedReadReport {
    pub const fn mode(&self) -> SourceReadMode {
        self.mode
    }

    pub const fn capabilities(&self) -> SourceCapabilities {
        self.capabilities
    }

    pub const fn snapshot_boundary(&self) -> SnapshotBoundary {
        self.snapshot_boundary
    }

    pub const fn scanned_range(&self) -> SourceByteRange {
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

    pub fn source(&self) -> &SourceReadReport {
        &self.source
    }
}

impl JsonlSourceBackend {
    pub fn capabilities(&self, spec: &SourceSpec) -> SourceCapabilities {
        spec.capabilities()
    }

    pub fn plan_full(&self, spec: &SourceSpec) -> ReadPlanResult<SourceReadPlan> {
        self.plan_forward_mode(spec, SourceReadMode::FullRead)
    }

    pub fn plan_forward(&self, spec: &SourceSpec) -> ReadPlanResult<SourceReadPlan> {
        self.plan_forward_mode(spec, SourceReadMode::ForwardStream)
    }

    pub fn plan_tail(&self, spec: &SourceSpec, tail_bytes: u64) -> ReadPlanResult<SourceReadPlan> {
        validate_common_limits(spec)?;
        let (snapshot, capabilities) = capture_snapshot(spec)?;
        ensure_mode_supported(spec, capabilities, SourceReadMode::TailPreview)?;
        validate_segment_request(spec, tail_bytes)?;

        let start_candidate = snapshot.byte_length().saturating_sub(tail_bytes);
        let start = previous_line_start(spec.path(), start_candidate)?;
        let range = SourceByteRange::new(start, snapshot.byte_length())?;
        validate_segment_range(spec, range)?;
        Ok(SourceReadPlan::new(
            spec,
            SourceReadMode::TailPreview,
            capabilities,
            snapshot,
            range,
        ))
    }

    pub fn plan_range(
        &self,
        spec: &SourceSpec,
        mode: SourceReadMode,
        range: SourceByteRange,
    ) -> ReadPlanResult<SourceReadPlan> {
        validate_common_limits(spec)?;
        if !matches!(
            mode,
            SourceReadMode::BackwardRange | SourceReadMode::ForwardRange
        ) {
            return Err(SourceReadPlanError::InvalidRangeMode { mode });
        }
        let (snapshot, capabilities) = capture_snapshot(spec)?;
        ensure_mode_supported(spec, capabilities, mode)?;
        if range.end() > snapshot.byte_length() {
            return Err(SourceReadPlanError::RangeExceedsSnapshot {
                end: range.end(),
                snapshot: snapshot.byte_length(),
            });
        }
        validate_segment_range(spec, range)?;
        validate_line_boundaries(spec.path(), snapshot.byte_length(), range)?;
        Ok(SourceReadPlan::new(
            spec,
            mode,
            capabilities,
            snapshot,
            range,
        ))
    }

    pub fn read_plan(
        &self,
        plan: &SourceReadPlan,
        visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    ) -> Result<PlannedReadReport> {
        let path = plan.source_spec().path();
        let metadata_before = std::fs::metadata(path)
            .with_context(|| format!("metadata before planned read {}", path.display()))?;
        if !metadata_before.is_file() {
            bail!("rollout path is not a file: {}", path.display());
        }

        let snapshot = plan.snapshot_boundary();
        let source = SourceReadReport {
            source_bytes: snapshot.byte_length(),
            ..SourceReadReport::default()
        };
        let actual_before = metadata_before.len();
        if actual_before < snapshot.byte_length() {
            let source_range = plan.byte_range();
            let clamped = source_range.start().min(actual_before);
            let empty_range =
                SourceByteRange::new(clamped, clamped).expect("clamped empty range is valid");
            let metadata_after = std::fs::metadata(path)
                .with_context(|| format!("metadata after planned read {}", path.display()))?;
            return Ok(PlannedReadReport {
                mode: plan.mode(),
                capabilities: plan.capabilities(),
                snapshot_boundary: snapshot,
                scanned_range: empty_range,
                complete_range: if plan.source_spec().compression() == SourceCompression::Zstd {
                    None
                } else {
                    Some(empty_range)
                },
                pending_tail_bytes: 0,
                source_grew_during_read: metadata_after.len() > snapshot.byte_length(),
                source_shrank_during_read: true,
                source_bytes_at_end: metadata_after.len(),
                source,
            });
        }

        let mut source = source;
        let scan = if plan.source_spec().compression() == SourceCompression::Zstd {
            read_zstd_plan(plan, &mut source, visit)?
        } else {
            read_plain_plan(plan, &mut source, visit)?
        };

        let metadata_after = std::fs::metadata(path)
            .with_context(|| format!("metadata after planned read {}", path.display()))?;
        let source_grew_during_read = metadata_after.len() > snapshot.byte_length();
        let source_shrank_during_read = metadata_after.len() < snapshot.byte_length();
        let scanned_range = SourceByteRange::new(plan.byte_range().start(), scan.scan_end)
            .expect("planned scan never moves backwards");
        let complete_range = if plan.source_spec().compression() == SourceCompression::Zstd {
            None
        } else {
            Some(
                SourceByteRange::new(plan.byte_range().start(), scan.complete_end)
                    .expect("complete range stays inside planned range"),
            )
        };

        Ok(PlannedReadReport {
            mode: plan.mode(),
            capabilities: plan.capabilities(),
            snapshot_boundary: snapshot,
            scanned_range,
            complete_range,
            pending_tail_bytes: scan.pending_tail_bytes,
            source_grew_during_read,
            source_shrank_during_read,
            source_bytes_at_end: metadata_after.len(),
            source,
        })
    }

    fn plan_forward_mode(
        &self,
        spec: &SourceSpec,
        mode: SourceReadMode,
    ) -> ReadPlanResult<SourceReadPlan> {
        validate_common_limits(spec)?;
        let (snapshot, capabilities) = capture_snapshot(spec)?;
        ensure_mode_supported(spec, capabilities, mode)?;
        Ok(SourceReadPlan::new(
            spec,
            mode,
            capabilities,
            snapshot,
            SourceByteRange::new(0, snapshot.byte_length())?,
        ))
    }
}

fn validate_common_limits(spec: &SourceSpec) -> ReadPlanResult<()> {
    if spec.max_decoded_bytes() == 0 {
        return Err(SourceReadPlanError::ZeroLimit {
            name: "max_decoded_bytes",
        });
    }
    if spec.max_line_bytes() == 0 {
        return Err(SourceReadPlanError::ZeroLimit {
            name: "max_line_bytes",
        });
    }
    Ok(())
}

fn validate_segment_request(spec: &SourceSpec, requested: u64) -> ReadPlanResult<()> {
    if spec.max_segment_bytes() == 0 {
        return Err(SourceReadPlanError::ZeroLimit {
            name: "max_segment_bytes",
        });
    }
    if requested == 0 {
        return Err(SourceReadPlanError::ZeroLimit { name: "tail_bytes" });
    }
    if requested > spec.max_segment_bytes() {
        return Err(SourceReadPlanError::SegmentLimitExceeded {
            requested,
            max: spec.max_segment_bytes(),
        });
    }
    Ok(())
}

fn validate_segment_range(spec: &SourceSpec, range: SourceByteRange) -> ReadPlanResult<()> {
    if spec.max_segment_bytes() == 0 {
        return Err(SourceReadPlanError::ZeroLimit {
            name: "max_segment_bytes",
        });
    }
    if range.len() > spec.max_segment_bytes() {
        return Err(SourceReadPlanError::SegmentLimitExceeded {
            requested: range.len(),
            max: spec.max_segment_bytes(),
        });
    }
    Ok(())
}

fn capture_snapshot(spec: &SourceSpec) -> ReadPlanResult<(SnapshotBoundary, SourceCapabilities)> {
    let metadata = std::fs::metadata(spec.path()).map_err(|error| SourceReadPlanError::Io {
        operation: format!("metadata for {}", spec.path().display()),
        message: error.to_string(),
    })?;
    if !metadata.is_file() {
        return Err(SourceReadPlanError::SourceNotFile {
            path: spec.path().display().to_string(),
        });
    }
    let snapshot = spec
        .snapshot_boundary()
        .unwrap_or_else(|| SnapshotBoundary::new(metadata.len()));
    if snapshot.byte_length() > metadata.len() {
        return Err(SourceReadPlanError::SnapshotBeyondSource {
            snapshot: snapshot.byte_length(),
            actual: metadata.len(),
        });
    }
    Ok((snapshot, spec.capabilities()))
}

fn ensure_mode_supported(
    spec: &SourceSpec,
    capabilities: SourceCapabilities,
    mode: SourceReadMode,
) -> ReadPlanResult<()> {
    if capabilities.supports_mode(mode) {
        return Ok(());
    }
    Err(SourceReadPlanError::UnsupportedMode {
        mode,
        compression: spec.compression(),
    })
}

fn validate_line_boundaries(
    path: &Path,
    snapshot: u64,
    range: SourceByteRange,
) -> ReadPlanResult<()> {
    if range.start() > 0 && !is_line_start(path, range.start())? {
        return Err(SourceReadPlanError::RangeNotAtLineBoundary {
            offset: range.start(),
            boundary: "start",
        });
    }
    if range.end() < snapshot && range.end() > 0 && !is_line_start(path, range.end())? {
        return Err(SourceReadPlanError::RangeNotAtLineBoundary {
            offset: range.end(),
            boundary: "end",
        });
    }
    Ok(())
}

fn is_line_start(path: &Path, offset: u64) -> ReadPlanResult<bool> {
    if offset == 0 {
        return Ok(true);
    }
    let mut file = open_file(path, "open source for line boundary")?;
    file.seek(SeekFrom::Start(offset - 1))
        .map_err(|error| io_error("seek source for line boundary", error))?;
    let mut byte = [0_u8; 1];
    file.read_exact(&mut byte)
        .map_err(|error| io_error("read source for line boundary", error))?;
    Ok(byte[0] == b'\n')
}

fn previous_line_start(path: &Path, candidate: u64) -> ReadPlanResult<u64> {
    if candidate == 0 {
        return Ok(0);
    }
    let mut file = open_file(path, "open source for tail boundary")?;
    let mut cursor = candidate;
    let mut buffer = vec![0_u8; IO_CHUNK_BYTES];
    while cursor > 0 {
        let start = cursor.saturating_sub(buffer.len() as u64);
        let length = usize::try_from(cursor - start).unwrap_or(buffer.len());
        file.seek(SeekFrom::Start(start))
            .map_err(|error| io_error("seek source for tail boundary", error))?;
        file.read_exact(&mut buffer[..length])
            .map_err(|error| io_error("read source for tail boundary", error))?;
        if let Some(index) = buffer[..length].iter().rposition(|byte| *byte == b'\n') {
            return Ok(start + index as u64 + 1);
        }
        cursor = start;
    }
    Ok(0)
}

fn count_newlines_before(file: &mut File, end: u64) -> Result<u64> {
    file.seek(SeekFrom::Start(0))
        .with_context(|| "seek source for physical ordinal")?;
    let mut remaining = end;
    let mut buffer = vec![0_u8; IO_CHUNK_BYTES];
    let mut count = 0_u64;
    while remaining > 0 {
        let requested = remaining.min(buffer.len() as u64) as usize;
        let read = file
            .read(&mut buffer[..requested])
            .with_context(|| "read source for physical ordinal")?;
        if read == 0 {
            bail!("source ended before planned range start {end}");
        }
        count = count
            .saturating_add(buffer[..read].iter().filter(|byte| **byte == b'\n').count() as u64);
        remaining -= read as u64;
    }
    Ok(count)
}

struct ScanOutcome {
    scan_end: u64,
    complete_end: u64,
    pending_tail_bytes: u64,
}

fn read_plain_plan(
    plan: &SourceReadPlan,
    source: &mut SourceReadReport,
    visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
) -> Result<ScanOutcome> {
    let spec = plan.source_spec();
    let range = plan.byte_range();
    let mut file = File::open(spec.path())
        .with_context(|| format!("open planned rollout {}", spec.path().display()))?;
    let starting_ordinal = count_newlines_before(&mut file, range.start())?;
    file.seek(SeekFrom::Start(range.start()))
        .with_context(|| "seek planned source range")?;

    let mut offset = range.start();
    let mut line_start = range.start();
    let mut complete_end = range.start();
    let mut physical_line_ordinal = starting_ordinal;
    let mut line_buffer = Vec::with_capacity(spec.max_line_bytes().min(4096));
    let mut buffer = vec![0_u8; IO_CHUNK_BYTES];

    while offset < range.end() {
        if source.decoded_bytes >= spec.max_decoded_bytes() {
            emit_source_limit_diagnostic(
                spec,
                source,
                visit,
                &mut physical_line_ordinal,
                line_start,
                offset,
            )?;
            return Ok(ScanOutcome {
                scan_end: offset,
                complete_end,
                pending_tail_bytes: offset.saturating_sub(complete_end),
            });
        }

        let requested = (range.end() - offset)
            .min(spec.max_decoded_bytes() - source.decoded_bytes)
            .min(buffer.len() as u64) as usize;
        let read = file
            .read(&mut buffer[..requested])
            .with_context(|| format!("read planned source range {}", spec.path().display()))?;
        if read == 0 {
            bail!(
                "source ended before planned range end {} at {}",
                range.end(),
                offset
            );
        }

        for byte in &buffer[..read] {
            if line_buffer.len() >= spec.max_line_bytes() {
                emit_line_limit_diagnostic(
                    spec,
                    source,
                    visit,
                    &mut physical_line_ordinal,
                    line_start,
                    offset,
                )?;
                return Ok(ScanOutcome {
                    scan_end: offset,
                    complete_end,
                    pending_tail_bytes: offset.saturating_sub(complete_end),
                });
            }

            offset += 1;
            source.decoded_bytes = source.decoded_bytes.saturating_add(1);

            if *byte == b'\n' {
                physical_line_ordinal = physical_line_ordinal.saturating_add(1);
                source.physical_line_count = source.physical_line_count.saturating_add(1);
                let line_end = offset;
                emit_complete_line(
                    spec,
                    &line_buffer,
                    line_start,
                    line_end,
                    physical_line_ordinal,
                    source,
                    visit,
                )?;
                line_buffer.clear();
                line_start = offset;
                complete_end = offset;
                continue;
            }

            line_buffer.push(*byte);
            if source.decoded_bytes >= spec.max_decoded_bytes() && offset < range.end() {
                let mut probe = [0_u8; 1];
                let probe_read = file.read(&mut probe).with_context(|| {
                    format!("probe planned source range {}", spec.path().display())
                })?;
                if probe_read == 0 {
                    let pending_tail_bytes = offset.saturating_sub(complete_end);
                    if pending_tail_bytes > 0 {
                        source.physical_line_count = source.physical_line_count.saturating_add(1);
                    }
                    return Ok(ScanOutcome {
                        scan_end: offset,
                        complete_end,
                        pending_tail_bytes,
                    });
                }

                if line_buffer.len() >= spec.max_line_bytes()
                    && spec.max_decoded_bytes() >= spec.max_line_bytes() as u64
                {
                    emit_line_limit_diagnostic(
                        spec,
                        source,
                        visit,
                        &mut physical_line_ordinal,
                        line_start,
                        offset,
                    )?;
                } else {
                    emit_source_limit_diagnostic(
                        spec,
                        source,
                        visit,
                        &mut physical_line_ordinal,
                        line_start,
                        offset,
                    )?;
                }
                return Ok(ScanOutcome {
                    scan_end: offset,
                    complete_end,
                    pending_tail_bytes: offset.saturating_sub(complete_end),
                });
            }
        }
    }

    let pending_tail_bytes = offset.saturating_sub(complete_end);
    if pending_tail_bytes > 0 {
        source.physical_line_count = source.physical_line_count.saturating_add(1);
    }
    Ok(ScanOutcome {
        scan_end: offset,
        complete_end,
        pending_tail_bytes,
    })
}

fn read_zstd_plan(
    plan: &SourceReadPlan,
    source: &mut SourceReadReport,
    visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
) -> Result<ScanOutcome> {
    let spec = plan.source_spec();
    let snapshot = plan.snapshot_boundary();
    let file = File::open(spec.path())
        .with_context(|| format!("open compressed rollout {}", spec.path().display()))?;
    let limited_file = file.take(snapshot.byte_length());
    let decoder = zstd::stream::read::Decoder::new(limited_file)
        .with_context(|| format!("decode compressed rollout {}", spec.path().display()))?;
    let mut reader = BufReader::new(decoder);
    let mut decoded_offset = 0_u64;
    let mut physical_line_ordinal = 0_u64;
    let mut complete_end = 0_u64;

    loop {
        let remaining_budget = spec
            .max_decoded_bytes()
            .saturating_sub(source.decoded_bytes);
        match read_strict_line(&mut reader, spec.max_line_bytes(), remaining_budget)? {
            StrictLine::End => break,
            StrictLine::Complete { bytes, len } => {
                let line_start = decoded_offset;
                decoded_offset = decoded_offset.saturating_add(len);
                source.decoded_bytes = source.decoded_bytes.saturating_add(len);
                physical_line_ordinal = physical_line_ordinal.saturating_add(1);
                source.physical_line_count = source.physical_line_count.saturating_add(1);
                emit_complete_line(
                    spec,
                    &bytes,
                    line_start,
                    decoded_offset,
                    physical_line_ordinal,
                    source,
                    visit,
                )?;
                complete_end = decoded_offset;
            }
            StrictLine::Pending { len } => {
                source.decoded_bytes = source.decoded_bytes.saturating_add(len);
                source.physical_line_count = source.physical_line_count.saturating_add(1);
                return Ok(ScanOutcome {
                    scan_end: snapshot.byte_length(),
                    complete_end,
                    pending_tail_bytes: len,
                });
            }
            StrictLine::Oversized { len } => {
                let line_start = decoded_offset;
                decoded_offset = decoded_offset.saturating_add(len);
                source.decoded_bytes = source.decoded_bytes.saturating_add(len);
                emit_line_limit_diagnostic(
                    spec,
                    source,
                    visit,
                    &mut physical_line_ordinal,
                    line_start,
                    decoded_offset,
                )?;
                return Ok(ScanOutcome {
                    scan_end: snapshot.byte_length(),
                    complete_end,
                    pending_tail_bytes: len,
                });
            }
            StrictLine::BudgetExceeded { len } => {
                let line_start = decoded_offset;
                decoded_offset = decoded_offset.saturating_add(len);
                source.decoded_bytes = source.decoded_bytes.saturating_add(len);
                emit_source_limit_diagnostic(
                    spec,
                    source,
                    visit,
                    &mut physical_line_ordinal,
                    line_start,
                    decoded_offset,
                )?;
                return Ok(ScanOutcome {
                    scan_end: snapshot.byte_length(),
                    complete_end,
                    pending_tail_bytes: decoded_offset.saturating_sub(complete_end),
                });
            }
        }
    }

    Ok(ScanOutcome {
        scan_end: snapshot.byte_length(),
        complete_end,
        pending_tail_bytes: 0,
    })
}

enum StrictLine {
    End,
    Complete { bytes: Vec<u8>, len: u64 },
    Pending { len: u64 },
    Oversized { len: u64 },
    BudgetExceeded { len: u64 },
}

fn read_strict_line<R: BufRead>(
    reader: &mut R,
    max_line_bytes: usize,
    remaining_budget_bytes: u64,
) -> io::Result<StrictLine> {
    let mut retained = Vec::with_capacity(max_line_bytes.min(4096));
    let mut consumed = 0_usize;
    loop {
        let buffer = reader.fill_buf()?;
        if buffer.is_empty() {
            return if consumed == 0 {
                Ok(StrictLine::End)
            } else {
                Ok(StrictLine::Pending {
                    len: consumed as u64,
                })
            };
        }

        let remaining_line = max_line_bytes.saturating_sub(consumed);
        let remaining_budget = usize::try_from(remaining_budget_bytes)
            .unwrap_or(usize::MAX)
            .saturating_sub(consumed);
        let allowed = buffer.len().min(remaining_line).min(remaining_budget);
        if allowed == 0 {
            if remaining_budget == 0 {
                return Ok(StrictLine::BudgetExceeded {
                    len: consumed as u64,
                });
            }
            return Ok(StrictLine::Oversized {
                len: consumed as u64,
            });
        }

        if let Some(position) = buffer[..allowed].iter().position(|byte| *byte == b'\n') {
            let take = position + 1;
            retained.extend_from_slice(&buffer[..take]);
            reader.consume(take);
            return Ok(StrictLine::Complete {
                bytes: retained,
                len: (consumed + take) as u64,
            });
        }

        retained.extend_from_slice(&buffer[..allowed]);
        reader.consume(allowed);
        consumed = consumed.saturating_add(allowed);
        if consumed as u64 >= remaining_budget_bytes {
            let next = reader.fill_buf()?;
            if next.is_empty() {
                return Ok(StrictLine::Pending {
                    len: consumed as u64,
                });
            }
            if consumed >= max_line_bytes && remaining_budget_bytes >= max_line_bytes as u64 {
                return Ok(StrictLine::Oversized {
                    len: consumed as u64,
                });
            }
            return Ok(StrictLine::BudgetExceeded {
                len: consumed as u64,
            });
        }
    }
}

fn emit_complete_line(
    spec: &SourceSpec,
    line: &[u8],
    byte_start: u64,
    byte_end: u64,
    physical_line_ordinal: u64,
    source: &mut SourceReadReport,
    visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
) -> Result<()> {
    let line = trim_line_ending(line);
    if line.iter().all(u8::is_ascii_whitespace) {
        source.blank_line_count = source.blank_line_count.saturating_add(1);
        return Ok(());
    }

    let (raw, parse_error) = match serde_json::from_slice::<Value>(line) {
        Ok(value) => (Some(value), None),
        Err(error) => (None, Some(format!("malformed_json: {error}"))),
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
    if parse_gap {
        source.parse_gap_count = source.parse_gap_count.saturating_add(1);
    } else {
        source.valid_record_count = source.valid_record_count.saturating_add(1);
    }
    visit(SourceRecord {
        source_identity: spec.source_identity().to_string(),
        byte_start,
        byte_end,
        physical_line_ordinal,
        rollout_ordinal,
        timestamp,
        raw,
        parse_error,
    })
}

fn emit_line_limit_diagnostic(
    spec: &SourceSpec,
    source: &mut SourceReadReport,
    visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    physical_line_ordinal: &mut u64,
    byte_start: u64,
    byte_end: u64,
) -> Result<()> {
    source.budget_exceeded = true;
    *physical_line_ordinal = physical_line_ordinal.saturating_add(1);
    source.physical_line_count = source.physical_line_count.saturating_add(1);
    source.parse_gap_count = source.parse_gap_count.saturating_add(1);
    visit(SourceRecord {
        source_identity: spec.source_identity().to_string(),
        byte_start,
        byte_end,
        physical_line_ordinal: *physical_line_ordinal,
        rollout_ordinal: None,
        timestamp: None,
        raw: None,
        parse_error: Some("line_exceeds_limit".to_string()),
    })
}

fn emit_source_limit_diagnostic(
    spec: &SourceSpec,
    source: &mut SourceReadReport,
    visit: &mut dyn FnMut(SourceRecord) -> Result<()>,
    physical_line_ordinal: &mut u64,
    byte_start: u64,
    byte_end: u64,
) -> Result<()> {
    source.budget_exceeded = true;
    *physical_line_ordinal = physical_line_ordinal.saturating_add(1);
    source.physical_line_count = source.physical_line_count.saturating_add(1);
    source.parse_gap_count = source.parse_gap_count.saturating_add(1);
    visit(SourceRecord {
        source_identity: spec.source_identity().to_string(),
        byte_start,
        byte_end,
        physical_line_ordinal: *physical_line_ordinal,
        rollout_ordinal: None,
        timestamp: None,
        raw: None,
        parse_error: Some("source_limit_exceeded".to_string()),
    })
}

fn trim_line_ending(line: &[u8]) -> &[u8] {
    line.strip_suffix(b"\n")
        .unwrap_or(line)
        .strip_suffix(b"\r")
        .unwrap_or_else(|| line.strip_suffix(b"\n").unwrap_or(line))
}

fn open_file(path: &Path, operation: &str) -> ReadPlanResult<File> {
    File::open(path).map_err(|error| io_error(operation, error))
}

fn io_error(operation: &str, error: io::Error) -> SourceReadPlanError {
    SourceReadPlanError::Io {
        operation: operation.to_string(),
        message: error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        io::Write,
        path::PathBuf,
        sync::atomic::{AtomicU64, Ordering},
    };

    use super::*;
    use crate::source::SourceBackend;

    static NEXT_TEMP_ID: AtomicU64 = AtomicU64::new(0);

    struct TempSource {
        path: PathBuf,
    }

    impl TempSource {
        fn new(extension: &str, bytes: &[u8]) -> Self {
            let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
            let mut path = std::env::temp_dir();
            path.push(format!(
                "termlink-rollout-read-plan-{}-{}.{}",
                std::process::id(),
                id,
                extension
            ));
            fs::write(&path, bytes).expect("write temporary source");
            Self { path }
        }

        fn append(&self, bytes: &[u8]) {
            let mut file = fs::OpenOptions::new()
                .append(true)
                .open(&self.path)
                .expect("open temporary source for append");
            file.write_all(bytes).expect("append temporary source");
        }
    }

    impl Drop for TempSource {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    fn record(ordinal: u64) -> Vec<u8> {
        format!("{{\"timestamp\":\"t-{ordinal}\",\"ordinal\":{ordinal},\"type\":\"event_msg\"}}\n")
            .into_bytes()
    }

    #[test]
    fn capabilities_keep_plain_jsonl_random_access_and_zstd_forward_only() {
        let plain = SourceSpec::new("rollout.jsonl").capabilities();
        assert!(plain.forward_stream);
        assert!(plain.tail_preview);
        assert!(plain.backward_segments);
        assert!(plain.append);
        assert!(plain.random_seek);

        let compressed = SourceSpec::new("rollout.jsonl.zst").capabilities();
        assert!(compressed.forward_stream);
        assert!(!compressed.tail_preview);
        assert!(!compressed.backward_segments);
        assert!(!compressed.append);
        assert!(!compressed.random_seek);
    }

    #[test]
    fn full_plan_submits_only_complete_lines_and_reports_growth() {
        let first = record(1);
        let pending = br#"{"timestamp":"t-2","ordinal":2,"type":"event_msg"}"#;
        let initial = [first.clone(), pending.to_vec()].concat();
        let source = TempSource::new("jsonl", &initial);
        let spec = SourceSpec::new(source.path.clone());
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("full plan");

        let third = record(3);
        let mut appended = vec![b'\n'];
        appended.extend_from_slice(&third);
        let mut append_after_first = Some(appended);
        let mut records = Vec::new();
        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                if let Some(bytes) = append_after_first.take() {
                    source.append(&bytes);
                }
                Ok(())
            })
            .expect("planned read");

        assert_eq!(records.len(), 1);
        assert_eq!(records[0].physical_line_ordinal, 1);
        assert_eq!(records[0].byte_end, first.len() as u64);
        assert_eq!(
            report.snapshot_boundary().byte_length(),
            initial.len() as u64
        );
        assert_eq!(report.pending_tail_bytes(), pending.len() as u64);
        assert!(report.source_grew_during_read());
        assert_eq!(
            report.complete_range().expect("plain complete range").end(),
            first.len() as u64
        );
        assert_eq!(report.source().valid_record_count, 1);
    }

    #[test]
    fn plain_exact_line_limit_unterminated_tail_remains_pending() {
        let source = TempSource::new("jsonl", b"{}");
        let spec = SourceSpec::new(source.path.clone()).with_limits(2, 2);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("plain full plan");
        let mut records = Vec::new();

        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("plain planned read");

        assert!(records.is_empty());
        assert_eq!(report.pending_tail_bytes(), 2);
        assert_eq!(
            report.complete_range().expect("plain complete range").len(),
            0
        );
    }

    #[test]
    fn plain_equal_line_and_source_limit_matches_legacy_line_diagnostic() {
        let source = TempSource::new("jsonl", b"{}\n");
        let spec = SourceSpec::new(source.path.clone()).with_limits(2, 2);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("plain full plan");
        let mut planned_records = Vec::new();
        let planned_report = backend
            .read_plan(&plan, &mut |item| {
                planned_records.push(item);
                Ok(())
            })
            .expect("plain planned read");

        let mut legacy_records = Vec::new();
        let legacy_report = backend
            .read(&spec, &mut |item| {
                legacy_records.push(item);
                Ok(())
            })
            .expect("plain legacy read");

        assert_eq!(planned_records.len(), 1);
        assert_eq!(legacy_records.len(), 1);
        assert_eq!(
            planned_records[0].parse_error.as_deref(),
            Some("line_exceeds_limit")
        );
        assert_eq!(
            planned_records[0].parse_error,
            legacy_records[0].parse_error
        );
        assert_eq!(planned_records[0].byte_start, 0);
        assert_eq!(planned_records[0].byte_end, 2);
        assert_eq!(planned_records[0].byte_end, legacy_records[0].byte_end);
        assert_eq!(planned_report.scanned_range().end(), 2);
        assert_eq!(planned_report.pending_tail_bytes(), 2);
        assert_eq!(
            planned_report.source().decoded_bytes,
            legacy_report.decoded_bytes
        );
        assert!(planned_report.source().budget_exceeded);
        assert!(legacy_report.budget_exceeded);
    }

    #[test]
    fn tail_plan_aligns_to_a_complete_line_and_preserves_global_ordinals() {
        let first = record(1);
        let second = record(2);
        let third = record(3);
        let bytes = [first.clone(), second.clone(), third.clone()].concat();
        let source = TempSource::new("jsonl", &bytes);
        let spec = SourceSpec::new(source.path.clone());
        let backend = JsonlSourceBackend;
        let tail_bytes = (third.len() + second.len() / 2) as u64;
        let plan = backend.plan_tail(&spec, tail_bytes).expect("tail plan");
        let mut records = Vec::new();
        let report = plan
            .read(&backend, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("tail read");

        assert_eq!(records.len(), 2);
        assert_eq!(records[0].physical_line_ordinal, 2);
        assert_eq!(records[1].physical_line_ordinal, 3);
        assert_eq!(plan.byte_range().start(), first.len() as u64);
        assert_eq!(report.pending_tail_bytes(), 0);
        assert_eq!(
            report.complete_range().expect("complete tail").start(),
            plan.byte_range().start()
        );
    }

    #[test]
    fn range_plan_rejects_split_boundaries_and_segment_overflow() {
        let first = record(1);
        let second = record(2);
        let bytes = [first.clone(), second].concat();
        let source = TempSource::new("jsonl", &bytes);
        let backend = JsonlSourceBackend;
        let spec = SourceSpec::new(source.path.clone());
        let split = SourceByteRange::new(1, bytes.len() as u64).expect("range shape");
        assert!(matches!(
            backend.plan_range(&spec, SourceReadMode::ForwardRange, split),
            Err(SourceReadPlanError::RangeNotAtLineBoundary {
                boundary: "start",
                ..
            })
        ));

        let limited = SourceSpec::new(source.path.clone()).with_segment_limit(2);
        let whole = SourceByteRange::new(0, bytes.len() as u64).expect("range shape");
        assert!(matches!(
            backend.plan_range(&limited, SourceReadMode::ForwardRange, whole),
            Err(SourceReadPlanError::SegmentLimitExceeded { .. })
        ));

        let first_end = first.len() as u64;
        let valid = SourceByteRange::new(first_end, bytes.len() as u64).expect("range shape");
        let plan = backend
            .plan_range(&spec, SourceReadMode::ForwardRange, valid)
            .expect("line-aligned range");
        let mut records = Vec::new();
        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("range read");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].physical_line_ordinal, 2);
        assert_eq!(
            report.complete_range().expect("complete range").start(),
            first_end
        );
    }

    #[test]
    fn zstd_plan_is_strict_and_rejects_tail_and_range_modes() {
        let first = record(1);
        let second = br#"{"ordinal":2,"type":"event_msg"}"#.to_vec();
        let plain = [first.clone(), second.clone()].concat();
        let compressed = zstd::stream::encode_all(plain.as_slice(), 1).expect("compress fixture");
        let source = TempSource::new("jsonl.zst", &compressed);
        let spec = SourceSpec::new(source.path.clone());
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("zstd forward plan");
        let mut records = Vec::new();
        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("zstd planned read");

        assert_eq!(records.len(), 1);
        assert!(report.complete_range().is_none());
        assert_eq!(report.pending_tail_bytes(), second.len() as u64);
        assert!(matches!(
            backend.plan_tail(&spec, 16),
            Err(SourceReadPlanError::UnsupportedMode { .. })
        ));
        let range = SourceByteRange::new(0, compressed.len() as u64).expect("range shape");
        assert!(matches!(
            backend.plan_range(&spec, SourceReadMode::ForwardRange, range),
            Err(SourceReadPlanError::UnsupportedMode { .. })
        ));
    }

    #[test]
    fn zstd_exact_line_limit_unterminated_tail_remains_pending() {
        let compressed = zstd::stream::encode_all(b"{}".as_slice(), 1).expect("compress fixture");
        let source = TempSource::new("jsonl.zst", &compressed);
        let spec = SourceSpec::new(source.path.clone()).with_limits(2, 2);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("zstd full plan");
        let mut records = Vec::new();

        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("zstd planned read");

        assert!(records.is_empty());
        assert_eq!(report.pending_tail_bytes(), 2);
        assert!(report.complete_range().is_none());
    }

    #[test]
    fn zstd_equal_line_and_source_limit_matches_legacy_line_diagnostic() {
        let compressed = zstd::stream::encode_all(b"{}\n".as_slice(), 1).expect("compress fixture");
        let source = TempSource::new("jsonl.zst", &compressed);
        let spec = SourceSpec::new(source.path.clone()).with_limits(2, 2);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("zstd full plan");
        let mut planned_records = Vec::new();
        let planned_report = backend
            .read_plan(&plan, &mut |item| {
                planned_records.push(item);
                Ok(())
            })
            .expect("zstd planned read");

        let mut legacy_records = Vec::new();
        let legacy_report = backend
            .read(&spec, &mut |item| {
                legacy_records.push(item);
                Ok(())
            })
            .expect("zstd legacy read");

        assert_eq!(planned_records.len(), 1);
        assert_eq!(legacy_records.len(), 1);
        assert_eq!(
            planned_records[0].parse_error.as_deref(),
            Some("line_exceeds_limit")
        );
        assert_eq!(
            planned_records[0].parse_error,
            legacy_records[0].parse_error
        );
        assert_eq!(planned_records[0].byte_start, 0);
        assert_eq!(planned_records[0].byte_end, 2);
        assert_eq!(planned_records[0].byte_end, legacy_records[0].byte_end);
        assert_eq!(
            planned_report.source().decoded_bytes,
            legacy_report.decoded_bytes
        );
        assert!(planned_report.source().budget_exceeded);
        assert!(legacy_report.budget_exceeded);
    }

    #[test]
    fn planned_line_and_source_limits_are_reported_without_partial_records() {
        let source = TempSource::new("jsonl", b"abcdef\n{}\n");
        let backend = JsonlSourceBackend;
        let line_limited = SourceSpec::new(source.path.clone()).with_limits(1024, 3);
        let plan = backend.plan_full(&line_limited).expect("line-limited plan");
        let mut records = Vec::new();
        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("line-limited read");
        assert_eq!(records.len(), 1);
        assert_eq!(
            records[0].parse_error.as_deref(),
            Some("line_exceeds_limit")
        );
        assert_eq!(report.complete_range().expect("complete range").len(), 0);

        let source_limited = SourceSpec::new(source.path.clone()).with_limits(2, 1024);
        let plan = backend
            .plan_full(&source_limited)
            .expect("source-limited plan");
        let mut records = Vec::new();
        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("source-limited read");
        assert!(report.source().budget_exceeded);
        assert_eq!(records.len(), 1);
        assert_eq!(
            records[0].parse_error.as_deref(),
            Some("source_limit_exceeded")
        );
    }

    #[test]
    fn plain_overlong_line_keeps_legacy_bounded_range() {
        let source = TempSource::new("jsonl", b"abc\n");
        let spec = SourceSpec::new(source.path.clone()).with_limits(1024, 3);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("plain full plan");
        let mut planned_records = Vec::new();
        let planned_report = backend
            .read_plan(&plan, &mut |item| {
                planned_records.push(item);
                Ok(())
            })
            .expect("plain planned read");

        let mut legacy_records = Vec::new();
        let legacy_report = backend
            .read(&spec, &mut |item| {
                legacy_records.push(item);
                Ok(())
            })
            .expect("plain legacy read");

        assert_eq!(planned_records.len(), 1);
        assert_eq!(legacy_records.len(), 1);
        assert_eq!(
            planned_records[0].parse_error,
            legacy_records[0].parse_error
        );
        assert_eq!(planned_records[0].byte_start, 0);
        assert_eq!(planned_records[0].byte_end, 3);
        assert_eq!(planned_records[0].byte_end, legacy_records[0].byte_end);
        assert_eq!(planned_report.scanned_range().end(), 3);
        assert_eq!(
            planned_report.source().decoded_bytes,
            legacy_report.decoded_bytes
        );
    }

    #[test]
    fn plain_overlong_line_keeps_boundary_across_io_chunks() {
        let max_line_bytes = IO_CHUNK_BYTES + 5;
        let mut bytes = vec![b'a'; max_line_bytes];
        bytes.push(b'\n');
        let source = TempSource::new("jsonl", &bytes);
        let spec = SourceSpec::new(source.path.clone()).with_limits(1024 * 1024, max_line_bytes);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("plain full plan");
        let mut records = Vec::new();
        let report = backend
            .read_plan(&plan, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("plain planned read");

        assert_eq!(records.len(), 1);
        assert_eq!(
            records[0].parse_error.as_deref(),
            Some("line_exceeds_limit")
        );
        assert_eq!(records[0].byte_start, 0);
        assert_eq!(records[0].byte_end, max_line_bytes as u64);
        assert_eq!(report.scanned_range().end(), max_line_bytes as u64);
        assert_eq!(report.source().decoded_bytes, max_line_bytes as u64);
    }

    #[test]
    fn zstd_stricter_source_limit_wins_after_exact_budget_probe() {
        let compressed = zstd::stream::encode_all(b"{}\n".as_slice(), 1).expect("compress fixture");
        let source = TempSource::new("jsonl.zst", &compressed);
        let spec = SourceSpec::new(source.path.clone()).with_limits(1, 2);
        let backend = JsonlSourceBackend;
        let plan = backend.plan_full(&spec).expect("zstd full plan");
        let mut planned_records = Vec::new();
        let planned_report = backend
            .read_plan(&plan, &mut |item| {
                planned_records.push(item);
                Ok(())
            })
            .expect("zstd planned read");

        assert_eq!(planned_records.len(), 1);
        assert_eq!(
            planned_records[0].parse_error.as_deref(),
            Some("source_limit_exceeded")
        );
        assert!(planned_report.source().budget_exceeded);
        assert_eq!(planned_records[0].byte_end, 1);
    }

    #[test]
    fn legacy_full_read_keeps_unterminated_line_compatibility() {
        let mut bytes = record(1);
        bytes.pop();
        let source = TempSource::new("jsonl", &bytes);
        let spec = SourceSpec::new(source.path.clone());
        let mut records = Vec::new();
        let report = JsonlSourceBackend
            .read(&spec, &mut |item| {
                records.push(item);
                Ok(())
            })
            .expect("legacy full read");
        assert_eq!(records.len(), 1);
        assert_eq!(report.valid_record_count, 1);
    }
}
