/**
 * Message Component
 * Handles rendering of chat messages with audio playback and user interactions
 */

export class MessageComponent {
    constructor(messageData, audioManager) {
        this.messageData = messageData;
        this.audioManager = audioManager;
        this.element = null;
    }

    /**
     * Render the message component
     * @returns {HTMLElement} The rendered message element
     */
    render() {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${this.messageData.sender === 'user' ? 'message-user' : 'message-tutor'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Message text
        if (this.messageData.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = this.messageData.text;
            contentDiv.appendChild(textDiv);
        }

        // Message metadata (translation, grammar, etc.)
        if (this.messageData.translation || this.messageData.grammar) {
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';

            if (this.messageData.translation) {
                const translationDiv = document.createElement('div');
                translationDiv.className = 'message-translation text-sm text-cafe-mocha';
                translationDiv.textContent = `Translation: ${this.messageData.translation}`;
                metaDiv.appendChild(translationDiv);
            }

            if (this.messageData.grammar) {
                const grammarDiv = document.createElement('div');
                grammarDiv.className = 'message-grammar text-sm text-cafe-mocha';
                grammarDiv.textContent = `Grammar: ${this.messageData.grammar}`;
                metaDiv.appendChild(grammarDiv);
            }

            contentDiv.appendChild(metaDiv);
        }

        // Audio controls
        if (this.messageData.audio_url) {
            const audioControls = this.createAudioControls();
            contentDiv.appendChild(audioControls);
        }

        // Feedback indicators
        if (this.messageData.feedback) {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'message-feedback';
            feedbackDiv.textContent = this.messageData.feedback;
            contentDiv.appendChild(feedbackDiv);
        }

        messageDiv.appendChild(contentDiv);
        this.element = messageDiv;

        return messageDiv;
    }

    /**
     * Create audio controls for the message
     * @returns {HTMLElement} Audio controls element
     */
    createAudioControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'audio-controls flex items-center space-x-2 mt-2';

        const playButton = document.createElement('button');
        playButton.className = 'audio-play-btn p-2 bg-cafe-latte text-cafe-espresso rounded-lg hover:bg-cafe-mocha hover:text-white transition-colors';
        playButton.innerHTML = '<i data-feather="play" class="w-4 h-4"></i>';
        playButton.title = 'Play audio';

        playButton.addEventListener('click', () => {
            this.audioManager.play(this.messageData.audio_url, playButton, controlsDiv);
        });

        controlsDiv.appendChild(playButton);

        // Initialize feather icons for this button
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        return controlsDiv;
    }

    /**
     * Update the message with new data
     * @param {Object} newData - Updated message data
     */
    update(newData) {
        Object.assign(this.messageData, newData);
        // Re-render if needed
        if (this.element && this.element.parentNode) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
            this.element = newElement;
        }
    }

    /**
     * Remove the message from DOM
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
