use std::{fmt, path::Path};

use serde::{Deserialize, Serialize};

use super::digest::{SHA256_ALGORITHM, digest_bytes, digest_file_range};
use super::record::SourceRecord;

/// Hash of the common physical fixture used by full-vs-segmented checks.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceFixtureHash {
    algorithm: String,
    digest: String,
    byte_length: u64,
}

impl SourceFixtureHash {
    pub fn from_bytes(bytes: &[u8]) -> Self {
        Self {
            algorithm: SHA256_ALGORITHM.to_string(),
            digest: digest_bytes(bytes),
            byte_length: bytes.len() as u64,
        }
    }

    pub fn from_file(
        path: impl AsRef<Path>,
        start: u64,
        end: u64,
    ) -> Result<Self, SourceOracleError> {
        let path = path.as_ref();
        let digest =
            digest_file_range(path, start, end).map_err(|error| SourceOracleError::Io {
                operation: format!("hash source fixture {}", path.display()),
                message: error.to_string(),
            })?;
        Ok(Self {
            algorithm: SHA256_ALGORITHM.to_string(),
            digest,
            byte_length: end.saturating_sub(start),
        })
    }

    pub fn algorithm(&self) -> &str {
        &self.algorithm
    }

    pub fn digest(&self) -> &str {
        &self.digest
    }

    pub const fn byte_length(&self) -> u64 {
        self.byte_length
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SourceOracleError {
    Io { operation: String, message: String },
}

impl fmt::Display for SourceOracleError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io { operation, message } => write!(formatter, "{operation}: {message}"),
        }
    }
}

impl std::error::Error for SourceOracleError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceRecordMismatch {
    index: usize,
    reason: String,
}

impl SourceRecordMismatch {
    pub const fn index(&self) -> usize {
        self.index
    }

    pub fn reason(&self) -> &str {
        &self.reason
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceRecordOracleResult {
    fixture_hash: SourceFixtureHash,
    full_record_count: usize,
    segmented_record_count: usize,
    records_match: bool,
    full_complete: bool,
    segmented_complete: bool,
    mismatch: Option<SourceRecordMismatch>,
}

impl SourceRecordOracleResult {
    pub fn fixture_hash(&self) -> &SourceFixtureHash {
        &self.fixture_hash
    }

    pub const fn full_record_count(&self) -> usize {
        self.full_record_count
    }

    pub const fn segmented_record_count(&self) -> usize {
        self.segmented_record_count
    }

    pub const fn records_match(&self) -> bool {
        self.records_match
    }

    pub const fn full_complete(&self) -> bool {
        self.full_complete
    }

    pub const fn segmented_complete(&self) -> bool {
        self.segmented_complete
    }

    pub const fn completeness_match(&self) -> bool {
        self.full_complete == self.segmented_complete
    }

    pub const fn matches(&self) -> bool {
        self.records_match && self.completeness_match()
    }

    pub fn mismatch(&self) -> Option<&SourceRecordMismatch> {
        self.mismatch.as_ref()
    }
}

/// Compare the old full-read source sequence with an assembled segmented
/// sequence without importing wire or reducer semantics into the source layer.
pub fn compare_source_records(
    fixture_hash: SourceFixtureHash,
    full: &[SourceRecord],
    segmented: &[SourceRecord],
    full_complete: bool,
    segmented_complete: bool,
) -> SourceRecordOracleResult {
    let mismatch = if full.len() != segmented.len() {
        Some(SourceRecordMismatch {
            index: full.len().min(segmented.len()),
            reason: "record_count_mismatch".to_string(),
        })
    } else {
        full.iter()
            .zip(segmented)
            .enumerate()
            .find_map(|(index, (left, right))| {
                (left != right).then(|| SourceRecordMismatch {
                    index,
                    reason: "source_record_mismatch".to_string(),
                })
            })
    };
    SourceRecordOracleResult {
        fixture_hash,
        full_record_count: full.len(),
        segmented_record_count: segmented.len(),
        records_match: mismatch.is_none(),
        full_complete,
        segmented_complete,
        mismatch,
    }
}

#[cfg(test)]
mod tests {
    use super::{SourceFixtureHash, compare_source_records};
    use crate::source::SourceRecord;

    fn record(value: u64) -> SourceRecord {
        SourceRecord {
            source_identity: "fixture".to_string(),
            byte_start: value,
            byte_end: value + 1,
            physical_line_ordinal: value + 1,
            rollout_ordinal: Some(value + 1),
            timestamp: None,
            raw: Some(serde_json::json!({"ordinal": value + 1})),
            parse_error: None,
        }
    }

    #[test]
    fn oracle_reports_record_and_completeness_identity() {
        let bytes = b"fixture";
        let hash = SourceFixtureHash::from_bytes(bytes);
        let result = compare_source_records(
            hash.clone(),
            &[record(0), record(2)],
            &[record(0), record(2)],
            false,
            false,
        );
        assert!(result.matches());
        assert_eq!(result.fixture_hash(), &hash);
        assert_eq!(result.full_record_count(), 2);
        assert_eq!(result.segmented_record_count(), 2);
    }

    #[test]
    fn oracle_keeps_first_mismatch_auditable() {
        let result = compare_source_records(
            SourceFixtureHash::from_bytes(b"fixture"),
            &[record(0)],
            &[record(1)],
            true,
            true,
        );
        assert!(!result.matches());
        assert_eq!(result.mismatch().expect("mismatch").index(), 0);
        assert_eq!(
            result.mismatch().expect("mismatch").reason(),
            "source_record_mismatch"
        );
    }
}
