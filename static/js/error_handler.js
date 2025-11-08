/**
 * Error Handler
 * Centralized error handling with categories, user-friendly messages, recovery actions, and offline queue
 */

class ErrorHandler {
    constructor(userId = 1) {
        this.userId = userId;
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        this.developerMode = false;
        this.errorLog = [];
        this.maxErrorLogSize = 100;
        
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
            message: "Microphone access denied. You can use text input instead.",
            recovery: ['switch_to_text'],
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
     * Handle error with category
     */
    handleError(category, error, context = {}) {
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
        
        const icon = severity === 'high' ? '⚠️' : severity === 'medium' ? '⚡' : 'ℹ️';
        
        errorEl.innerHTML = `
            <div class="error-notification__content">
                <span class="error-notification__icon">${icon}</span>
                <span class="error-notification__message">${this.escapeHtml(message)}</span>
            </div>
            ${recoveryActions.length > 0 ? `
                <div class="error-notification__actions">
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
            case 'switch_to_text':
                // Switch to text input
                if (window.chatUI) {
                    const micButton = document.getElementById('mic-button');
                    if (micButton) {
                        micButton.style.display = 'none';
                    }
                }
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
}

// Initialize error handler when DOM is ready
let errorHandler;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        errorHandler = new ErrorHandler(1); // Default user ID
        window.errorHandler = errorHandler;
    });
} else {
    errorHandler = new ErrorHandler(1);
    window.errorHandler = errorHandler;
}

