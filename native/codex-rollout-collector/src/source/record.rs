use std::path::{Path, PathBuf};

use serde_json::Value;

/// An explicit rollout source selected by the caller.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceLocator {
    path: PathBuf,
    identity: String,
}

impl SourceLocator {
    /// Bind one concrete path. The backend never searches for or discovers a source.
    ///
    /// The path is retained for I/O, while the externally visible identity is
    /// limited to the final path component so local directories cannot cross
    /// the analysis boundary.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        let path = path.into();
        let identity = safe_source_identity(&path.to_string_lossy());
        Self { path, identity }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn identity(&self) -> &str {
        &self.identity
    }
}

pub(crate) fn safe_source_identity(identity: &str) -> String {
    identity
        .rsplit(|separator| matches!(separator, '/' | '\\'))
        .find(|component| !component.is_empty() && *component != "." && *component != "..")
        .unwrap_or("rollout-source")
        .to_string()
}

/// Limits applied before a source record enters the wire decoder.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceSpec {
    locator: SourceLocator,
    max_decoded_bytes: u64,
    max_line_bytes: usize,
}

impl SourceSpec {
    pub const DEFAULT_MAX_DECODED_BYTES: u64 = 32 * 1024 * 1024;
    pub const DEFAULT_MAX_LINE_BYTES: usize = 512 * 1024;

    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            locator: SourceLocator::new(path),
            max_decoded_bytes: Self::DEFAULT_MAX_DECODED_BYTES,
            max_line_bytes: Self::DEFAULT_MAX_LINE_BYTES,
        }
    }

    pub fn from_locator(locator: SourceLocator) -> Self {
        Self {
            locator,
            max_decoded_bytes: Self::DEFAULT_MAX_DECODED_BYTES,
            max_line_bytes: Self::DEFAULT_MAX_LINE_BYTES,
        }
    }

    pub fn with_limits(mut self, max_decoded_bytes: u64, max_line_bytes: usize) -> Self {
        self.max_decoded_bytes = max_decoded_bytes;
        self.max_line_bytes = max_line_bytes;
        self
    }

    pub fn locator(&self) -> &SourceLocator {
        &self.locator
    }

    pub fn path(&self) -> &Path {
        self.locator.path()
    }

    pub fn source_identity(&self) -> &str {
        self.locator.identity()
    }

    pub fn max_decoded_bytes(&self) -> u64 {
        self.max_decoded_bytes
    }

    pub fn max_line_bytes(&self) -> usize {
        self.max_line_bytes
    }
}

/// One complete physical JSONL record or one bounded source diagnostic.
///
/// `raw` is deliberately optional: malformed input is still represented so
/// the adapter can emit a `ParseGap` without stopping later records.
#[derive(Debug, Clone, PartialEq)]
pub struct SourceRecord {
    pub source_identity: String,
    pub byte_start: u64,
    pub byte_end: u64,
    pub physical_line_ordinal: u64,
    pub rollout_ordinal: Option<u64>,
    pub timestamp: Option<String>,
    pub raw: Option<Value>,
    pub parse_error: Option<String>,
}

impl SourceRecord {
    pub fn is_valid_json(&self) -> bool {
        self.raw.is_some() && self.parse_error.is_none()
    }

    pub fn type_name(&self) -> Option<String> {
        let object = self.raw.as_ref()?.as_object()?;
        let outer = object.get("type")?.as_str()?;
        let nested = object
            .get("payload")
            .and_then(Value::as_object)
            .and_then(|payload| payload.get("type"))
            .and_then(Value::as_str);
        Some(match nested {
            Some(nested) => format!("{outer}/{nested}"),
            None => outer.to_string(),
        })
    }
}

/// Summary of one bounded source pass.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SourceReadReport {
    pub source_bytes: u64,
    pub decoded_bytes: u64,
    pub physical_line_count: u64,
    pub valid_record_count: u64,
    pub parse_gap_count: u64,
    pub blank_line_count: u64,
    pub budget_exceeded: bool,
}
