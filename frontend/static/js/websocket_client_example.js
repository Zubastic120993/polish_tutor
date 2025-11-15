/**
 * WebSocket Client Example for Patient Polish Tutor
 * 
 * This example demonstrates how to connect to the WebSocket chat endpoint
 * and handle real-time communication with the tutor.
 */

class TutorWebSocketClient {
    constructor(url = 'ws://localhost:8000/ws/chat') {
        this.url = url;
        this.ws = null;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.isReconnecting = false;
        this.messageHandlers = {
            connected: this.handleConnected.bind(this),
            typing: this.handleTyping.bind(this),
            response: this.handleResponse.bind(this),
            error: this.handleError.bind(this),
            pong: this.handlePong.bind(this),
        };
    }

    /**
     * Connect to WebSocket server
     * @param {number} userId - User ID
     * @param {Function} onOpen - Callback when connection opens
     * @param {Function} onClose - Callback when connection closes
     * @param {Function} onError - Callback when error occurs
     */
    connect(userId, onOpen = null, onClose = null, onError = null) {
        this.userId = userId;
        this.onOpenCallback = onOpen;
        this.onCloseCallback = onClose;
        this.onErrorCallback = onError;

        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('WebSocket connection opened');
                // Send initial connect message
                this.send({
                    type: 'connect',
                    user_id: userId
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                    if (this.onErrorCallback) {
                        this.onErrorCallback(error);
                    }
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket connection closed', event.code, event.reason);
                this.ws = null;
                
                if (this.onCloseCallback) {
                    this.onCloseCallback(event);
                }

                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000 && !this.isReconnecting) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
            };

        } catch (error) {
            console.error('Error creating WebSocket:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
        }
    }

    /**
     * Send a message to the server
     * @param {Object} message - Message object
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
            throw new Error('WebSocket is not connected');
        }
    }

    /**
     * Send a chat message
     * @param {string} text - User's input text
     * @param {string} lessonId - Lesson ID
     * @param {string} dialogueId - Dialogue ID
     * @param {number} speed - Audio speed (0.75 or 1.0)
     * @param {number} confidence - Confidence slider value (1-5)
     */
    sendMessage(text, lessonId, dialogueId, speed = 1.0, confidence = null) {
        this.send({
            type: 'message',
            user_id: this.userId,
            text: text,
            lesson_id: lessonId,
            dialogue_id: dialogueId,
            speed: speed,
            confidence: confidence
        });
    }

    /**
     * Send ping for heartbeat/keepalive
     */
    ping() {
        this.send({
            type: 'ping'
        });
    }

    /**
     * Close the WebSocket connection
     */
    disconnect() {
        this.isReconnecting = false;
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }

    /**
     * Handle incoming messages
     * @param {Object} message - Parsed message object
     */
    handleMessage(message) {
        const handler = this.messageHandlers[message.type];
        if (handler) {
            handler(message);
        } else {
            console.warn('Unknown message type:', message.type);
        }
    }

    /**
     * Handle connection confirmation
     */
    handleConnected(message) {
        console.log('Connected:', message.message);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        if (this.onOpenCallback) {
            this.onOpenCallback();
        }
    }

    /**
     * Handle typing indicator
     */
    handleTyping(message) {
        console.log('Tutor is typing...', message.message);
        // Emit custom event or call callback
        this.onTyping?.(message);
    }

    /**
     * Handle tutor response
     */
    handleResponse(message) {
        console.log('Tutor response:', message.data);
        // Emit custom event or call callback
        this.onResponse?.(message.data, message.metadata);
    }

    /**
     * Handle error message
     */
    handleError(message) {
        console.error('Error from server:', message.message);
        // Emit custom event or call callback
        this.onError?.(message.message);
    }

    /**
     * Handle pong response
     */
    handlePong(message) {
        console.log('Pong received');
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);
        
        setTimeout(() => {
            if (this.userId) {
                this.connect(this.userId, this.onOpenCallback, this.onCloseCallback, this.onErrorCallback);
            }
            // Exponential backoff: double the delay each time
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
        }, this.reconnectDelay);
    }

    /**
     * Set callback for typing indicator
     */
    onTyping(callback) {
        this.onTyping = callback;
    }

    /**
     * Set callback for tutor response
     */
    onResponse(callback) {
        this.onResponse = callback;
    }

    /**
     * Set callback for errors
     */
    onError(callback) {
        this.onError = callback;
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Example usage:
/*
const client = new TutorWebSocketClient();

// Set up callbacks
client.onTyping((message) => {
    console.log('Tutor is thinking...');
    // Update UI to show typing indicator
});

client.onResponse((data, metadata) => {
    console.log('Tutor replied:', data.reply_text);
    console.log('Score:', data.score);
    console.log('Audio URLs:', data.audio);
    // Update UI with response
});

client.onError((error) => {
    console.error('Error:', error);
    // Show error to user
});

// Connect
client.connect(1, 
    () => console.log('Connected!'),
    () => console.log('Disconnected'),
    (error) => console.error('Error:', error)
);

// Send a message
client.sendMessage('Poproszę kawę', 'coffee_001', 'coffee_001_d1');

// Send ping for keepalive
setInterval(() => {
    if (client.isConnected()) {
        client.ping();
    }
}, 30000); // Every 30 seconds

// Disconnect when done
// client.disconnect();
*/

// Export for use in modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TutorWebSocketClient;
}

// Export for use in browser (global) - multiple fallbacks to ensure availability
try {
    // Direct global assignment (works in all environments)
    if (typeof globalThis !== 'undefined') {
        globalThis.TutorWebSocketClient = TutorWebSocketClient;
    }
    
    // Window object (standard browser)
    if (typeof window !== 'undefined') {
        window.TutorWebSocketClient = TutorWebSocketClient;
    }
    
    // Direct global scope (fallback for older browsers)
    if (typeof self !== 'undefined') {
        self.TutorWebSocketClient = TutorWebSocketClient;
    }

    // Verify export succeeded
    if (typeof TutorWebSocketClient !== 'undefined') {
        console.log('[WebSocketClient] TutorWebSocketClient class exported successfully');
    } else {
        console.warn('[WebSocketClient] Warning: TutorWebSocketClient may not be available globally');
    }

    // Broadcast readiness so deferred initializers can hook in
    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
        try {
            document.dispatchEvent(new CustomEvent('tutor-websocket-ready'));
        } catch (eventError) {
            console.warn('[WebSocketClient] Failed to dispatch readiness event:', eventError);
        }
    }
} catch (error) {
    console.error('[WebSocketClient] Error exporting TutorWebSocketClient:', error);
}
