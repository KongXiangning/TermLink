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
        if (requestKind === 'command') return '命令确认';
        if (requestKind === 'file') return '文件改动确认';
        if (requestKind === 'patch') return '补丁确认';
        if (requestKind === 'userInput') return '补充信息请求';
        return 'Codex 确认';
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
            return '收到待确认请求。';
        }
        if (isNonEmptyString(request.summary)) {
            return request.summary;
        }
        if (request.requestKind === 'command') return '需要确认后才能执行命令。';
        if (request.requestKind === 'file') return '需要确认后才能修改文件。';
        if (request.requestKind === 'patch') return '需要确认后才能应用补丁。';
        if (request.requestKind === 'userInput') {
            if (request.questionCount > 1) {
                return `还有 ${request.questionCount} 个问题待补充`;
            }
            return '需要补充信息后才能继续。';
        }
        return `收到待确认请求：${request.method || 'unknown'}`;
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
            return '等待处理';
        }
        if (requestState.status === 'resolved') {
            if (requestState.resolution === 'approved') return '已允许';
            if (requestState.resolution === 'rejected') return '已拒绝';
            return '已完成';
        }
        if (requestState.status === 'submitted') {
            if (requestState.resolution === 'approved') return '正在允许...';
            if (requestState.resolution === 'rejected') return '正在拒绝...';
            return '提交中...';
        }
        return '等待处理';
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
