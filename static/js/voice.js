/**
 * Voice Input Manager (STT)
 * Handles speech recognition using Web Speech API
 * Supports tap-to-toggle and push-to-talk modes
 */

class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.micMode = 'tap'; // 'tap' or 'push'
        this.silenceTimeout = null;
        this.silenceDuration = 2000; // 2 seconds
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.liveCaptionElement = null;
        this.listeningStartTime = null; // Track when listening started
        this.minListeningDuration = 5000; // Minimum 5 seconds before showing "no speech" error
        this.restartCount = 0; // Track number of restarts to prevent infinite loops
        this.maxRestarts = 3; // Maximum number of auto-restarts allowed
        this.startupTime = null; // Track when we TRIED to start (even if onstart hasn't fired yet)
        this.startupGracePeriod = 5000; // 5 seconds grace period from startup attempt
        
        // Check browser support
        this.isSupported = this.checkSupport();
        
        if (this.isSupported) {
            this.initRecognition();
        }
        
        // Load mic mode preference from localStorage
        const savedMicMode = localStorage.getItem('micMode');
        if (savedMicMode === 'push' || savedMicMode === 'tap') {
            this.micMode = savedMicMode;
        }
        
        // Listen for settings changes
        document.addEventListener('settingsChanged', (event) => {
            const settings = event.detail;
            if (settings.mic_mode && (settings.mic_mode === 'tap' || settings.mic_mode === 'hold')) {
                // Map 'hold' to 'push' for internal use
                const mode = settings.mic_mode === 'hold' ? 'push' : 'tap';
                this.setMicMode(mode);
            }
        });
    }
    
    /**
     * Check if Web Speech API is supported
     * @returns {boolean} True if supported
     */
    checkSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        return !!SpeechRecognition;
    }
    
    /**
     * Initialize speech recognition
     */
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pl-PL'; // Polish language
        
        // Event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            
            // Only set listeningStartTime if it's not already set (for restarts)
            if (!this.listeningStartTime) {
                this.listeningStartTime = Date.now();
                this.restartCount = 0;
            }
            // Don't reset transcripts on restart - keep accumulating
            if (!this.finalTranscript && !this.interimTranscript) {
                this.finalTranscript = '';
                this.interimTranscript = '';
            }
            this.updateLiveCaption('Listening...');
            this.onListeningStateChange(true);
        };
        
        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    final += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }
            
            this.finalTranscript += final;
            this.interimTranscript = interim;
            
            // Update live caption
            const fullText = this.finalTranscript + this.interimTranscript;
            this.updateLiveCaption(fullText.trim());
            
            // Reset silence timeout
            this.resetSilenceTimeout();
        };
        
        this.recognition.onerror = (event) => {
            this.handleError(event.error);
        };
        
        this.recognition.onend = () => {
            const hadTranscript = this.finalTranscript.trim().length > 0;
            
            // If we have a final transcript, send it before resetting
            if (hadTranscript) {
                this.onTranscriptReady(this.finalTranscript.trim());
                // Reset state after sending transcript
                this.finalTranscript = '';
                this.interimTranscript = '';
                this.listeningStartTime = null;
                this.startupTime = null;
                this.isListening = false;
                this.onListeningStateChange(false);
                this.hideLiveCaption();
                return;
            }
            
            // Reset listening state
            this.isListening = false;
            this.onListeningStateChange(false);
            
            // Clear silence timeout
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }
            
            // Hide live caption
            this.hideLiveCaption();
            
            // Reset state
            this.finalTranscript = '';
            this.interimTranscript = '';
            this.listeningStartTime = null;
            this.startupTime = null;
            this.restartCount = 0;
        };
    }
    
    /**
     * Request microphone permission and start listening
     * @param {string} mode - 'tap' or 'push'
     * @returns {Promise<boolean>} True if started successfully
     */
    async startListening(mode = null) {
        if (!this.isSupported) {
            this.onError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return false;
        }
        
        if (mode) {
            this.micMode = mode;
        }
        
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const errorMsg = `Microphone not available!\n\n` +
                `Current URL: ${window.location.href}\n\n` +
                `Microphone access requires HTTPS or localhost.\n\n` +
                `You're using: ${window.location.protocol}//${window.location.host}\n\n` +
                `Please access the app at: http://localhost:8000`;
            
            alert(errorMsg);
            this.onError('Please access the app at http://localhost:8000');
            return false;
        }
        
        // Request microphone permission
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream - we just needed permission
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            this.handlePermissionError(error);
            return false;
        }
        
        if (!this.recognition) {
            this.initRecognition();
        }
        
        try {
            // Set startup time BEFORE calling start() to protect against immediate errors
            this.startupTime = Date.now();
            this.recognition.start();
            return true;
        } catch (error) {
            // Recognition might already be running
            if (error.name === 'InvalidStateError') {
                return true;
            }
            // Don't call handleError for startup errors - they should go through permission handler
            if (error.name !== 'NotAllowedError' && error.name !== 'NotFoundError') {
                this.handleError(error.name || error.message || 'unknown');
            }
            return false;
        }
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
    }
    
    /**
     * Toggle listening state (for tap mode)
     */
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening('tap');
        }
    }
    
    /**
     * Reset silence timeout
     */
    resetSilenceTimeout() {
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
        }
        
        // Set timeout for auto-stop after silence
        this.silenceTimeout = setTimeout(() => {
            if (this.isListening) {
                // Only auto-stop if we have some transcript
                if (this.finalTranscript.trim() || this.interimTranscript.trim()) {
                    this.stopListening();
                }
            }
        }, this.silenceDuration);
    }
    
    /**
     * Update live caption display
     * @param {string} text - Text to display
     */
    updateLiveCaption(text) {
        if (!this.liveCaptionElement) {
            this.createLiveCaptionElement();
        }
        
        if (text) {
            this.liveCaptionElement.textContent = `You said: ${text}`;
            this.liveCaptionElement.style.display = 'block';
        } else {
            this.liveCaptionElement.textContent = 'Listening...';
            this.liveCaptionElement.style.display = 'block';
        }
    }
    
    /**
     * Hide live caption
     */
    hideLiveCaption() {
        if (this.liveCaptionElement) {
            this.liveCaptionElement.style.display = 'none';
        }
    }
    
    /**
     * Create live caption element
     */
    createLiveCaptionElement() {
        // Find input bar container
        const inputBar = document.querySelector('.input-bar');
        if (!inputBar) {
            console.error('Input bar not found');
            return;
        }
        
        // Create caption element
        const caption = document.createElement('div');
        caption.className = 'voice-caption';
        caption.id = 'voice-caption';
        caption.setAttribute('role', 'status');
        caption.setAttribute('aria-live', 'polite');
        caption.style.display = 'none';
        
        // Insert before input bar
        inputBar.parentNode.insertBefore(caption, inputBar);
        
        this.liveCaptionElement = caption;
    }
    
    /**
     * Handle recognition errors
     * @param {string} error - Error code or message
     */
    handleError(error) {
        const listeningDuration = this.listeningStartTime ? Date.now() - this.listeningStartTime : null;
        const timeSinceStartup = this.startupTime ? Date.now() - this.startupTime : null;
        
        // CRITICAL: Never show errors in the first 5 seconds
        // Check BOTH listeningDuration (from onstart) AND timeSinceStartup (from start attempt)
        const gracePeriodActive = (listeningDuration !== null && listeningDuration < this.minListeningDuration) ||
                                  (timeSinceStartup !== null && timeSinceStartup < this.startupGracePeriod);
        
        if (gracePeriodActive) {
            return; // Don't show error, let recognition continue naturally
        }
        
        let errorMessage = '';
        let shouldShowError = true; // Flag to control whether to show error
        
        switch (error) {
            case 'no-speech':
                // No speech detected - check if user had enough time to speak
                if (this.listeningStartTime) {
                    const listeningDuration = Date.now() - this.listeningStartTime;
                    // Only show error if user had sufficient time to speak (at least 5 seconds)
                    if (listeningDuration < this.minListeningDuration) {
                        // Too soon - user hasn't had time to speak yet, don't show error
                        console.log('No speech detected but user hasn\'t had time to speak yet. Restarting...');
                        // Restart recognition to give more time
                        if (this.recognition && !this.isListening) {
                            setTimeout(() => {
                                try {
                                    this.recognition.start();
                                } catch (e) {
                                    // Might already be starting, ignore
                                    console.log('Recognition restart error (ignored):', e);
                                }
                            }, 100);
                        }
                        return; // Don't show error, don't stop listening
                    }
                }
                // User had time but no speech - this is normal, don't show error
                // Just silently handle it
                console.log('No speech detected after sufficient time - silently ending');
                shouldShowError = false;
                break;
            case 'audio-capture':
                errorMessage = 'No microphone found. Please check your microphone connection.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
                break;
            case 'network':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            case 'aborted':
                // User stopped manually - this is normal
                console.log('Recognition aborted by user - normal');
                return; // Don't show error
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
                break;
            case 'bad-grammar':
            case 'language-not-supported':
                // These are configuration issues, not user errors
                console.log('Recognition configuration issue:', error);
                shouldShowError = false;
                break;
            default:
                // For unknown errors, log them but don't show user-facing error unless it's critical
                console.warn('Unknown speech recognition error:', error);
                // Only show error for critical issues, not for normal operation
                shouldShowError = false;
                return; // Don't show error for unknown cases
        }
        
        // Only show error if it's a real problem that needs user attention
        if (shouldShowError && errorMessage) {
            // Use error handler if available
            if (window.errorHandler) {
                const category = error === 'not-allowed' ? 'MICROPHONE_DENIED' : 'SPEECH';
                window.errorHandler.handleError(category, new Error(errorMessage), {
                    errorCode: error
                });
            } else {
                this.onError(errorMessage);
            }
        }
        
        // Only stop listening if we're showing an error
        if (shouldShowError) {
            this.stopListening();
        }
    }
    
    /**
     * Handle permission errors
     * @param {Error} error - Permission error
     */
    handlePermissionError(error) {
        let errorMessage = '';
        let errorCategory = 'MICROPHONE_DENIED';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone permission denied. Click "Grant Permission" to allow access.';
            errorCategory = 'MICROPHONE_DENIED';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
            errorCategory = 'SPEECH'; // Different category for hardware issues
        } else {
            errorMessage = `Microphone error: ${error.message}. Please try again.`;
            errorCategory = 'SPEECH';
        }
        
        // Use error handler if available
        if (window.errorHandler) {
            window.errorHandler.handleError(errorCategory, error, {
                errorName: error.name
            });
        } else {
            this.onError(errorMessage);
            // If no error handler, still try to enable text input
            if (window.chatUI && typeof window.chatUI.enableTextInputMode === 'function') {
                window.chatUI.enableTextInputMode();
            }
        }
    }
    
    /**
     * Set microphone mode
     * @param {string} mode - 'tap' or 'push'
     */
    setMicMode(mode) {
        if (mode !== 'tap' && mode !== 'push') {
            console.warn('Invalid mic mode. Use "tap" or "push"');
            return;
        }
        
        this.micMode = mode;
        localStorage.setItem('micMode', mode);
    }
    
    /**
     * Get microphone mode
     * @returns {string} Current mic mode
     */
    getMicMode() {
        return this.micMode;
    }
    
    /**
     * Check if currently listening
     * @returns {boolean} True if listening
     */
    isCurrentlyListening() {
        return this.isListening;
    }
    
    /**
     * Callback when listening state changes
     * Override this in integration
     * @param {boolean} isListening - Whether currently listening
     */
    onListeningStateChange(isListening) {
        // Override in integration
    }
    
    /**
     * Callback when transcript is ready
     * Override this in integration
     * @param {string} transcript - Final transcript text
     */
    onTranscriptReady(transcript) {
        // Override in integration
    }
    
    /**
     * Callback when error occurs
     * Override this in integration
     * @param {string} errorMessage - Error message
     */
    onError(errorMessage) {
        // Override in integration
        console.error('Voice input error:', errorMessage);
    }
}

// Global voice input manager instance
window.voiceInputManager = new VoiceInputManager();

