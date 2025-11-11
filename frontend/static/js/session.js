/**
 * Session Manager
 * Handles session snapshots, auto-save, resume, multi-profile support, and crash recovery
 */

class SessionManager {
    constructor(userId = 1) {
        this.userId = userId;
        this.currentSession = null;
        this.autoSaveInterval = null;
        this.lastSaveTime = null;
        this.autoSaveIntervalMs = 30 * 1000; // 30 seconds
        
        this.init();
    }
    
    init() {
        // Archive old sessions on init
        this.archiveOldSessions();
        
        // Try to recover from crash on page load
        this.recoverFromCrash();
        
        // Set up auto-save interval
        this.setupAutoSave();
        
        // Set up beforeunload handler for final save
        window.addEventListener('beforeunload', () => {
            this.saveSession();
        });
        
        // Listen for page visibility changes (save when tab becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveSession();
            }
        });
        
        // Set up weekly archive check (check daily)
        this.setupWeeklyArchive();
    }
    
    /**
     * Setup weekly archive check
     */
    setupWeeklyArchive() {
        // Check for old sessions daily
        setInterval(() => {
            this.archiveOldSessions();
        }, 24 * 60 * 60 * 1000); // 24 hours
    }
    
    /**
     * Create session snapshot
     */
    createSnapshot() {
        const chatUI = window.chatUI;
        const lessonFlow = window.lessonFlowManager;
        
        if (!chatUI) {
            return null;
        }
        
        // Get chat messages
        const messages = [];
        const messageElements = chatUI.chatMessages?.querySelectorAll('.message');
        if (messageElements) {
            messageElements.forEach(el => {
                const type = el.classList.contains('message--tutor') ? 'tutor' : 'learner';
                const bubble = el.querySelector('.message__bubble');
                const text = bubble?.textContent?.trim() || '';
                const translation = el.querySelector('.message__translation')?.textContent?.trim() || null;
                
                messages.push({
                    type,
                    text,
                    translation,
                    timestamp: new Date().toISOString(),
                });
            });
        }
        
        const snapshot = {
            user_id: this.userId,
            lesson_id: chatUI.currentLessonId,
            dialogue_id: chatUI.currentDialogueId,
            messages: messages,
            translation_mode: chatUI.translationMode,
            successful_phrases: Array.from(chatUI.successfulPhrases || []),
            lesson_progress: lessonFlow?.lessonProgress || [],
            dialogue_history: lessonFlow?.dialogueHistory || [],
            timestamp: new Date().toISOString(),
            version: '1.0',
        };
        
        return snapshot;
    }
    
    /**
     * Save session snapshot
     */
    saveSession() {
        const snapshot = this.createSnapshot();
        if (!snapshot) {
            return;
        }
        
        try {
            // Save to localStorage (active session)
            const sessionKey = `session_${this.userId}_active`;
            localStorage.setItem(sessionKey, JSON.stringify(snapshot));
            
            // Also save timestamp for auto-archive
            localStorage.setItem(`${sessionKey}_timestamp`, Date.now().toString());
            
            this.currentSession = snapshot;
            this.lastSaveTime = Date.now();
            
            console.debug('Session saved:', snapshot);
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }
    
    /**
     * Load last session
     */
    loadLastSession() {
        try {
            const sessionKey = `session_${this.userId}_active`;
            const sessionData = localStorage.getItem(sessionKey);
            
            if (!sessionData) {
                return null;
            }
            
            const session = JSON.parse(sessionData);
            this.currentSession = session;
            
            return session;
        } catch (error) {
            console.error('Failed to load session:', error);
            return null;
        }
    }
    
    /**
     * Resume session from snapshot
     */
    async resumeSession(session = null) {
        if (!session) {
            session = this.loadLastSession();
        }
        
        if (!session) {
            return false;
        }
        
        const chatUI = window.chatUI;
        const lessonFlow = window.lessonFlowManager;
        
        if (!chatUI || !lessonFlow) {
            console.warn('ChatUI or LessonFlowManager not available');
            return false;
        }
        
        try {
            // Restore lesson state
            if (session.lesson_id) {
                await lessonFlow.startLesson(session.lesson_id);
                chatUI.currentLessonId = session.lesson_id;
                chatUI.currentDialogueId = session.dialogue_id;
            }
            
            // Restore translation mode
            if (session.translation_mode) {
                chatUI.translationMode = session.translation_mode;
            }
            
            // Restore successful phrases
            if (session.successful_phrases) {
                chatUI.successfulPhrases = new Set(session.successful_phrases);
            }
            
            // Restore lesson progress
            if (session.lesson_progress) {
                lessonFlow.lessonProgress = session.lesson_progress;
            }
            
            // Restore dialogue history
            if (session.dialogue_history) {
                lessonFlow.dialogueHistory = session.dialogue_history;
            }
            
            // Restore chat messages (skip intro messages)
            if (session.messages && session.messages.length > 0) {
                // Clear existing messages
                chatUI.chatMessages.innerHTML = '';
                
                // Restore messages
                session.messages.forEach(msg => {
                    if (msg.type === 'tutor') {
                        const messageEl = chatUI.createMessageElement('tutor', msg.text);
                        if (msg.translation) {
                            const translationEl = document.createElement('div');
                            translationEl.className = 'message__translation';
                            translationEl.textContent = msg.translation;
                            translationEl.style.fontSize = 'var(--font-size-small)';
                            translationEl.style.color = 'var(--color-text-muted)';
                            translationEl.style.fontStyle = 'italic';
                            translationEl.style.marginTop = 'var(--spacing-xs)';
                            messageEl.querySelector('.message__bubble').appendChild(translationEl);
                        }
                        chatUI.chatMessages.appendChild(messageEl);
                    } else if (msg.type === 'learner') {
                        const messageEl = chatUI.createMessageElement('learner', msg.text);
                        chatUI.chatMessages.appendChild(messageEl);
                    }
                });
                
                chatUI.scrollToBottom();
            }
            
            // Show resume notification
            this.showMessage('Session resumed from ' + new Date(session.timestamp).toLocaleString(), 'info');
            
            return true;
        } catch (error) {
            console.error('Failed to resume session:', error);
            return false;
        }
    }
    
    /**
     * Recover from crash (called on page load)
     */
    recoverFromCrash() {
        // Disabled auto-resume to avoid blocking popups
        // Users can manually resume by typing "resume" in chat
        
        const session = this.loadLastSession();
        if (!session) {
            return;
        }
        
        // Check if session is recent (within last 5 minutes - crash recovery only)
        const sessionTime = new Date(session.timestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - sessionTime < fiveMinutes) {
            // Show non-blocking notification instead of popup
            console.log('Recent session found - type "resume" to continue where you left off');
            
            // Show subtle notification in UI (if chat is available)
            setTimeout(() => {
                if (window.chatUI) {
                    // Don't auto-resume - let user start fresh
                    // They can type "resume" if they want to continue
                }
            }, 1000);
        }
    }
    
    /**
     * Setup auto-save interval
     */
    setupAutoSave() {
        // Clear existing interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Set up new interval
        this.autoSaveInterval = setInterval(() => {
            this.saveSession();
        }, this.autoSaveIntervalMs);
    }
    
    /**
     * Save session after response (called by chat UI)
     */
    saveAfterResponse() {
        // Debounce: only save if last save was more than 1 second ago
        if (this.lastSaveTime && Date.now() - this.lastSaveTime < 1000) {
            return;
        }
        
        this.saveSession();
    }
    
    /**
     * Switch user profile
     */
    switchProfile(newUserId) {
        // Save current session before switching
        this.saveSession();
        
        // Switch user
        this.userId = newUserId;
        
        // Update all managers
        if (window.chatUI) {
            window.chatUI.userId = newUserId;
        }
        if (window.reviewManager) {
            window.reviewManager.userId = newUserId;
        }
        if (window.settingsManager) {
            window.settingsManager.userId = newUserId;
        }
        
        // Load new user's session
        const newSession = this.loadLastSession();
        if (newSession) {
            this.resumeSession(newSession);
        } else {
            // Clear UI for new user
            if (window.chatUI) {
                window.chatUI.chatMessages.innerHTML = '';
                window.chatUI.currentLessonId = null;
                window.chatUI.currentDialogueId = null;
            }
        }
        
        this.showMessage(`Switched to profile: User ${newUserId}`, 'info');
    }
    
    /**
     * Archive old sessions (weekly)
     */
    archiveOldSessions() {
        try {
            const sessionKey = `session_${this.userId}_active`;
            const timestampKey = `${sessionKey}_timestamp`;
            const timestamp = localStorage.getItem(timestampKey);
            
            if (!timestamp) {
                return;
            }
            
            const sessionTime = parseInt(timestamp);
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            
            // If session is older than a week, archive it
            if (now - sessionTime > oneWeek) {
                const sessionData = localStorage.getItem(sessionKey);
                if (sessionData) {
                    // Move to history
                    const historyKey = `session_${this.userId}_history_${new Date(sessionTime).toISOString()}`;
                    localStorage.setItem(historyKey, sessionData);
                    
                    // Clear active session
                    localStorage.removeItem(sessionKey);
                    localStorage.removeItem(timestampKey);
                    
                    console.log('Session archived:', historyKey);
                }
            }
        } catch (error) {
            console.error('Failed to archive session:', error);
        }
    }
    
    /**
     * Get session history
     */
    getSessionHistory() {
        const history = [];
        const prefix = `session_${this.userId}_history_`;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                try {
                    const sessionData = localStorage.getItem(key);
                    const session = JSON.parse(sessionData);
                    history.push({
                        key,
                        timestamp: session.timestamp,
                        lesson_id: session.lesson_id,
                    });
                } catch (e) {
                    console.warn('Failed to parse session history:', key);
                }
            }
        }
        
        // Sort by timestamp (newest first)
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return history;
    }
    
    /**
     * Clear current session
     */
    clearSession() {
        const sessionKey = `session_${this.userId}_active`;
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(`${sessionKey}_timestamp`);
        this.currentSession = null;
        
        if (window.chatUI) {
            window.chatUI.chatMessages.innerHTML = '';
            window.chatUI.currentLessonId = null;
            window.chatUI.currentDialogueId = null;
        }
        
        this.showMessage('Session cleared', 'info');
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
                background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
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

// Initialize session manager when DOM is ready
let sessionManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sessionManager = new SessionManager(1); // Default user ID
        window.sessionManager = sessionManager;
    });
} else {
    sessionManager = new SessionManager(1);
    window.sessionManager = sessionManager;
}

