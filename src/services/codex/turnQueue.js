const EventEmitter = require('events');

class TurnQueue extends EventEmitter {
    constructor(processService) {
        super();
        this.processService = processService;
        this.queue = [];
        this.activeTurn = null;
        this.turnTimeoutMs = 120000; // 120s timeout
        this.timer = null;
    }

    enqueue(task) {
        // task: { id, systemPrompt, userMessage }
        this.queue.push(task);
        this._processNext();
    }

    _processNext() {
        if (this.activeTurn || this.queue.length === 0) return;

        this.activeTurn = this.queue.shift();
        this.emit('turn_start', this.activeTurn);

        // Start Timeout Timer
        this.timer = setTimeout(() => {
            this._handleTimeout();
        }, this.turnTimeoutMs);

        // Execute via Service
        this.processService.sendTurn(this.activeTurn);
    }

    finishTurn() {
        if (!this.activeTurn) return;

        if (this.timer) clearTimeout(this.timer);
        this.emit('turn_end', this.activeTurn);
        this.activeTurn = null;

        // Next
        setTimeout(() => this._processNext(), 100);
    }

    _handleTimeout() {
        if (!this.activeTurn) return;

        console.error(`[TurnQueue] Turn ${this.activeTurn.id} timed out.`);
        this.emit('turn_timeout', this.activeTurn);

        // Kill Process to reset state
        this.processService.killAndRestart();

        this.activeTurn = null;
        this.timer = null;

        // Next
        setTimeout(() => this._processNext(), 1000); // Wait for restart
    }
}

module.exports = TurnQueue;
