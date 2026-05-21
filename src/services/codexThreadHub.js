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
        this.actorSessionThreads = new Map();
        this.followerSessionThreads = new Map();
    }

    ensureThreadSubscriber(threadId) {
        let subscriber = this.threadSubscribers.get(threadId);
        if (!subscriber) {
            subscriber = {
                actorSessionId: null,
                followerSessionIds: new Set()
            };
            this.threadSubscribers.set(threadId, subscriber);
        }
        return subscriber;
    }

    pruneThreadSubscriber(threadId) {
        const subscriber = this.threadSubscribers.get(threadId);
        if (!subscriber) {
            return;
        }
        if (!subscriber.actorSessionId && subscriber.followerSessionIds.size === 0) {
            this.threadSubscribers.delete(threadId);
        }
    }

    removeFollowerSessionThread(sessionId, threadId) {
        const followerThreads = this.followerSessionThreads.get(sessionId);
        if (!followerThreads) {
            return;
        }
        followerThreads.delete(threadId);
        if (followerThreads.size === 0) {
            this.followerSessionThreads.delete(sessionId);
        }
    }

    rememberFollowerSessionThread(sessionId, threadId) {
        let followerThreads = this.followerSessionThreads.get(sessionId);
        if (!followerThreads) {
            followerThreads = new Set();
            this.followerSessionThreads.set(sessionId, followerThreads);
        }
        followerThreads.add(threadId);
    }

    bindThreadToSession(threadId, sessionId) {
        const normalizedThreadId = normalizeId(threadId);
        const normalizedSessionId = normalizeId(sessionId);
        if (!normalizedThreadId || !normalizedSessionId) {
            return;
        }

        const previousSubscriber = this.threadSubscribers.get(normalizedThreadId);
        if (previousSubscriber && previousSubscriber.actorSessionId !== normalizedSessionId) {
            this.actorSessionThreads.delete(previousSubscriber.actorSessionId);
            if (previousSubscriber.actorSessionId) {
                previousSubscriber.followerSessionIds.add(previousSubscriber.actorSessionId);
                this.rememberFollowerSessionThread(previousSubscriber.actorSessionId, normalizedThreadId);
            }
        }

        this.unbindSessionThreads(normalizedSessionId, { keepThreadId: normalizedThreadId });
        const subscriber = this.ensureThreadSubscriber(normalizedThreadId);
        subscriber.actorSessionId = normalizedSessionId;
        subscriber.followerSessionIds.delete(normalizedSessionId);
        this.removeFollowerSessionThread(normalizedSessionId, normalizedThreadId);
        this.actorSessionThreads.set(normalizedSessionId, normalizedThreadId);
    }

    addFollowerSession(threadId, sessionId) {
        const normalizedThreadId = normalizeId(threadId);
        const normalizedSessionId = normalizeId(sessionId);
        if (!normalizedThreadId || !normalizedSessionId) {
            return;
        }
        if (this.actorSessionThreads.get(normalizedSessionId) === normalizedThreadId) {
            return;
        }

        const subscriber = this.ensureThreadSubscriber(normalizedThreadId);
        subscriber.followerSessionIds.add(normalizedSessionId);
        this.rememberFollowerSessionThread(normalizedSessionId, normalizedThreadId);
    }

    removeFollowerSession(threadId, sessionId) {
        const normalizedThreadId = normalizeId(threadId);
        const normalizedSessionId = normalizeId(sessionId);
        if (!normalizedThreadId || !normalizedSessionId) {
            return;
        }

        const subscriber = this.threadSubscribers.get(normalizedThreadId);
        if (!subscriber) {
            return;
        }

        subscriber.followerSessionIds.delete(normalizedSessionId);
        this.removeFollowerSessionThread(normalizedSessionId, normalizedThreadId);
        this.pruneThreadSubscriber(normalizedThreadId);
    }

    getThreadSubscribers(threadId) {
        const normalizedThreadId = normalizeId(threadId);
        if (!normalizedThreadId) {
            return null;
        }
        const subscriber = this.threadSubscribers.get(normalizedThreadId);
        if (!subscriber) {
            return null;
        }
        return {
            actorSessionId: subscriber.actorSessionId,
            followerSessionIds: Array.from(subscriber.followerSessionIds)
        };
    }

    unbindSessionThreads(sessionId, options = {}) {
        const normalizedSessionId = normalizeId(sessionId);
        if (!normalizedSessionId) {
            return;
        }
        const keepThreadId = normalizeId(options.keepThreadId);

        const actorThreadId = this.actorSessionThreads.get(normalizedSessionId);
        if (actorThreadId && actorThreadId !== keepThreadId) {
            const subscriber = this.threadSubscribers.get(actorThreadId);
            if (subscriber && subscriber.actorSessionId === normalizedSessionId) {
                subscriber.actorSessionId = null;
            }
            this.actorSessionThreads.delete(normalizedSessionId);
            this.pruneThreadSubscriber(actorThreadId);
        }

        const followerThreads = this.followerSessionThreads.get(normalizedSessionId);
        if (!followerThreads) {
            return;
        }
        for (const threadId of Array.from(followerThreads)) {
            if (threadId === keepThreadId) {
                continue;
            }
            const subscriber = this.threadSubscribers.get(threadId);
            if (subscriber) {
                subscriber.followerSessionIds.delete(normalizedSessionId);
            }
            followerThreads.delete(threadId);
            this.pruneThreadSubscriber(threadId);
        }
        if (followerThreads.size === 0) {
            this.followerSessionThreads.delete(normalizedSessionId);
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
            subscriber
            && subscriber.actorSessionId
            && this.actorSessionThreads.get(subscriber.actorSessionId) === normalizedThreadId
        ) {
            this.actorSessionThreads.delete(subscriber.actorSessionId);
        }
        if (subscriber && subscriber.followerSessionIds.size > 0) {
            for (const followerSessionId of subscriber.followerSessionIds) {
                this.removeFollowerSessionThread(followerSessionId, normalizedThreadId);
            }
        }
    }
}

module.exports = { CodexThreadHub };
