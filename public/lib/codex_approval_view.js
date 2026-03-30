(function attachCodexApprovalView(globalScope) {
    const t = typeof globalScope.t === 'function' ? globalScope.t : (k) => k;
    const VALID_REQUEST_KINDS = new Set(['command', 'file', 'patch', 'userInput']);
    const VALID_RESPONSE_MODES = new Set(['decision', 'answers']);

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    function normalizeRequestKind(value) {
        const normalized = isNonEmptyString(value) ? value.trim() : '';
        return VALID_REQUEST_KINDS.has(normalized) ? normalized : 'unknown';
    }

    function normalizeResponseMode(value) {
        const normalized = isNonEmptyString(value) ? value.trim() : '';
        return VALID_RESPONSE_MODES.has(normalized) ? normalized : 'unknown';
    }

    function resolveApprovalTitle(requestKind) {
        if (requestKind === 'command') return t('codex.approval.title.command');
        if (requestKind === 'file') return t('codex.approval.title.file');
        if (requestKind === 'patch') return t('codex.approval.title.patch');
        if (requestKind === 'userInput') return t('codex.approval.title.userInput');
        return t('codex.approval.title.default');
    }

    function normalizeApprovalRequest(envelope) {
        if (!envelope || typeof envelope !== 'object') {
            return null;
        }
        const requestId = isNonEmptyString(envelope.requestId) ? envelope.requestId.trim() : '';
        if (!requestId) {
            return null;
        }
        const requestKind = normalizeRequestKind(envelope.requestKind);
        const summary = isNonEmptyString(envelope.summary) ? envelope.summary.trim() : '';
        return {
            requestId,
            method: isNonEmptyString(envelope.method) ? envelope.method.trim() : 'unknown',
            requestKind,
            responseMode: normalizeResponseMode(envelope.responseMode),
            handledBy: isNonEmptyString(envelope.handledBy) ? envelope.handledBy.trim() : 'unknown',
            summary,
            title: resolveApprovalTitle(requestKind),
            questionCount: Number.isFinite(envelope.questionCount) ? envelope.questionCount : 0,
            params: envelope.params && typeof envelope.params === 'object' ? envelope.params : null,
            questions: Array.isArray(envelope && envelope.params && envelope.params.questions)
                ? envelope.params.questions.filter((question) => question && typeof question === 'object')
                : []
        };
    }

    function buildApprovalDecisionResult(request, approved) {
        if (!request || typeof request !== 'object') {
            return null;
        }
        if (request.responseMode !== 'decision') {
            return null;
        }
        if (request.method === 'item/commandExecution/requestApproval') {
            return { decision: approved ? 'accept' : 'decline' };
        }
        if (request.method === 'item/fileChange/requestApproval') {
            return { decision: approved ? 'approve' : 'decline' };
        }
        if (request.method === 'applyPatchApproval' || request.method === 'execCommandApproval') {
            return { decision: approved ? 'approved' : 'denied' };
        }
        return null;
    }

    function resolveApprovalSummaryText(request) {
        if (!request || typeof request !== 'object') {
            return t('codex.approval.summary.default');
        }
        if (isNonEmptyString(request.summary)) {
            return request.summary;
        }
        if (request.requestKind === 'command') return t('codex.approval.summary.command');
        if (request.requestKind === 'file') return t('codex.approval.summary.file');
        if (request.requestKind === 'patch') return t('codex.approval.summary.patch');
        if (request.requestKind === 'userInput') {
            if (request.questionCount > 1) {
                return t('codex.approval.summary.questionsRemaining', { count: request.questionCount });
            }
            return t('codex.approval.summary.userInput');
        }
        return t('codex.approval.summary.unknown', { method: request.method || 'unknown' });
    }

    function buildUserInputResult(request, selectedAnswersByQuestionId) {
        if (!request || request.responseMode !== 'answers') {
            return null;
        }
        const answers = {};
        const questions = Array.isArray(request.questions) ? request.questions : [];
        for (const question of questions) {
            const questionId = isNonEmptyString(question.id) ? question.id.trim() : '';
            if (!questionId) {
                continue;
            }
            const selectedLabel = selectedAnswersByQuestionId && isNonEmptyString(selectedAnswersByQuestionId[questionId])
                ? selectedAnswersByQuestionId[questionId].trim()
                : '';
            if (!selectedLabel) {
                return null;
            }
            answers[questionId] = { answers: [selectedLabel] };
        }
        return { answers };
    }

    function resolveApprovalStatusText(requestState) {
        if (!requestState || typeof requestState !== 'object') {
            return t('codex.approval.status.pending');
        }
        if (requestState.status === 'resolved') {
            if (requestState.resolution === 'approved') return t('codex.approval.status.approved');
            if (requestState.resolution === 'rejected') return t('codex.approval.status.rejected');
            return t('codex.approval.status.resolved');
        }
        if (requestState.status === 'submitted') {
            if (requestState.resolution === 'approved') return t('codex.approval.status.approving');
            if (requestState.resolution === 'rejected') return t('codex.approval.status.rejecting');
            return t('codex.approval.status.submitting');
        }
        return t('codex.approval.status.pending');
    }

    function shouldUseBlockingModal(request) {
        return !!(request && request.requestKind === 'command' && request.responseMode === 'decision');
    }

    function extractCommandText(request) {
        if (!request || !request.params || typeof request.params !== 'object') {
            return '';
        }
        return isNonEmptyString(request.params.command) ? request.params.command.trim() : '';
    }

    function pickResolvedRequestIds(activeRequestIds, requestStates) {
        if (!Array.isArray(activeRequestIds) || !Array.isArray(requestStates)) {
            return [];
        }
        const activeSet = new Set(
            activeRequestIds
                .filter((requestId) => isNonEmptyString(requestId))
                .map((requestId) => requestId.trim())
        );
        return requestStates
            .filter((entry) => (
                entry
                && entry.status === 'submitted'
                && isNonEmptyString(entry.requestId)
                && !activeSet.has(entry.requestId.trim())
            ))
            .map((entry) => entry.requestId.trim());
    }

    globalScope.TermLinkCodexApprovalView = {
        normalizeApprovalRequest,
        buildApprovalDecisionResult,
        buildUserInputResult,
        resolveApprovalSummaryText,
        resolveApprovalStatusText,
        pickResolvedRequestIds,
        shouldUseBlockingModal,
        extractCommandText
    };
}(typeof window !== 'undefined' ? window : globalThis));
