/**
 * Error Handler
 * Centralized error handling with categories, user-friendly messages, recovery actions, and offline queue
 */

// Prevent duplicate declaration if script is loaded twice
// Use window.ErrorHandler check because class declarations are hoisted
if (typeof window.ErrorHandler === 'undefined') {
    window.ErrorHandler = class {
    constructor(userId = 1) {
        this.userId = userId;
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        this.developerMode = false;
        this.errorLog = [];
        this.maxErrorLogSize = 100;
        this.micStartupTime = null; // Track when mic was clicked
        this.micStartupGracePeriod = 5000; // 5 seconds grace period
        
        this.init();
    }
    
    init() {
        // Set up online/offline listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOfflineQueue();
            this.showMessage('Connection restored. Syncing...', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showMessage('Connection lost. Your progress will be saved when online.', 'warning');
        });
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleUnhandledError(event.error, event.filename, event.lineno);
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledError(event.reason, 'Promise', null);
        });
        
        // Load developer mode from localStorage
        const devMode = localStorage.getItem('developerMode');
        if (devMode === 'true') {
            this.developerMode = true;
        }
        
        // Load offline queue from localStorage
        this.loadOfflineQueue();
    }
    
    /**
     * Error categories and user-friendly messages
     */
    ERROR_CATEGORIES = {
        SPEECH: {
            name: 'Speech Error',
            message: "Couldn't hear you clearly. Try speaking closer to the microphone or type your answer.",
            recovery: ['switch_to_text', 'retry'],
            severity: 'medium'
        },
        AUDIO: {
            name: 'Audio Playback Failure',
            message: "Audio unavailable. Here's the text: [phrase]. You can still continue.",
            recovery: ['show_text', 'continue'],
            severity: 'low'
        },
        DATABASE: {
            name: 'Database Error',
            message: "Progress couldn't be saved. Don't worry, we'll try again automatically.",
            recovery: ['auto_retry', 'temp_cache'],
            severity: 'medium'
        },
        LESSON_DATA: {
            name: 'Lesson Data Error',
            message: "Lesson file is missing. Please restart the app or contact support.",
            recovery: ['skip_phrase', 'log_issue'],
            severity: 'high'
        },
        NETWORK: {
            name: 'Network Issue',
            message: "Connection lost. Your progress is saved. Reconnecting...",
            recovery: ['queue_offline', 'auto_sync'],
            severity: 'medium'
        },
        STT_TIMEOUT: {
            name: 'STT Timeout',
            message: "Speech recognition timed out. Try typing your answer or speaking again.",
            recovery: ['suggest_text', 'retry'],
            severity: 'low'
        },
        MICROPHONE_DENIED: {
            name: 'Microphone Denied',
            message: "Microphone access denied. Click 'Grant Permission' to allow microphone access, or use text input.",
            recovery: ['retry', 'switch_to_text', 'grant_permission'],
            severity: 'low'
        },
        UNHANDLED: {
            name: 'Unhandled Error',
            message: "Something went wrong. Your progress is safe. Please refresh the page.",
            recovery: ['log_error', 'show_support'],
            severity: 'high'
        }
    };
    
    /**
     * Set microphone startup time (called when mic button is clicked)
     */
    setMicStartupTime() {
        this.micStartupTime = Date.now();
        console.log('[ErrorHandler] Mic startup time set, grace period active for', this.micStartupGracePeriod, 'ms');
    }
    
    /**
     * Clear microphone startup time (called when mic stops)
     */
    clearMicStartupTime() {
        this.micStartupTime = null;
        console.log('[ErrorHandler] Mic startup time cleared');
    }
    
    /**
     * Handle error with category
     */
    handleError(category, error, context = {}) {
        // CRITICAL: Block SPEECH errors in the first 5 seconds after mic button click
        if (category === 'SPEECH' && this.micStartupTime) {
            const timeSinceMicStart = Date.now() - this.micStartupTime;
            if (timeSinceMicStart < this.micStartupGracePeriod) {
                console.log('[ErrorHandler] Blocking SPEECH error during grace period (' + timeSinceMicStart + 'ms since mic start)');
                return; // Don't show error during grace period
            }
        }
        
        const errorCategory = this.ERROR_CATEGORIES[category] || this.ERROR_CATEGORIES.UNHANDLED;
        
        // Log error
        const errorEntry = {
            category: category,
            name: errorCategory.name,
            message: error?.message || String(error),
            stack: error?.stack,
            context: context,
            timestamp: new Date().toISOString(),
            user_id: this.userId,
        };
        
        this.logError(errorEntry);
        
        // Report to backend if online
        if (this.isOnline) {
            this.reportError(errorEntry);
        } else {
            // Queue for later
            this.queueOffline({
                type: 'error_report',
                data: errorEntry
            });
        }
        
        // Show user-friendly message
        const userMessage = this.formatUserMessage(errorCategory, context);
        this.showErrorMessage(userMessage, errorCategory.recovery, errorCategory.severity);
        
        // Attempt recovery
        this.attemptRecovery(errorCategory.recovery, context);
        
        return errorEntry;
    }
    
    /**
     * Format user message with context
     */
    formatUserMessage(category, context) {
        let message = category.message;
        
        // Replace placeholders
        if (context.phrase) {
            message = message.replace('[phrase]', context.phrase);
        }
        
        return message;
    }
    
    /**
     * Show error message to user
     */
    showErrorMessage(message, recoveryActions = [], severity = 'medium') {
        // Create error notification
        const errorEl = document.createElement('div');
        errorEl.className = `error-notification error-notification--${severity}`;
        errorEl.setAttribute('role', 'alert');
        
        const iconName = severity === 'high' ? 'alert-triangle' : severity === 'medium' ? 'zap' : 'info';
        
        errorEl.innerHTML = `
            <div class="error-notification__content">
                <span class="error-notification__icon" aria-hidden="true">
                    <i data-feather="${iconName}"></i>
                </span>
                <span class="error-notification__message">${this.escapeHtml(message)}</span>
            </div>
            ${recoveryActions.length > 0 ? `
                <div class="error-notification__actions">
                    ${recoveryActions.includes('grant_permission') ? '<button class="error-notification__button error-notification__button--primary" data-action="grant_permission">Grant Permission</button>' : ''}
                    ${recoveryActions.includes('retry') ? '<button class="error-notification__button" data-action="retry">Retry</button>' : ''}
                    ${recoveryActions.includes('switch_to_text') ? '<button class="error-notification__button" data-action="switch_to_text">Use Text</button>' : ''}
                    ${recoveryActions.includes('continue') ? '<button class="error-notification__button" data-action="continue">Continue</button>' : ''}
                </div>
            ` : ''}
            ${this.developerMode ? `
                <button class="error-notification__button error-notification__button--dev" data-action="show_details">Details</button>
            ` : ''}
        `;
        
        // Add to page
        document.body.appendChild(errorEl);
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Auto-dismiss after 5 seconds (unless high severity)
        if (severity !== 'high') {
            setTimeout(() => {
                errorEl.classList.add('error-notification--dismissing');
                setTimeout(() => errorEl.remove(), 300);
            }, 5000);
        }
        
        // Handle recovery actions
        errorEl.querySelectorAll('.error-notification__button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleRecoveryAction(action, errorEl);
            });
        });
    }
    
    /**
     * Handle recovery action
     */
    handleRecoveryAction(action, errorEl) {
        switch (action) {
            case 'retry':
                // Trigger retry event
                document.dispatchEvent(new CustomEvent('errorRetry'));
                errorEl.remove();
                break;
            case 'grant_permission':
                // Request microphone permission again
                this.requestMicrophonePermission().then((granted) => {
                    if (granted) {
                        this.showMessage('Microphone permission granted! You can now use voice input.', 'success');
                        errorEl.remove();
                        // Show mic button again if it was hidden
                        const micButton = document.getElementById('mic-button');
                        if (micButton) {
                            micButton.style.display = '';
                            micButton.removeAttribute('aria-hidden');
                        }
                    } else {
                        this.showMessage('Permission still denied. Please check your browser settings.', 'warning');
                    }
                });
                break;
            case 'switch_to_text':
                // Switch to text input
                this.enableTextInputMode();
                errorEl.remove();
                break;
            case 'continue':
                errorEl.remove();
                break;
            case 'show_details':
                this.showErrorDetails(errorEl);
                break;
        }
    }
    
    /**
     * Request microphone permission
     * @returns {Promise<boolean>} True if permission granted
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Microphone permission request failed:', error);
            
            // Provide helpful instructions based on error type
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.showPermissionInstructions();
            }
            
            return false;
        }
    }
    
    /**
     * Show instructions for granting microphone permission
     */
    showPermissionInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'error-notification error-notification--medium';
        instructions.setAttribute('role', 'alert');
        
        const browser = this.detectBrowser();
        let instructionsText = '';
        
        if (browser === 'chrome' || browser === 'edge') {
            instructionsText = `
                <strong>To enable microphone access:</strong><br>
                1. Click the lock icon in your browser's address bar<br>
                2. Find "Microphone" in the permissions list<br>
                3. Change it from "Block" to "Allow"<br>
                4. Refresh the page
            `;
        } else if (browser === 'safari') {
            instructionsText = `
                <strong>To enable microphone access:</strong><br>
                1. Go to Safari → Settings → Websites → Microphone<br>
                2. Find this website and set it to "Allow"<br>
                3. Refresh the page
            `;
        } else if (browser === 'firefox') {
            instructionsText = `
                <strong>To enable microphone access:</strong><br>
                1. Click the shield icon in your browser's address bar<br>
                2. Click "Permissions" → "Use the Microphone"<br>
                3. Select "Allow" and refresh the page
            `;
        } else {
            instructionsText = `
                <strong>To enable microphone access:</strong><br>
                1. Check your browser's address bar for a permission icon<br>
                2. Click it and allow microphone access<br>
                3. Refresh the page
            `;
        }
        
        instructions.innerHTML = `
            <div class="error-notification__content">
                <span class="error-notification__icon" aria-hidden="true">
                    <i data-feather="mic-off"></i>
                </span>
                <div class="error-notification__message">${instructionsText}</div>
            </div>
            <button class="error-notification__button" data-action="close_instructions">Got it</button>
        `;
        
        document.body.appendChild(instructions);
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        instructions.querySelector('[data-action="close_instructions"]').addEventListener('click', () => {
            instructions.remove();
        });
        
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (instructions.parentNode) {
                instructions.classList.add('error-notification--dismissing');
                setTimeout(() => instructions.remove(), 300);
            }
        }, 15000);
    }
    
    /**
     * Detect browser type
     * @returns {string} Browser name
     */
    detectBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
            return 'chrome';
        } else if (userAgent.includes('edg')) {
            return 'edge';
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            return 'safari';
        } else if (userAgent.includes('firefox')) {
            return 'firefox';
        }
        return 'unknown';
    }
    
    /**
     * Enable text input mode (hide mic button, focus text input)
     */
    enableTextInputMode() {
        const micButton = document.getElementById('mic-button');
        const messageInput = document.getElementById('message-input');
        
        if (micButton) {
            micButton.style.display = 'none';
            micButton.setAttribute('aria-hidden', 'true');
        }
        
        if (messageInput) {
            messageInput.focus();
            messageInput.setAttribute('aria-label', 'Type your message');
            // Update placeholder to indicate text input is available
            if (!messageInput.value) {
                messageInput.placeholder = 'Type your message...';
            }
        }
        
        // Also notify chatUI if available
        if (window.chatUI && typeof window.chatUI.enableTextInputMode === 'function') {
            window.chatUI.enableTextInputMode();
        }
    }
    
    /**
     * Show error details (developer mode)
     */
    showErrorDetails(errorEl) {
        const lastError = this.errorLog[this.errorLog.length - 1];
        if (!lastError) return;
        
        const details = `
Category: ${lastError.category}
Message: ${lastError.message}
Stack: ${lastError.stack || 'N/A'}
Context: ${JSON.stringify(lastError.context, null, 2)}
Timestamp: ${lastError.timestamp}
        `;
        
        alert(details);
    }
    
    /**
     * Attempt automatic recovery
     */
    attemptRecovery(recoveryActions, context) {
        recoveryActions.forEach(action => {
            switch (action) {
                case 'auto_retry':
                    // Auto-retry after 2 seconds
                    setTimeout(() => {
                        document.dispatchEvent(new CustomEvent('errorRetry'));
                    }, 2000);
                    break;
                case 'switch_to_text':
                    // Don't auto-switch - let user choose to grant permission first
                    // Only switch if they explicitly choose text input
                    break;
                case 'queue_offline':
                    // Already handled by offline queue
                    break;
                case 'auto_sync':
                    // Will sync when online
                    break;
                case 'temp_cache':
                    // Use localStorage as temp cache
                    if (context.data) {
                        localStorage.setItem(`temp_cache_${Date.now()}`, JSON.stringify(context.data));
                    }
                    break;
            }
        });
    }
    
    /**
     * Handle unhandled errors
     */
    handleUnhandledError(error, filename, lineno) {
        const errorEntry = {
            category: 'UNHANDLED',
            name: 'Unhandled Error',
            message: error?.message || String(error),
            stack: error?.stack || `at ${filename}:${lineno}`,
            context: {
                filename,
                lineno,
                userAgent: navigator.userAgent,
                url: window.location.href,
            },
            timestamp: new Date().toISOString(),
            user_id: this.userId,
        };
        
        this.logError(errorEntry);
        this.reportError(errorEntry);
        
        // Show user-friendly message
        this.showErrorMessage(
            this.ERROR_CATEGORIES.UNHANDLED.message,
            this.ERROR_CATEGORIES.UNHANDLED.recovery,
            'high'
        );
    }
    
    /**
     * Log error locally
     */
    logError(errorEntry) {
        this.errorLog.push(errorEntry);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog.shift();
        }
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem('errorLog', JSON.stringify(this.errorLog.slice(-50))); // Keep last 50
        } catch (e) {
            console.warn('Failed to save error log:', e);
        }
        
        // Log to console if developer mode
        if (this.developerMode) {
            console.error('Error logged:', errorEntry);
        }
    }
    
    /**
     * Report error to backend
     */
    async reportError(errorEntry) {
        if (!this.isOnline) {
            this.queueOffline({
                type: 'error_report',
                data: errorEntry
            });
            return;
        }
        
        try {
            const response = await fetch('/api/error/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    error_type: errorEntry.category,
                    message: errorEntry.message,
                    stack_trace: errorEntry.stack,
                    context: JSON.stringify(errorEntry.context),
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Failed to report error: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to report error:', error);
            // Queue for retry
            this.queueOffline({
                type: 'error_report',
                data: errorEntry
            });
        }
    }
    
    /**
     * Queue offline action
     */
    queueOffline(action) {
        this.offlineQueue.push({
            ...action,
            queued_at: new Date().toISOString(),
        });
        
        // Save to localStorage
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        } catch (e) {
            console.warn('Failed to save offline queue:', e);
        }
    }
    
    /**
     * Load offline queue from localStorage
     */
    loadOfflineQueue() {
        try {
            const queue = localStorage.getItem('offlineQueue');
            if (queue) {
                this.offlineQueue = JSON.parse(queue);
            }
        } catch (e) {
            console.warn('Failed to load offline queue:', e);
            this.offlineQueue = [];
        }
    }
    
    /**
     * Sync offline queue when online
     */
    async syncOfflineQueue() {
        if (!this.isOnline || this.offlineQueue.length === 0) {
            return;
        }
        
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        
        let synced = 0;
        let failed = 0;
        
        for (const action of queue) {
            try {
                if (action.type === 'error_report') {
                    await this.reportError(action.data);
                    synced++;
                } else if (action.type === 'api_request') {
                    // Retry API request
                    const response = await fetch(action.url, {
                        method: action.method,
                        headers: action.headers,
                        body: action.body,
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Request failed: ${response.statusText}`);
                    }
                    synced++;
                }
            } catch (error) {
                // Re-queue if still failing
                this.queueOffline(action);
                failed++;
            }
        }
        
        // Update localStorage queue
        if (this.offlineQueue.length > 0) {
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        } else {
            localStorage.removeItem('offlineQueue');
        }
        
        if (synced > 0) {
            this.showMessage(`Synced ${synced} item${synced !== 1 ? 's' : ''}`, 'success');
        }
    }
    
    /**
     * Wrapper for fetch that handles offline queueing
     */
    async fetchWithOfflineQueue(url, options = {}) {
        try {
            const response = await fetch(url, options);
            
            // If offline, queue the request
            if (!this.isOnline && !response.ok) {
                this.queueOffline({
                    type: 'api_request',
                    url,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body,
                });
            }
            
            return response;
        } catch (error) {
            // Network error - queue if offline
            if (!this.isOnline) {
                this.queueOffline({
                    type: 'api_request',
                    url,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body,
                });
            }
            throw error;
        }
    }
    
    /**
     * Toggle developer mode
     */
    toggleDeveloperMode() {
        this.developerMode = !this.developerMode;
        localStorage.setItem('developerMode', this.developerMode.toString());
        
        if (this.developerMode) {
            console.log('Developer mode enabled');
        } else {
            console.log('Developer mode disabled');
        }
        
        return this.developerMode;
    }
    
    /**
     * Get error log (for developer mode)
     */
    getErrorLog() {
        return this.errorLog;
    }
    
    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        localStorage.removeItem('errorLog');
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Use settings manager's showMessage if available
        if (window.settingsManager && window.settingsManager.showMessage) {
            window.settingsManager.showMessage(message, type);
        } else {
            // Simple toast notification
            const toast = document.createElement('div');
            toast.className = `toast toast--${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 24px;
                background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3'};
                color: white;
                border-radius: 4px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
}; // End of window.ErrorHandler class assignment
} // End of if (typeof window.ErrorHandler === 'undefined')

// Initialize error handler when DOM is ready (only if not already initialized)
if (!window.errorHandler && typeof window.ErrorHandler !== 'undefined') {
    let errorHandler;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.errorHandler) {
                errorHandler = new window.ErrorHandler(1); // Default user ID
                window.errorHandler = errorHandler;
            }
        });
    } else {
        if (!window.errorHandler) {
            errorHandler = new window.ErrorHandler(1);
            window.errorHandler = errorHandler;
        }
    }
}
