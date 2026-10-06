//! Bounded discovery of the rollout files belonging to one Codex session.
//!
//! This module deliberately owns only source discovery and lineage evidence.
//! It does not reduce events and it does not turn a file name into a
//! conversation identity.  The caller supplies the target conversation ID;
//! file names are candidate indexes and the first `session_meta` line is the
//! authoritative identity check.

use std::{
    cmp::Ordering,
    collections::{BTreeMap, BTreeSet},
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering as AtomicOrdering},
    time::Instant,
};

use codex_history::RolloutItem;
use codex_protocol::protocol::ThreadHistoryMode;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::digest::{
    DigestFileRangeError, SHA256_ALGORITHM, digest_file_range, digest_file_range_with_callback,
};
use super::{HistoryBaseRef, LineageError, RolloutCatalog, RolloutSource, SourceFingerprint};

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

/// Aggregate resource limits for the stage4 discovery pass.
///
/// The existing `discover_session` entry point intentionally remains
/// backward-compatible and has no request-local cancellation or I/O budget.
/// Stage4 uses `DiscoveryControl` to make directory traversal, header reads
/// and candidate fingerprinting part of the same request budget as source
/// analysis.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DiscoveryBudget {
    pub max_directory_entries: u64,
    pub max_header_bytes: u64,
    pub max_fingerprint_bytes: u64,
}

impl DiscoveryBudget {
    pub const fn new(
        max_directory_entries: u64,
        max_header_bytes: u64,
        max_fingerprint_bytes: u64,
    ) -> Self {
        Self {
            max_directory_entries,
            max_header_bytes,
            max_fingerprint_bytes,
        }
    }
}

/// Request-local cancellation/deadline and I/O budget used by stage4.
pub struct DiscoveryControl<'a> {
    cancelled: &'a AtomicBool,
    deadline: Instant,
    budget: DiscoveryBudget,
    directory_entries: u64,
    header_bytes: u64,
    fingerprint_bytes: u64,
}

impl<'a> DiscoveryControl<'a> {
    pub fn new(cancelled: &'a AtomicBool, deadline: Instant, budget: DiscoveryBudget) -> Self {
        Self {
            cancelled,
            deadline,
            budget,
            directory_entries: 0,
            header_bytes: 0,
            fingerprint_bytes: 0,
        }
    }

    fn check(&self) -> Result<(), LineageError> {
        if self.cancelled.load(AtomicOrdering::Acquire) {
            return Err(LineageError::DiscoveryCancelled);
        }
        if Instant::now() >= self.deadline {
            return Err(LineageError::DiscoveryTimeout);
        }
        Ok(())
    }

    fn consume_directory_entry(&mut self) -> Result<(), LineageError> {
        self.check()?;
        self.directory_entries = self.directory_entries.saturating_add(1);
        if self.directory_entries > self.budget.max_directory_entries {
            return Err(LineageError::DiscoveryBudgetExceeded {
                resource: "directory_entries".to_string(),
                limit: self.budget.max_directory_entries,
            });
        }
        Ok(())
    }

    fn consume_header_bytes(&mut self, bytes: u64) -> Result<(), LineageError> {
        self.check()?;
        self.header_bytes = self.header_bytes.saturating_add(bytes);
        if self.header_bytes > self.budget.max_header_bytes {
            return Err(LineageError::DiscoveryBudgetExceeded {
                resource: "header_bytes".to_string(),
                limit: self.budget.max_header_bytes,
            });
        }
        Ok(())
    }

    fn reserve_fingerprint_chunk(&mut self, bytes: u64) -> Result<(), LineageError> {
        self.check()?;
        let next = self.fingerprint_bytes.saturating_add(bytes);
        if next > self.budget.max_fingerprint_bytes {
            return Err(LineageError::DiscoveryBudgetExceeded {
                resource: "fingerprint_bytes".to_string(),
                limit: self.budget.max_fingerprint_bytes,
            });
        }
        self.fingerprint_bytes = next;
        Ok(())
    }
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
    discover_session_internal(request, None)
}

/// Discover one session while charging all discovery I/O to a request-local
/// cancellation/deadline and aggregate byte budget.  This is the stage4
/// entry point; the legacy `discover_session` API intentionally keeps its
/// original behavior for callers that do not have a request budget.
pub fn discover_session_with_control(
    request: &SessionDiscoveryRequest,
    control: &mut DiscoveryControl<'_>,
) -> Result<SessionLineage, LineageError> {
    discover_session_internal(request, Some(control))
}

fn discover_session_internal(
    request: &SessionDiscoveryRequest,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<SessionLineage, LineageError> {
    if let Some(control) = control.as_deref() {
        control.check()?;
    }
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
        control.as_deref_mut(),
    )?;
    let candidates = scan_candidates(
        &search_directories,
        &request.conversation_id,
        None,
        request.max_candidates,
        control.as_deref_mut(),
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

    // Only explicit history_base references admit auxiliary sources. They are
    // catalog/ancestry evidence, never candidates for the target's active head.
    let mut pending = by_id.keys().cloned().collect::<Vec<_>>();
    let mut visited = BTreeSet::new();
    while let Some(id) = pending.pop() {
        if !visited.insert(id.clone()) {
            continue;
        }
        let Some(base) = by_id[&id].header.history_base.clone() else {
            continue;
        };
        if !by_id.contains_key(&base.parent_rollout_id) {
            let parents = scan_candidates(
                &search_directories,
                &request.conversation_id,
                Some(&base.parent_rollout_id),
                request.max_candidates.saturating_sub(by_id.len()),
                control.as_deref_mut(),
            )?;
            if parents.is_empty() {
                return Err(LineageError::ParentRolloutMissing {
                    rollout_id: base.parent_rollout_id,
                });
            }
            for parent in parents {
                if by_id.contains_key(&parent.source.rollout_id) {
                    return Err(LineageError::AmbiguousRollout {
                        rollout_id: parent.source.rollout_id,
                    });
                }
                by_id.insert(parent.source.rollout_id.clone(), parent);
            }
        }
        pending.push(base.parent_rollout_id);
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
        if candidate.header.conversation_id == request.conversation_id
            && by_id
                .get(&history_base.parent_rollout_id)
                .is_some_and(|parent| parent.header.conversation_id == request.conversation_id)
        {
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
    let chain = build_chain(&by_id, &active_rollout_id)?;
    if let Some(control) = control.as_deref_mut() {
        // Keep fingerprint evidence on every verified candidate so the
        // discovery provenance remains compatible with the legacy API.  The
        // controlled path still makes this formerly unbounded work safe by
        // charging every read against one aggregate, cancellable budget.
        for candidate in by_id.values_mut() {
            candidate.fingerprint = Some(fingerprint_candidate(candidate, control)?);
        }
    } else {
        for candidate in by_id.values_mut() {
            candidate.fingerprint = Some(fingerprint_candidate_unbounded(candidate)?);
        }
    }
    let chain = chain
        .iter()
        .map(|candidate| {
            by_id
                .get(&candidate.source.rollout_id)
                .cloned()
                .ok_or_else(|| LineageError::ActiveRolloutNotDiscovered {
                    rollout_id: candidate.source.rollout_id.clone(),
                })
        })
        .collect::<Result<Vec<_>, _>>()?;
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
        if !by_id
            .get(&hint)
            .is_some_and(|candidate| candidate.header.conversation_id == request.conversation_id)
        {
            return Err(LineageError::ActiveRolloutNotDiscovered { rollout_id: hint });
        }
        let active_rollout_id = follow_unique_descendant(&hint, by_id, children)?;
        ensure_root_like_candidates_are_safe(&active_rollout_id, by_id)?;
        return Ok(active_rollout_id);
    }
    let mut leaves = by_id
        .values()
        .filter(|candidate| candidate.header.conversation_id == request.conversation_id)
        .map(|candidate| &candidate.source.rollout_id)
        .filter(|rollout_id| children.get(*rollout_id).is_none_or(Vec::is_empty))
        .cloned()
        .collect::<Vec<_>>();
    leaves.sort();
    // A stable conversation can contain an older root-like file that was
    // superseded by a later root-like source before the paginated parent
    // chain began.  Such a file is safe to treat as provenance only after
    // `ensure_root_like_candidates_are_safe` proves it is strictly older than
    // the connected chain root.  Prefer the unique connected leaf, but keep
    // ambiguity when a root-like candidate cannot be ordered safely.
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
        [only] => {
            ensure_root_like_candidates_are_safe(only, by_id)?;
            Ok(only.clone())
        }
        [] => match leaves.as_slice() {
            [only] => {
                ensure_root_like_candidates_are_safe(only, by_id)?;
                Ok(only.clone())
            }
            _ => Err(LineageError::AmbiguousActiveHead { candidates: leaves }),
        },
        _ => Err(LineageError::AmbiguousActiveHead {
            candidates: connected_leaves,
        }),
    }
}

/// A root-like candidate is safe to ignore only when its filename timestamp
/// is strictly earlier than the root of the connected active chain.  A newer,
/// equal, or unorderable root-like file may be a separate active head, so
/// discovery must fail closed instead of silently selecting the connected leaf.
fn ensure_root_like_candidates_are_safe(
    active_head: &str,
    by_id: &BTreeMap<String, DiscoveredRollout>,
) -> Result<(), LineageError> {
    let active =
        by_id
            .get(active_head)
            .ok_or_else(|| LineageError::ActiveRolloutNotDiscovered {
                rollout_id: active_head.to_string(),
            })?;
    if active.header.history_base.is_none() {
        let mut root_like = by_id
            .values()
            .filter(|candidate| {
                candidate.header.conversation_id == active.header.conversation_id
                    && candidate.header.history_base.is_none()
            })
            .map(|candidate| candidate.source.rollout_id.clone())
            .collect::<Vec<_>>();
        root_like.sort();
        if root_like.len() > 1 {
            return Err(LineageError::AmbiguousActiveHead {
                candidates: root_like,
            });
        }
        return Ok(());
    }

    let connected_root_id = connected_root_id(active_head, by_id)?;
    let connected_root =
        by_id
            .get(&connected_root_id)
            .ok_or_else(|| LineageError::ParentRolloutMissing {
                rollout_id: connected_root_id.clone(),
            })?;
    let mut unresolved = by_id
        .values()
        .filter(|candidate| {
            candidate.header.conversation_id == active.header.conversation_id
                && candidate.header.history_base.is_none()
                && candidate.source.rollout_id != connected_root_id
        })
        .filter(|candidate| !strictly_older_than_connected_root(candidate, connected_root))
        .map(|candidate| candidate.source.rollout_id.clone())
        .collect::<Vec<_>>();
    if unresolved.is_empty() {
        return Ok(());
    }
    unresolved.push(active_head.to_string());
    unresolved.sort();
    unresolved.dedup();
    Err(LineageError::AmbiguousActiveHead {
        candidates: unresolved,
    })
}

fn connected_root_id(
    active_head: &str,
    by_id: &BTreeMap<String, DiscoveredRollout>,
) -> Result<String, LineageError> {
    let mut current = active_head.to_string();
    let mut visited = BTreeSet::new();
    loop {
        if !visited.insert(current.clone()) {
            return Err(LineageError::ParentChainCycle {
                rollout_id: current,
            });
        }
        let candidate = by_id
            .get(&current)
            .ok_or_else(|| LineageError::ParentRolloutMissing {
                rollout_id: current.clone(),
            })?;
        let Some(history_base) = candidate.header.history_base.as_ref() else {
            return Ok(current);
        };
        if !by_id.contains_key(&history_base.parent_rollout_id) {
            return Err(LineageError::ParentRolloutMissing {
                rollout_id: history_base.parent_rollout_id.clone(),
            });
        }
        current = history_base.parent_rollout_id.clone();
    }
}

fn strictly_older_than_connected_root(
    candidate: &DiscoveredRollout,
    connected_root: &DiscoveredRollout,
) -> bool {
    match (
        sortable_rollout_timestamp(&candidate.filename.timestamp),
        sortable_rollout_timestamp(&connected_root.filename.timestamp),
    ) {
        (Some(candidate), Some(connected_root)) => candidate.cmp(connected_root) == Ordering::Less,
        _ => false,
    }
}

fn sortable_rollout_timestamp(timestamp: &str) -> Option<&str> {
    valid_rollout_timestamp(timestamp).then_some(timestamp)
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
) -> Result<Vec<DiscoveredRollout>, LineageError> {
    let mut chain = Vec::new();
    let mut current = active_rollout_id.to_string();
    let mut visited = BTreeSet::new();
    loop {
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
}

fn scan_candidates(
    directories: &[PathBuf],
    conversation_id: &str,
    parent_rollout_id: Option<&str>,
    max_candidates: usize,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<Vec<DiscoveredRollout>, LineageError> {
    let mut paths = Vec::new();
    for directory in directories {
        if let Some(control) = control.as_deref_mut() {
            control.check()?;
        }
        let entries = fs::read_dir(directory).map_err(|error| LineageError::Io {
            operation: format!("read session partition {}", directory.display()),
            message: error.to_string(),
        })?;
        for entry in entries {
            if let Some(control) = control.as_deref_mut() {
                control.consume_directory_entry()?;
            }
            let entry = entry.map_err(|error| LineageError::Io {
                operation: format!("read session partition entry {}", directory.display()),
                message: error.to_string(),
            })?;
            let path = entry.path();
            if path.is_file()
                && super::lineage::is_rollout_path(&path)
                && !super::lineage::should_skip_compressed_sibling(&path)
                && parse_rollout_filename(&path).is_some_and(|candidate| match parent_rollout_id {
                    Some(parent) => candidate.rollout_id == parent,
                    None => candidate.conversation_id == conversation_id,
                })
            {
                paths.push(path);
                if paths.len() > max_candidates {
                    return Err(LineageError::DiscoveryLimitExceeded {
                        limit: max_candidates,
                    });
                }
            }
        }
    }
    paths.sort();

    let mut candidates = Vec::with_capacity(paths.len());
    for path in paths {
        if let Some(control) = control.as_deref_mut() {
            control.check()?;
        }
        let filename =
            parse_rollout_filename(&path).ok_or_else(|| LineageError::CandidateHeaderInvalid {
                path: path.display().to_string(),
                message: "rollout filename does not match the supported convention".to_string(),
            })?;
        let header = read_rollout_header(&path, control.as_deref_mut())?;
        if (parent_rollout_id.is_none() && header.conversation_id != conversation_id)
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
        candidates.push(DiscoveredRollout {
            source: RolloutSource::new(filename.rollout_id.clone(), path.clone())?,
            filename,
            header,
            file_size: metadata.len(),
            // Fingerprints are populated after active-head resolution so
            // invalid/ambiguous catalogs do not spend hash budget first.
            fingerprint: None,
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

fn fingerprint_candidate_unbounded(
    candidate: &DiscoveredRollout,
) -> Result<SourceFingerprint, LineageError> {
    let digest =
        digest_file_range(&candidate.source.path, 0, candidate.file_size).map_err(|error| {
            LineageError::Io {
                operation: format!(
                    "fingerprint discovered rollout {}",
                    candidate.source.path.display()
                ),
                message: error.to_string(),
            }
        })?;
    SourceFingerprint::new(SHA256_ALGORITHM.to_string(), digest, candidate.file_size)
        .map_err(|error| LineageError::InvalidDiscoveryRequest(error.to_string()))
}

fn fingerprint_candidate(
    candidate: &DiscoveredRollout,
    control: &mut DiscoveryControl<'_>,
) -> Result<SourceFingerprint, LineageError> {
    let digest = digest_file_range_with_callback(
        &candidate.source.path,
        0,
        candidate.file_size,
        |requested| control.reserve_fingerprint_chunk(requested),
    )
    .map_err(|error| match error {
        DigestFileRangeError::Callback(error) => error,
        DigestFileRangeError::Io(error) => LineageError::Io {
            operation: format!(
                "fingerprint discovered rollout {}",
                candidate.source.path.display()
            ),
            message: error.to_string(),
        },
    })?;
    SourceFingerprint::new(SHA256_ALGORITHM.to_string(), digest, candidate.file_size)
        .map_err(|error| LineageError::InvalidDiscoveryRequest(error.to_string()))
}

fn bounded_search_directories(
    root: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    max_date_partitions: usize,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<Vec<PathBuf>, LineageError> {
    if !root.exists() {
        return Err(LineageError::Io {
            operation: format!("inspect sessions root {}", root.display()),
            message: "path does not exist".to_string(),
        });
    }
    let mut partitions = Vec::<(String, PathBuf)>::new();
    if contains_rollout_file(root, control.as_deref_mut())? {
        partitions.push((String::new(), root.to_path_buf()));
    }
    let years = directory_entries(root, control.as_deref_mut())?;
    for year in years {
        if let Some(control) = control.as_deref_mut() {
            control.check()?;
        }
        let year_name = year
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_string();
        if !is_digits(&year_name, 4) {
            continue;
        }
        for month in directory_entries(&year, control.as_deref_mut())? {
            if let Some(control) = control.as_deref_mut() {
                control.check()?;
            }
            let month_name = month
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string();
            if !is_digits(&month_name, 2) {
                continue;
            }
            for day in directory_entries(&month, control.as_deref_mut())? {
                if let Some(control) = control.as_deref_mut() {
                    control.check()?;
                }
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
                if start_date.is_some() || end_date.is_some() {
                    if partitions.len() > max_date_partitions {
                        return Err(LineageError::DatePartitionLimitExceeded {
                            limit: max_date_partitions,
                        });
                    }
                } else if partitions.len() > max_date_partitions {
                    // Without an explicit range the historical behavior is
                    // to retain only the newest partitions.  Keep that
                    // selection bounded while walking the directory tree.
                    partitions.sort_by(|left, right| left.0.cmp(&right.0));
                    partitions.remove(0);
                }
            }
        }
    }
    partitions.sort_by(|left, right| left.0.cmp(&right.0));
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

fn directory_entries(
    root: &Path,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<Vec<PathBuf>, LineageError> {
    let entries = fs::read_dir(root).map_err(|error| LineageError::Io {
        operation: format!("read directory {}", root.display()),
        message: error.to_string(),
    })?;
    let mut paths = Vec::new();
    for entry in entries {
        if let Some(control) = control.as_deref_mut() {
            control.consume_directory_entry()?;
        }
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

fn contains_rollout_file(
    root: &Path,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<bool, LineageError> {
    let entries = fs::read_dir(root).map_err(|error| LineageError::Io {
        operation: format!("inspect session root {}", root.display()),
        message: error.to_string(),
    })?;
    for entry in entries {
        if let Some(control) = control.as_deref_mut() {
            control.consume_directory_entry()?;
        }
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

fn read_rollout_header(
    path: &Path,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<RolloutHeaderEvidence, LineageError> {
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
        read_first_line(BufReader::new(decoder), path, control.as_deref_mut())?
    } else {
        let file = fs::File::open(path).map_err(|error| LineageError::Io {
            operation: format!("open rollout header {}", path.display()),
            message: error.to_string(),
        })?;
        read_first_line(BufReader::new(file), path, control.as_deref_mut())?
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

fn read_first_line<R: BufRead>(
    mut reader: R,
    path: &Path,
    mut control: Option<&mut DiscoveryControl<'_>>,
) -> Result<(String, u64), LineageError> {
    let mut line = Vec::new();
    loop {
        if let Some(control) = control.as_deref() {
            control.check()?;
        }
        let (take, has_newline) = {
            let available = reader.fill_buf().map_err(|error| LineageError::Io {
                operation: format!("read rollout header {}", path.display()),
                message: error.to_string(),
            })?;
            if available.is_empty() {
                break;
            }
            let take = available
                .iter()
                .position(|byte| *byte == b'\n')
                .map_or(available.len(), |position| position + 1);
            if let Some(control) = control.as_deref_mut() {
                control.consume_header_bytes(take as u64)?;
            }
            line.extend_from_slice(&available[..take]);
            (take, available[..take].contains(&b'\n'))
        };
        reader.consume(take);
        if has_newline {
            break;
        }
    }
    let bytes = line.len();
    if bytes == 0 || line.last() != Some(&b'\n') {
        return Err(LineageError::CandidateHeaderInvalid {
            path: path.display().to_string(),
            message: "rollout has no complete session header line".to_string(),
        });
    }
    let line = String::from_utf8(line).map_err(|error| LineageError::CandidateHeaderInvalid {
        path: path.display().to_string(),
        message: format!("rollout header is not UTF-8: {error}"),
    })?;
    Ok((line, bytes as u64))
}

#[cfg(test)]
mod tests {
    use std::{
        collections::BTreeMap,
        fs,
        io::{self, BufRead, Cursor, Read},
        path::PathBuf,
        sync::atomic::AtomicBool,
        time::{Duration, Instant, SystemTime, UNIX_EPOCH},
    };

    use super::{
        DiscoveredRollout, DiscoveryBudget, DiscoveryControl, HistoryBaseRef, LineageError,
        RolloutFilenameCandidate, RolloutHeaderEvidence, RolloutSource, SessionDiscoveryRequest,
        build_chain, choose_active_head, discover_session_with_control,
    };

    fn temp_discovery_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "termlink-discovery-{label}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock is after unix epoch")
                .as_nanos()
        ))
    }

    fn session_header(
        conversation_id: &str,
        history_base: Option<(&str, u64, u64)>,
        padding: usize,
    ) -> Vec<u8> {
        let mut payload = serde_json::json!({
            "id": conversation_id,
            "timestamp": "2026-08-22T00:00:00.000Z",
            "cwd": "E:\\fixture\\workspace",
            "originator": "codex_cli",
            "cli_version": "0.1.0",
            "source": "cli",
            "model_provider": "openai",
            "git": {}
        });
        if let Some((parent, ordinal, byte)) = history_base {
            payload["history_mode"] = serde_json::Value::String("paginated".to_string());
            payload["history_base"] = serde_json::json!({
                "thread_id": parent,
                "end_ordinal_exclusive": ordinal,
                "end_byte_offset": byte
            });
        }
        if padding > 0 {
            payload["padding"] = serde_json::Value::String("x".repeat(padding));
        }
        let mut line = serde_json::to_vec(&serde_json::json!({
            "timestamp": "2026-08-22T00:00:00.000Z",
            "ordinal": 1,
            "type": "session_meta",
            "payload": payload
        }))
        .expect("session header serializes");
        line.push(b'\n');
        line
    }

    fn write_rollout(
        root: &std::path::Path,
        partition: &str,
        filename: &str,
        header: Vec<u8>,
    ) -> PathBuf {
        let path = root.join(partition).join(filename);
        fs::create_dir_all(path.parent().expect("rollout parent directory"))
            .expect("directory creates");
        fs::write(&path, header).expect("rollout writes");
        path
    }

    fn control<'a>(
        cancelled: &'a AtomicBool,
        deadline: Instant,
        budget: DiscoveryBudget,
    ) -> DiscoveryControl<'a> {
        DiscoveryControl::new(cancelled, deadline, budget)
    }

    struct CancellingBufReader<'a> {
        inner: Cursor<Vec<u8>>,
        cancelled: &'a AtomicBool,
        chunk_size: usize,
        flipped: bool,
    }

    impl Read for CancellingBufReader<'_> {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            self.inner.read(buffer)
        }
    }

    impl BufRead for CancellingBufReader<'_> {
        fn fill_buf(&mut self) -> io::Result<&[u8]> {
            let available = self.inner.fill_buf()?;
            let length = available.len().min(self.chunk_size);
            Ok(&available[..length])
        }

        fn consume(&mut self, amount: usize) {
            self.inner.consume(amount);
            if !self.flipped {
                self.cancelled
                    .store(true, std::sync::atomic::Ordering::Release);
                self.flipped = true;
            }
        }
    }

    fn rollout(
        rollout_id: &str,
        timestamp: &str,
        history_base: Option<HistoryBaseRef>,
    ) -> DiscoveredRollout {
        let source = RolloutSource::new(rollout_id, PathBuf::from(format!("{rollout_id}.jsonl")))
            .expect("test rollout source is valid");
        DiscoveredRollout {
            filename: RolloutFilenameCandidate {
                conversation_id: "conversation".to_string(),
                rollout_id: rollout_id.to_string(),
                timestamp: timestamp.to_string(),
                date_partition: timestamp
                    .get(..10)
                    .unwrap_or("0000-00-00")
                    .replace('-', "/"),
            },
            source,
            header: RolloutHeaderEvidence {
                conversation_id: "conversation".to_string(),
                history_mode: if history_base.is_some() {
                    "paginated"
                } else {
                    "legacy"
                }
                .to_string(),
                history_base,
                header_end_byte: 1,
            },
            file_size: 1,
            fingerprint: None,
        }
    }

    fn connected_chain_with_root_like(
        root_timestamp: &str,
        root_like: &[(&str, &str)],
    ) -> (
        SessionDiscoveryRequest,
        BTreeMap<String, DiscoveredRollout>,
        BTreeMap<String, Vec<String>>,
    ) {
        let mut by_id = BTreeMap::new();
        by_id.insert("A".to_string(), rollout("A", root_timestamp, None));
        by_id.insert(
            "B".to_string(),
            rollout(
                "B",
                "2026-08-22T00-10-00",
                Some(HistoryBaseRef::new("A", 14, 100).expect("test history base is valid")),
            ),
        );
        for (rollout_id, timestamp) in root_like {
            by_id.insert(
                (*rollout_id).to_string(),
                rollout(rollout_id, timestamp, None),
            );
        }
        let children = BTreeMap::from([(String::from("A"), vec![String::from("B")])]);
        (
            SessionDiscoveryRequest::new("sessions", "conversation"),
            by_id,
            children,
        )
    }

    fn assert_ambiguous(result: Result<String, LineageError>, expected_candidates: &[&str]) {
        match result {
            Err(LineageError::AmbiguousActiveHead { candidates }) => {
                assert_eq!(
                    candidates,
                    expected_candidates
                        .iter()
                        .map(|candidate| (*candidate).to_string())
                        .collect::<Vec<_>>()
                );
            }
            other => panic!("expected ambiguous active head, got {other:?}"),
        }
    }

    #[test]
    fn older_root_like_candidate_is_ignored_when_connected_chain_is_unique() {
        let (request, by_id, children) =
            connected_chain_with_root_like("2026-08-22T00-00-00", &[("C", "2026-08-21T23-59-59")]);

        assert_eq!(
            choose_active_head(&request, &by_id, &children).expect("older root is safe"),
            "B"
        );
    }

    #[test]
    fn newer_root_like_candidate_makes_connected_head_ambiguous() {
        let (request, by_id, children) =
            connected_chain_with_root_like("2026-08-22T00-00-00", &[("C", "2026-08-22T00-20-00")]);

        assert_ambiguous(choose_active_head(&request, &by_id, &children), &["B", "C"]);
    }

    #[test]
    fn same_timestamp_root_like_candidate_is_not_silently_ignored() {
        let (request, by_id, children) =
            connected_chain_with_root_like("2026-08-22T00-00-00", &[("C", "2026-08-22T00-00-00")]);

        assert_ambiguous(choose_active_head(&request, &by_id, &children), &["B", "C"]);
    }

    #[test]
    fn unorderable_root_like_timestamp_fails_closed() {
        let (request, by_id, children) = connected_chain_with_root_like(
            "2026-08-22T00-00-00",
            &[("C", "not-a-rollout-timestamp")],
        );

        assert_ambiguous(choose_active_head(&request, &by_id, &children), &["B", "C"]);
    }

    #[test]
    fn multiple_root_like_candidates_without_connected_chain_report_all_candidates() {
        let mut by_id = BTreeMap::new();
        by_id.insert("A".to_string(), rollout("A", "2026-08-22T00-00-00", None));
        by_id.insert("B".to_string(), rollout("B", "2026-08-22T00-20-00", None));
        let request = SessionDiscoveryRequest::new("sessions", "conversation");
        let children = BTreeMap::new();

        assert_ambiguous(choose_active_head(&request, &by_id, &children), &["A", "B"]);
    }

    #[test]
    fn active_hint_cannot_hide_unresolved_new_root_like_candidate() {
        let (request, by_id, children) =
            connected_chain_with_root_like("2026-08-22T00-00-00", &[("C", "2026-08-22T00-20-00")]);
        let request = request.with_active_rollout_id("B");

        assert_ambiguous(choose_active_head(&request, &by_id, &children), &["B", "C"]);
    }

    #[test]
    fn lineage_chain_has_no_depth_limit_but_rejects_cycles() {
        let mut by_id = BTreeMap::new();
        for index in 0..10 {
            let parent = (index > 0).then(|| {
                HistoryBaseRef::new(
                    format!("R{index_minus_one}", index_minus_one = index - 1),
                    index,
                    index,
                )
                .expect("test history base is valid")
            });
            by_id.insert(
                format!("R{index}"),
                rollout(
                    &format!("R{index}"),
                    &format!("2026-08-22T00-{index:02}-00"),
                    parent,
                ),
            );
        }

        let chain = build_chain(&by_id, "R9").expect("lineage is not limited by depth");
        assert_eq!(chain.len(), 10);
        assert_eq!(
            chain
                .iter()
                .map(|candidate| candidate.source.rollout_id.clone())
                .collect::<Vec<_>>(),
            (0..10).map(|index| format!("R{index}")).collect::<Vec<_>>()
        );

        by_id
            .get_mut("R0")
            .expect("root candidate exists")
            .header
            .history_base = Some(HistoryBaseRef::new("R9", 10, 10).expect("cycle base"));
        assert_eq!(
            build_chain(&by_id, "R9").expect_err("cycle must fail closed"),
            LineageError::ParentChainCycle {
                rollout_id: "R9".to_string(),
            }
        );
    }

    #[test]
    fn controlled_discovery_fails_before_io_when_cancelled() {
        let cancelled = AtomicBool::new(true);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(1, 1, 1),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new("missing", "conversation"),
            &mut control,
        )
        .expect_err("cancelled discovery must fail closed");
        assert_eq!(error, LineageError::DiscoveryCancelled);
    }

    #[test]
    fn controlled_discovery_honors_deadline_inside_discovery() {
        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() - Duration::from_millis(1),
            DiscoveryBudget::new(1, 1, 1),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new("missing", "conversation"),
            &mut control,
        )
        .expect_err("expired discovery must fail closed");
        assert_eq!(error, LineageError::DiscoveryTimeout);
    }

    #[test]
    fn controlled_header_read_honors_cancel_after_first_chunk() {
        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(16, 4096, 1024),
        );
        let reader = CancellingBufReader {
            inner: Cursor::new(b"{\"header\":\"this spans chunks\"}\n".to_vec()),
            cancelled: &cancelled,
            chunk_size: 4,
            flipped: false,
        };
        let error = super::read_first_line(
            reader,
            PathBuf::from("cancelled-header.jsonl").as_path(),
            Some(&mut control),
        )
        .expect_err("mid-read cancellation must fail closed");
        assert_eq!(error, LineageError::DiscoveryCancelled);
    }

    #[test]
    fn controlled_discovery_bounds_header_bytes() {
        let root = temp_discovery_root("header-budget");
        let conversation = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
        write_rollout(
            &root,
            "2026/08/22",
            "rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed.jsonl",
            session_header(conversation, None, 256),
        );
        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(16, 64, 1024 * 1024),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new(&root, conversation),
            &mut control,
        )
        .expect_err("oversized header must fail closed");
        assert_eq!(
            error,
            LineageError::DiscoveryBudgetExceeded {
                resource: "header_bytes".to_string(),
                limit: 64,
            }
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_bounds_directory_entries() {
        let root = temp_discovery_root("directory-budget");
        let date = root.join("2026/08/22");
        fs::create_dir_all(&date).expect("date directory creates");
        for index in 0..8 {
            fs::write(
                date.join(format!("not-a-rollout-{index}.txt")),
                b"not a rollout",
            )
            .expect("non-matching directory entry writes");
        }
        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            // Four entries are consumed while reaching the date partition;
            // the eighth non-matching scan entry exceeds this bound.  None
            // of the eight files is a rollout candidate.
            DiscoveryBudget::new(11, 1024, 1024),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new(&root, "conversation"),
            &mut control,
        )
        .expect_err("directory entry budget must fail closed");
        assert_eq!(
            error,
            LineageError::DiscoveryBudgetExceeded {
                resource: "directory_entries".to_string(),
                limit: 11,
            }
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_bounds_fingerprint_bytes() {
        let root = temp_discovery_root("fingerprint-budget");
        let conversation = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
        write_rollout(
            &root,
            "2026/08/22",
            "rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed.jsonl",
            session_header(conversation, None, 128),
        );
        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(16, 1024, 1),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new(&root, conversation),
            &mut control,
        )
        .expect_err("fingerprint byte budget must fail closed");
        assert_eq!(
            error,
            LineageError::DiscoveryBudgetExceeded {
                resource: "fingerprint_bytes".to_string(),
                limit: 1,
            }
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_resolves_cross_date_chain_and_hashes_all_candidates() {
        let root = temp_discovery_root("cross-date");
        let conversation = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
        let parent_path = write_rollout(
            &root,
            "2026/08/22",
            "rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed.jsonl",
            session_header(conversation, None, 0),
        );
        fs::write(
            parent_path.with_file_name(
                "rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed.jsonl.zst",
            ),
            b"compressed sibling placeholder\n",
        )
        .expect("compressed sibling writes");
        let stale_path = write_rollout(
            &root,
            "2026/08/21",
            "rollout-2026-08-21T23-59-59-01a02530-9975-7df2-a3b3-6bb214ad47ed_stale.jsonl",
            session_header(conversation, None, 0),
        );
        let child_path = write_rollout(
            &root,
            "2026/08/23",
            "rollout-2026-08-23T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed_01a02531-9f57-76d0-89f7-9b5e12d04911.jsonl",
            session_header(conversation, Some((conversation, 1, 1)), 0),
        );
        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(32, 4096, 1024 * 1024),
        );
        let request = SessionDiscoveryRequest::new(&root, conversation).with_limits(3, 16);
        let lineage = discover_session_with_control(&request, &mut control)
            .expect("cross-date discovery succeeds within budget");
        assert_eq!(
            lineage.active_head_rollout_id,
            "01a02531-9f57-76d0-89f7-9b5e12d04911"
        );
        assert_eq!(lineage.chain.len(), 2);
        assert!(
            lineage
                .chain
                .iter()
                .all(|candidate| candidate.fingerprint.is_some())
        );
        assert_eq!(lineage.candidates.len(), 3);
        assert!(
            lineage
                .candidates
                .iter()
                .all(|candidate| candidate.fingerprint.is_some())
        );
        assert!(
            lineage
                .candidates
                .iter()
                .any(|candidate| candidate.source.path == stale_path)
        );
        assert_eq!(lineage.active_source().path, child_path);
        assert_eq!(lineage.chain[0].source.path, parent_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_keeps_zstd_only_rollout_as_forward_source() {
        let root = temp_discovery_root("zstd-only");
        let conversation = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
        let path = root.join("2026/08/22").join(format!(
            "rollout-2026-08-22T00-00-00-{conversation}.jsonl.zst"
        ));
        fs::create_dir_all(path.parent().expect("zstd rollout directory"))
            .expect("directory creates");
        let compressed =
            zstd::stream::encode_all(session_header(conversation, None, 0).as_slice(), 0)
                .expect("session header compresses");
        fs::write(&path, compressed).expect("zstd rollout writes");

        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(16, 4096, 1024 * 1024),
        );
        let lineage = discover_session_with_control(
            &SessionDiscoveryRequest::new(&root, conversation),
            &mut control,
        )
        .expect("zstd-only rollout remains discoverable");
        assert_eq!(lineage.candidates.len(), 1);
        assert_eq!(lineage.active_source().path, path);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_does_not_fallback_to_compressed_sibling_when_plain_is_invalid() {
        let root = temp_discovery_root("plain-invalid-no-fallback");
        let conversation = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
        let plain = write_rollout(
            &root,
            "2026/08/22",
            &format!("rollout-2026-08-22T00-00-00-{conversation}_same-rollout.jsonl"),
            b"not a session header\n".to_vec(),
        );
        let compressed =
            zstd::stream::encode_all(session_header(conversation, None, 0).as_slice(), 0)
                .expect("valid sibling header compresses");
        fs::write(
            plain.with_file_name("rollout-2026-08-22T00-00-00-01a02530-9975-7df2-a3b3-6bb214ad47ed_same-rollout.jsonl.zst"),
            compressed,
        )
        .expect("compressed sibling writes");

        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(16, 4096, 1024 * 1024),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new(&root, conversation),
            &mut control,
        )
        .expect_err("invalid plain canonical source must fail closed");
        match error {
            LineageError::CandidateHeaderInvalid { path, .. } => {
                assert_eq!(
                    fs::canonicalize(path).expect("reported plain path resolves"),
                    fs::canonicalize(&plain).expect("fixture plain path resolves")
                );
            }
            other => panic!("expected plain header error, got {other:?}"),
        }

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_keeps_same_rollout_id_at_different_paths_ambiguous() {
        let root = temp_discovery_root("non-sibling-ambiguity");
        let conversation = "01a02530-9975-7df2-a3b3-6bb214ad47ed";
        let filename = format!("rollout-2026-08-22T00-00-00-{conversation}_same-rollout.jsonl");
        write_rollout(
            &root,
            "2026/08/22",
            &filename,
            session_header(conversation, None, 0),
        );
        write_rollout(
            &root,
            "2026/08/23",
            &filename,
            session_header(conversation, None, 0),
        );

        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(32, 4096, 1024 * 1024),
        );
        let error = discover_session_with_control(
            &SessionDiscoveryRequest::new(&root, conversation),
            &mut control,
        )
        .expect_err("same rollout ID at unrelated paths must remain ambiguous");
        assert_eq!(
            error,
            LineageError::AmbiguousRollout {
                rollout_id: "same-rollout".to_string()
            }
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn controlled_discovery_allows_lineage_deeper_than_date_partition_limit() {
        let root = temp_discovery_root("same-date-deep-lineage");
        let conversation = "7d9f2f20-3d1a-4f9a-8b1c-2e7a4f60a101";
        let rollout_ids = [
            conversation,
            "1a2b3c40-5d6e-4f7a-8b9c-0d1e2f3a4b50",
            "2b3c4d50-6e7f-4a8b-9c0d-1e2f3a4b5c60",
            "3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70",
        ];
        for (index, rollout_id) in rollout_ids.iter().enumerate() {
            let filename = if index == 0 {
                format!("rollout-2026-08-22T00-{index:02}-00-{conversation}.jsonl")
            } else {
                format!("rollout-2026-08-22T00-{index:02}-00-{conversation}_{rollout_id}.jsonl")
            };
            let history_base =
                (index > 0).then(|| (rollout_ids[index - 1], index as u64, index as u64));
            write_rollout(
                &root,
                "2026/08/22",
                &filename,
                session_header(conversation, history_base, 0),
            );
        }

        let cancelled = AtomicBool::new(false);
        let mut control = control(
            &cancelled,
            Instant::now() + Duration::from_secs(30),
            DiscoveryBudget::new(64, 4096, 1024 * 1024),
        );
        let request = SessionDiscoveryRequest::new(&root, conversation)
            .with_date_range(Some("2026-08-22"), Some("2026-08-22"))
            .with_limits(16, 1);
        let lineage = discover_session_with_control(&request, &mut control)
            .expect("date partition limit must not limit same-date lineage depth");
        assert_eq!(lineage.chain.len(), rollout_ids.len());
        assert_eq!(
            lineage
                .chain
                .iter()
                .map(|candidate| candidate.source.rollout_id.as_str())
                .collect::<Vec<_>>(),
            rollout_ids
        );

        let _ = fs::remove_dir_all(root);
    }
}
