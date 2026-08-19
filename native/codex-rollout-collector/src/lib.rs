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

pub mod codex_adapter;
pub mod codex_wire;
pub mod error;
pub mod model;
pub mod protocol;
pub mod source;
pub mod version;

pub use codex_wire::CompatibilityProfile;
pub use protocol::{AnalysisBatch, ParserProvenance, analyze_source};
pub use source::{JsonlSourceBackend, SourceBackend, SourceLocator, SourceRecord, SourceSpec};

/// Implementation stage represented by this package.
pub const PACKAGE_STAGE: &str = "P0-RC.1-step3-vertical-slice";
