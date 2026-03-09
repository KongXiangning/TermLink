(function attachCodexApprovalView(globalScope) {
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
        if (requestKind === 'command') return 'Command Approval';
        if (requestKind === 'file') return 'File Change Approval';
        if (requestKind === 'patch') return 'Patch Approval';
        if (requestKind === 'userInput') return 'User Input Request';
        return 'Codex Approval';
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
        if (request.method === 'item/commandExecution/requestApproval' || request.method === 'item/fileChange/requestApproval') {
            return { decision: approved ? 'approve' : 'decline' };
        }
        if (request.method === 'applyPatchApproval' || request.method === 'execCommandApproval') {
            return { decision: approved ? 'approved' : 'denied' };
        }
        return null;
    }

    function resolveApprovalSummaryText(request) {
        if (!request || typeof request !== 'object') {
            return 'Approval requested.';
        }
        if (isNonEmptyString(request.summary)) {
            return request.summary;
        }
        if (request.requestKind === 'command') return 'Command approval requested.';
        if (request.requestKind === 'file') return 'File change approval requested.';
        if (request.requestKind === 'patch') return 'Patch approval requested.';
        if (request.requestKind === 'userInput') {
            if (request.questionCount > 1) {
                return `${request.questionCount} questions pending`;
            }
            return 'User input requested.';
        }
        return `Approval requested: ${request.method || 'unknown'}`;
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
            return 'Pending';
        }
        if (requestState.status === 'resolved') {
            if (requestState.resolution === 'approved') return 'Approved';
            if (requestState.resolution === 'rejected') return 'Rejected';
            return 'Resolved';
        }
        if (requestState.status === 'submitted') {
            if (requestState.resolution === 'approved') return 'Approving...';
            if (requestState.resolution === 'rejected') return 'Rejecting...';
            return 'Submitting...';
        }
        return 'Pending';
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
        pickResolvedRequestIds
    };
}(typeof window !== 'undefined' ? window : globalThis));
