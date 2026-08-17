//! Disk-backed detail storage used by the streaming importer.
//!
//! The reducer may replace or remove a detail while it is folding later
//! rollout events.  The store therefore uses an append-only journal plus a
//! small in-memory index.  Only the latest record for each `detail_ref` is
//! emitted to the final JSONL file, so detail bodies do not have to remain in
//! the reducer's heap.

use std::collections::BTreeMap;
use std::fs::{File, OpenOptions};
use std::io::{self, BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::Error as JsonError;

use crate::dto::DetailPayloadDto;

pub trait DetailStore {
    fn upsert(&mut self, detail: &DetailPayloadDto) -> io::Result<()>;
    fn remove(&mut self, detail_ref: &str) -> io::Result<()>;
    fn get(&mut self, detail_ref: &str) -> io::Result<Option<DetailPayloadDto>>;
    fn finalize(&mut self) -> io::Result<()>;
}

/// Sink used when the caller did not request a detail output. It keeps the
/// streaming reducer bounded without silently making the file-backed store
/// mandatory for diagnostic-only runs.
#[derive(Default)]
pub struct DiscardDetailStore;

impl DetailStore for DiscardDetailStore {
    fn upsert(&mut self, _detail: &DetailPayloadDto) -> io::Result<()> {
        Ok(())
    }

    fn remove(&mut self, _detail_ref: &str) -> io::Result<()> {
        Ok(())
    }

    fn get(&mut self, _detail_ref: &str) -> io::Result<Option<DetailPayloadDto>> {
        Ok(None)
    }

    fn finalize(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
struct DetailIndex {
    offset: u64,
    length: u64,
}

/// A JSONL detail sink whose retained bodies live on disk.
pub struct JsonlDetailStore {
    output_path: PathBuf,
    journal_path: PathBuf,
    journal: File,
    index: BTreeMap<String, DetailIndex>,
    finalized: bool,
}

impl JsonlDetailStore {
    pub fn create(output_path: &Path) -> io::Result<Self> {
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file_name = output_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("details.jsonl");
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let journal_path = output_path.with_file_name(format!(
            ".{file_name}.streaming-journal.{}.{}",
            std::process::id(),
            nonce
        ));
        let journal = OpenOptions::new()
            .create_new(true)
            .write(true)
            .read(true)
            .open(&journal_path)?;
        Ok(Self {
            output_path: output_path.to_path_buf(),
            journal_path,
            journal,
            index: BTreeMap::new(),
            finalized: false,
        })
    }

    fn read_indexed(&mut self, index: DetailIndex) -> io::Result<DetailPayloadDto> {
        self.journal.seek(SeekFrom::Start(index.offset))?;
        let mut bytes = vec![0_u8; index.length as usize];
        self.journal.read_exact(&mut bytes)?;
        serde_json::from_slice(&bytes).map_err(json_error_to_io)
    }

    fn write_final_file(&mut self) -> io::Result<()> {
        let file_name = self
            .output_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("details.jsonl");
        let temporary = self.output_path.with_file_name(format!(
            ".{file_name}.streaming-final.{}",
            std::process::id()
        ));
        let result = (|| -> io::Result<()> {
            let mut output = OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&temporary)?;
            let indexes = self.index.values().copied().collect::<Vec<_>>();
            for index in indexes {
                let detail = self.read_indexed(index)?;
                serde_json::to_writer(&mut output, &detail).map_err(json_error_to_io)?;
                output.write_all(b"\n")?;
            }
            output.sync_all()?;
            if self.output_path.exists() {
                std::fs::remove_file(&self.output_path)?;
            }
            std::fs::rename(&temporary, &self.output_path)?;
            Ok(())
        })();
        if result.is_err() {
            let _ = std::fs::remove_file(&temporary);
        }
        result
    }
}

impl DetailStore for JsonlDetailStore {
    fn upsert(&mut self, detail: &DetailPayloadDto) -> io::Result<()> {
        let bytes = serde_json::to_vec(detail).map_err(json_error_to_io)?;
        let offset = self.journal.seek(SeekFrom::End(0))?;
        self.journal.write_all(&bytes)?;
        self.journal.write_all(b"\n")?;
        self.index.insert(
            detail.detail_ref.clone(),
            DetailIndex {
                offset,
                length: bytes.len() as u64,
            },
        );
        Ok(())
    }

    fn remove(&mut self, detail_ref: &str) -> io::Result<()> {
        self.index.remove(detail_ref);
        Ok(())
    }

    fn get(&mut self, detail_ref: &str) -> io::Result<Option<DetailPayloadDto>> {
        self.index
            .get(detail_ref)
            .copied()
            .map(|index| self.read_indexed(index).map(Some))
            .unwrap_or(Ok(None))
    }

    fn finalize(&mut self) -> io::Result<()> {
        if self.finalized {
            return Ok(());
        }
        self.journal.sync_all()?;
        self.write_final_file()?;
        self.finalized = true;
        Ok(())
    }
}

impl Drop for JsonlDetailStore {
    fn drop(&mut self) {
        let _ = self.journal.sync_all();
        if !self.finalized {
            let _ = std::fs::remove_file(&self.journal_path);
        } else {
            let _ = std::fs::remove_file(&self.journal_path);
        }
    }
}

pub fn read_details_jsonl(path: &Path) -> io::Result<Vec<DetailPayloadDto>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut details = Vec::new();
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        details.push(serde_json::from_str(&line).map_err(json_error_to_io)?);
    }
    Ok(details)
}

fn json_error_to_io(error: JsonError) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, error)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    fn detail(detail_ref: &str, output: &str) -> DetailPayloadDto {
        DetailPayloadDto {
            detail_ref: detail_ref.to_string(),
            tool_kind: Some("command".to_string()),
            tool_name: Some("shell_command".to_string()),
            canonical_output: Some(output.to_string()),
            stdout: None,
            stderr: None,
            aggregated_output: None,
            formatted_output: None,
            result: None,
            raw: None,
            field_availability: BTreeMap::new(),
        }
    }

    #[test]
    fn jsonl_store_emits_only_latest_non_deleted_details() {
        let output = std::env::temp_dir().join(format!(
            "codex-rollout-demo-detail-store-{}-{}.jsonl",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let mut store = JsonlDetailStore::create(&output).unwrap();
        store.upsert(&detail("detail:000001", "first")).unwrap();
        store.upsert(&detail("detail:000002", "removed")).unwrap();
        store
            .upsert(&detail("detail:000001", "replacement"))
            .unwrap();
        assert_eq!(
            store
                .get("detail:000001")
                .unwrap()
                .unwrap()
                .canonical_output
                .as_deref(),
            Some("replacement")
        );
        store.remove("detail:000002").unwrap();
        store.finalize().unwrap();
        drop(store);

        let details = read_details_jsonl(&output).unwrap();
        assert_eq!(details.len(), 1);
        assert_eq!(details[0].detail_ref, "detail:000001");
        assert_eq!(details[0].canonical_output.as_deref(), Some("replacement"));
        std::fs::remove_file(output).unwrap();
    }
}
