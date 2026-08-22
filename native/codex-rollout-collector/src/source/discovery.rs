//! Bounded discovery of the rollout files belonging to one Codex session.
//!
//! This module deliberately owns only source discovery and lineage evidence.
//! It does not reduce events and it does not turn a file name into a
//! conversation identity.  The caller supplies the target conversation ID;
//! file names are candidate indexes and the first `session_meta` line is the
//! authoritative identity check.

use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
};

use codex_history::RolloutItem;
use codex_protocol::protocol::ThreadHistoryMode;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{
    HistoryBaseRef, LineageError, RolloutCatalog, RolloutSource, SourceFingerprint,
    SourceFixtureHash,
};

/// The filename metadata that Codex currently writes for rollout files.
///
/// The `conversation_id` field is only a filename candidate.  Discovery still
/// verifies it against `session_meta.meta.id` and against the explicit target
/// ID supplied by the caller.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RolloutFilenameCandidate {
    pub conversation_id: String,
    pub rollout_id: String,
    pub timestamp: String,
    pub date_partition: String,
}

/// A bounded, explicit session discovery request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SessionDiscoveryRequest {
    pub sessions_root: PathBuf,
    pub conversation_id: String,
    #[serde(default)]
    pub start_date: Option<String>,
    #[serde(default)]
    pub end_date: Option<String>,
    #[serde(default)]
    pub active_rollout_id: Option<String>,
    #[serde(default)]
    pub active_path: Option<PathBuf>,
    #[serde(default = "default_max_discovery_candidates")]
    pub max_candidates: usize,
    #[serde(default = "default_max_date_partitions")]
    pub max_date_partitions: usize,
}

impl SessionDiscoveryRequest {
    pub fn new(sessions_root: impl Into<PathBuf>, conversation_id: impl Into<String>) -> Self {
        Self {
            sessions_root: sessions_root.into(),
            conversation_id: conversation_id.into(),
            start_date: None,
            end_date: None,
            active_rollout_id: None,
            active_path: None,
            max_candidates: default_max_discovery_candidates(),
            max_date_partitions: default_max_date_partitions(),
        }
    }

    pub fn with_date_range(
        mut self,
        start_date: Option<impl Into<String>>,
        end_date: Option<impl Into<String>>,
    ) -> Self {
        self.start_date = start_date.map(Into::into);
        self.end_date = end_date.map(Into::into);
        self
    }

    pub fn with_active_rollout_id(mut self, rollout_id: impl Into<String>) -> Self {
        self.active_rollout_id = Some(rollout_id.into());
        self
    }

    pub fn with_active_path(mut self, path: impl Into<PathBuf>) -> Self {
        self.active_path = Some(path.into());
        self
    }

    pub fn with_limits(mut self, max_candidates: usize, max_date_partitions: usize) -> Self {
        self.max_candidates = max_candidates;
        self.max_date_partitions = max_date_partitions;
        self
    }
}

fn default_max_discovery_candidates() -> usize {
    4096
}

fn default_max_date_partitions() -> usize {
    366
}

/// Header evidence read from the first complete JSONL line.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RolloutHeaderEvidence {
    pub conversation_id: String,
    pub history_mode: String,
    #[serde(default)]
    pub history_base: Option<HistoryBaseRef>,
    pub header_end_byte: u64,
}

/// One candidate discovered in a bounded date partition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscoveredRollout {
    pub filename: RolloutFilenameCandidate,
    pub source: RolloutSource,
    pub header: RolloutHeaderEvidence,
    pub file_size: u64,
    pub fingerprint: Option<SourceFingerprint>,
}

/// An authoritative parent-to-child edge after filename and header checks.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoveredLineageEdge {
    pub parent_rollout_id: String,
    pub child_rollout_id: String,
    pub history_base: HistoryBaseRef,
}

/// The result of session discovery. `chain` is ordered root to active head;
/// `candidates` includes other bounded candidates for diagnostics/recovery.
#[derive(Debug, Clone)]
pub struct SessionLineage {
    pub conversation_id: String,
    pub root_rollout_id: String,
    pub active_head_rollout_id: String,
    pub candidates: Vec<DiscoveredRollout>,
    pub chain: Vec<DiscoveredRollout>,
    pub transitions: Vec<DiscoveredLineageEdge>,
    pub catalog: RolloutCatalog,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

impl SessionLineage {
    pub fn active_source(&self) -> &RolloutSource {
        &self
            .chain
            .last()
            .expect("session lineage always has an active chain element")
            .source
    }

    pub fn active_rollout(&self) -> &DiscoveredRollout {
        self.chain
            .last()
            .expect("session lineage always has an active chain element")
    }

    pub fn active_history_base(&self) -> Option<HistoryBaseRef> {
        self.active_rollout().header.history_base.clone()
    }

    /// A stable epoch for a discovered active head.  Appending to the same
    /// physical rollout keeps the epoch; a new child rollout changes it.
    pub fn source_epoch(&self) -> String {
        format!(
            "lineage:{}:{}",
            self.conversation_id, self.active_head_rollout_id
        )
    }
}

/// Parse the stable conversation and rollout IDs from a Codex rollout file
/// name without treating either as authoritative application identity.
pub fn parse_rollout_filename(path: &Path) -> Option<RolloutFilenameCandidate> {
    let name = path.file_name()?.to_string_lossy();
    let mut stem = name.as_ref();
    for suffix in [".zst", ".jsonl"] {
        if stem.to_ascii_lowercase().ends_with(suffix) {
            stem = &stem[..stem.len().saturating_sub(suffix.len())];
        }
    }
    let rest = stem.strip_prefix("rollout-")?;
    if rest.len() < 20 || rest.as_bytes().get(19) != Some(&b'-') {
        return None;
    }
    let timestamp = rest.get(..19)?.to_string();
    if !valid_rollout_timestamp(&timestamp) {
        return None;
    }
    let ids = rest.get(20..)?.trim();
    if ids.is_empty() {
        return None;
    }
    let (conversation_id, rollout_id) = ids.split_once('_').unwrap_or((ids, ids));
    if conversation_id.trim().is_empty() || rollout_id.trim().is_empty() {
        return None;
    }
    Some(RolloutFilenameCandidate {
        conversation_id: conversation_id.to_string(),
        rollout_id: rollout_id.to_string(),
        timestamp,
        date_partition: format!("{}/{}/{}", &rest[0..4], &rest[5..7], &rest[8..10]),
    })
}

fn valid_rollout_timestamp(timestamp: &str) -> bool {
    timestamp.len() == 19
        && timestamp.as_bytes()[4] == b'-'
        && timestamp.as_bytes()[7] == b'-'
        && timestamp.as_bytes()[10] == b'T'
        && timestamp.as_bytes()[13] == b'-'
        && timestamp.as_bytes()[16] == b'-'
        && timestamp
            .bytes()
            .enumerate()
            .all(|(index, byte)| matches!(index, 4 | 7 | 10 | 13 | 16) || byte.is_ascii_digit())
}

/// Discover one session using only a bounded set of `YYYY/MM/DD` partitions.
pub fn discover_session(request: &SessionDiscoveryRequest) -> Result<SessionLineage, LineageError> {
    if request.conversation_id.trim().is_empty() {
        return Err(LineageError::InvalidDiscoveryRequest(
            "conversation_id must not be empty".to_string(),
        ));
    }
    if request.max_candidates == 0 || request.max_date_partitions == 0 {
        return Err(LineageError::InvalidDiscoveryRequest(
            "discovery limits must be greater than zero".to_string(),
        ));
    }
    let start_date = request
        .start_date
        .as_deref()
        .map(normalize_date)
        .transpose()?;
    let end_date = request
        .end_date
        .as_deref()
        .map(normalize_date)
        .transpose()?;
    if let (Some(start), Some(end)) = (&start_date, &end_date)
        && start > end
    {
        return Err(LineageError::InvalidDateRange {
            start: start.clone(),
            end: end.clone(),
        });
    }
    let search_directories = bounded_search_directories(
        &request.sessions_root,
        start_date.as_deref(),
        end_date.as_deref(),
        request.max_date_partitions,
    )?;
    let candidates = scan_candidates(
        &search_directories,
        &request.conversation_id,
        request.max_candidates,
    )?;
    if candidates.is_empty() {
        return Err(LineageError::ConversationRolloutMissing {
            conversation_id: request.conversation_id.clone(),
        });
    }

    let mut by_id = BTreeMap::<String, DiscoveredRollout>::new();
    for candidate in candidates {
        if let Some(existing) = by_id.get(&candidate.source.rollout_id)
            && existing.source.path != candidate.source.path
        {
            return Err(LineageError::AmbiguousRollout {
                rollout_id: candidate.source.rollout_id,
            });
        }
        by_id.insert(candidate.source.rollout_id.clone(), candidate);
    }

    let mut children = BTreeMap::<String, Vec<String>>::new();
    for candidate in by_id.values() {
        let Some(history_base) = candidate.header.history_base.as_ref() else {
            continue;
        };
        if history_base.parent_rollout_id == candidate.source.rollout_id {
            return Err(LineageError::InvalidHistoryBase {
                rollout_id: candidate.source.rollout_id.clone(),
                message: "history_base points to the child itself".to_string(),
            });
        }
        if by_id.contains_key(&history_base.parent_rollout_id) {
            children
                .entry(history_base.parent_rollout_id.clone())
                .or_default()
                .push(candidate.source.rollout_id.clone());
        }
    }
    for values in children.values_mut() {
        values.sort();
    }

    let active_rollout_id = choose_active_head(request, &by_id, &children)?;
    let chain = build_chain(&by_id, &active_rollout_id, request.max_date_partitions)?;
    let root_rollout_id = chain
        .first()
        .map(|candidate| candidate.source.rollout_id.clone())
        .ok_or_else(|| {
            LineageError::InvalidDiscoveryRequest("resolved lineage chain is empty".to_string())
        })?;
    let transitions = chain
        .windows(2)
        .map(|window| {
            let parent = &window[0];
            let child = &window[1];
            let history_base = child.header.history_base.clone().ok_or_else(|| {
                LineageError::InvalidHistoryBase {
                    rollout_id: child.source.rollout_id.clone(),
                    message: "chain child has no history_base".to_string(),
                }
            })?;
            Ok(DiscoveredLineageEdge {
                parent_rollout_id: parent.source.rollout_id.clone(),
                child_rollout_id: child.source.rollout_id.clone(),
                history_base,
            })
        })
        .collect::<Result<Vec<_>, LineageError>>()?;
    let mut all_candidates = by_id.into_values().collect::<Vec<_>>();
    all_candidates.sort_by(|left, right| {
        left.filename
            .timestamp
            .cmp(&right.filename.timestamp)
            .then_with(|| left.source.rollout_id.cmp(&right.source.rollout_id))
            .then_with(|| left.source.path.cmp(&right.source.path))
    });
    let catalog = RolloutCatalog::from_candidates(
        all_candidates
            .iter()
            .map(|candidate| candidate.source.clone()),
    )?;
    Ok(SessionLineage {
        conversation_id: request.conversation_id.clone(),
        root_rollout_id,
        active_head_rollout_id: active_rollout_id,
        candidates: all_candidates,
        chain,
        transitions,
        catalog,
        start_date,
        end_date,
    })
}

fn choose_active_head(
    request: &SessionDiscoveryRequest,
    by_id: &BTreeMap<String, DiscoveredRollout>,
    children: &BTreeMap<String, Vec<String>>,
) -> Result<String, LineageError> {
    let hint = request.active_rollout_id.clone().or_else(|| {
        request.active_path.as_ref().and_then(|path| {
            by_id.values().find_map(|candidate| {
                same_path(&candidate.source.path, path).then(|| candidate.source.rollout_id.clone())
            })
        })
    });
    if request.active_path.is_some() && hint.is_none() {
        return Err(LineageError::ActivePathNotDiscovered {
            path: request
                .active_path
                .as_ref()
                .map(|path| path.display().to_string())
                .unwrap_or_default(),
        });
    }
    if let Some(hint) = hint {
        if !by_id.contains_key(&hint) {
            return Err(LineageError::ActiveRolloutNotDiscovered { rollout_id: hint });
        }
        return follow_unique_descendant(&hint, by_id, children);
    }
    let mut leaves = by_id
        .keys()
        .filter(|rollout_id| children.get(*rollout_id).is_none_or(Vec::is_empty))
        .cloned()
        .collect::<Vec<_>>();
    leaves.sort();
    // A stable conversation can contain an older root-like file that was
    // superseded by a later root-like source before the paginated parent
    // chain began.  Such a file is a diagnostic candidate, not an active
    // head.  Prefer the unique leaf that participates in a history_base edge;
    // retain ambiguity when there are multiple connected heads.
    let connected_leaves = leaves
        .iter()
        .filter(|rollout_id| {
            by_id
                .get(*rollout_id)
                .is_some_and(|candidate| candidate.header.history_base.is_some())
        })
        .cloned()
        .collect::<Vec<_>>();
    match connected_leaves.as_slice() {
        [only] => Ok(only.clone()),
        [] => match leaves.as_slice() {
            [only] => Ok(only.clone()),
            _ => Err(LineageError::AmbiguousActiveHead { candidates: leaves }),
        },
        _ => Err(LineageError::AmbiguousActiveHead {
            candidates: connected_leaves,
        }),
    }
}

fn follow_unique_descendant(
    start: &str,
    by_id: &BTreeMap<String, DiscoveredRollout>,
    children: &BTreeMap<String, Vec<String>>,
) -> Result<String, LineageError> {
    let mut current = start.to_string();
    let mut visited = BTreeSet::new();
    while let Some(next) = children.get(&current) {
        if !visited.insert(current.clone()) {
            return Err(LineageError::ParentChainCycle {
                rollout_id: current,
            });
        }
        match next.as_slice() {
            [] => break,
            [only] => {
                if !by_id.contains_key(only) {
                    return Err(LineageError::ParentRolloutMissing {
                        rollout_id: only.clone(),
                    });
                }
                current = only.clone();
            }
            _ => {
                return Err(LineageError::AmbiguousActiveHead {
                    candidates: next.clone(),
                });
            }
        }
    }
    Ok(current)
}

fn build_chain(
    by_id: &BTreeMap<String, DiscoveredRollout>,
    active_rollout_id: &str,
    max_depth: usize,
) -> Result<Vec<DiscoveredRollout>, LineageError> {
    let mut chain = Vec::new();
    let mut current = active_rollout_id.to_string();
    let mut visited = BTreeSet::new();
    for _ in 0..=max_depth {
        if !visited.insert(current.clone()) {
            return Err(LineageError::ParentChainCycle {
                rollout_id: current,
            });
        }
        let candidate =
            by_id
                .get(&current)
                .cloned()
                .ok_or_else(|| LineageError::ParentRolloutMissing {
                    rollout_id: current.clone(),
                })?;
        let parent = candidate
            .header
            .history_base
            .as_ref()
            .map(|history_base| history_base.parent_rollout_id.clone());
        chain.push(candidate);
        let Some(parent) = parent else {
            chain.reverse();
            return Ok(chain);
        };
        if !by_id.contains_key(&parent) {
            return Err(LineageError::ParentRolloutMissing { rollout_id: parent });
        }
        current = parent;
    }
    Err(LineageError::ParentChainDepthExceeded { max_depth })
}

fn scan_candidates(
    directories: &[PathBuf],
    conversation_id: &str,
    max_candidates: usize,
) -> Result<Vec<DiscoveredRollout>, LineageError> {
    let mut paths = Vec::new();
    for directory in directories {
        let entries = fs::read_dir(directory).map_err(|error| LineageError::Io {
            operation: format!("read session partition {}", directory.display()),
            message: error.to_string(),
        })?;
        for entry in entries {
            let entry = entry.map_err(|error| LineageError::Io {
                operation: format!("read session partition entry {}", directory.display()),
                message: error.to_string(),
            })?;
            let path = entry.path();
            if path.is_file()
                && super::lineage::is_rollout_path(&path)
                && parse_rollout_filename(&path)
                    .is_some_and(|candidate| candidate.conversation_id == conversation_id)
            {
                paths.push(path);
            }
        }
    }
    paths.sort();
    if paths.len() > max_candidates {
        return Err(LineageError::DiscoveryLimitExceeded {
            limit: max_candidates,
        });
    }

    let mut candidates = Vec::with_capacity(paths.len());
    for path in paths {
        let filename =
            parse_rollout_filename(&path).ok_or_else(|| LineageError::CandidateHeaderInvalid {
                path: path.display().to_string(),
                message: "rollout filename does not match the supported convention".to_string(),
            })?;
        let header = read_rollout_header(&path)?;
        if header.conversation_id != conversation_id
            || filename.conversation_id != header.conversation_id
        {
            return Err(LineageError::FilenameHeaderMismatch {
                path: path.display().to_string(),
                filename_conversation_id: filename.conversation_id,
                header_conversation_id: header.conversation_id,
            });
        }
        let metadata = fs::metadata(&path).map_err(|error| LineageError::Io {
            operation: format!("metadata for discovered rollout {}", path.display()),
            message: error.to_string(),
        })?;
        let hash = SourceFixtureHash::from_file(&path, 0, metadata.len()).map_err(|error| {
            LineageError::Io {
                operation: format!("fingerprint discovered rollout {}", path.display()),
                message: error.to_string(),
            }
        })?;
        let fingerprint = SourceFingerprint::new(
            hash.algorithm().to_string(),
            hash.digest().to_string(),
            metadata.len(),
        )
        .map_err(|error| LineageError::InvalidDiscoveryRequest(error.to_string()))?;
        candidates.push(DiscoveredRollout {
            source: RolloutSource::new(filename.rollout_id.clone(), path.clone())?,
            filename,
            header,
            file_size: metadata.len(),
            fingerprint: Some(fingerprint),
        });
    }
    candidates.sort_by(|left, right| {
        left.filename
            .timestamp
            .cmp(&right.filename.timestamp)
            .then_with(|| left.source.rollout_id.cmp(&right.source.rollout_id))
            .then_with(|| left.source.path.cmp(&right.source.path))
    });
    Ok(candidates)
}

fn bounded_search_directories(
    root: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    max_date_partitions: usize,
) -> Result<Vec<PathBuf>, LineageError> {
    if !root.exists() {
        return Err(LineageError::Io {
            operation: format!("inspect sessions root {}", root.display()),
            message: "path does not exist".to_string(),
        });
    }
    let mut partitions = Vec::<(String, PathBuf)>::new();
    if contains_rollout_file(root)? {
        partitions.push((String::new(), root.to_path_buf()));
    }
    let years = directory_entries(root)?;
    for year in years {
        let year_name = year
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_string();
        if !is_digits(&year_name, 4) {
            continue;
        }
        for month in directory_entries(&year)? {
            let month_name = month
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string();
            if !is_digits(&month_name, 2) {
                continue;
            }
            for day in directory_entries(&month)? {
                let day_name = day
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or_default()
                    .to_string();
                if !is_digits(&day_name, 2) {
                    continue;
                }
                let partition = format!("{year_name}/{month_name}/{day_name}");
                if start_date.is_some_and(|start| partition.as_str() < start)
                    || end_date.is_some_and(|end| partition.as_str() > end)
                {
                    continue;
                }
                partitions.push((partition, day));
            }
        }
    }
    partitions.sort_by(|left, right| left.0.cmp(&right.0));
    if partitions.len() > max_date_partitions {
        if start_date.is_none() && end_date.is_none() {
            partitions = partitions
                .into_iter()
                .rev()
                .take(max_date_partitions)
                .collect();
            partitions.sort_by(|left, right| left.0.cmp(&right.0));
        } else {
            return Err(LineageError::DatePartitionLimitExceeded {
                limit: max_date_partitions,
            });
        }
    }
    if partitions.is_empty() {
        return Err(LineageError::ConversationRolloutMissing {
            conversation_id: "no date partition in requested boundary".to_string(),
        });
    }
    Ok(partitions.into_iter().map(|(_, path)| path).collect())
}

fn normalize_date(value: &str) -> Result<String, LineageError> {
    let normalized = value.trim().replace('-', "/");
    let parts = normalized.split('/').collect::<Vec<_>>();
    if parts.len() != 3
        || !is_digits(parts[0], 4)
        || !is_digits(parts[1], 2)
        || !is_digits(parts[2], 2)
    {
        return Err(LineageError::InvalidDate(value.to_string()));
    }
    Ok(normalized)
}

fn is_digits(value: &str, length: usize) -> bool {
    value.len() == length && value.bytes().all(|byte| byte.is_ascii_digit())
}

fn directory_entries(root: &Path) -> Result<Vec<PathBuf>, LineageError> {
    let entries = fs::read_dir(root).map_err(|error| LineageError::Io {
        operation: format!("read directory {}", root.display()),
        message: error.to_string(),
    })?;
    let mut paths = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| LineageError::Io {
            operation: format!("read directory entry {}", root.display()),
            message: error.to_string(),
        })?;
        let path = entry.path();
        if path.is_dir() {
            paths.push(path);
        }
    }
    paths.sort();
    Ok(paths)
}

fn contains_rollout_file(root: &Path) -> Result<bool, LineageError> {
    let entries = fs::read_dir(root).map_err(|error| LineageError::Io {
        operation: format!("inspect session root {}", root.display()),
        message: error.to_string(),
    })?;
    for entry in entries {
        let path = entry
            .map_err(|error| LineageError::Io {
                operation: format!("inspect session root entry {}", root.display()),
                message: error.to_string(),
            })?
            .path();
        if path.is_file() && super::lineage::is_rollout_path(&path) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn same_path(left: &Path, right: &Path) -> bool {
    let left = fs::canonicalize(left).unwrap_or_else(|_| left.to_path_buf());
    let right = fs::canonicalize(right).unwrap_or_else(|_| right.to_path_buf());
    left == right
}

fn read_rollout_header(path: &Path) -> Result<RolloutHeaderEvidence, LineageError> {
    let (line, header_end_byte) = if path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("zst"))
    {
        let file = fs::File::open(path).map_err(|error| LineageError::Io {
            operation: format!("open rollout header {}", path.display()),
            message: error.to_string(),
        })?;
        let decoder = zstd::stream::read::Decoder::new(file).map_err(|error| {
            LineageError::CandidateHeaderInvalid {
                path: path.display().to_string(),
                message: error.to_string(),
            }
        })?;
        read_first_line(BufReader::new(decoder), path)?
    } else {
        let file = fs::File::open(path).map_err(|error| LineageError::Io {
            operation: format!("open rollout header {}", path.display()),
            message: error.to_string(),
        })?;
        read_first_line(BufReader::new(file), path)?
    };
    let value: Value =
        serde_json::from_str(&line).map_err(|error| LineageError::CandidateHeaderInvalid {
            path: path.display().to_string(),
            message: error.to_string(),
        })?;
    let decoded = crate::codex_wire::decode_rollout_line(value).map_err(|error| {
        LineageError::CandidateHeaderInvalid {
            path: path.display().to_string(),
            message: error.to_string(),
        }
    })?;
    let RolloutItem::SessionMeta(session_meta) = decoded.item else {
        return Err(LineageError::CandidateHeaderInvalid {
            path: path.display().to_string(),
            message: "first rollout record is not session_meta".to_string(),
        });
    };
    let history_base = session_meta
        .meta
        .history_base
        .as_ref()
        .map(|history_base| {
            HistoryBaseRef::new(
                history_base.thread_id.to_string(),
                history_base.end_ordinal_exclusive,
                history_base.end_byte_offset,
            )
        })
        .transpose()?;
    if history_base.is_some() && session_meta.meta.history_mode != ThreadHistoryMode::Paginated {
        return Err(LineageError::InvalidHistoryBase {
            rollout_id: session_meta.meta.id.to_string(),
            message: "history_base requires paginated history_mode".to_string(),
        });
    }
    Ok(RolloutHeaderEvidence {
        conversation_id: session_meta.meta.id.to_string(),
        history_mode: session_meta.meta.history_mode.as_str().to_string(),
        history_base,
        header_end_byte,
    })
}

fn read_first_line<R: BufRead>(mut reader: R, path: &Path) -> Result<(String, u64), LineageError> {
    let mut line = String::new();
    let bytes = reader
        .read_line(&mut line)
        .map_err(|error| LineageError::Io {
            operation: format!("read rollout header {}", path.display()),
            message: error.to_string(),
        })?;
    if bytes == 0 || !line.ends_with('\n') {
        return Err(LineageError::CandidateHeaderInvalid {
            path: path.display().to_string(),
            message: "rollout has no complete session header line".to_string(),
        });
    }
    Ok((line, bytes as u64))
}
