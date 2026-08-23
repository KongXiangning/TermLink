#![forbid(unsafe_code)]

//! Formal TermLink Codex rollout collector.
//!
//! The crate deliberately keeps the boundary explicit:
//!
//! `SourceBackend -> codex_wire -> codex_adapter -> AnalysisEvent -> AnalysisBatch`
//!
//! The vendored Codex types stop at `codex_wire`/`codex_adapter`; the model and
//! protocol modules only expose TermLink-owned data structures.

#![forbid(unsafe_code)]

pub mod analysis;
pub mod codex_adapter;
pub mod codex_wire;
pub mod error;
pub mod model;
pub mod protocol;
pub mod source;
pub mod version;

pub use analysis::{
    AnalysisDiagnostic, AnalysisItem, AnalysisPlan, AnalysisProjection, AnalysisQuestion,
    AnalysisRateLimit, AnalysisReducer, AnalysisTool, AnalysisTurn, AnalysisTurnStatus,
    AnalysisUsage, LineageValidationError, ProjectionCoverage, validate_last_turn_replacement,
};
pub use codex_wire::CompatibilityProfile;
pub use model::LastTurnReplacement;
pub use protocol::{
    ANALYZER_CHECKPOINT_SCHEMA_VERSION, ANALYZER_PROTOCOL_VERSION, ANALYZER_VERSION, AnalysisBatch,
    AnalyzerCheckpoint, AnalyzerProtocolError, BatchCompleteness, BatchMessage,
    LineageCoverageMessage, LineageSourceMessage, LineageTransitionMessage,
    LineageTransitionValidationState, ParserProvenance, RolloutDiscoveryRequest,
    SESSION_LINEAGE_CAPABILITY, analyze_records_with_adapter, analyze_request, analyze_source,
    analyze_source_with_cancel,
};
pub use source::{
    AppendError, AppendReadReport, BackfillCursor, CURSOR_READER_BACKEND, CURSOR_READER_VERSION,
    CURSOR_SCHEMA_VERSION, CompleteLineAnchor, CursorError, CursorMetadata, DiscoveredLineageEdge,
    DiscoveredRollout, DiscoveryBudget, DiscoveryControl, ForwardAppendCursor, HistoryBaseRef,
    JsonlSourceBackend, LineageError, PlannedReadReport, ReadPlanResult, RolloutCatalog,
    RolloutFilenameCandidate, RolloutHeaderEvidence, RolloutSource, SegmentAssembler,
    SegmentAssembly, SegmentAssemblyLimits, SegmentCarrier, SegmentCarrierKind,
    SegmentCompleteness, SegmentDescriptor, SegmentError, SegmentGap, SessionDiscoveryRequest,
    SessionLineage, SnapshotBoundary, SourceBackend, SourceBindingError, SourceByteRange,
    SourceCandidate, SourceCapabilities, SourceCapability, SourceCompression, SourceCursorKind,
    SourceFingerprint, SourceFixtureHash, SourceKind, SourceLocator, SourceOracleError,
    SourcePrefixAnchor, SourceReadMode, SourceReadPlan, SourceReadPlanError, SourceRecord,
    SourceRecordMismatch, SourceRecordOracleResult, SourceSegment, SourceSpec, TailPreviewCursor,
    compare_source_records, discover_session, discover_session_with_control,
    parse_rollout_filename, rollout_id_from_filename,
};

/// Implementation stage represented by this package.
pub const PACKAGE_STAGE: &str = "P0-RC.1-step4-analyzer-runtime";
