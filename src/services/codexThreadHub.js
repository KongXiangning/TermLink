function normalizeId(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

class CodexThreadHub {
    constructor() {
        this.threadSubscribers = new Map();
        this.sessionThreads = new Map();
    }

    bindThreadToSession(threadId, sessionId) {
        const normalizedThreadId = normalizeId(threadId);
        const normalizedSessionId = normalizeId(sessionId);
        if (!normalizedThreadId || !normalizedSessionId) {
            return;
        }

        const previousSubscriber = this.threadSubscribers.get(normalizedThreadId);
        if (previousSubscriber && previousSubscriber.actorSessionId !== normalizedSessionId) {
            this.sessionThreads.delete(previousSubscriber.actorSessionId);
        }

        this.unbindSessionThreads(normalizedSessionId, { keepThreadId: normalizedThreadId });
        this.threadSubscribers.set(normalizedThreadId, { actorSessionId: normalizedSessionId });
        this.sessionThreads.set(normalizedSessionId, normalizedThreadId);
    }

    unbindSessionThreads(sessionId, options = {}) {
        const normalizedSessionId = normalizeId(sessionId);
        if (!normalizedSessionId) {
            return;
        }
        const keepThreadId = normalizeId(options.keepThreadId);

        for (const [threadId, subscriber] of this.threadSubscribers.entries()) {
            if (subscriber.actorSessionId === normalizedSessionId && threadId !== keepThreadId) {
                this.threadSubscribers.delete(threadId);
            }
        }

        const currentThreadId = this.sessionThreads.get(normalizedSessionId);
        if (currentThreadId && currentThreadId !== keepThreadId) {
            this.sessionThreads.delete(normalizedSessionId);
        }
    }

    getSessionIdForThread(threadId) {
        const normalizedThreadId = normalizeId(threadId);
        if (!normalizedThreadId) {
            return null;
        }
        const subscriber = this.threadSubscribers.get(normalizedThreadId);
        return subscriber ? subscriber.actorSessionId : null;
    }

    unbindThread(threadId) {
        const normalizedThreadId = normalizeId(threadId);
        if (!normalizedThreadId) {
            return;
        }
        const subscriber = this.threadSubscribers.get(normalizedThreadId);
        this.threadSubscribers.delete(normalizedThreadId);
        if (
            subscriber &&
            this.sessionThreads.get(subscriber.actorSessionId) === normalizedThreadId
        ) {
            this.sessionThreads.delete(subscriber.actorSessionId);
        }
    }
}

module.exports = { CodexThreadHub };
