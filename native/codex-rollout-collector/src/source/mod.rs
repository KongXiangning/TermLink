//! Explicit, bounded JSONL/.zst source input.

mod append;
mod cursor;
mod digest;
mod discovery;
mod jsonl;
mod lineage;
mod oracle;
mod read_plan;
mod record;
mod segment;
mod zstd;

pub use append::{AppendError, AppendReadReport};
pub use cursor::{
    BackfillCursor, CURSOR_READER_BACKEND, CURSOR_READER_VERSION, CURSOR_SCHEMA_VERSION,
    CompleteLineAnchor, CursorError, CursorMetadata, ForwardAppendCursor, SourceCursorKind,
    TailPreviewCursor,
};
pub use discovery::{
    DiscoveredLineageEdge, DiscoveredRollout, DiscoveryBudget, DiscoveryControl,
    RolloutFilenameCandidate, RolloutHeaderEvidence, SessionDiscoveryRequest, SessionLineage,
    discover_session, discover_session_with_control, parse_rollout_filename,
};
pub use jsonl::{JsonlSourceBackend, SourceBackend};
pub use lineage::{
    HistoryBaseRef, LineageError, RolloutCatalog, RolloutSource, rollout_id_from_filename,
};
pub use oracle::{
    SourceFixtureHash, SourceOracleError, SourceRecordMismatch, SourceRecordOracleResult,
    compare_source_records,
};
pub use read_plan::{
    PlannedReadReport, ReadPlanResult, SourceByteRange, SourceCapabilities, SourceCapability,
    SourceReadMode, SourceReadPlan, SourceReadPlanError,
};
pub(crate) use record::safe_source_identity;
pub use record::{
    SnapshotBoundary, SourceBindingError, SourceCandidate, SourceCompression, SourceFingerprint,
    SourceKind, SourceLocator, SourcePrefixAnchor, SourceReadReport, SourceRecord, SourceSpec,
};
pub use segment::{
    SegmentAssembler, SegmentAssembly, SegmentAssemblyLimits, SegmentCarrier, SegmentCarrierKind,
    SegmentCompleteness, SegmentDescriptor, SegmentError, SegmentGap, SourceSegment,
};
