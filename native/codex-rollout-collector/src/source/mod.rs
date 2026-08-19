//! Explicit, bounded JSONL/.zst source input.

mod jsonl;
mod record;
mod zstd;

pub use jsonl::{JsonlSourceBackend, SourceBackend};
pub(crate) use record::safe_source_identity;
pub use record::{SourceLocator, SourceReadReport, SourceRecord, SourceSpec};
