const EventEmitter = require('events');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

class GeminiService extends EventEmitter {
    constructor() {
        super();
        this.sessionId = uuidv4();
        this.state = 'IDLE'; // IDLE, BUSY
        this.chatSession = null;
        this.modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';

        // Initialize SDK
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[GeminiService] GEMINI_API_KEY not found in environment');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async start() {
        console.log(`[GeminiService] Starting session ${this.sessionId} with model ${this.modelName}`);
        try {
            const model = this.genAI.getGenerativeModel({ model: this.modelName });
            this.chatSession = model.startChat({
                history: [], // Start empty
                generationConfig: {
                    maxOutputTokens: 8000,
                },
            });
            this.emit('ready');
        } catch (e) {
            console.error('[GeminiService] Failed to initialize chat:', e);
            this.emit('error', e);
        }
    }

    async sendTurn(turn) {
        if (this.state === 'BUSY') {
            console.warn('[GeminiService] Busy, ignoring turn.');
            return;
        }

        if (!this.chatSession) {
            this.emit('assistant', { content: 'Error: Session not started.' });
            this.emit('done');
            return;
        }

        this.state = 'BUSY';
        this.emit('status', { status: 'thinking' });

        try {
            let message = turn.userMessage;

            // System prompt injection logic (simplified)
            // If TermLink sends systemPrompt, we can prepend it or ignore it depending on policy.
            // For now, simple pass-through of user message.
            if (turn.systemPrompt) {
                // message = `System: ${turn.systemPrompt}\n\nUser: ${message}`;
            }

            const result = await this.chatSession.sendMessageStream(message);

            let fullText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                this.emit('assistant', { content: chunkText });
            }

            this.state = 'IDLE';
            this.emit('done');

        } catch (e) {
            console.error('[GeminiService] API Error:', e);
            this.state = 'IDLE';
            let errorMsg = `Error: ${e.message}`;
            if (e.message && e.message.includes('429')) {
                errorMsg = 'Error: Quota exceeded. Please try again in minute or switch models via GEMINI_MODEL env var.';
            } else if (e.message && e.message.includes('404')) {
                errorMsg = `Error: Model ${this.modelName} not found. Please set GEMINI_MODEL to a valid model (e.g. gemini-flash-latest).`;
            }
            this.emit('assistant', { content: errorMsg });
            this.emit('done');
        }
    }

    stop() {
        this.chatSession = null;
        this.emit('exit');
    }

    killAndRestart() {
        this.state = 'IDLE';
        this.start();
    }
}

module.exports = GeminiService;
