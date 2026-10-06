//! Stdio JSONL entry point for the isolated stage 4 analyzer.

use std::io::{self, BufRead, BufReader, BufWriter, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, Sender, TryRecvError};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use codex_rollout_collector::protocol::{
    AckMessage, AnalyzeRequest, AnalyzerProtocolError, AnalyzerRuntimeState, CancelMessage,
    CompleteMessage, ErrorMessage, HelloMessage, MessageType, ProtocolMessage, StartupMode,
    TargetAnalyzeRequest, TargetAnalyzerCheckpoint, TargetBatchMessage, TargetCompleteMessage,
    TargetErrorMessage, TargetMappedAnalysis, TargetMessage, TargetRuntime, TargetRuntimeAction,
    TargetSourceReadError, TargetStartupConfig, map_target_source_read_with_profile_and_control,
    parse_startup_args, read_target_source_with_deadline,
};

enum InputCommand {
    Line(String),
    Eof,
}

enum TargetInput {
    Line(String),
    ReadError(String),
    Deadline,
    SourceReadFinished {
        request: TargetAnalyzeRequest,
        worker_token: u64,
        result: Result<TargetMappedAnalysis, TargetSourceReadError>,
    },
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

type SourceWorkerSlot = (String, u64, Arc<AtomicBool>);

fn source_worker_is_current(
    slot: Option<&SourceWorkerSlot>,
    request_id: &str,
    worker_token: u64,
) -> bool {
    slot.is_some_and(|(active_request_id, active_token, _)| {
        active_request_id == request_id && *active_token == worker_token
    })
}

#[derive(Clone)]
struct TargetTestDelivery {
    batch: TargetBatchMessage,
    complete: TargetCompleteMessage,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("codex-rollout-collector: {error:#}");
        std::process::exit(1);
    }
}

fn run() -> anyhow::Result<()> {
    match parse_startup_args(std::env::args_os().skip(1))? {
        StartupMode::Legacy => run_legacy(),
        StartupMode::Target(config) => run_target(config),
    }
}

fn run_target(config: TargetStartupConfig) -> anyhow::Result<()> {
    let mut runtime = TargetRuntime::new(config);
    let test_delivery = load_target_test_delivery();
    let (input_tx, input_rx) = mpsc::channel();
    let input_reader_tx = input_tx.clone();
    thread::spawn(move || read_target_input(input_reader_tx));
    let mut source_cancellation: Option<SourceWorkerSlot> = None;
    let mut next_source_worker_token = 0_u64;
    let mut pending_target_complete: Option<(String, TargetCompleteMessage)> = None;

    let stdout = io::stdout();
    let mut output = BufWriter::new(stdout.lock());

    loop {
        let input = match runtime.next_deadline() {
            Some(deadline) => {
                let timeout = deadline.saturating_duration_since(Instant::now());
                match input_rx.recv_timeout(timeout) {
                    Ok(input) => input,
                    Err(mpsc::RecvTimeoutError::Timeout) => TargetInput::Deadline,
                    Err(mpsc::RecvTimeoutError::Disconnected) => TargetInput::Eof,
                }
            }
            None => match input_rx.recv() {
                Ok(input) => input,
                Err(_) => TargetInput::Eof,
            },
        };

        match input {
            TargetInput::Eof => break,
            TargetInput::Deadline => {
                let expired_request_id = runtime
                    .active_request()
                    .map(|active| active.request_id.clone());
                let action = runtime.poll(Instant::now());
                if action.outbound.iter().any(|message| {
                    matches!(
                        message,
                        TargetMessage::Error(error) if error.code == "resource_timeout"
                    )
                }) {
                    if let Some((request_id, _, cancelled)) = source_cancellation.as_ref()
                        && expired_request_id.as_deref() == Some(request_id.as_str())
                    {
                        cancelled.store(true, Ordering::Release);
                    }
                }
                if write_target_action(&mut output, action)? {
                    break;
                }
                if runtime.active_request().is_none() {
                    pending_target_complete = None;
                }
            }
            TargetInput::SourceReadFinished {
                request,
                worker_token,
                result,
            } => {
                let request_id = request.header.request_id.clone();
                let worker_is_current = source_worker_is_current(
                    source_cancellation.as_ref(),
                    &request_id,
                    worker_token,
                );
                if worker_is_current {
                    // The worker owns the slot until it has actually exited
                    // and reported its result. This remains true after a
                    // cancel/timeout so a replacement request cannot start
                    // concurrently with the abandoned worker.
                    source_cancellation = None;
                }
                if test_delivery.is_some() {
                    // The debug fixture path intentionally owns its synthetic
                    // batch lifecycle. The source worker still exercises the
                    // target-side locating/read bridge, but its result is not
                    // allowed to race the lifecycle fixture assertions.
                    continue;
                }
                if !worker_is_current
                    || runtime
                        .active_request()
                        .is_none_or(|active| active.request_id != request_id)
                {
                    continue;
                }
                match result {
                    Err(error) => {
                        let code = target_source_error_code(&error);
                        let retryable = error.is_retryable();
                        if write_target_action(
                            &mut output,
                            runtime.fail_active_request(
                                &request_id,
                                code,
                                error.to_string(),
                                retryable,
                                false,
                            ),
                        )? {
                            break;
                        }
                    }
                    Ok(mapped) => {
                        pending_target_complete = Some((request_id.clone(), mapped.complete));
                        if write_target_action(&mut output, runtime.publish_batch(mapped.batch))? {
                            break;
                        }
                    }
                }
                if runtime.active_request().is_none() {
                    pending_target_complete = None;
                }
            }
            TargetInput::ReadError(error) => {
                write_target_message(
                    &mut output,
                    TargetMessage::Error(TargetErrorMessage::new(
                        "unknown",
                        "stdin_read_error",
                        error.to_string(),
                        false,
                        true,
                    )),
                )?;
                break;
            }
            TargetInput::Line(line) => {
                let request_id = request_id_from_line(&line);
                let message = match TargetMessage::parse_line(&line) {
                    Ok(message) => message,
                    Err(error) => {
                        write_target_message(
                            &mut output,
                            TargetMessage::Error(TargetErrorMessage::new(
                                request_id,
                                "malformed_protocol",
                                error.to_string(),
                                false,
                                false,
                            )),
                        )?;
                        continue;
                    }
                };

                let analyze_request = match &message {
                    TargetMessage::Analyze(request) => Some(request.clone()),
                    _ => None,
                };
                let cancel_request_id = match &message {
                    TargetMessage::Cancel(cancel) => Some(cancel.header.request_id.clone()),
                    _ => None,
                };
                if let Some(request_id) = cancel_request_id.as_deref()
                    && source_cancellation
                        .as_ref()
                        .is_some_and(|(active_id, _, _)| active_id == request_id)
                {
                    if let Some((_, _, cancelled)) = source_cancellation.as_ref() {
                        cancelled.store(true, Ordering::Release);
                    }
                }
                if analyze_request.is_some() && source_cancellation.is_some() {
                    let request_id = message.request_id().to_string();
                    write_target_message(
                        &mut output,
                        TargetMessage::Error(TargetErrorMessage::new(
                            request_id,
                            "busy",
                            "analyzer source worker is still shutting down",
                            false,
                            false,
                        )),
                    )?;
                    continue;
                }
                let is_analyze = analyze_request.is_some();
                let is_positive_ack = matches!(
                    &message,
                    TargetMessage::Ack(ack) if ack.accepted && ack.persisted
                );
                let action = runtime.handle(message);
                let action_succeeded = action.outbound.is_empty() && !action.terminate;
                if write_target_action(&mut output, action)? {
                    break;
                }

                if action_succeeded
                    && let Some(request) = analyze_request
                    && runtime
                        .active_request()
                        .is_some_and(|active| active.request_id == request.header.request_id)
                {
                    let request_id = request.header.request_id.clone();
                    let cancelled = Arc::new(AtomicBool::new(false));
                    next_source_worker_token = next_source_worker_token
                        .checked_add(1)
                        .ok_or_else(|| anyhow::anyhow!("source worker token exhausted"))?;
                    let worker_token = next_source_worker_token;
                    let worker_cancelled = Arc::clone(&cancelled);
                    let worker_startup = runtime.startup_config().clone();
                    let worker_deadline = runtime
                        .next_deadline()
                        .expect("accepted target request has a deadline");
                    let worker_tx = input_tx.clone();
                    let history_profile = runtime.history_profile(&request);
                    let worker_request = request.clone();
                    thread::spawn(move || {
                        target_test_worker_delay();
                        let result = read_target_source_with_deadline(
                            &request,
                            &worker_startup,
                            &worker_cancelled,
                            worker_deadline,
                        )
                        .and_then(|source| {
                            map_target_source_read_with_profile_and_control(
                                &request,
                                &source,
                                history_profile,
                                &worker_cancelled,
                                worker_deadline,
                            )
                        });
                        let _ = worker_tx.send(TargetInput::SourceReadFinished {
                            request: worker_request,
                            worker_token,
                            result,
                        });
                    });
                    source_cancellation = Some((request_id, worker_token, cancelled));
                }

                // Debug-only fixture bridge for the Rust subprocess protocol
                // tests. It does not add a wire message or startup argument.
                // The target source worker above still performs the real
                // sessions_root discovery/read. Production delivery is
                // completed by the source-finished mapper above.
                if action_succeeded
                    && is_analyze
                    && runtime
                        .active_request()
                        .is_some_and(|active| active.request_id == request_id)
                {
                    if let Some(delivery) = &test_delivery {
                        if write_target_action(
                            &mut output,
                            runtime.publish_batch(delivery.batch.clone()),
                        )? {
                            break;
                        }
                    }
                }

                if action_succeeded
                    && is_positive_ack
                    && runtime
                        .active_request()
                        .is_some_and(|active| active.request_id == request_id)
                {
                    if let Some(delivery) = &test_delivery {
                        if write_target_action(
                            &mut output,
                            runtime.complete_request(delivery.complete.clone()),
                        )? {
                            break;
                        }
                    } else if pending_target_complete
                        .as_ref()
                        .is_some_and(|(pending_id, _)| pending_id == &request_id)
                    {
                        let (_, complete) = pending_target_complete
                            .take()
                            .expect("pending target complete checked above");
                        if write_target_action(&mut output, runtime.complete_request(complete))? {
                            break;
                        }
                    }
                }

                if runtime.active_request().is_none() {
                    pending_target_complete = None;
                }
            }
        }
    }

    output.flush()?;
    Ok(())
}

fn read_target_input(sender: Sender<TargetInput>) {
    let stdin = io::stdin();
    let reader = BufReader::new(stdin.lock());
    for line in reader.lines() {
        match line {
            Ok(line) => {
                if sender.send(TargetInput::Line(line)).is_err() {
                    return;
                }
            }
            Err(error) => {
                let _ = sender.send(TargetInput::ReadError(error.to_string()));
                return;
            }
        }
    }
    let _ = sender.send(TargetInput::Eof);
}

fn write_target_action(
    output: &mut impl Write,
    action: TargetRuntimeAction,
) -> anyhow::Result<bool> {
    for outbound in action.outbound {
        write_target_message(output, outbound)?;
    }
    Ok(action.terminate)
}

fn load_target_test_delivery() -> Option<TargetTestDelivery> {
    #[cfg(debug_assertions)]
    {
        let raw = std::env::var("TERMLINK_TARGET_PROTOCOL_TEST_DELIVERY").ok()?;
        let value = serde_json::from_str::<serde_json::Value>(&raw).ok()?;
        let batch =
            serde_json::from_value::<TargetBatchMessage>(value.get("batch")?.clone()).ok()?;
        let complete =
            serde_json::from_value::<TargetCompleteMessage>(value.get("complete")?.clone()).ok()?;
        let _ = serde_json::from_value::<TargetAnalyzerCheckpoint>(
            value.get("complete")?.get("checkpoint")?.clone(),
        )
        .ok()?;
        Some(TargetTestDelivery { batch, complete })
    }
    #[cfg(not(debug_assertions))]
    {
        None
    }
}

fn target_test_worker_delay() {
    #[cfg(debug_assertions)]
    if let Ok(raw) = std::env::var("TERMLINK_TARGET_PROTOCOL_TEST_WORKER_DELAY_MS")
        && let Ok(delay_ms) = raw.parse::<u64>()
    {
        thread::sleep(Duration::from_millis(delay_ms));
    }
}

fn run_legacy() -> anyhow::Result<()> {
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

fn write_target_message(output: &mut impl Write, message: TargetMessage) -> anyhow::Result<()> {
    writeln!(output, "{}", message.to_json_line()?)?;
    output.flush()?;
    Ok(())
}

fn target_source_error_code(error: &TargetSourceReadError) -> &'static str {
    if let TargetSourceReadError::Mapping(message) = error {
        if message.starts_with("unsupported_capability:") {
            return "unsupported_capability";
        }
        if message.starts_with("checkpoint_incompatible:") {
            return "checkpoint_incompatible";
        }
    }
    error.wire_error_code()
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

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::AtomicBool;

    use super::{SourceWorkerSlot, source_worker_is_current};

    #[test]
    fn stale_source_worker_result_is_rejected_after_request_id_reuse() {
        let slot: SourceWorkerSlot = (
            "reused-request".to_string(),
            2,
            Arc::new(AtomicBool::new(false)),
        );

        assert!(!source_worker_is_current(Some(&slot), "reused-request", 1));
        assert!(source_worker_is_current(Some(&slot), "reused-request", 2));
        assert!(!source_worker_is_current(Some(&slot), "other-request", 2));
        assert!(!source_worker_is_current(None, "reused-request", 2));
    }
}
