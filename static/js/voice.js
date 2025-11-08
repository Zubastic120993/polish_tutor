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
            this.finalTranscript = '';
            this.interimTranscript = '';
            this.updateLiveCaption('');
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
            this.isListening = false;
            this.onListeningStateChange(false);
            
            // Clear silence timeout
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }
            
            // Hide live caption
            this.hideLiveCaption();
            
            // If we have a final transcript, send it
            if (this.finalTranscript.trim()) {
                this.onTranscriptReady(this.finalTranscript.trim());
            }
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
        
        // Request microphone permission
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            this.handlePermissionError(error);
            return false;
        }
        
        if (!this.recognition) {
            this.initRecognition();
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            // Recognition might already be running
            if (error.name === 'InvalidStateError') {
                console.warn('Recognition already running');
                return true;
            }
            this.handleError(error);
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
        let errorMessage = '';
        
        switch (error) {
            case 'no-speech':
                // No speech detected - this is normal, don't show error
                return;
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
                return;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
                break;
            default:
                errorMessage = `Speech recognition error: ${error}. Please try again.`;
        }
        
        // Use error handler if available
        if (window.errorHandler) {
            const category = error === 'not-allowed' ? 'MICROPHONE_DENIED' : 
                           error === 'no-speech' ? 'STT_TIMEOUT' : 'SPEECH';
            window.errorHandler.handleError(category, new Error(errorMessage), {
                errorCode: error
            });
        } else {
            this.onError(errorMessage);
        }
        this.stopListening();
    }
    
    /**
     * Handle permission errors
     * @param {Error} error - Permission error
     */
    handlePermissionError(error) {
        let errorMessage = '';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else {
            errorMessage = `Microphone error: ${error.message}. Please try again.`;
        }
        
        // Use error handler if available
        if (window.errorHandler) {
            window.errorHandler.handleError('MICROPHONE_DENIED', error, {
                errorName: error.name
            });
        } else {
            this.onError(errorMessage);
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

