//! In-process JSON API used to verify the future server persistence boundary.
//!
//! This is deliberately not an HTTP server and does not connect to TermLink.
//! The demo still crosses the important boundary: typed DTOs are serialized as
//! JSON, dispatched through API-shaped routes, deserialized by the caller, and
//! then written to files exactly as an API client could persist the response.

use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::dto::{DetailPayloadDto, HistoryProjection};

pub const IMPORT_PATH: &str = "/v1/history/import";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportHistoryRequest {
    pub conversation_id: String,
    pub projection: HistoryProjection,
    pub details: Vec<DetailPayloadDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportHistoryResponse {
    pub conversation_id: String,
    pub status: String,
    pub content_hash: String,
    pub snapshot_hash: String,
    pub item_count: u64,
    pub turn_count: u64,
    pub detail_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryResponse {
    pub conversation_id: String,
    pub projection: HistoryProjection,
    pub detail_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailResponse {
    pub conversation_id: String,
    pub detail: DetailPayloadDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfApiVerificationReport {
    pub mode: String,
    pub success: bool,
    pub output_dir: String,
    pub request_count: u64,
    pub response_count: u64,
    pub stored_import_status: String,
    pub duplicate_import_status: String,
    pub content_hash: String,
    pub snapshot_hash: String,
    pub retrieved_content_hash: String,
    pub retrieved_snapshot_hash: String,
    pub turn_count_match: bool,
    pub item_count_match: bool,
    pub detail_count_match: bool,
    pub detail_round_trip_match: bool,
    pub duplicate_import_is_idempotent: bool,
    pub checks: BTreeMap<String, bool>,
}

#[derive(Debug, Clone)]
struct StoredHistory {
    projection: HistoryProjection,
    details: BTreeMap<String, DetailPayloadDto>,
}

/// Minimal server-side persistence boundary. The storage is intentionally
/// in-memory for this demo; the request/response shape is the part that will
/// later be backed by files or SQLite in the real service.
#[derive(Debug, Default)]
pub struct SelfApiServer {
    histories: BTreeMap<String, StoredHistory>,
}

impl SelfApiServer {
    pub fn dispatch(&mut self, method: &str, path: &str, body: &str) -> Result<String> {
        match (method, path) {
            ("POST", IMPORT_PATH) => {
                let request: ImportHistoryRequest = decode_json(body, "import request")?;
                let response = self.import_history(request)?;
                encode_json(&response, "import response")
            }
            ("GET", _) => {
                let segments = path_segments(path)?;
                match segments.as_slice() {
                    ["v1", "history", conversation_id] => {
                        let response = self.get_history(conversation_id)?;
                        encode_json(&response, "history response")
                    }
                    ["v1", "history", conversation_id, "details", detail_ref] => {
                        let response = self.get_detail(conversation_id, detail_ref)?;
                        encode_json(&response, "detail response")
                    }
                    _ => anyhow::bail!("unsupported GET path: {path}"),
                }
            }
            _ => anyhow::bail!("unsupported self API route: {method} {path}"),
        }
    }

    fn import_history(&mut self, request: ImportHistoryRequest) -> Result<ImportHistoryResponse> {
        validate_import(&request)?;
        let conversation_id = request.conversation_id.clone();
        let content_hash = request.projection.content_hash();
        let snapshot_hash = request.projection.snapshot_hash();
        let item_count = item_count(&request.projection);
        let turn_count = request.projection.turns.len() as u64;
        let detail_count = request.details.len() as u64;
        let details = request
            .details
            .into_iter()
            .map(|detail| (detail.detail_ref.clone(), detail))
            .collect::<BTreeMap<_, _>>();

        let status = match self.histories.get(&conversation_id) {
            Some(existing) if existing.projection.content_hash() == content_hash => "duplicate",
            Some(_) => "replaced",
            None => "stored",
        };
        if status != "duplicate" {
            self.histories.insert(
                conversation_id.clone(),
                StoredHistory {
                    projection: request.projection,
                    details,
                },
            );
        }

        Ok(ImportHistoryResponse {
            conversation_id,
            status: status.to_string(),
            content_hash,
            snapshot_hash,
            item_count,
            turn_count,
            detail_count,
        })
    }

    fn get_history(&self, conversation_id: &str) -> Result<HistoryResponse> {
        let stored = self
            .histories
            .get(conversation_id)
            .with_context(|| format!("history not found: {conversation_id}"))?;
        Ok(HistoryResponse {
            conversation_id: conversation_id.to_string(),
            projection: stored.projection.clone(),
            detail_refs: stored.details.keys().cloned().collect(),
        })
    }

    fn get_detail(&self, conversation_id: &str, detail_ref: &str) -> Result<DetailResponse> {
        let stored = self
            .histories
            .get(conversation_id)
            .with_context(|| format!("history not found: {conversation_id}"))?;
        let detail = stored
            .details
            .get(detail_ref)
            .with_context(|| format!("detail not found: {conversation_id}/{detail_ref}"))?;
        Ok(DetailResponse {
            conversation_id: conversation_id.to_string(),
            detail: detail.clone(),
        })
    }
}

/// JSON-boundary client for the in-process server. Keeping this client
/// separate makes the demo exercise the same serialization contract that a
/// later HTTP/IPC adapter will use.
pub struct SelfApiClient<'a> {
    server: &'a mut SelfApiServer,
}

impl<'a> SelfApiClient<'a> {
    pub fn new(server: &'a mut SelfApiServer) -> Self {
        Self { server }
    }

    pub fn import_history(
        &mut self,
        request: &ImportHistoryRequest,
    ) -> Result<ImportHistoryResponse> {
        self.call("POST", IMPORT_PATH, request)
    }

    pub fn get_history(&mut self, conversation_id: &str) -> Result<HistoryResponse> {
        self.call(
            "GET",
            &format!("/v1/history/{conversation_id}"),
            &Value::Null,
        )
    }

    pub fn get_detail(
        &mut self,
        conversation_id: &str,
        detail_ref: &str,
    ) -> Result<DetailResponse> {
        self.call(
            "GET",
            &format!("/v1/history/{conversation_id}/details/{detail_ref}"),
            &Value::Null,
        )
    }

    fn call<Request, Response>(
        &mut self,
        method: &str,
        path: &str,
        request: &Request,
    ) -> Result<Response>
    where
        Request: Serialize,
        Response: DeserializeOwned,
    {
        let request_json = encode_json(request, "self API request")?;
        let response_json = self.server.dispatch(method, path, &request_json)?;
        decode_json(&response_json, "self API response")
    }
}

/// Run the self-call and persist every API result needed to inspect the
/// boundary manually. A failed check still leaves `verification-report.json`
/// on disk before returning an error.
pub fn verify_to_files(
    projection: &HistoryProjection,
    details: &[DetailPayloadDto],
    output_dir: &Path,
) -> Result<SelfApiVerificationReport> {
    fs::create_dir_all(output_dir)
        .with_context(|| format!("create self API output directory {}", output_dir.display()))?;

    let conversation_id = projection.conversation.conversation_id.clone();
    let import_request = ImportHistoryRequest {
        conversation_id: conversation_id.clone(),
        projection: projection.clone(),
        details: details.to_vec(),
    };
    let mut server = SelfApiServer::default();
    let mut client = SelfApiClient::new(&mut server);

    write_json(output_dir.join("import.request.json"), &import_request)?;
    let import_response = client.import_history(&import_request)?;
    write_json(output_dir.join("import.response.json"), &import_response)?;

    let history_request = serde_json::json!({
        "conversation_id": conversation_id.clone(),
    });
    write_json(output_dir.join("history.request.json"), &history_request)?;
    let history_response = client.get_history(&import_request.conversation_id)?;
    write_json(output_dir.join("history.response.json"), &history_response)?;

    let details_path = output_dir.join("details.response.jsonl");
    let details_file = File::create(&details_path)
        .with_context(|| format!("create self API details file {}", details_path.display()))?;
    let mut details_writer = BufWriter::new(details_file);
    let expected_details = details
        .iter()
        .map(|detail| (detail.detail_ref.clone(), detail))
        .collect::<BTreeMap<_, _>>();
    let mut detail_round_trip_match = expected_details.len() == history_response.detail_refs.len();
    let mut response_count = 2_u64;
    for detail_ref in &history_response.detail_refs {
        let response = client.get_detail(&import_request.conversation_id, detail_ref)?;
        serde_json::to_writer(&mut details_writer, &response)
            .context("serialize detail response")?;
        details_writer
            .write_all(b"\n")
            .context("write detail response separator")?;
        response_count += 1;
        let matches = expected_details.get(detail_ref).is_some_and(|expected| {
            serde_json::to_value(&response.detail).ok() == serde_json::to_value(expected).ok()
        });
        detail_round_trip_match &= matches;
    }
    details_writer.flush().context("flush detail responses")?;

    let duplicate_response = client.import_history(&import_request)?;
    write_json(
        output_dir.join("import.duplicate.response.json"),
        &duplicate_response,
    )?;
    response_count += 1;

    let content_hash = projection.content_hash();
    let snapshot_hash = projection.snapshot_hash();
    let retrieved_content_hash = history_response.projection.content_hash();
    let retrieved_snapshot_hash = history_response.projection.snapshot_hash();
    let original_item_count = item_count(projection);
    let retrieved_item_count = item_count(&history_response.projection);
    let turn_count_match = projection.turns.len() == history_response.projection.turns.len();
    let item_count_match = original_item_count == retrieved_item_count;
    let detail_count_match = details.len() == history_response.detail_refs.len();
    let duplicate_import_is_idempotent = duplicate_response.status == "duplicate"
        && duplicate_response.content_hash == content_hash
        && duplicate_response.detail_count == details.len() as u64;
    let mut checks = BTreeMap::new();
    checks.insert(
        "initial_import_stored".to_string(),
        import_response.status == "stored",
    );
    checks.insert(
        "conversation_id_round_trip".to_string(),
        history_response.conversation_id == conversation_id
            && history_response.projection.conversation.conversation_id == conversation_id,
    );
    checks.insert(
        "content_hash_round_trip".to_string(),
        retrieved_content_hash == content_hash,
    );
    checks.insert(
        "snapshot_hash_round_trip".to_string(),
        retrieved_snapshot_hash == snapshot_hash,
    );
    checks.insert("turn_count_match".to_string(), turn_count_match);
    checks.insert("item_count_match".to_string(), item_count_match);
    checks.insert("detail_count_match".to_string(), detail_count_match);
    checks.insert(
        "detail_round_trip_match".to_string(),
        detail_round_trip_match,
    );
    checks.insert(
        "duplicate_import_is_idempotent".to_string(),
        duplicate_import_is_idempotent,
    );
    let success = checks.values().all(|passed| *passed);
    let report = SelfApiVerificationReport {
        mode: "in_process_self_api".to_string(),
        success,
        output_dir: output_dir.display().to_string(),
        request_count: 3 + history_response.detail_refs.len() as u64,
        response_count,
        stored_import_status: import_response.status,
        duplicate_import_status: duplicate_response.status,
        content_hash,
        snapshot_hash,
        retrieved_content_hash,
        retrieved_snapshot_hash,
        turn_count_match,
        item_count_match,
        detail_count_match,
        detail_round_trip_match,
        duplicate_import_is_idempotent,
        checks,
    };
    write_json(output_dir.join("verification-report.json"), &report)?;
    if !report.success {
        anyhow::bail!(
            "self API verification failed; see {}",
            output_dir.join("verification-report.json").display()
        );
    }
    Ok(report)
}

fn validate_import(request: &ImportHistoryRequest) -> Result<()> {
    if request.conversation_id != request.projection.conversation.conversation_id {
        anyhow::bail!(
            "conversation id mismatch: request={} projection={}",
            request.conversation_id,
            request.projection.conversation.conversation_id
        );
    }
    let mut refs = BTreeMap::new();
    for detail in &request.details {
        if refs.insert(detail.detail_ref.clone(), ()).is_some() {
            anyhow::bail!("duplicate detail_ref: {}", detail.detail_ref);
        }
    }
    for item in request
        .projection
        .turns
        .iter()
        .flat_map(|turn| turn.items.iter())
    {
        if let Some(detail_ref) = &item.detail_ref {
            if !refs.contains_key(detail_ref) {
                anyhow::bail!("history item references missing detail: {detail_ref}");
            }
        }
    }
    Ok(())
}

fn item_count(projection: &HistoryProjection) -> u64 {
    projection
        .turns
        .iter()
        .map(|turn| turn.items.len() as u64)
        .sum()
}

fn path_segments(path: &str) -> Result<Vec<&str>> {
    let segments = path.trim_matches('/').split('/').collect::<Vec<_>>();
    if segments.iter().any(|segment| segment.is_empty()) {
        anyhow::bail!("invalid self API path: {path}");
    }
    Ok(segments)
}

fn encode_json<T: Serialize>(value: &T, context: &str) -> Result<String> {
    serde_json::to_string(value).with_context(|| format!("serialize {context}"))
}

fn decode_json<T: DeserializeOwned>(value: &str, context: &str) -> Result<T> {
    serde_json::from_str(value).with_context(|| format!("deserialize {context}"))
}

fn write_json<T: Serialize>(path: PathBuf, value: &T) -> Result<()> {
    let contents = serde_json::to_string_pretty(value).context("serialize self API file")?;
    fs::write(&path, contents).with_context(|| format!("write {}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dto::{ConversationDto, HistoryProjection};

    fn fixture_projection() -> HistoryProjection {
        HistoryProjection {
            schema: "history-schema".to_string(),
            schema_version: 2,
            hash_algorithm: "test".to_string(),
            conversation: ConversationDto {
                conversation_id: "test-conversation".to_string(),
                source: "test".to_string(),
                rollout_path: "test.jsonl".to_string(),
                cli_version: None,
                codex_revision: None,
                thread_id: None,
                forked_from_id: None,
                parent_thread_id: None,
                history_mode: None,
                history_base: None,
                subagent_history_start_ordinal: None,
                cwd: None,
                git_info: None,
                model: None,
                model_provider: None,
                redaction_policy: None,
                availability: None,
                created_at: None,
                updated_at: None,
            },
            turns: Vec::new(),
            task_outcome: None,
            field_availability: BTreeMap::new(),
        }
    }

    #[test]
    fn json_client_round_trip_is_idempotent() {
        let projection = fixture_projection();
        let request = ImportHistoryRequest {
            conversation_id: "test-conversation".to_string(),
            projection: projection.clone(),
            details: Vec::new(),
        };
        let mut server = SelfApiServer::default();
        let mut client = SelfApiClient::new(&mut server);

        let first = client.import_history(&request).unwrap();
        assert_eq!(first.status, "stored");
        let history = client.get_history("test-conversation").unwrap();
        assert_eq!(history.projection.content_hash(), projection.content_hash());
        let second = client.import_history(&request).unwrap();
        assert_eq!(second.status, "duplicate");
    }

    #[test]
    fn import_rejects_mismatched_conversation_identity() {
        let projection = fixture_projection();
        let request = ImportHistoryRequest {
            conversation_id: "other-conversation".to_string(),
            projection,
            details: Vec::new(),
        };
        let mut server = SelfApiServer::default();
        let body = serde_json::to_string(&request).unwrap();
        assert!(server.dispatch("POST", IMPORT_PATH, &body).is_err());
    }
}
