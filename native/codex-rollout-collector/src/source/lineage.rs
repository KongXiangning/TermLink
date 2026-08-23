use std::{
    collections::BTreeMap,
    fmt, fs,
    path::{Path, PathBuf},
    result::Result,
};

use serde::{Deserialize, Serialize};

use super::{
    JsonlSourceBackend, SourceByteRange, SourceCompression, SourceReadMode, SourceReadPlan,
    SourceSpec,
};

/// The TermLink-owned representation of Codex's `history_base`.
///
/// The vendor calls the parent rollout ID `thread_id`.  The collector keeps
/// the business meaning explicit so the value cannot accidentally be used as
/// the stable conversation/session ID.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HistoryBaseRef {
    pub parent_rollout_id: String,
    pub end_ordinal_exclusive: u64,
    pub end_byte_offset: u64,
}

impl HistoryBaseRef {
    pub fn new(
        parent_rollout_id: impl Into<String>,
        end_ordinal_exclusive: u64,
        end_byte_offset: u64,
    ) -> Result<Self, LineageError> {
        let parent_rollout_id = parent_rollout_id.into();
        if parent_rollout_id.trim().is_empty() {
            return Err(LineageError::EmptyParentRolloutId);
        }
        Ok(Self {
            parent_rollout_id,
            end_ordinal_exclusive,
            end_byte_offset,
        })
    }

    pub fn cut(&self) -> SourceByteRange {
        // A history position is an exclusive point, not a range.  Exposing it
        // as an empty range keeps all byte-range validation in one place.
        SourceByteRange::new(self.end_byte_offset, self.end_byte_offset)
            .expect("history cut is an empty ordered range")
    }
}

/// One physical rollout source known to the catalog.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RolloutSource {
    pub rollout_id: String,
    pub path: PathBuf,
}

impl RolloutSource {
    pub fn new(
        rollout_id: impl Into<String>,
        path: impl Into<PathBuf>,
    ) -> Result<Self, LineageError> {
        let rollout_id = rollout_id.into();
        let path = path.into();
        if rollout_id.trim().is_empty() {
            return Err(LineageError::EmptyRolloutId);
        }
        if path.as_os_str().is_empty() {
            return Err(LineageError::EmptySourcePath);
        }
        Ok(Self { rollout_id, path })
    }
}

/// A deterministic catalog of rollout ID to physical path bindings.
///
/// The catalog is deliberately separate from `SourceLocator`: the active
/// source remains caller-selected, while this catalog is only used to resolve
/// a parent named by `history_base`.
#[derive(Debug, Clone, Default)]
pub struct RolloutCatalog {
    sources: BTreeMap<String, RolloutSource>,
}

impl RolloutCatalog {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(
        &mut self,
        rollout_id: impl Into<String>,
        path: impl Into<PathBuf>,
    ) -> Result<(), LineageError> {
        let source = RolloutSource::new(rollout_id, path)?;
        if let Some(existing) = self.sources.get(&source.rollout_id) {
            if existing.path != source.path {
                return Err(LineageError::AmbiguousRollout {
                    rollout_id: source.rollout_id,
                });
            }
            return Ok(());
        }
        self.sources.insert(source.rollout_id.clone(), source);
        Ok(())
    }

    pub fn from_candidates(
        candidates: impl IntoIterator<Item = RolloutSource>,
    ) -> Result<Self, LineageError> {
        let mut catalog = Self::new();
        for candidate in candidates {
            catalog.insert(candidate.rollout_id, candidate.path)?;
        }
        Ok(catalog)
    }

    /// Build a catalog from one caller-approved directory.
    ///
    /// File names are used only as lookup keys for the parent rollout ID.  No
    /// conversation or item identity is inferred from them.  The active
    /// source still has to be explicitly bound by the caller.
    pub fn from_directory(root: impl AsRef<Path>) -> Result<Self, LineageError> {
        let root = root.as_ref();
        let entries = fs::read_dir(root).map_err(|error| LineageError::Io {
            operation: format!("read rollout catalog directory {}", root.display()),
            message: error.to_string(),
        })?;
        let mut catalog = Self::new();
        for entry in entries {
            let entry = entry.map_err(|error| LineageError::Io {
                operation: format!("read rollout catalog entry {}", root.display()),
                message: error.to_string(),
            })?;
            let path = entry.path();
            if !path.is_file() || !is_rollout_path(&path) {
                continue;
            }
            let Some(rollout_id) = rollout_id_from_filename(&path) else {
                continue;
            };
            catalog.insert(rollout_id, path)?;
        }
        Ok(catalog)
    }

    pub fn get(&self, rollout_id: &str) -> Option<&RolloutSource> {
        self.sources.get(rollout_id)
    }

    pub fn resolve(&self, rollout_id: &str) -> Result<RolloutSource, LineageError> {
        self.get(rollout_id)
            .cloned()
            .ok_or_else(|| LineageError::ParentRolloutMissing {
                rollout_id: rollout_id.to_string(),
            })
    }

    pub fn len(&self) -> usize {
        self.sources.len()
    }

    pub fn is_empty(&self) -> bool {
        self.sources.is_empty()
    }

    /// Resolve a child `history_base` to a bounded parent suffix plan.
    ///
    /// The returned plan is still immutable and must be executed through the
    /// normal `SourceReadPlan::read` path.  This method only validates the
    /// parent binding, the cut's physical range, and the JSONL line boundary.
    pub fn plan_parent_suffix(
        &self,
        history_base: &HistoryBaseRef,
        target_conversation_id: &str,
        max_decoded_bytes: u64,
        max_line_bytes: usize,
        max_segment_bytes: u64,
    ) -> Result<(RolloutSource, SourceReadPlan), LineageError> {
        let parent = self.resolve(&history_base.parent_rollout_id)?;
        let spec = SourceSpec::bind(
            target_conversation_id,
            parent.rollout_id.clone(),
            parent.path.clone(),
        )
        .map_err(|error| LineageError::InvalidBinding(error.to_string()))?
        .with_limits(max_decoded_bytes, max_line_bytes)
        .with_segment_limit(max_segment_bytes);
        if spec.compression() != SourceCompression::PlainJsonl {
            return Err(LineageError::UnsupportedParentSourceCompression {
                rollout_id: parent.rollout_id.clone(),
                compression: spec.compression().as_str().to_string(),
                operation: "parent_suffix_plan".to_string(),
            });
        }

        let metadata = fs::metadata(&parent.path).map_err(|error| LineageError::Io {
            operation: format!("metadata for parent rollout {}", parent.path.display()),
            message: error.to_string(),
        })?;
        if !metadata.is_file() {
            return Err(LineageError::SourceNotFile {
                path: parent.path.display().to_string(),
            });
        }
        if history_base.end_byte_offset > metadata.len() {
            return Err(LineageError::CutBeyondParent {
                cut: history_base.end_byte_offset,
                parent_bytes: metadata.len(),
            });
        }
        let range = SourceByteRange::new(history_base.end_byte_offset, metadata.len())
            .map_err(|error| LineageError::InvalidBinding(error.to_string()))?;
        let plan = JsonlSourceBackend
            .plan_range(&spec, SourceReadMode::BackwardRange, range)
            .map_err(|error| LineageError::InvalidCut(error.to_string()))?;
        Ok((parent, plan))
    }
}

pub(super) fn is_rollout_path(path: &Path) -> bool {
    let name = path.to_string_lossy().to_ascii_lowercase();
    name.ends_with(".jsonl") || name.ends_with(".jsonl.zst")
}

/// Extract the lookup key used by the Codex rollout filename conventions.
///
/// This helper is intentionally scoped to catalog lookup.  Callers must not
/// use the returned value as the conversation ID or an AnalysisEvent key.
pub fn rollout_id_from_filename(path: &Path) -> Option<String> {
    let mut stem = path.file_name()?.to_string_lossy().to_string();
    for suffix in [".zst", ".jsonl"] {
        if stem.to_ascii_lowercase().ends_with(suffix) {
            let new_len = stem.len().saturating_sub(suffix.len());
            stem.truncate(new_len);
        }
    }
    let candidate = stem
        .rsplit_once('_')
        .map(|(_, suffix)| suffix)
        .or_else(|| trailing_uuid(&stem))?
        .trim();
    (!candidate.is_empty()).then(|| candidate.to_string())
}

fn trailing_uuid(stem: &str) -> Option<&str> {
    let parts = stem.split('-').collect::<Vec<_>>();
    if parts.len() < 5 {
        return None;
    }
    let start = parts.len() - 5;
    let lengths = [8, 4, 4, 4, 12];
    if !parts[start..].iter().zip(lengths).all(|(part, length)| {
        part.len() == length && part.bytes().all(|byte| byte.is_ascii_hexdigit())
    }) {
        return None;
    }
    let offset = stem
        .splitn(start + 1, '-')
        .take(start)
        .map(str::len)
        .sum::<usize>()
        .saturating_add(start);
    stem.get(offset..)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LineageError {
    EmptyParentRolloutId,
    EmptyRolloutId,
    EmptySourcePath,
    ParentRolloutMissing {
        rollout_id: String,
    },
    AmbiguousRollout {
        rollout_id: String,
    },
    SourceNotFile {
        path: String,
    },
    CutBeyondParent {
        cut: u64,
        parent_bytes: u64,
    },
    InvalidCut(String),
    InvalidBinding(String),
    UnsupportedParentSourceCompression {
        rollout_id: String,
        compression: String,
        operation: String,
    },
    Io {
        operation: String,
        message: String,
    },
    ParentChainCycle {
        rollout_id: String,
    },
    ParentChainDepthExceeded {
        max_depth: usize,
    },
    InvalidDiscoveryRequest(String),
    InvalidDate(String),
    InvalidDateRange {
        start: String,
        end: String,
    },
    DatePartitionLimitExceeded {
        limit: usize,
    },
    DiscoveryLimitExceeded {
        limit: usize,
    },
    DiscoveryBudgetExceeded {
        resource: String,
        limit: u64,
    },
    DiscoveryCancelled,
    DiscoveryTimeout,
    ConversationRolloutMissing {
        conversation_id: String,
    },
    CandidateHeaderInvalid {
        path: String,
        message: String,
    },
    FilenameHeaderMismatch {
        path: String,
        filename_conversation_id: String,
        header_conversation_id: String,
    },
    InvalidHistoryBase {
        rollout_id: String,
        message: String,
    },
    ActiveRolloutNotDiscovered {
        rollout_id: String,
    },
    ActivePathNotDiscovered {
        path: String,
    },
    AmbiguousActiveHead {
        candidates: Vec<String>,
    },
}

impl fmt::Display for LineageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyParentRolloutId => write!(formatter, "parent rollout ID must not be empty"),
            Self::EmptyRolloutId => write!(formatter, "rollout ID must not be empty"),
            Self::EmptySourcePath => write!(formatter, "rollout source path must not be empty"),
            Self::ParentRolloutMissing { rollout_id } => {
                write!(
                    formatter,
                    "parent rollout is missing from catalog: {rollout_id}"
                )
            }
            Self::AmbiguousRollout { rollout_id } => {
                write!(
                    formatter,
                    "rollout ID resolves to multiple paths: {rollout_id}"
                )
            }
            Self::SourceNotFile { path } => {
                write!(formatter, "rollout source is not a file: {path}")
            }
            Self::CutBeyondParent { cut, parent_bytes } => write!(
                formatter,
                "history cut byte offset {cut} exceeds parent source size {parent_bytes}"
            ),
            Self::InvalidCut(message) => write!(formatter, "invalid history cut: {message}"),
            Self::InvalidBinding(message) => {
                write!(formatter, "invalid lineage binding: {message}")
            }
            Self::UnsupportedParentSourceCompression {
                rollout_id,
                compression,
                operation,
            } => write!(
                formatter,
                "unsupported parent source compression for {operation}: rollout={rollout_id}, compression={compression}; ordinary .zst parent lineage is fail-closed and requires a seekable plain JSONL source"
            ),
            Self::Io { operation, message } => write!(formatter, "{operation}: {message}"),
            Self::ParentChainCycle { rollout_id } => {
                write!(
                    formatter,
                    "parent rollout chain contains a cycle at {rollout_id}"
                )
            }
            Self::ParentChainDepthExceeded { max_depth } => {
                write!(
                    formatter,
                    "parent rollout chain exceeds maximum depth {max_depth}"
                )
            }
            Self::InvalidDiscoveryRequest(message) => {
                write!(formatter, "invalid session discovery request: {message}")
            }
            Self::InvalidDate(value) => {
                write!(formatter, "invalid rollout date partition: {value}")
            }
            Self::InvalidDateRange { start, end } => {
                write!(formatter, "rollout date range is reversed: {start} > {end}")
            }
            Self::DatePartitionLimitExceeded { limit } => write!(
                formatter,
                "rollout discovery date range exceeds maximum partition count {limit}"
            ),
            Self::DiscoveryLimitExceeded { limit } => {
                write!(
                    formatter,
                    "rollout discovery exceeds candidate limit {limit}"
                )
            }
            Self::DiscoveryBudgetExceeded { resource, limit } => write!(
                formatter,
                "rollout discovery {resource} budget exceeded (limit {limit})"
            ),
            Self::DiscoveryCancelled => write!(formatter, "source analysis cancelled"),
            Self::DiscoveryTimeout => write!(formatter, "resource timeout exceeded"),
            Self::ConversationRolloutMissing { conversation_id } => write!(
                formatter,
                "no rollout candidate was discovered for conversation {conversation_id}"
            ),
            Self::CandidateHeaderInvalid { path, message } => {
                write!(formatter, "invalid rollout header {path}: {message}")
            }
            Self::FilenameHeaderMismatch {
                path,
                filename_conversation_id,
                header_conversation_id,
            } => write!(
                formatter,
                "rollout filename/header conversation mismatch for {path}: filename={filename_conversation_id}, header={header_conversation_id}"
            ),
            Self::InvalidHistoryBase {
                rollout_id,
                message,
            } => {
                write!(
                    formatter,
                    "invalid history_base in rollout {rollout_id}: {message}"
                )
            }
            Self::ActiveRolloutNotDiscovered { rollout_id } => write!(
                formatter,
                "requested active rollout was not discovered: {rollout_id}"
            ),
            Self::ActivePathNotDiscovered { path } => {
                write!(
                    formatter,
                    "requested active rollout path was not discovered: {path}"
                )
            }
            Self::AmbiguousActiveHead { candidates } => write!(
                formatter,
                "session has ambiguous active rollout heads: {}",
                candidates.join(", ")
            ),
        }
    }
}

impl std::error::Error for LineageError {}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::{HistoryBaseRef, LineageError, RolloutCatalog, rollout_id_from_filename};

    #[test]
    fn history_base_keeps_parent_rollout_and_cut_separate() {
        let value = HistoryBaseRef::new("parent-rollout", 14, 128).expect("valid history base");
        assert_eq!(value.parent_rollout_id, "parent-rollout");
        assert_eq!(value.end_ordinal_exclusive, 14);
        assert_eq!(value.end_byte_offset, 128);
        assert_eq!(value.cut().start(), 128);
    }

    #[test]
    fn catalog_lookup_is_idempotent_but_conflicting_paths_fail_closed() {
        let mut catalog = RolloutCatalog::new();
        catalog
            .insert("parent", "parent.jsonl")
            .expect("insert parent");
        catalog
            .insert("parent", "parent.jsonl")
            .expect("same binding is idempotent");
        assert!(catalog.insert("parent", "other.jsonl").is_err());
    }

    #[test]
    fn parent_suffix_plan_rejects_ordinary_zstd_with_typed_error() {
        let path = std::env::temp_dir().join(format!(
            "termlink-lineage-parent-{}.jsonl.zst",
            std::process::id()
        ));
        fs::write(&path, b"compressed placeholder\n").expect("compressed parent writes");

        let mut catalog = RolloutCatalog::new();
        catalog
            .insert("parent", &path)
            .expect("compressed parent inserts");
        let history_base = HistoryBaseRef::new("parent", 0, 0).expect("history base creates");
        let error = catalog
            .plan_parent_suffix(&history_base, "conversation", 1024, 1024, 1024)
            .expect_err("ordinary zstd parent suffix must fail closed");
        assert_eq!(
            error,
            LineageError::UnsupportedParentSourceCompression {
                rollout_id: "parent".to_string(),
                compression: "zstd".to_string(),
                operation: "parent_suffix_plan".to_string(),
            }
        );

        let _ = fs::remove_file(path);
    }

    #[test]
    fn directory_catalog_uses_filename_only_as_parent_lookup_key() {
        let root =
            std::env::temp_dir().join(format!("termlink-lineage-catalog-{}", std::process::id()));
        fs::create_dir_all(&root).expect("catalog directory creates");
        let path = root.join("rollout-2026-08-22T00-00-00_parent-rollout.jsonl");
        fs::write(&path, b"{}\n").expect("catalog file writes");

        let catalog = RolloutCatalog::from_directory(&root).expect("directory catalog builds");
        assert!(catalog.get("parent-rollout").is_some());
        assert_eq!(
            rollout_id_from_filename(&path).as_deref(),
            Some("parent-rollout")
        );
        let root_path =
            root.join("rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed.jsonl");
        assert_eq!(
            rollout_id_from_filename(&root_path).as_deref(),
            Some("01a02530-9975-7df2-a3b3-6bb214ad47ed")
        );
        let _ = fs::remove_file(path);
        let _ = fs::remove_dir(root);
    }
}
