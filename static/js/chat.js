/**
 * Chat UI Functionality
 * Handles WebSocket connection, message rendering, and user interactions
 */

class ChatUI {
    constructor() {
        this.wsClient = null;
        this.userId = 1; // Default user ID (will be configurable later)
        this.currentLessonId = null;
        this.currentDialogueId = null;
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.micButton = document.getElementById('mic-button');
        this.chatMessages = document.getElementById('chat-messages');
        this.connectionStatus = document.getElementById('connection-status');
        this.connectionStatusText = document.getElementById('connection-status-text');
        this.isTyping = false;
        
        this.init();
    }
    
    init() {
        // Initialize WebSocket client
        this.initWebSocket();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial lesson (will be implemented in checkpoint 5.1)
        // For now, we'll use placeholder values
        this.currentLessonId = 'coffee_001';
        this.currentDialogueId = 'coffee_001_d1';
    }
    
    initWebSocket() {
        // Import WebSocket client (using the example we created)
        if (typeof TutorWebSocketClient === 'undefined') {
            console.error('TutorWebSocketClient not found. Make sure websocket_client_example.js is loaded.');
            return;
        }
        
        const wsUrl = `ws://${window.location.host}/ws/chat`;
        this.wsClient = new TutorWebSocketClient(wsUrl);
        
        // Set up callbacks
        this.wsClient.onTyping((message) => {
            this.showTypingIndicator();
        });
        
        this.wsClient.onResponse((data, metadata) => {
            this.hideTypingIndicator();
            this.renderTutorMessage(data, metadata);
        });
        
        this.wsClient.onError((errorMessage) => {
            this.hideTypingIndicator();
            this.showErrorMessage(errorMessage);
        });
        
        // Connect
        this.wsClient.connect(
            this.userId,
            () => {
                this.updateConnectionStatus('connected', 'Connected');
                console.log('WebSocket connected');
            },
            (event) => {
                this.updateConnectionStatus('disconnected', 'Disconnected');
                console.log('WebSocket disconnected', event);
            },
            (error) => {
                this.updateConnectionStatus('disconnected', 'Connection error');
                console.error('WebSocket error:', error);
            }
        );
    }
    
    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send (Shift+Enter for new line)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Mic button (will be implemented in checkpoint 4.4)
        this.micButton.addEventListener('click', () => {
            this.handleMicClick();
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }
    
    sendMessage() {
        const text = this.messageInput.value.trim();
        
        if (!text) {
            return;
        }
        
        if (!this.wsClient || !this.wsClient.isConnected()) {
            this.showErrorMessage('Not connected. Please wait...');
            return;
        }
        
        // Render learner message immediately
        this.renderLearnerMessage(text);
        
        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Send via WebSocket
        try {
            this.wsClient.sendMessage(
                text,
                this.currentLessonId,
                this.currentDialogueId,
                1.0, // speed
                null  // confidence (will be from settings later)
            );
        } catch (error) {
            console.error('Error sending message:', error);
            this.showErrorMessage('Failed to send message. Please try again.');
        }
    }
    
    renderLearnerMessage(text) {
        const messageEl = this.createMessageElement('learner', text);
        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    renderTutorMessage(data, metadata) {
        // Update current dialogue ID if provided
        if (data.next_dialogue_id) {
            this.currentDialogueId = data.next_dialogue_id;
        }
        
        // Create tutor message
        const messageEl = this.createMessageElement('tutor', data.reply_text);
        
        // Add score indicator if available
        if (data.score !== undefined) {
            const scoreEl = this.createScoreIndicator(data.score, data.feedback_type);
            messageEl.querySelector('.message__bubble').appendChild(scoreEl);
        }
        
        // Add audio button if audio URLs available
        if (data.audio && data.audio.length > 0) {
            const audioButton = this.createAudioButton(data.audio[0]);
            messageEl.querySelector('.message__bubble').appendChild(audioButton);
        }
        
        // Add quick actions
        if (data.feedback_type) {
            const actionsEl = this.createQuickActions(data);
            messageEl.appendChild(actionsEl);
        }
        
        // Add hint if available
        if (data.hint) {
            const hintEl = this.createHintMessage(data.hint);
            this.chatMessages.appendChild(hintEl);
        }
        
        // Add grammar explanation if available
        if (data.grammar_explanation) {
            const grammarEl = this.createInfoMessage(data.grammar_explanation);
            this.chatMessages.appendChild(grammarEl);
        }
        
        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    createMessageElement(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${type}`;
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', `${type === 'tutor' ? 'Tutor' : 'Your'} message`);
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message__bubble';
        
        const textP = document.createElement('p');
        textP.textContent = text;
        bubbleDiv.appendChild(textP);
        
        messageDiv.appendChild(bubbleDiv);
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message__meta';
        
        const timeEl = document.createElement('time');
        timeEl.setAttribute('datetime', new Date().toISOString());
        timeEl.textContent = 'Just now';
        metaDiv.appendChild(timeEl);
        
        messageDiv.appendChild(metaDiv);
        
        return messageDiv;
    }
    
    createScoreIndicator(score, feedbackType) {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = `score-indicator score-indicator--${feedbackType}`;
        
        const scoreText = document.createElement('span');
        scoreText.textContent = `Score: ${Math.round(score * 100)}%`;
        scoreDiv.appendChild(scoreText);
        
        return scoreDiv;
    }
    
    createAudioButton(audioUrl) {
        const button = document.createElement('button');
        button.className = 'audio-button';
        button.setAttribute('aria-label', 'Play audio');
        button.setAttribute('title', 'Play audio');
        
        const icon = document.createElement('i');
        icon.setAttribute('data-feather', 'play');
        icon.className = 'audio-button__icon';
        button.appendChild(icon);
        
        button.addEventListener('click', () => {
            this.playAudio(audioUrl, button);
        });
        
        // Initialize feather icon after adding to DOM
        setTimeout(() => feather.replace(), 0);
        
        return button;
    }
    
    createQuickActions(data) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message__actions';
        
        // Repeat button
        const repeatBtn = document.createElement('button');
        repeatBtn.className = 'quick-action';
        repeatBtn.textContent = 'Repeat';
        repeatBtn.setAttribute('aria-label', 'Repeat phrase');
        repeatBtn.addEventListener('click', () => {
            this.handleRepeat();
        });
        actionsDiv.appendChild(repeatBtn);
        
        // Explain why button (if feedback is low or medium)
        if (data.feedback_type === 'low' || data.feedback_type === 'medium') {
            const explainBtn = document.createElement('button');
            explainBtn.className = 'quick-action';
            explainBtn.textContent = 'Explain why';
            explainBtn.setAttribute('aria-label', 'Explain why');
            explainBtn.addEventListener('click', () => {
                this.handleExplainWhy(data);
            });
            actionsDiv.appendChild(explainBtn);
        }
        
        return actionsDiv;
    }
    
    createHintMessage(hint) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message--hint';
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', 'Hint');
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message__bubble';
        bubbleDiv.textContent = `💡 ${hint}`;
        
        messageDiv.appendChild(bubbleDiv);
        return messageDiv;
    }
    
    createInfoMessage(info) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message--info';
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', 'Information');
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message__bubble';
        bubbleDiv.textContent = `📚 ${info}`;
        
        messageDiv.appendChild(bubbleDiv);
        return messageDiv;
    }
    
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.setAttribute('aria-label', 'Tutor is typing');
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-indicator__dot';
            typingDiv.appendChild(dot);
        }
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message message--info';
        errorDiv.setAttribute('role', 'alert');
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message__bubble';
        bubbleDiv.textContent = `⚠️ ${message}`;
        bubbleDiv.style.backgroundColor = 'var(--color-error)';
        bubbleDiv.style.color = 'white';
        
        errorDiv.appendChild(bubbleDiv);
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        // Smooth scroll to bottom
        this.chatMessages.scrollTo({
            top: this.chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    autoResizeTextarea() {
        const textarea = this.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    updateConnectionStatus(status, text) {
        this.connectionStatus.className = `connection-status connection-status--${status}`;
        this.connectionStatusText.textContent = text;
        
        // Update aria-live
        if (status === 'disconnected') {
            this.connectionStatus.setAttribute('aria-live', 'assertive');
        } else {
            this.connectionStatus.setAttribute('aria-live', 'polite');
        }
    }
    
    handleMicClick() {
        // Will be implemented in checkpoint 4.4
        console.log('Mic button clicked - voice input will be implemented in checkpoint 4.4');
        this.showInfoMessage('Voice input will be available in the next update.');
    }
    
    handleRepeat() {
        // Get the last tutor message and repeat it
        const tutorMessages = this.chatMessages.querySelectorAll('.message--tutor');
        if (tutorMessages.length > 0) {
            const lastMessage = tutorMessages[tutorMessages.length - 1];
            const text = lastMessage.querySelector('.message__bubble p').textContent;
            this.renderLearnerMessage(text);
            
            // Send repeat request (same text as tutor's last message)
            if (this.wsClient && this.wsClient.isConnected()) {
                this.wsClient.sendMessage(
                    text,
                    this.currentLessonId,
                    this.currentDialogueId,
                    1.0,
                    null
                );
            }
        }
    }
    
    handleExplainWhy(data) {
        // Show grammar explanation or hint if available
        if (data.grammar_explanation) {
            const grammarEl = this.createInfoMessage(data.grammar_explanation);
            this.chatMessages.appendChild(grammarEl);
            this.scrollToBottom();
        } else if (data.hint) {
            const hintEl = this.createHintMessage(data.hint);
            this.chatMessages.appendChild(hintEl);
            this.scrollToBottom();
        } else {
            this.showInfoMessage('No additional explanation available.');
        }
    }
    
    playAudio(audioUrl, button) {
        // Will be fully implemented in checkpoint 4.3
        // For now, just create audio element and play
        const audio = new Audio(audioUrl);
        
        button.classList.add('audio-button--playing');
        const icon = button.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', 'pause');
            feather.replace();
        }
        
        audio.addEventListener('ended', () => {
            button.classList.remove('audio-button--playing');
            if (icon) {
                icon.setAttribute('data-feather', 'play');
                feather.replace();
            }
        });
        
        audio.addEventListener('error', () => {
            button.classList.remove('audio-button--playing');
            if (icon) {
                icon.setAttribute('data-feather', 'play');
                feather.replace();
            }
            this.showErrorMessage('Failed to play audio.');
        });
        
        audio.play().catch((error) => {
            console.error('Audio play error:', error);
            this.showErrorMessage('Failed to play audio.');
        });
    }
    
    showInfoMessage(message) {
        const infoEl = this.createInfoMessage(message);
        this.chatMessages.appendChild(infoEl);
        this.scrollToBottom();
    }
}

// Initialize chat UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatUI = new ChatUI();
});

