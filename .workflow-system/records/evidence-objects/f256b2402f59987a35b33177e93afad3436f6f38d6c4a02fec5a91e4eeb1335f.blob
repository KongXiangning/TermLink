use serde::{Deserialize, Serialize};

/// Why a single source record could not become a known Codex wire record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UnknownReason {
    MalformedJson,
    NotAnObject,
    UnknownVariant,
    MissingRequiredField,
    UnsupportedSchema,
    PayloadLimit,
}

impl UnknownReason {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::MalformedJson => "malformed_json",
            Self::NotAnObject => "not_an_object",
            Self::UnknownVariant => "unknown_variant",
            Self::MissingRequiredField => "missing_required_field",
            Self::UnsupportedSchema => "unsupported_schema",
            Self::PayloadLimit => "source_limit_exceeded",
        }
    }
}

/// Availability attached to a wire diagnostic before it becomes a model event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WireAvailability {
    PartialRollout,
    UnsupportedSchema,
    NotRecoverableFromRollout,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UnknownRecord {
    pub timestamp: Option<String>,
    pub ordinal: Option<u64>,
    pub type_name: Option<String>,
    /// A bounded single-record diagnostic payload, never the full rollout.
    pub raw_payload: String,
    pub reason: UnknownReason,
    pub availability: WireAvailability,
}

pub(crate) fn bounded_payload(value: Option<&serde_json::Value>) -> String {
    const MAX_BYTES: usize = 16 * 1024;
    let Some(value) = value else {
        return "<unavailable>".to_string();
    };
    let serialized = serde_json::to_string(value).unwrap_or_else(|_| "<unserializable>".into());
    if serialized.len() <= MAX_BYTES {
        return serialized;
    }
    crate::error::truncate_utf8(serialized, MAX_BYTES)
}

#[cfg(test)]
mod tests {
    use super::bounded_payload;
    use serde_json::json;

    #[test]
    fn bounded_payload_keeps_multibyte_output_on_a_utf8_boundary() {
        let value = json!({"payload": "界😀".repeat(12_000)});
        let output = bounded_payload(Some(&value));
        assert!(output.len() <= 16 * 1024);
        assert!(std::str::from_utf8(output.as_bytes()).is_ok());
        assert!(output.ends_with("…<truncated>"));
    }
}
