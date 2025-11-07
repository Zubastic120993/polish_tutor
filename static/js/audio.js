/**
 * Audio Playback Manager
 * Handles audio playback with progress, speed control, and error handling
 */

class AudioManager {
    constructor() {
        this.currentAudio = null;
        this.currentButton = null;
        this.currentProgressBar = null;
        this.playbackSpeed = 1.0; // Default speed
        this.progressUpdateInterval = null;
        
        // Load speed preference from localStorage
        const savedSpeed = localStorage.getItem('audioSpeed');
        if (savedSpeed) {
            this.playbackSpeed = parseFloat(savedSpeed);
        }
    }
    
    /**
     * Play audio with full controls
     * @param {string} audioUrl - URL to audio file
     * @param {HTMLElement} button - Button element to update
     * @param {HTMLElement} messageEl - Message element containing the button
     */
    play(audioUrl, button, messageEl) {
        // Stop any currently playing audio
        this.stop();
        
        // Create new audio element
        const audio = new Audio(audioUrl);
        audio.playbackRate = this.playbackSpeed;
        
        // Store references
        this.currentAudio = audio;
        this.currentButton = button;
        
        // Create progress bar if it doesn't exist
        let progressContainer = messageEl.querySelector('.audio-progress-container');
        if (!progressContainer) {
            progressContainer = this.createProgressBar(messageEl);
        }
        this.currentProgressBar = progressContainer.querySelector('.audio-progress-bar');
        
        // Update button state
        this.updateButtonState(button, 'playing');
        
        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
            this.updateProgressBar(0, audio.duration);
        });
        
        audio.addEventListener('timeupdate', () => {
            this.updateProgressBar(audio.currentTime, audio.duration);
        });
        
        audio.addEventListener('ended', () => {
            this.handleAudioEnd();
        });
        
        audio.addEventListener('error', (e) => {
            this.handleAudioError(e);
        });
        
        audio.addEventListener('pause', () => {
            this.updateButtonState(button, 'paused');
        });
        
        audio.addEventListener('play', () => {
            this.updateButtonState(button, 'playing');
        });
        
        // Start playback
        audio.play().catch((error) => {
            console.error('Audio play error:', error);
            this.handleAudioError(error);
        });
    }
    
    /**
     * Stop currently playing audio
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        if (this.currentButton) {
            this.updateButtonState(this.currentButton, 'stopped');
            this.currentButton = null;
        }
        
        if (this.currentProgressBar) {
            this.hideProgressBar();
            this.currentProgressBar = null;
        }
        
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
    }
    
    /**
     * Toggle play/pause for current audio
     */
    toggle() {
        if (!this.currentAudio) return;
        
        if (this.currentAudio.paused) {
            this.currentAudio.play();
        } else {
            this.currentAudio.pause();
        }
    }
    
    /**
     * Set playback speed
     * @param {number} speed - Playback speed (0.75 or 1.0)
     */
    setSpeed(speed) {
        if (speed !== 0.75 && speed !== 1.0) {
            console.warn('Invalid speed. Use 0.75 or 1.0');
            return;
        }
        
        this.playbackSpeed = speed;
        localStorage.setItem('audioSpeed', speed.toString());
        
        // Update current audio if playing
        if (this.currentAudio) {
            this.currentAudio.playbackRate = speed;
        }
    }
    
    /**
     * Toggle between 0.75× and 1.0× speed
     */
    toggleSpeed() {
        const newSpeed = this.playbackSpeed === 1.0 ? 0.75 : 1.0;
        this.setSpeed(newSpeed);
        return newSpeed;
    }
    
    /**
     * Create progress bar element
     * @param {HTMLElement} messageEl - Message element
     * @returns {HTMLElement} Progress container element
     */
    createProgressBar(messageEl) {
        const container = document.createElement('div');
        container.className = 'audio-progress-container';
        container.setAttribute('role', 'progressbar');
        container.setAttribute('aria-label', 'Audio playback progress');
        container.setAttribute('aria-valuemin', '0');
        container.setAttribute('aria-valuemax', '100');
        container.setAttribute('aria-valuenow', '0');
        
        const bar = document.createElement('div');
        bar.className = 'audio-progress-bar';
        
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'audio-progress-time';
        timeDisplay.textContent = '0:00 / 0:00';
        
        container.appendChild(bar);
        container.appendChild(timeDisplay);
        
        // Insert after message bubble
        const bubble = messageEl.querySelector('.message__bubble');
        bubble.appendChild(container);
        
        return container;
    }
    
    /**
     * Update progress bar
     * @param {number} currentTime - Current playback time in seconds
     * @param {number} duration - Total duration in seconds
     */
    updateProgressBar(currentTime, duration) {
        if (!this.currentProgressBar || !duration) return;
        
        const progress = (currentTime / duration) * 100;
        this.currentProgressBar.style.width = `${progress}%`;
        
        const container = this.currentProgressBar.parentElement;
        container.setAttribute('aria-valuenow', Math.round(progress));
        
        const timeDisplay = container.querySelector('.audio-progress-time');
        if (timeDisplay) {
            timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
        }
    }
    
    /**
     * Hide progress bar
     */
    hideProgressBar() {
        if (this.currentProgressBar) {
            const container = this.currentProgressBar.parentElement;
            if (container) {
                container.style.display = 'none';
            }
        }
    }
    
    /**
     * Format time in seconds to MM:SS
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Update button state
     * @param {HTMLElement} button - Button element
     * @param {string} state - State: 'playing', 'paused', 'stopped'
     */
    updateButtonState(button, state) {
        const icon = button.querySelector('i');
        if (!icon) return;
        
        // Remove all state classes
        button.classList.remove('audio-button--playing', 'audio-button--paused');
        
        switch (state) {
            case 'playing':
                button.classList.add('audio-button--playing');
                icon.setAttribute('data-feather', 'pause');
                button.setAttribute('aria-label', 'Pause audio');
                break;
            case 'paused':
                button.classList.add('audio-button--paused');
                icon.setAttribute('data-feather', 'play');
                button.setAttribute('aria-label', 'Play audio');
                break;
            case 'stopped':
                icon.setAttribute('data-feather', 'play');
                button.setAttribute('aria-label', 'Play audio');
                break;
        }
        
        // Update feather icon
        feather.replace();
    }
    
    /**
     * Handle audio end
     */
    handleAudioEnd() {
        if (this.currentButton) {
            this.updateButtonState(this.currentButton, 'stopped');
        }
        
        if (this.currentProgressBar) {
            this.hideProgressBar();
        }
        
        this.currentAudio = null;
        this.currentButton = null;
        this.currentProgressBar = null;
    }
    
    /**
     * Handle audio error
     * @param {Error|Event} error - Error object or event
     */
    handleAudioError(error) {
        console.error('Audio playback error:', error);
        
        if (this.currentButton) {
            this.updateButtonState(this.currentButton, 'stopped');
            
            // Show error state
            const icon = this.currentButton.querySelector('i');
            if (icon) {
                icon.setAttribute('data-feather', 'alert-circle');
                feather.replace();
            }
        }
        
        // Hide progress bar
        if (this.currentProgressBar) {
            this.hideProgressBar();
        }
        
        // Reset references
        this.currentAudio = null;
        this.currentButton = null;
        this.currentProgressBar = null;
        
        // Emit error event (can be listened to by chat UI)
        if (window.chatUI) {
            window.chatUI.showErrorMessage('Failed to play audio. Please try again.');
        }
    }
    
    /**
     * Get current playback speed
     * @returns {number} Current speed (0.75 or 1.0)
     */
    getSpeed() {
        return this.playbackSpeed;
    }
    
    /**
     * Check if audio is currently playing
     * @returns {boolean} True if audio is playing
     */
    isPlaying() {
        return this.currentAudio && !this.currentAudio.paused;
    }
}

// Global audio manager instance
window.audioManager = new AudioManager();

