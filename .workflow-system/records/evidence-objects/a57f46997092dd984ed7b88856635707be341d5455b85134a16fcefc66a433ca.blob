//! Parser backend adapter used by the Demo A/B validation.
//!
//! The Demo reducer deliberately consumes only the Demo reader's
//! `ParsedRolloutLine`.  The Spike uses a different Codex checkout and must
//! not leak its Rust types into this crate.  The Spike backend is therefore a
//! small process adapter: it consumes the Spike's diagnostic JSONL one record
//! at a time and converts each serialized Codex line into the Demo baseline
//! type.

use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, ErrorKind};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

use anyhow::{Context, Result};
use serde::Deserialize;
use serde_json::Value;

use crate::reader::{
    AppendReadResult, ParsedRolloutLine, ParsedRolloutSegment, ReadStats, TailSegment,
};

const MIB: u64 = 1024 * 1024;
static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParserBackend {
    Demo,
    Spike,
}

impl ParserBackend {
    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "demo" => Ok(Self::Demo),
            "spike" => Ok(Self::Spike),
            other => anyhow::bail!("unsupported --parser {other}; expected demo or spike"),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Demo => "demo",
            Self::Spike => "spike",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ParserConfig {
    pub backend: ParserBackend,
    pub spike_binary: Option<PathBuf>,
}

impl Default for ParserConfig {
    fn default() -> Self {
        Self {
            backend: ParserBackend::Demo,
            spike_binary: None,
        }
    }
}

#[derive(Debug, Deserialize)]
struct SpikeRecord {
    #[serde(default)]
    source: SpikeSource,
    rollout: Value,
}

#[derive(Debug, Default, Deserialize)]
struct SpikeSource {
    physical_ordinal: u64,
    rollout_ordinal: Option<u64>,
    #[serde(default)]
    segment_start_offset: Option<u64>,
    #[serde(default)]
    segment_end_offset: Option<u64>,
}

#[derive(Debug, Default, Deserialize)]
struct SpikeReport {
    source_bytes: u64,
    decoded_bytes: u64,
    line_count: u64,
    segments: u64,
    parse_errors: u64,
    last_source_ordinal: Option<u64>,
    first_parse_error: Option<String>,
    pending_tail_bytes: u64,
    scanned_end_offset: Option<u64>,
    complete_end_offset: Option<u64>,
    source_grew_during_read: bool,
    segment_start_offset: Option<u64>,
    segment_end_offset: Option<u64>,
    #[serde(default)]
    unmapped_types: BTreeMap<String, u64>,
    #[serde(default)]
    item_kinds: BTreeMap<String, u64>,
    #[serde(default)]
    event_payload_types: BTreeMap<String, u64>,
}

struct SpikeInvocation {
    output_path: PathBuf,
    report: SpikeReport,
}

impl Drop for SpikeInvocation {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.output_path);
    }
}

struct AdaptedRecord {
    line: ParsedRolloutLine,
    segment_range: Option<(u64, u64)>,
}

pub async fn read_full(
    config: &ParserConfig,
    path: &Path,
    max_decoded_bytes: u64,
) -> Result<(Vec<ParsedRolloutLine>, ReadStats)> {
    let mut lines = Vec::new();
    let stats = read_streaming(config, path, max_decoded_bytes, |line| {
        lines.push(line);
        Ok(())
    })
    .await?;
    Ok((lines, stats))
}

pub async fn read_streaming<F>(
    config: &ParserConfig,
    path: &Path,
    max_decoded_bytes: u64,
    mut visit: F,
) -> Result<ReadStats>
where
    F: FnMut(ParsedRolloutLine) -> Result<()>,
{
    match config.backend {
        ParserBackend::Demo => crate::reader::read_streaming(path, max_decoded_bytes, visit).await,
        ParserBackend::Spike => {
            let invocation = invoke_spike(
                config,
                path,
                "stream",
                None,
                None,
                0,
                max_decoded_bytes,
                2 * MIB,
            )?;
            let stats = stats_from_report(&invocation.report, max_decoded_bytes);
            let (stats, _) = consume_records(invocation, stats, |record| visit(record.line))?;
            Ok(stats)
        }
    }
}

pub async fn read_tail_segment(
    config: &ParserConfig,
    path: &Path,
    max_decoded_bytes: u64,
    segment_bytes: u64,
) -> Result<Option<TailSegment>> {
    match config.backend {
        ParserBackend::Demo => {
            crate::reader::read_tail_segment(path, max_decoded_bytes, segment_bytes).await
        }
        ParserBackend::Spike => {
            if is_compressed_rollout(path) {
                return Ok(None);
            }
            let invocation = invoke_spike(
                config,
                path,
                "tail",
                None,
                None,
                0,
                max_decoded_bytes,
                segment_bytes,
            )?;
            let start_offset = invocation.report.segment_start_offset;
            let end_offset = invocation.report.segment_end_offset;
            let stats = stats_from_report(&invocation.report, max_decoded_bytes);
            let (stats, records) = collect_records(invocation, stats)?;
            let start_offset = start_offset
                .or_else(|| {
                    records
                        .iter()
                        .find_map(|record| record.segment_range.map(|r| r.0))
                })
                .unwrap_or(0);
            let end_offset = end_offset
                .or_else(|| {
                    records
                        .iter()
                        .find_map(|record| record.segment_range.map(|r| r.1))
                })
                .unwrap_or(start_offset);
            let lines = records.into_iter().map(|record| record.line).collect();
            Ok(Some(TailSegment {
                segment: ParsedRolloutSegment {
                    start_offset,
                    end_offset,
                    lines,
                },
                stats,
            }))
        }
    }
}

pub async fn read_backward_range<F>(
    config: &ParserConfig,
    path: &Path,
    end_offset: u64,
    max_decoded_bytes: u64,
    segment_bytes: u64,
    visit: F,
) -> Result<Option<ReadStats>>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    match config.backend {
        ParserBackend::Demo => {
            crate::reader::read_backward_range(
                path,
                end_offset,
                max_decoded_bytes,
                segment_bytes,
                visit,
            )
            .await
        }
        ParserBackend::Spike => {
            let invocation = invoke_spike(
                config,
                path,
                "backward",
                Some(end_offset),
                None,
                0,
                max_decoded_bytes,
                segment_bytes,
            )?;
            let stats = stats_from_report(&invocation.report, max_decoded_bytes);
            let (stats, _) = consume_segmented_records(invocation, stats, visit)?;
            Ok(Some(stats))
        }
    }
}

pub async fn read_forward_range<F>(
    config: &ParserConfig,
    path: &Path,
    end_offset: u64,
    max_decoded_bytes: u64,
    segment_bytes: u64,
    visit: F,
) -> Result<ReadStats>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    match config.backend {
        ParserBackend::Demo => {
            crate::reader::read_forward_range(
                path,
                end_offset,
                max_decoded_bytes,
                segment_bytes,
                visit,
            )
            .await
        }
        ParserBackend::Spike => {
            let invocation = invoke_spike(
                config,
                path,
                "forward",
                Some(end_offset),
                None,
                0,
                max_decoded_bytes,
                segment_bytes,
            )?;
            let stats = stats_from_report(&invocation.report, max_decoded_bytes);
            let (stats, _) = consume_segmented_records(invocation, stats, visit)?;
            Ok(stats)
        }
    }
}

pub async fn read_append_range<F>(
    config: &ParserConfig,
    path: &Path,
    start_offset: u64,
    start_source_ordinal: u64,
    max_decoded_bytes: u64,
    segment_bytes: u64,
    visit: F,
) -> Result<AppendReadResult>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    match config.backend {
        ParserBackend::Demo => {
            crate::reader::read_append_range(
                path,
                start_offset,
                start_source_ordinal,
                max_decoded_bytes,
                segment_bytes,
                visit,
            )
            .await
        }
        ParserBackend::Spike => {
            let invocation = invoke_spike(
                config,
                path,
                "append",
                None,
                Some(start_offset),
                start_source_ordinal,
                max_decoded_bytes,
                segment_bytes,
            )?;
            let report = &invocation.report;
            let scanned_end_offset = report.scanned_end_offset.unwrap_or(report.source_bytes);
            let complete_end_offset = report.complete_end_offset.unwrap_or(scanned_end_offset);
            let pending_tail_bytes = report.pending_tail_bytes;
            let source_grew_during_read = report.source_grew_during_read;
            let last_source_ordinal = report.last_source_ordinal.unwrap_or(start_source_ordinal);
            let stats = stats_from_report(&invocation.report, max_decoded_bytes);
            let (stats, last_rollout_ordinal) =
                consume_segmented_records(invocation, stats, visit)?;
            Ok(AppendReadResult {
                stats,
                scanned_end_offset,
                complete_end_offset,
                pending_tail_bytes,
                last_source_ordinal,
                last_rollout_ordinal,
                source_grew_during_read,
            })
        }
    }
}

fn stats_from_report(report: &SpikeReport, budget_bytes: u64) -> ReadStats {
    ReadStats {
        bytes: report.source_bytes,
        decoded_bytes: report.decoded_bytes,
        budget_bytes,
        line_count: report.line_count,
        valid_records: 0,
        segments: report.segments,
        last_source_ordinal: report.last_source_ordinal,
        parse_errors: report.parse_errors,
        unmapped_types: report.unmapped_types.clone(),
        item_kinds: report.item_kinds.clone(),
        event_payload_types: report.event_payload_types.clone(),
        first_parse_error: report.first_parse_error.clone(),
    }
}

fn invoke_spike(
    config: &ParserConfig,
    path: &Path,
    mode: &str,
    end_offset: Option<u64>,
    start_offset: Option<u64>,
    start_ordinal: u64,
    max_input_bytes: u64,
    segment_bytes: u64,
) -> Result<SpikeInvocation> {
    let binary = resolve_spike_binary(config)?;
    let output_path = reserve_temp_output()?;
    let max_input_mib = max_input_bytes.max(1).div_ceil(MIB);
    let segment_mib = segment_bytes.max(1).div_ceil(MIB);

    let mut command = Command::new(&binary);
    command
        .arg("--rollout")
        .arg(path)
        .arg("--output")
        .arg(&output_path)
        .arg("--mode")
        .arg(mode)
        .arg("--max-input-mib")
        .arg(max_input_mib.to_string())
        .arg("--segment-mib")
        .arg(segment_mib.to_string())
        .arg("--start-ordinal")
        .arg(start_ordinal.to_string());
    if let Some(end_offset) = end_offset {
        command.arg("--end-offset").arg(end_offset.to_string());
    }
    if let Some(start_offset) = start_offset {
        command.arg("--start-offset").arg(start_offset.to_string());
    }

    let output = command.output().with_context(|| {
        format!(
            "run Spike parser {} for {}",
            binary.display(),
            path.display()
        )
    })?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        anyhow::bail!(
            "Spike parser failed with {}; stdout: {}; stderr: {}",
            output.status,
            truncate(&stdout, 2_000),
            truncate(&stderr, 2_000)
        );
    }
    let report = serde_json::from_slice::<SpikeReport>(&output.stdout).with_context(|| {
        format!(
            "decode Spike parser report for {}; stdout: {}",
            path.display(),
            truncate(&String::from_utf8_lossy(&output.stdout), 2_000)
        )
    })?;
    Ok(SpikeInvocation {
        output_path,
        report,
    })
}

fn consume_records<F>(
    invocation: SpikeInvocation,
    mut stats: ReadStats,
    mut visit: F,
) -> Result<(ReadStats, Option<u64>)>
where
    F: FnMut(AdaptedRecord) -> Result<()>,
{
    let file = File::open(&invocation.output_path)
        .with_context(|| format!("open Spike output {}", invocation.output_path.display()))?;
    let reader = BufReader::new(file);
    let mut last_rollout_ordinal = None;
    for (index, raw) in reader.lines().enumerate() {
        let raw = raw.with_context(|| {
            format!(
                "read Spike output line {} from {}",
                index + 1,
                invocation.output_path.display()
            )
        })?;
        let record = serde_json::from_str::<SpikeRecord>(&raw).with_context(|| {
            format!(
                "decode Spike output line {} from {}",
                index + 1,
                invocation.output_path.display()
            )
        })?;
        let physical_ordinal = record.source.physical_ordinal;
        let rollout_ordinal = record.source.rollout_ordinal;
        match crate::wire::parse_rollout_line(record.rollout) {
            Ok(line) => {
                stats.valid_records += 1;
                if rollout_ordinal.is_some() {
                    last_rollout_ordinal = rollout_ordinal;
                }
                let segment_range = match (
                    record.source.segment_start_offset,
                    record.source.segment_end_offset,
                ) {
                    (Some(start), Some(end)) => Some((start, end)),
                    _ => None,
                };
                visit(AdaptedRecord {
                    line: ParsedRolloutLine {
                        source_ordinal: physical_ordinal,
                        rollout_ordinal,
                        line,
                    },
                    segment_range,
                })?;
            }
            Err(error) => {
                stats.parse_errors += 1;
                remember_first_error(
                    &mut stats,
                    format!(
                        "Spike record {} cannot adapt to TermLink wire model: {}",
                        physical_ordinal,
                        truncate(&error.to_string(), 300)
                    ),
                );
            }
        }
    }
    Ok((stats, last_rollout_ordinal))
}

fn collect_records(
    invocation: SpikeInvocation,
    stats: ReadStats,
) -> Result<(ReadStats, Vec<AdaptedRecord>)> {
    let mut records = Vec::new();
    let (stats, _) = consume_records(invocation, stats, |record| {
        records.push(record);
        Ok(())
    })?;
    Ok((stats, records))
}

fn consume_segmented_records<F>(
    invocation: SpikeInvocation,
    stats: ReadStats,
    mut visit: F,
) -> Result<(ReadStats, Option<u64>)>
where
    F: FnMut(ParsedRolloutSegment) -> Result<()>,
{
    let mut pending_range: Option<(u64, u64)> = None;
    let mut pending_lines = Vec::new();
    let mut last_rollout_ordinal = None;
    let (stats, _) = consume_records(invocation, stats, |record| {
        last_rollout_ordinal = record.line.rollout_ordinal.or(last_rollout_ordinal);
        let Some(range) = record.segment_range else {
            if !pending_lines.is_empty() {
                visit(ParsedRolloutSegment {
                    start_offset: pending_range.map_or(0, |value| value.0),
                    end_offset: pending_range.map_or(0, |value| value.1),
                    lines: std::mem::take(&mut pending_lines),
                })?;
                pending_range = None;
            }
            return visit(ParsedRolloutSegment {
                start_offset: 0,
                end_offset: 0,
                lines: vec![record.line],
            });
        };
        if pending_range != Some(range) && !pending_lines.is_empty() {
            visit(ParsedRolloutSegment {
                start_offset: pending_range.map_or(0, |value| value.0),
                end_offset: pending_range.map_or(0, |value| value.1),
                lines: std::mem::take(&mut pending_lines),
            })?;
        }
        pending_range = Some(range);
        pending_lines.push(record.line);
        Ok(())
    })?;
    if !pending_lines.is_empty() {
        visit(ParsedRolloutSegment {
            start_offset: pending_range.map_or(0, |value| value.0),
            end_offset: pending_range.map_or(0, |value| value.1),
            lines: pending_lines,
        })?;
    }
    Ok((stats, last_rollout_ordinal))
}

fn resolve_spike_binary(config: &ParserConfig) -> Result<PathBuf> {
    if let Some(path) = &config.spike_binary {
        if path.is_file() {
            return Ok(path.clone());
        }
        anyhow::bail!("configured Spike binary does not exist: {}", path.display());
    }
    if let Ok(path) = std::env::var("CODEX_ROLLOUT_SPIKE_BIN") {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Ok(path);
        }
    }
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidates = [
        std::env::current_dir().unwrap_or_default().join(
            "native/codex-rollout-compat-spike/target/release/codex-rollout-compat-spike.exe",
        ),
        manifest_dir
            .join("../codex-rollout-compat-spike/target/release/codex-rollout-compat-spike.exe"),
        manifest_dir
            .join("../codex-rollout-compat-spike/target/debug/codex-rollout-compat-spike.exe"),
    ];
    if let Some(path) = candidates.iter().find(|path| path.is_file()) {
        return Ok(path.clone());
    }
    anyhow::bail!(
        "Spike backend selected but no Spike executable was found; pass --spike-bin <path> or set CODEX_ROLLOUT_SPIKE_BIN. Checked: {}",
        candidates
            .iter()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    )
}

fn is_compressed_rollout(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("zst"))
}

fn reserve_temp_output() -> Result<PathBuf> {
    let directory = std::env::temp_dir();
    for _ in 0..100 {
        let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let path = directory.join(format!(
            "termlink-codex-spike-{}-{}.jsonl",
            std::process::id(),
            sequence
        ));
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(_) => {
                fs::remove_file(&path)
                    .with_context(|| format!("reserve Spike output {}", path.display()))?;
                return Ok(path);
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(error)
                    .with_context(|| format!("reserve Spike output {}", path.display()));
            }
        }
    }
    anyhow::bail!("could not allocate a unique temporary Spike output path")
}

fn remember_first_error(stats: &mut ReadStats, error: String) {
    if stats.first_parse_error.is_none() {
        stats.first_parse_error = Some(error);
    }
}

fn truncate(value: &str, limit: usize) -> String {
    if value.len() <= limit {
        return value.to_owned();
    }
    format!("{}…", &value[..limit])
}
