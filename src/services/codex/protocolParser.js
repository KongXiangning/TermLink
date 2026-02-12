const EventEmitter = require('events');

class ProtocolParser extends EventEmitter {
    constructor() {
        super();
        this.buffer = '';
        this.PROTOCOL_PREFIX = '@@TERM_LINK/1 ';
    }

    feed(chunk) {
        // Normalize newlines: treat \r as \n to handle interactive progress bars/spinners
        this.buffer += chunk.replace(/\r/g, '\n');
        this._processBuffer();
    }

    _processBuffer() {
        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1); // Remove processed line
            this._parseLine(line.trim()); // Trim \r
        }
    }

    _parseLine(line) {
        if (!line) return; // Skip empty lines

        // Strip ANSI codes for parsing
        // eslint-disable-next-line no-control-regex
        const cleanLine = line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

        if (cleanLine.startsWith(this.PROTOCOL_PREFIX)) {
            const jsonPart = cleanLine.slice(this.PROTOCOL_PREFIX.length);
            try {
                const event = JSON.parse(jsonPart);
                this._emitStructuredEvent(event);
            } catch (e) {
                console.error('[ProtocolParser] JSON Parse Error:', e.message, 'Line:', cleanLine);
                this.emit('error', { type: 'parse_error', raw: cleanLine, error: e.message });
                // Fallback: treat as raw text if JSON fails? Or just error.
                // Document says: "JSON parse failed: treat as raw"
                this.emit('raw', line + '\n');
            }
        } else {
            // Raw text (e.g. thinking process, random stdout)
            this.emit('raw', line + '\n');
        }
    }

    _emitStructuredEvent(event) {
        // Event types: assistant, proposal, status, done
        switch (event.type) {
            case 'assistant':
                this.emit('assistant', event);
                break;
            case 'proposal':
                this.emit('proposal', event);
                break;
            case 'status':
                this.emit('status', event);
                break;
            case 'done':
                this.emit('done', event);
                break;
            case 'error':
                this.emit('error', event);
                break;
            default:
                console.warn('[ProtocolParser] Unknown event type:', event.type);
                this.emit('raw', JSON.stringify(event) + '\n');
        }
    }
}

module.exports = ProtocolParser;
