//! Stdio JSONL entry point for the isolated stage 4 analyzer.

use std::io::{self, BufRead, BufReader, BufWriter, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, Sender, TryRecvError};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use codex_rollout_collector::protocol::{
    AckMessage, AnalyzeRequest, AnalyzerProtocolError, AnalyzerRuntimeState, CancelMessage,
    CompleteMessage, ErrorMessage, HelloMessage, MessageType, ProtocolMessage,
};

enum InputCommand {
    Line(String),
    Eof,
}

enum WorkerEvent {
    Message(ProtocolMessage),
    Finished(String),
}

struct ActiveRequest {
    request_id: String,
    cancelled: Arc<AtomicBool>,
    ack_tx: Sender<AckMessage>,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("codex-rollout-collector: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> anyhow::Result<()> {
    let (input_tx, input_rx) = mpsc::channel();
    thread::spawn(move || read_input(input_tx));

    let (worker_tx, worker_rx) = mpsc::channel();
    let stdout = io::stdout();
    let mut output = BufWriter::new(stdout.lock());

    let mut active: Option<ActiveRequest> = None;
    let mut hello_received = false;
    let mut peer_capabilities = Vec::new();
    let runtime_state = Arc::new(Mutex::new(AnalyzerRuntimeState::new(
        codex_rollout_collector::codex_wire::CompatibilityProfile::Current,
    )));
    let mut input_closed = false;
    loop {
        if !input_closed {
            match input_rx.recv_timeout(Duration::from_millis(20)) {
                Ok(InputCommand::Line(line)) => {
                    handle_input_line(
                        line,
                        &worker_tx,
                        &mut active,
                        &mut output,
                        &runtime_state,
                        &mut hello_received,
                        &mut peer_capabilities,
                    )?;
                }
                Ok(InputCommand::Eof) | Err(mpsc::RecvTimeoutError::Disconnected) => {
                    input_closed = true;
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
            }
        }

        loop {
            match worker_rx.try_recv() {
                Ok(WorkerEvent::Message(message)) => write_message(&mut output, message)?,
                Ok(WorkerEvent::Finished(request_id)) => {
                    if active
                        .as_ref()
                        .is_some_and(|request| request.request_id == request_id)
                    {
                        active = None;
                    }
                }
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => {
                    input_closed = true;
                    break;
                }
            }
        }

        if input_closed && active.is_none() {
            break;
        }
    }

    output.flush()?;
    Ok(())
}

fn read_input(sender: Sender<InputCommand>) {
    let stdin = io::stdin();
    let reader = BufReader::new(stdin.lock());
    for line in reader.lines() {
        match line {
            Ok(line) => {
                if sender.send(InputCommand::Line(line)).is_err() {
                    return;
                }
            }
            Err(error) => {
                let _ = sender.send(InputCommand::Line(format!(
                    "{{\"message_type\":\"error\",\"protocol_version\":1,\"request_id\":\"unknown\",\"code\":\"stdin_read_error\",\"message\":{}}}",
                    serde_json::to_string(&error.to_string()).unwrap_or_else(|_| "\"stdin read error\"".to_string())
                )));
                break;
            }
        }
    }
    let _ = sender.send(InputCommand::Eof);
}

fn handle_input_line(
    line: String,
    worker_tx: &Sender<WorkerEvent>,
    active: &mut Option<ActiveRequest>,
    output: &mut impl Write,
    runtime_state: &Arc<Mutex<AnalyzerRuntimeState>>,
    hello_received: &mut bool,
    peer_capabilities: &mut Vec<String>,
) -> anyhow::Result<()> {
    let message = match ProtocolMessage::parse_line(&line) {
        Ok(message) => message,
        Err(error) => {
            write_message(
                output,
                ProtocolMessage::Error(ErrorMessage::for_request(
                    request_id_from_line(&line),
                    "malformed_protocol",
                    error.to_string(),
                    false,
                    false,
                )),
            )?;
            return Ok(());
        }
    };

    if let Err(error) = message.validate() {
        write_protocol_error(output, message.request_id(), error)?;
        return Ok(());
    }

    match message {
        ProtocolMessage::Hello(hello) => {
            if hello.role.as_deref().is_some_and(|role| role != "node") {
                write_message(
                    output,
                    ProtocolMessage::Error(ErrorMessage::for_request(
                        hello.header.request_id,
                        "invalid_hello_role",
                        "Node hello role must be node",
                        false,
                        true,
                    )),
                )?;
            } else {
                *hello_received = true;
                *peer_capabilities = hello.capabilities;
                write_message(
                    output,
                    ProtocolMessage::Hello(HelloMessage::new(hello.header.request_id)),
                )?;
            }
        }
        ProtocolMessage::Analyze(mut request) => {
            if !*hello_received {
                write_message(
                    output,
                    ProtocolMessage::Error(ErrorMessage::for_request(
                        request.header.request_id,
                        "handshake_required",
                        "Node hello must be accepted before analyze",
                        false,
                        false,
                    )),
                )?;
            } else if active.is_some() {
                write_message(
                    output,
                    ProtocolMessage::Error(ErrorMessage::for_request(
                        request.header.request_id,
                        "busy",
                        "analyzer already has an active request",
                        true,
                        false,
                    )),
                )?;
            } else {
                request.peer_capabilities = peer_capabilities.clone();
                start_request(request, worker_tx.clone(), active, runtime_state.clone());
            }
        }
        ProtocolMessage::Cancel(cancel) => {
            handle_cancel(cancel, active, output)?;
        }
        ProtocolMessage::Ack(ack) => {
            if let Some(request) = active.as_ref() {
                if request.request_id == ack.header.request_id {
                    let _ = request.ack_tx.send(ack);
                } else {
                    write_message(
                        output,
                        ProtocolMessage::Error(ErrorMessage::for_request(
                            ack.header.request_id,
                            "ack_request_mismatch",
                            "ACK does not target the active request",
                            false,
                            false,
                        )),
                    )?;
                }
            }
        }
        ProtocolMessage::Batch(_) | ProtocolMessage::Complete(_) | ProtocolMessage::Error(_) => {
            write_message(
                output,
                ProtocolMessage::Error(ErrorMessage::for_request(
                    message.request_id().to_string(),
                    "unexpected_message",
                    format!(
                        "{} is not accepted from Node",
                        message.message_type().as_str()
                    ),
                    false,
                    false,
                )),
            )?;
        }
    }
    Ok(())
}

fn start_request(
    request: AnalyzeRequest,
    worker_tx: Sender<WorkerEvent>,
    active: &mut Option<ActiveRequest>,
    runtime_state: Arc<Mutex<AnalyzerRuntimeState>>,
) {
    let request_id = request.header.request_id.clone();
    let cancelled = Arc::new(AtomicBool::new(false));
    let (ack_tx, ack_rx) = mpsc::channel();
    let worker_cancelled = Arc::clone(&cancelled);
    let worker_request_id = request_id.clone();
    thread::spawn(move || {
        let request_started = Instant::now();
        let mut candidate = match runtime_state
            .lock()
            .map(|runtime| runtime.clone())
            .map_err(|_| anyhow::anyhow!("analyzer runtime state lock poisoned"))
        {
            Ok(candidate) => candidate,
            Err(error) => {
                let _ = worker_tx.send(WorkerEvent::Message(ProtocolMessage::Error(
                    ErrorMessage::for_request(
                        worker_request_id.clone(),
                        "runtime_state_failed",
                        error.to_string(),
                        true,
                        false,
                    ),
                )));
                let _ = worker_tx.send(WorkerEvent::Finished(worker_request_id));
                return;
            }
        };
        let result = codex_rollout_collector::protocol::analyze_request_with_state(
            &request,
            &worker_cancelled,
            &mut candidate,
        );
        match result {
            Ok(batch) => {
                let batch_id = batch.batch_id.clone();
                let completeness = batch.completeness;
                let next_cursor = batch.next_cursor.clone();
                let checkpoint =
                    match codex_rollout_collector::protocol::checkpoint_for_batch(&request, &batch)
                    {
                        Ok(checkpoint) => checkpoint,
                        Err(error) => {
                            let _ = worker_tx.send(WorkerEvent::Message(ProtocolMessage::Error(
                                ErrorMessage::for_request(
                                    worker_request_id.clone(),
                                    "checkpoint_failed",
                                    error.to_string(),
                                    true,
                                    false,
                                ),
                            )));
                            let _ = worker_tx.send(WorkerEvent::Finished(worker_request_id));
                            return;
                        }
                    };
                if worker_tx
                    .send(WorkerEvent::Message(ProtocolMessage::Batch(batch)))
                    .is_ok()
                {
                    let timeout = Duration::from_millis(request.resource_limits.timeout_ms)
                        .saturating_sub(request_started.elapsed());
                    match wait_for_ack(&ack_rx, &worker_cancelled, &batch_id, timeout) {
                        Ok(()) => {
                            let commit_result = runtime_state
                                .lock()
                                .map(|mut runtime| {
                                    *runtime = candidate;
                                })
                                .map_err(|_| {
                                    anyhow::anyhow!("analyzer runtime state lock poisoned")
                                });
                            if let Err(error) = commit_result {
                                let _ = worker_tx.send(WorkerEvent::Message(
                                    ProtocolMessage::Error(ErrorMessage::for_request(
                                        worker_request_id.clone(),
                                        "runtime_state_commit_failed",
                                        error.to_string(),
                                        true,
                                        false,
                                    )),
                                ));
                                let _ = worker_tx.send(WorkerEvent::Finished(worker_request_id));
                                return;
                            }
                            let complete = CompleteMessage {
                                header: codex_rollout_collector::protocol::ProtocolHeader::new(
                                    MessageType::Complete,
                                    worker_request_id.clone(),
                                ),
                                status: "ok".to_string(),
                                completeness,
                                next_cursor,
                                checkpoint: Some(checkpoint),
                            };
                            let _ = worker_tx
                                .send(WorkerEvent::Message(ProtocolMessage::Complete(complete)));
                        }
                        Err((code, message, retryable)) => {
                            let _ = worker_tx.send(WorkerEvent::Message(ProtocolMessage::Error(
                                ErrorMessage::for_request(
                                    worker_request_id.clone(),
                                    code,
                                    message,
                                    retryable,
                                    false,
                                ),
                            )));
                        }
                    }
                }
            }
            Err(error) => {
                let cancelled = worker_cancelled.load(Ordering::Acquire)
                    || error.to_string().contains("cancelled");
                let error_text = error.to_string();
                let timed_out = error_text.contains("resource timeout");
                let unsupported_capability = error_text.contains("unsupported capability");
                let _ = worker_tx.send(WorkerEvent::Message(ProtocolMessage::Error(
                    ErrorMessage::for_request(
                        worker_request_id.clone(),
                        if cancelled {
                            "cancelled"
                        } else if timed_out {
                            "resource_timeout"
                        } else if unsupported_capability {
                            "unsupported_capability"
                        } else {
                            "analysis_failed"
                        },
                        error_text,
                        !cancelled && !unsupported_capability,
                        false,
                    ),
                )));
            }
        }
        let _ = worker_tx.send(WorkerEvent::Finished(worker_request_id));
    });
    *active = Some(ActiveRequest {
        request_id,
        cancelled,
        ack_tx,
    });
}

fn wait_for_ack(
    receiver: &Receiver<AckMessage>,
    cancelled: &AtomicBool,
    expected_batch_id: &str,
    timeout: Duration,
) -> Result<(), (&'static str, String, bool)> {
    let deadline = Instant::now() + timeout;
    loop {
        if cancelled.load(Ordering::Acquire) {
            return Err((
                "cancelled",
                "analysis was cancelled before ACK".to_string(),
                true,
            ));
        }
        if Instant::now() >= deadline {
            return Err((
                "resource_timeout",
                "Node did not ACK the analyzer batch within the request timeout budget".to_string(),
                true,
            ));
        }
        match receiver.recv_timeout(Duration::from_millis(50)) {
            Ok(ack) if ack.batch_id == expected_batch_id && ack.accepted && ack.persisted => {
                return Ok(());
            }
            Ok(ack) => {
                return Err((
                    "ack_rejected",
                    format!(
                        "batch {} was not persisted or does not match expected batch {}",
                        ack.batch_id, expected_batch_id
                    ),
                    true,
                ));
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                return Err((
                    "ack_channel_closed",
                    "Node ACK channel closed".to_string(),
                    true,
                ));
            }
        }
    }
}

fn handle_cancel(
    cancel: CancelMessage,
    active: &mut Option<ActiveRequest>,
    output: &mut impl Write,
) -> anyhow::Result<()> {
    cancel
        .header
        .validate(MessageType::Cancel)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    if let Some(request) = active.as_ref()
        && request.request_id == cancel.header.request_id
    {
        request.cancelled.store(true, Ordering::Release);
    } else {
        write_message(
            output,
            ProtocolMessage::Error(ErrorMessage::for_request(
                cancel.header.request_id,
                "cancel_request_not_found",
                "no active request matches cancel",
                false,
                false,
            )),
        )?;
    }
    Ok(())
}

fn write_protocol_error(
    output: &mut impl Write,
    request_id: &str,
    error: AnalyzerProtocolError,
) -> anyhow::Result<()> {
    write_message(
        output,
        ProtocolMessage::Error(ErrorMessage::for_request(
            request_id.to_string(),
            "invalid_protocol",
            error.to_string(),
            false,
            false,
        )),
    )
}

fn write_message(output: &mut impl Write, message: ProtocolMessage) -> anyhow::Result<()> {
    writeln!(output, "{}", message.to_json_line()?)?;
    output.flush()?;
    Ok(())
}

fn request_id_from_line(line: &str) -> String {
    serde_json::from_str::<serde_json::Value>(line)
        .ok()
        .and_then(|value| {
            value
                .get("request_id")
                .and_then(serde_json::Value::as_str)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
        })
        .unwrap_or_else(|| "unknown".to_string())
}
