//! Target-process protocol lifecycle for the 4.5 analyzer boundary.
//!
//! This module owns the process generation, handshake admission, single
//! active request, batch delivery and ACK/complete settlement boundary.  The
//! source locator, adapter and reducer remain outside this module: they hand
//! a validated `TargetBatchMessage` to [`TargetRuntime::publish_batch`] and
//! receive a validated terminal decision back.

use std::time::{Duration, Instant};

use serde_json::json;

use super::startup::TargetStartupConfig;
use super::target::{
    TARGET_ANALYZE_CAPABILITY, TARGET_REQUIRED_CAPABILITIES, TargetAckMessage, TargetAnalyzeMode,
    TargetAnalyzeRequest, TargetAnalyzerHello, TargetBatchMessage, TargetCancelMessage,
    TargetCapabilitySet, TargetCompleteMessage, TargetCompleteness, TargetErrorMessage,
    TargetMessage, TargetNodeHello, TargetRecovery,
};
use super::target_data::{TargetAnalyzerCursor, TargetDeliveryIdentity};
use crate::protocol::ANALYZER_VERSION;
use crate::version::{COMPATIBILITY_LAYER_VERSION, PARSER_BACKEND};

/// The request identity held by the target process while an analyze attempt is
/// admitted.  The slot is process-wide; it is not a product-level worker or
/// lease abstraction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetActiveRequest {
    pub request_id: String,
    pub job_id: String,
    pub conversation_id: String,
    pub mode: TargetAnalyzeMode,
}

#[derive(Debug, Clone)]
struct PendingBatch {
    identity: TargetDeliveryIdentity,
    batch: TargetBatchMessage,
}

#[derive(Debug, Clone)]
struct AcknowledgedBatch {
    identity: TargetDeliveryIdentity,
    source_id: String,
    source_epoch: String,
    next_cursor: Option<TargetAnalyzerCursor>,
    completeness: TargetCompleteness,
}

#[derive(Debug)]
struct ActiveRequestState {
    request: TargetActiveRequest,
    recovery: Option<TargetRecovery>,
    deadline: Instant,
    pending_batch: Option<PendingBatch>,
    acknowledged_batches: Vec<AcknowledgedBatch>,
}

#[derive(Debug, Clone)]
struct RejectedAck {
    request_id: String,
    identity: TargetDeliveryIdentity,
    rejection_code: String,
}

/// Messages and process disposition produced by one target input message or
/// one internal delivery event.
#[derive(Debug, Default, PartialEq)]
pub struct TargetRuntimeAction {
    pub outbound: Vec<TargetMessage>,
    pub terminate: bool,
}

impl TargetRuntimeAction {
    fn none() -> Self {
        Self::default()
    }

    fn message(message: TargetMessage) -> Self {
        Self {
            outbound: vec![message],
            terminate: false,
        }
    }

    fn fatal(message: TargetMessage) -> Self {
        Self {
            outbound: vec![message],
            terminate: true,
        }
    }
}

/// State machine for the target analyzer process.
#[derive(Debug)]
pub struct TargetRuntime {
    startup: TargetStartupConfig,
    generation_id: Option<String>,
    negotiated_capabilities: Option<TargetCapabilitySet>,
    active_request: Option<ActiveRequestState>,
    last_rejected_ack: Option<RejectedAck>,
    terminated: bool,
}

impl TargetRuntime {
    pub fn new(startup: TargetStartupConfig) -> Self {
        Self {
            startup,
            generation_id: None,
            negotiated_capabilities: None,
            active_request: None,
            last_rejected_ack: None,
            terminated: false,
        }
    }

    pub fn startup_config(&self) -> &TargetStartupConfig {
        &self.startup
    }

    pub fn generation_id(&self) -> Option<&str> {
        self.generation_id.as_deref()
    }

    pub fn negotiated_capabilities(&self) -> Option<&TargetCapabilitySet> {
        self.negotiated_capabilities.as_ref()
    }

    pub fn active_request(&self) -> Option<&TargetActiveRequest> {
        self.active_request.as_ref().map(|state| &state.request)
    }

    pub fn awaiting_ack(&self) -> Option<&TargetDeliveryIdentity> {
        self.active_request
            .as_ref()
            .and_then(|state| state.pending_batch.as_ref())
            .map(|pending| &pending.identity)
    }

    pub fn last_acknowledged_identity(&self) -> Option<&TargetDeliveryIdentity> {
        self.active_request
            .as_ref()
            .and_then(|state| state.acknowledged_batches.last())
            .map(|batch| &batch.identity)
    }

    pub fn is_terminated(&self) -> bool {
        self.terminated
    }

    /// Return the next process wake-up deadline.  The stdio event loop uses
    /// this to notice a missing ACK even when stdin is otherwise idle.
    pub fn next_deadline(&self) -> Option<Instant> {
        self.active_request.as_ref().map(|state| state.deadline)
    }

    /// Consume one already parsed target message and return the resulting
    /// protocol output.  No legacy `ProtocolMessage` can enter this state
    /// machine because the target process parses through `TargetMessage` only.
    pub fn handle(&mut self, message: TargetMessage) -> TargetRuntimeAction {
        let request_id = message.request_id().to_string();
        if self.terminated {
            return TargetRuntimeAction {
                outbound: Vec::new(),
                terminate: true,
            };
        }

        if let Err(error) = message.validate() {
            return self.protocol_error(request_id, "invalid_protocol", error, false, false);
        }

        if self.generation_id.is_none() && !matches!(&message, TargetMessage::NodeHello(_)) {
            return self.protocol_error(
                request_id,
                "handshake_required",
                "Node hello must be accepted before target messages",
                false,
                false,
            );
        }

        if matches!(
            &message,
            TargetMessage::Analyze(_) | TargetMessage::Cancel(_) | TargetMessage::Ack(_)
        ) {
            if let Some(action) = self.expire_if_deadline_passed(Instant::now()) {
                return action;
            }
        }

        match message {
            TargetMessage::NodeHello(hello) => self.handle_node_hello(hello),
            TargetMessage::AnalyzerHello(_) => self.protocol_error(
                request_id,
                "invalid_hello_role",
                "analyzer hello is an outbound target message",
                false,
                true,
            ),
            TargetMessage::Analyze(request) => self.handle_analyze(request),
            TargetMessage::Cancel(cancel) => self.handle_cancel(cancel),
            TargetMessage::Ack(ack) => self.handle_ack(ack),
            TargetMessage::Batch(_)
            | TargetMessage::Complete(_)
            | TargetMessage::Error(_) => self.protocol_error(
                request_id,
                "unexpected_message",
                "message direction is not accepted by the target process at this lifecycle step",
                false,
                false,
            ),
        }
    }

    /// Publish one source/adapter-produced batch.  The batch is emitted at
    /// most once for a new delivery identity and then remains pending until a
    /// matching positive ACK arrives.  Re-publishing the exact pending batch
    /// retransmits the same wire identity; it never creates a new batch.
    pub fn publish_batch(&mut self, batch: TargetBatchMessage) -> TargetRuntimeAction {
        let now = Instant::now();
        if let Some(action) = self.expire_if_deadline_passed(now) {
            return action;
        }

        let Some(active) = self.active_request.as_ref() else {
            return self.protocol_error(
                batch.header.request_id,
                "batch_request_not_found",
                "no active request can receive a batch",
                false,
                false,
            );
        };
        let request_id = active.request.request_id.clone();

        let identity =
            match validate_batch_for_request(&active.request, active.recovery.as_ref(), &batch) {
                Ok(identity) => identity,
                Err(error) => {
                    return self.terminal_request_error(
                        request_id,
                        "analysis_failed",
                        error,
                        false,
                        false,
                    );
                }
            };

        if let Some(pending) = &active.pending_batch {
            if pending.identity == identity && pending.batch == batch {
                return TargetRuntimeAction::message(TargetMessage::Batch(batch));
            }
            return self.protocol_error(
                request_id,
                "batch_ack_pending",
                "a different batch cannot be published before the current batch is ACKed",
                false,
                false,
            );
        }

        if active
            .acknowledged_batches
            .iter()
            .any(|acknowledged| acknowledged.identity == identity)
        {
            return self.protocol_error(
                request_id,
                "duplicate_batch",
                "the batch delivery identity was already ACKed in this request",
                false,
                false,
            );
        }

        // Resource limits account for source read/analysis bytes.  The source
        // bridge owns that accounting; an outbound target payload can be
        // larger or smaller after projection/diagnostic mapping and must not
        // be measured as source usage here.
        let pending = PendingBatch {
            identity,
            batch: batch.clone(),
        };
        self.active_request
            .as_mut()
            .expect("active request remains while publishing batch")
            .pending_batch = Some(pending);
        TargetRuntimeAction::message(TargetMessage::Batch(batch))
    }

    /// Emit the request terminal complete only after at least one batch has
    /// been positively ACKed and no batch remains ACK-pending.
    pub fn complete_request(&mut self, complete: TargetCompleteMessage) -> TargetRuntimeAction {
        if let Some(action) = self.expire_if_deadline_passed(Instant::now()) {
            return action;
        }

        let request_id = complete.header.request_id.clone();
        let Some(active) = self.active_request.as_ref() else {
            return self.protocol_error(
                request_id,
                "complete_request_not_found",
                "no active request can emit complete",
                false,
                false,
            );
        };
        if active.request.request_id != complete.header.request_id
            || active.request.job_id != complete.job_id
        {
            return self.protocol_error(
                request_id,
                "complete_rejected",
                "complete request/job identity does not match the active request",
                false,
                false,
            );
        }
        if active.pending_batch.is_some() || active.acknowledged_batches.is_empty() {
            return self.protocol_error(
                request_id,
                "complete_before_ack",
                "complete requires at least one settled positive ACK and no pending batch",
                false,
                false,
            );
        }

        if let Err(error) = complete.validate_for_output() {
            return self.terminal_request_error(
                request_id,
                "analysis_failed",
                error.to_string(),
                false,
                false,
            );
        }

        let last_acknowledged = active
            .acknowledged_batches
            .last()
            .expect("non-empty acknowledged batch list");
        if let Err(error) =
            validate_complete_for_request(&active.request, last_acknowledged, &complete)
        {
            return self.terminal_request_error(request_id, "analysis_failed", error, false, false);
        }

        self.active_request = None;
        TargetRuntimeAction::message(TargetMessage::Complete(complete))
    }

    /// Terminate an active request from an internal source/analysis failure.
    /// This is intentionally separate from a protocol error: the process can
    /// remain alive for a new request unless the caller marks the failure
    /// fatal.
    pub fn fail_active_request(
        &mut self,
        request_id: &str,
        code: impl Into<String>,
        message: impl Into<String>,
        retryable: bool,
        fatal: bool,
    ) -> TargetRuntimeAction {
        if let Some(action) = self.expire_if_deadline_passed(Instant::now()) {
            return action;
        }

        let matches_active = self
            .active_request
            .as_ref()
            .is_some_and(|active| active.request.request_id == request_id);
        if !matches_active {
            return self.protocol_error(
                request_id.to_string(),
                "request_not_found",
                "no active request matches the internal failure",
                false,
                false,
            );
        }
        self.active_request = None;
        self.error_action(
            request_id.to_string(),
            code.into(),
            message.into(),
            retryable,
            fatal,
            None,
        )
    }

    /// Advance timeout state without consuming an input message.
    pub fn poll(&mut self, now: Instant) -> TargetRuntimeAction {
        self.expire_if_deadline_passed(now)
            .unwrap_or_else(TargetRuntimeAction::none)
    }

    fn handle_node_hello(&mut self, hello: TargetNodeHello) -> TargetRuntimeAction {
        if self.generation_id.is_some() {
            return self.protocol_error(
                hello.header.request_id,
                "duplicate_hello",
                "target process generation already completed its hello handshake",
                false,
                true,
            );
        }

        let analyzer_capabilities = TARGET_REQUIRED_CAPABILITIES
            .iter()
            .map(|capability| (*capability).to_string())
            .collect::<Vec<_>>();
        let negotiated = match super::target::negotiate_capabilities(
            &hello.capabilities,
            &analyzer_capabilities,
        ) {
            Ok(capabilities) => capabilities,
            Err(error) => {
                return self.protocol_error(
                    hello.header.request_id,
                    "unsupported_capability",
                    error,
                    false,
                    true,
                );
            }
        };

        let response = TargetAnalyzerHello::respond_to(
            &hello,
            ANALYZER_VERSION,
            analyzer_capabilities,
            PARSER_BACKEND,
            COMPATIBILITY_LAYER_VERSION,
        );
        self.generation_id = Some(hello.header.request_id.clone());
        self.negotiated_capabilities = Some(negotiated);
        TargetRuntimeAction::message(TargetMessage::AnalyzerHello(response))
    }

    fn handle_analyze(&mut self, request: TargetAnalyzeRequest) -> TargetRuntimeAction {
        if self
            .negotiated_capabilities
            .as_ref()
            .is_none_or(|capabilities| !capabilities.supports(TARGET_ANALYZE_CAPABILITY))
        {
            return self.protocol_error(
                request.header.request_id,
                "unsupported_capability",
                "analyze capability was not negotiated",
                false,
                true,
            );
        }

        if self.active_request.is_some() {
            return self.protocol_error(
                request.header.request_id,
                "busy",
                "analyzer process already has an active request",
                false,
                false,
            );
        }

        if self
            .generation_id
            .as_deref()
            .is_some_and(|generation_id| generation_id == request.header.request_id)
        {
            return self.protocol_error(
                request.header.request_id,
                "request_id_conflict",
                "analyze request_id must not reuse the process hello generation id",
                false,
                false,
            );
        }

        let requested_limits = request.resource_limits.clone().unwrap_or_default();
        if let Err(error) = requested_limits.validate_for_runtime() {
            return self.protocol_error(
                request.header.request_id,
                "invalid_resource_limits",
                error,
                false,
                false,
            );
        }
        let limits = requested_limits.resolve();
        if limits.timeout_ms == 0 {
            return self.protocol_error(
                request.header.request_id,
                "resource_timeout",
                "timeout_ms=0 leaves no analysis or ACK budget",
                true,
                false,
            );
        }
        if limits.max_decoded_bytes == 0
            || limits.max_line_bytes == 0
            || limits.max_segment_bytes == 0
            || (request.mode == TargetAnalyzeMode::Preview && limits.tail_bytes == 0)
        {
            return self.protocol_error(
                request.header.request_id,
                "resource_limit_exceeded",
                "resource limits leave no safe source or batch prefix",
                false,
                false,
            );
        }

        let deadline = Instant::now() + Duration::from_millis(limits.timeout_ms);
        self.active_request = Some(ActiveRequestState {
            request: TargetActiveRequest {
                request_id: request.header.request_id,
                job_id: request.job_id,
                conversation_id: request.conversation_id,
                mode: request.mode,
            },
            recovery: request.recovery,
            deadline,
            pending_batch: None,
            acknowledged_batches: Vec::new(),
        });
        TargetRuntimeAction::none()
    }

    fn handle_cancel(&mut self, cancel: TargetCancelMessage) -> TargetRuntimeAction {
        let matches_active = self
            .active_request
            .as_ref()
            .is_some_and(|active| active.request.request_id == cancel.header.request_id);
        if !matches_active {
            return self.protocol_error(
                cancel.header.request_id,
                "cancel_request_not_found",
                "no active request matches cancel",
                false,
                false,
            );
        }

        self.active_request = None;
        TargetRuntimeAction::message(TargetMessage::Error(TargetErrorMessage::new(
            cancel.header.request_id,
            "cancelled",
            "target analyze request cancelled",
            false,
            false,
        )))
    }

    fn handle_ack(&mut self, ack: TargetAckMessage) -> TargetRuntimeAction {
        if let Some(action) = self.expire_if_deadline_passed(Instant::now()) {
            return action;
        }

        let identity = TargetDeliveryIdentity::new(
            ack.job_id.clone(),
            ack.segment_id.clone(),
            ack.batch_id.clone(),
        );
        if let Some(active) = self.active_request.as_ref() {
            if active.request.request_id != ack.header.request_id {
                return self.protocol_error(
                    ack.header.request_id,
                    "ack_rejected",
                    "ACK request_id does not match the active request",
                    false,
                    false,
                );
            }

            let Some(pending) = active.pending_batch.as_ref() else {
                if ack.accepted
                    && ack.persisted
                    && active
                        .acknowledged_batches
                        .last()
                        .is_some_and(|settled| settled.identity == identity)
                {
                    // A duplicate positive ACK is harmless at the Rust
                    // state boundary.  It cannot advance a second time.
                    return TargetRuntimeAction::none();
                }
                return self.protocol_error(
                    ack.header.request_id,
                    "ack_rejected",
                    "no matching batch is awaiting this ACK",
                    false,
                    false,
                );
            };
            if pending.identity != identity {
                return self.protocol_error(
                    ack.header.request_id,
                    "ack_rejected",
                    "ACK delivery identity does not match the pending batch",
                    false,
                    false,
                );
            }
        } else if let Some(rejected) = &self.last_rejected_ack
            && rejected.request_id == ack.header.request_id
            && rejected.identity == identity
            && !ack.accepted
            && !ack.persisted
            && ack.error.as_deref() == Some(rejected.rejection_code.as_str())
        {
            return self
                .batch_rejected_action(ack.header.request_id, rejected.rejection_code.clone());
        } else {
            return self.protocol_error(
                ack.header.request_id,
                "ack_rejected",
                "no active request matches this ACK",
                false,
                false,
            );
        }

        if ack.accepted && ack.persisted {
            let active = self
                .active_request
                .as_mut()
                .expect("active request remains while settling ACK");
            let pending = active
                .pending_batch
                .take()
                .expect("pending batch was checked above");
            active.acknowledged_batches.push(AcknowledgedBatch {
                identity: pending.identity,
                source_id: pending.batch.payload.source_id,
                source_epoch: pending.batch.payload.source_epoch,
                next_cursor: pending.batch.payload.next_cursor,
                completeness: pending.batch.payload.completeness,
            });
            return TargetRuntimeAction::none();
        }

        let rejection_code = ack
            .error
            .expect("TargetAckMessage validation requires negative ACK error");
        self.last_rejected_ack = Some(RejectedAck {
            request_id: ack.header.request_id.clone(),
            identity,
            rejection_code: rejection_code.clone(),
        });
        self.active_request = None;
        self.batch_rejected_action(ack.header.request_id, rejection_code)
    }

    fn expire_if_deadline_passed(&mut self, now: Instant) -> Option<TargetRuntimeAction> {
        let request_id = self
            .active_request
            .as_ref()
            .filter(|active| active.deadline <= now)
            .map(|active| active.request.request_id.clone())?;

        Some(self.terminal_request_error(
            request_id,
            "resource_timeout",
            "target request timeout budget expired before completion",
            true,
            false,
        ))
    }

    fn batch_rejected_action(
        &mut self,
        request_id: String,
        rejection_code: String,
    ) -> TargetRuntimeAction {
        self.error_action(
            request_id,
            "batch_rejected".to_string(),
            "Node rejected the target batch at its durable staging boundary".to_string(),
            rejection_code == "staging_unavailable",
            false,
            Some(json!({"rejection_code": rejection_code})),
        )
    }

    fn terminal_request_error(
        &mut self,
        request_id: String,
        code: &'static str,
        message: impl Into<String>,
        retryable: bool,
        fatal: bool,
    ) -> TargetRuntimeAction {
        self.active_request = None;
        self.error_action(
            request_id,
            code.to_string(),
            message.into(),
            retryable,
            fatal,
            None,
        )
    }

    fn protocol_error(
        &mut self,
        request_id: String,
        code: &'static str,
        error: impl std::fmt::Display,
        retryable: bool,
        fatal: bool,
    ) -> TargetRuntimeAction {
        self.error_action(
            request_id,
            code.to_string(),
            error.to_string(),
            retryable,
            fatal,
            None,
        )
    }

    fn error_action(
        &mut self,
        request_id: String,
        code: String,
        message: String,
        retryable: bool,
        fatal: bool,
        details: Option<serde_json::Value>,
    ) -> TargetRuntimeAction {
        let mut error = TargetErrorMessage::new(request_id, code, message, retryable, fatal);
        error.details = details;
        if fatal {
            self.active_request = None;
            self.terminated = true;
            TargetRuntimeAction::fatal(TargetMessage::Error(error))
        } else {
            TargetRuntimeAction::message(TargetMessage::Error(error))
        }
    }
}

fn validate_batch_for_request(
    request: &TargetActiveRequest,
    recovery: Option<&TargetRecovery>,
    batch: &TargetBatchMessage,
) -> Result<TargetDeliveryIdentity, String> {
    batch.validate().map_err(|error| error.to_string())?;
    if batch.header.request_id != request.request_id {
        return Err("target batch request_id does not match the active request".to_string());
    }
    if batch.job_id != request.job_id {
        return Err("target batch job_id does not match the active request".to_string());
    }
    if batch.payload.conversation_id != request.conversation_id {
        return Err("target batch conversation_id does not match the active request".to_string());
    }

    let identity = TargetDeliveryIdentity::new(
        batch.job_id.clone(),
        batch.segment_id.clone(),
        batch.batch_id.clone(),
    );
    identity.validate().map_err(|error| error.to_string())?;
    if let Some(recovery) = recovery {
        if recovery.segment_id != identity.segment_id || recovery.batch_id != identity.batch_id {
            return Err(
                "target batch delivery identity does not match the requested recovery identity"
                    .to_string(),
            );
        }
    }
    Ok(identity)
}

fn validate_complete_for_request(
    request: &TargetActiveRequest,
    last_acknowledged: &AcknowledgedBatch,
    complete: &TargetCompleteMessage,
) -> Result<(), String> {
    if complete.checkpoint.conversation_id != request.conversation_id {
        return Err(
            "complete checkpoint conversation_id does not match the active request".to_string(),
        );
    }
    if complete.checkpoint.projection_watermark.segment_id != last_acknowledged.identity.segment_id
        || complete.checkpoint.projection_watermark.batch_id != last_acknowledged.identity.batch_id
    {
        return Err(
            "complete checkpoint watermark must identify the last positively ACKed batch"
                .to_string(),
        );
    }
    if complete.checkpoint.source.source_id != last_acknowledged.source_id
        || complete.checkpoint.source.source_epoch != last_acknowledged.source_epoch
    {
        return Err(
            "complete checkpoint source scope does not match the last ACKed batch".to_string(),
        );
    }
    if complete.checkpoint.cursor != last_acknowledged.next_cursor {
        return Err(
            "complete checkpoint cursor must match the last ACKed batch cursor".to_string(),
        );
    }
    let completeness_compatible = match last_acknowledged.completeness {
        TargetCompleteness::Canonical => complete.completeness == TargetCompleteness::Canonical,
        TargetCompleteness::Unknown
        | TargetCompleteness::Partial
        | TargetCompleteness::Provisional => matches!(
            complete.completeness,
            TargetCompleteness::Partial | TargetCompleteness::Provisional
        ),
    };
    if !completeness_compatible {
        return Err(
            "complete completeness cannot promote or downgrade the last ACKed batch implicitly"
                .to_string(),
        );
    }
    Ok(())
}
