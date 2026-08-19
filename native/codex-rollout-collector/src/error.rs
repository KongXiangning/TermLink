//! Formal collector error and diagnostic classification.

use std::fmt;

/// Stable fail-closed classes shared by wire, adapter and batch diagnostics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CollectorErrorKind {
    MalformedInput,
    UnknownVariant,
    MissingRequiredField,
    PayloadLimit,
    PartialRollout,
}

impl CollectorErrorKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::MalformedInput => "malformed_input",
            Self::UnknownVariant => "unknown_variant",
            Self::MissingRequiredField => "missing_required_field",
            Self::PayloadLimit => "source_limit_exceeded",
            Self::PartialRollout => "partial_rollout",
        }
    }

    pub const fn event_type(self) -> &'static str {
        match self {
            Self::MalformedInput | Self::MissingRequiredField | Self::PayloadLimit => "parse_gap",
            Self::UnknownVariant => "unknown_event",
            Self::PartialRollout => "diagnostic",
        }
    }

    pub const fn is_parse_gap(self) -> bool {
        matches!(
            self,
            Self::MalformedInput | Self::MissingRequiredField | Self::PayloadLimit
        )
    }

    pub fn from_wire_reason(reason: &str) -> Self {
        match reason {
            "malformed_json" | "not_an_object" => Self::MalformedInput,
            "source_limit_exceeded" => Self::PayloadLimit,
            "missing_required_field" => Self::MissingRequiredField,
            "unknown_variant" | "unsupported_schema" => Self::UnknownVariant,
            _ => Self::PartialRollout,
        }
    }
}

/// A bounded truncation helper that never splits a UTF-8 code point.
pub(crate) fn truncate_utf8(mut value: String, max_bytes: usize) -> String {
    if value.len() <= max_bytes {
        return value;
    }
    const MARKER: &str = "…<truncated>";
    if max_bytes < MARKER.len() {
        let mut end = max_bytes.min(value.len());
        while end > 0 && !value.is_char_boundary(end) {
            end -= 1;
        }
        value.truncate(end);
        return value;
    }
    let content_limit = max_bytes.saturating_sub(MARKER.len());
    let mut end = content_limit.min(value.len());
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    value.truncate(end);
    value.push_str(MARKER);
    value
}

/// Error value for callers that need a typed failure without exposing vendor errors.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CollectorError {
    pub kind: CollectorErrorKind,
    pub message: String,
}

impl CollectorError {
    pub fn new(kind: CollectorErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }
}

impl fmt::Display for CollectorError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.kind.as_str(), self.message)
    }
}

impl std::error::Error for CollectorError {}

#[cfg(test)]
mod tests {
    use super::{CollectorErrorKind, truncate_utf8};

    #[test]
    fn wire_reasons_map_to_fail_closed_classes() {
        assert_eq!(
            CollectorErrorKind::from_wire_reason("missing_required_field"),
            CollectorErrorKind::MissingRequiredField
        );
        assert_eq!(
            CollectorErrorKind::from_wire_reason("unknown_variant"),
            CollectorErrorKind::UnknownVariant
        );
        assert_eq!(
            CollectorErrorKind::from_wire_reason("source_limit_exceeded"),
            CollectorErrorKind::PayloadLimit
        );
        assert_eq!(
            CollectorErrorKind::from_wire_reason("unexpected"),
            CollectorErrorKind::PartialRollout
        );
    }

    #[test]
    fn truncate_utf8_respects_byte_limit_and_code_point_boundaries() {
        let output = truncate_utf8("界😀界😀".repeat(10_000), 64);
        assert!(output.len() <= 64);
        assert!(std::str::from_utf8(output.as_bytes()).is_ok());
        assert!(output.ends_with("…<truncated>"));
    }

    #[test]
    fn truncate_utf8_handles_limits_shorter_than_marker() {
        let output = truncate_utf8("界😀".repeat(10_000), 2);
        assert!(output.len() <= 2);
        assert!(std::str::from_utf8(output.as_bytes()).is_ok());
    }
}
