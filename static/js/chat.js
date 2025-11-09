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
        this.translationMode = 'smart'; // 'show', 'hide', or 'smart'
        this.successfulPhrases = new Set(); // Track phrases that were answered correctly
        this.lessonScenarioShown = false;
        this.hasShownFirstPromptGuide = false;
        
        // Load translation setting from localStorage
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.translation) {
                    this.translationMode = settings.translation;
                }
            } catch (e) {
                console.warn('Failed to parse saved settings:', e);
            }
        }
        
        // Listen for settings changes
        document.addEventListener('settingsChanged', (event) => {
            const settings = event.detail;
            if (settings.translation) {
                this.translationMode = settings.translation;
            }
        });
        
        this.init();
        this.initVoiceInput();
    }
    
    init() {
        console.log('[Chat] Initializing...');
        
        // Show immediate feedback
        if (this.chatMessages) {
            const loadingMsg = this.createInfoMessage('Initializing Patient Polish Tutor...');
            this.chatMessages.appendChild(loadingMsg);
        }
        
        // Initialize WebSocket client
        this.initWebSocket();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize lesson flow
        this.initLessonFlow();
    }
    
    async initLessonFlow() {
        // Wait for lesson flow manager to be available
        setTimeout(async () => {
            if (typeof window.lessonFlowManager === 'undefined') {
                console.warn('LessonFlowManager not loaded. Lesson flow will not be available.');
                // Fallback to placeholder values
                this.currentLessonId = 'coffee_001';
                this.currentDialogueId = 'coffee_001_d1';
                return;
            }
            
            // Start default lesson
            try {
                console.log('[Chat] Starting lesson coffee_001...');
                await this.startLesson('coffee_001');
                console.log('[Chat] Lesson started successfully');
            } catch (error) {
                console.error('[Chat] Failed to start lesson:', error);
                if (window.errorHandler) {
                    window.errorHandler.handleError('LESSON_DATA', error, {
                        lessonId: 'coffee_001'
                    });
                } else {
                    this.showErrorMessage('Failed to load lesson. Please refresh the page.');
                }
                // Fallback to placeholder values
                this.currentLessonId = 'coffee_001';
                this.currentDialogueId = 'coffee_001_d1';
                // Show welcome message anyway
                this.showInfoMessage('Welcome! Type a message to start learning Polish.');
            }
        }, 500); // Increased delay to ensure all scripts are loaded
    }
    
    async startLesson(lessonId) {
        if (!window.lessonFlowManager) {
            throw new Error('LessonFlowManager not available');
        }
        
        const lessonData = await window.lessonFlowManager.startLesson(lessonId);
        
        this.hasShownFirstPromptGuide = false;
        this.lessonScenarioShown = false;

        this.currentLessonId = lessonData.lesson.id;
        this.currentDialogueId = lessonData.dialogue.id;
        
        // Show intro message
        this.renderLessonScenarioCard(lessonData);

        // Show first tutor message
        this.renderTutorDialogue(lessonData.dialogue);
        
        return lessonData;
    }
    
    /**
     * Check if translation should be shown based on settings
     * @param {string} phraseId - Phrase/dialogue ID
     * @returns {boolean} True if translation should be shown
     */
    shouldShowTranslation(phraseId) {
        if (this.translationMode === 'show') {
            return true;
        }
        if (this.translationMode === 'hide') {
            return false;
        }
        // Smart mode: hide if phrase was answered correctly
        if (this.translationMode === 'smart') {
            return !this.successfulPhrases.has(phraseId);
        }
        return true; // Default to showing
    }
    
    renderLessonScenarioCard(lessonData) {
        if (!this.chatMessages || this.lessonScenarioShown) {
            return;
        }

        const lesson = lessonData?.lesson || {};
        const title = lesson.title || 'Your Polish lesson';
        const level = lesson.level ? lesson.level.toUpperCase() : 'A0';
        const goal = lesson.cefr_goal || lessonData?.intro || 'Practice speaking naturally.';

        const card = document.createElement('div');
        card.className = 'message message--info lesson-scenario';
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', 'Lesson introduction');

        const bubble = document.createElement('div');
        bubble.className = 'message__bubble';
        bubble.innerHTML = `<div style="font-size: 1rem; font-weight: 600;">☕ Welcome! Imagine you're stepping into a cozy Polish café.</div>` +
            `<div style="margin-top: 0.75rem;">Today we're working on <strong>${title}</strong> (Level ${level}).</div>` +
            `<div style="color: var(--color-text-muted, #4b5563); margin-top: 0.35rem;">🎯 Goal: ${goal}</div>` +
            `<div style="margin-top: 1rem; font-weight: 500;">Here's how to begin:</div>` +
            `<ol style="margin: 0.5rem 0 0; padding-left: 1.4rem; display: grid; gap: 0.35rem; text-align: left;">` +
            `<li><strong>Listen</strong> — tap the green play button to hear the tutor.</li>` +
            `<li><strong>Reply</strong> — speak with the microphone or type your answer.</li>` +
            `<li><strong>Need help?</strong> — try “repeat”, “hint”, or “change topic”.</li>` +
            `</ol>` +
            `<div style="margin-top: 0.85rem; font-weight: 500;">Quick commands:</div>`;

        const chips = document.createElement('div');
        chips.style.display = 'flex';
        chips.style.flexWrap = 'wrap';
        chips.style.gap = '0.5rem';
        chips.style.marginTop = '0.5rem';

        const commands = ['repeat', 'hint', 'change topic', 'teach me about coffee'];
        commands.forEach((cmd) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.textContent = cmd;
            chip.style.border = '1px solid var(--color-border, rgba(148, 163, 184, 0.35))';
            chip.style.background = 'transparent';
            chip.style.color = 'var(--color-text)';
            chip.style.borderRadius = '999px';
            chip.style.padding = '0.35rem 0.75rem';
            chip.style.fontSize = '0.85rem';
            chip.style.cursor = 'pointer';
            chip.style.transition = 'background 0.2s ease, color 0.2s ease';

            chip.addEventListener('mouseenter', () => {
                chip.style.background = 'var(--color-primary-muted, rgba(59,130,246,0.15))';
            });
            chip.addEventListener('mouseleave', () => {
                chip.style.background = 'transparent';
            });

            chip.addEventListener('click', () => {
                if (this.messageInput) {
                    this.messageInput.value = cmd;
                    this.messageInput.focus();
                }
            });

            chips.appendChild(chip);
        });

        bubble.appendChild(chips);
        card.appendChild(bubble);
        this.chatMessages.appendChild(card);
        this.scrollToBottom();

        this.lessonScenarioShown = true;
    }

    renderTutorDialogue(dialogue) {
        if (!dialogue) return;
        
        const tutorText = dialogue.tutor || '';
        const translation = dialogue.translation || '';
        
        // Create tutor message
        const messageEl = this.createMessageElement('tutor', tutorText);
        const messageBubble = messageEl.querySelector('.message__bubble');
        
        if (!this.hasShownFirstPromptGuide) {
            const guide = document.createElement('div');
            guide.className = 'first-prompt-guide';
            guide.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(129, 140, 248, 0.18))';
            guide.style.borderRadius = 'var(--border-radius, 10px)';
            guide.style.padding = 'calc(var(--spacing-sm) * 1.1)';
            guide.style.marginBottom = 'var(--spacing-sm)';
            guide.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.18)';
            guide.style.color = 'var(--color-text)';
            guide.innerHTML = `<div style="display:flex; align-items:center; gap:0.5rem; font-weight:600;">` +
                `<span style="font-size:1.1rem;">✅</span><span>Your turn!</span></div>` +
                `<div style="margin-top:0.65rem; display:grid; gap:0.45rem; line-height:1.55;">` +
                `<div><span style="font-weight:600;">1. Listen.</span> Tap the green play button for the tutor's Polish audio.</div>` +
                `<div><span style="font-weight:600;">2. Reply.</span> Speak with the microphone or type your best answer below — English is okay if you're unsure.</div>` +
                `<div><span style="font-weight:600;">3. Need help?</span> Type “hint”, “repeat”, or ask for another topic.</div>` +
                `</div>` +
                `<div style="margin-top:0.6rem; font-size:0.85rem; color:var(--color-text-muted, #6b7280);">I’ll listen and give you gentle feedback after every reply. 🌟</div>`;
            messageBubble.appendChild(guide);
            this.hasShownFirstPromptGuide = true;
        }

        // Show the Polish phrase being learned in a highlighted box
        if (tutorText && tutorText.trim()) {
            const phraseCard = document.createElement('div');
            phraseCard.className = 'tutor-phrase';

            const header = document.createElement('div');
            header.className = 'tutor-phrase__header';
            header.innerHTML = '<span class="tutor-phrase__icon">🗣️</span><span class="tutor-phrase__title">Practice this phrase</span>';
            phraseCard.appendChild(header);

            const phraseText = document.createElement('div');
            phraseText.className = 'tutor-phrase__text';
            phraseText.textContent = tutorText;
            phraseCard.appendChild(phraseText);

            if (translation && this.shouldShowTranslation(dialogue.id)) {
                const translationEl = document.createElement('div');
                translationEl.className = 'tutor-phrase__translation';
                translationEl.textContent = translation;
                phraseCard.appendChild(translationEl);
            }

            const helperRow = document.createElement('div');
            helperRow.className = 'tutor-phrase__helper';
            helperRow.innerHTML = '<span class="tutor-phrase__dot">•</span> Tap play to hear it in Polish, then try saying it yourself.';
            phraseCard.appendChild(helperRow);

            messageBubble.appendChild(phraseCard);
        } else if (translation && this.shouldShowTranslation(dialogue.id)) {
            const translationEl = document.createElement('div');
            translationEl.className = 'tutor-phrase__translation';
            translationEl.textContent = translation;
            messageBubble.appendChild(translationEl);
        }
        
        // ALWAYS add audio controls for tutor dialogue
        const audioContainer = document.createElement('div');
        audioContainer.className = 'audio-controls';
        audioContainer.style.display = 'flex';
        audioContainer.style.alignItems = 'center';
        audioContainer.style.marginTop = 'var(--spacing-sm)';
        audioContainer.style.gap = 'var(--spacing-xs)';
        audioContainer.style.padding = 'var(--spacing-xs)';
        audioContainer.style.backgroundColor = 'var(--color-background-light, #f8f9fa)';
        audioContainer.style.borderRadius = 'var(--border-radius, 8px)';
        
        // Try pre-recorded audio first, fallback to TTS generation
        if (dialogue.audio) {
            const preRecordedUrl = `/static/audio/native/${this.currentLessonId}/${dialogue.audio}`;
            this.getAudioUrl(dialogue, preRecordedUrl).then(audioUrl => {
                const audioButton = this.createAudioButton(audioUrl);
                audioContainer.appendChild(audioButton);
                
                // Add speed toggle
                const speedToggle = this.createSpeedToggle();
                audioContainer.appendChild(speedToggle);
                
                // Add label
                const audioLabel = document.createElement('span');
                audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
                audioLabel.style.color = 'var(--color-text-muted, #666)';
                audioLabel.style.marginLeft = 'var(--spacing-xs)';
                audioLabel.textContent = '🔊 Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.addEventListener('click', () => {
                    audioButton.click();
                });
                audioContainer.appendChild(audioLabel);
                
                messageBubble.appendChild(audioContainer);
            }).catch(error => {
                console.error('Failed to get audio URL:', error);
                // Fallback: generate on-demand
                const audioButton = this.createAudioButtonWithGeneration(tutorText, dialogue.id);
                audioContainer.appendChild(audioButton);
                
                const speedToggle = this.createSpeedToggle();
                audioContainer.appendChild(speedToggle);
                
                const audioLabel = document.createElement('span');
                audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
                audioLabel.style.color = 'var(--color-text-muted, #666)';
                audioLabel.style.marginLeft = 'var(--spacing-xs)';
                audioLabel.textContent = '🔊 Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.addEventListener('click', () => {
                    audioButton.click();
                });
                audioContainer.appendChild(audioLabel);
                
                messageBubble.appendChild(audioContainer);
            });
        } else if (tutorText && tutorText.trim()) {
            // No pre-recorded audio, generate on-demand
            const audioButton = this.createAudioButtonWithGeneration(tutorText, dialogue.id);
            audioContainer.appendChild(audioButton);
            
            const speedToggle = this.createSpeedToggle();
            audioContainer.appendChild(speedToggle);
            
            const audioLabel = document.createElement('span');
            audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
            audioLabel.style.color = 'var(--color-text-muted, #666)';
            audioLabel.style.marginLeft = 'var(--spacing-xs)';
            audioLabel.textContent = '🔊 Click to hear pronunciation';
            audioLabel.style.cursor = 'pointer';
            audioLabel.addEventListener('click', () => {
                audioButton.click();
            });
            audioContainer.appendChild(audioLabel);
            
            messageBubble.appendChild(audioContainer);
        }
        
        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    initVoiceInput() {
        // Wait for voice input manager to be available
        // Use a small delay to ensure voice.js has loaded
        setTimeout(() => {
            if (typeof window.voiceInputManager === 'undefined') {
                console.warn('VoiceInputManager not loaded. Voice input will not be available.');
                return;
            }
            
            const voiceManager = window.voiceInputManager;
            
            // Set up callbacks
            voiceManager.onListeningStateChange = (isListening) => {
                this.updateMicButtonState(isListening);
            };
            
            voiceManager.onTranscriptReady = (transcript) => {
                // Set transcript in input field
                this.messageInput.value = transcript;
                this.autoResizeTextarea();
                
                // Auto-send if in push-to-talk mode, or let user review in tap mode
                const micMode = voiceManager.getMicMode();
                if (micMode === 'push' && transcript.trim()) {
                    // Small delay to show the text before sending
                    setTimeout(() => {
                        this.sendMessage();
                    }, 300);
                }
            };
            
            voiceManager.onError = (errorMessage) => {
                this.showErrorMessage(errorMessage);
            };
            
            // Listen for error retry events
            document.addEventListener('errorRetry', () => {
                // Retry starting voice input
                if (!voiceManager.isCurrentlyListening()) {
                    voiceManager.startListening(voiceManager.getMicMode());
                }
            });
        }, 100);
    }
    
    updateMicButtonState(isListening) {
        if (!this.micButton) return;
        
        const icon = this.micButton.querySelector('i');
        if (!icon) return;
        
        if (isListening) {
            this.micButton.classList.add('mic-button--listening');
            icon.setAttribute('data-feather', 'mic-off');
            this.micButton.setAttribute('aria-label', 'Stop voice input');
            this.micButton.setAttribute('title', 'Stop voice input');
        } else {
            this.micButton.classList.remove('mic-button--listening');
            icon.setAttribute('data-feather', 'mic');
            this.micButton.setAttribute('aria-label', 'Start voice input');
            this.micButton.setAttribute('title', 'Start voice input');
        }
        
        // Update feather icon
        feather.replace();
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
            if (window.errorHandler) {
                window.errorHandler.handleError('NETWORK', new Error(errorMessage), {
                    connectionType: 'websocket'
                });
            } else {
                this.showErrorMessage(errorMessage);
            }
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
        
        // Mic button
        if (this.micButton) {
            this.micButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleMicClick();
            });
        }
        
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
        
        // Store last user message for progress tracking
        this.lastUserMessage = text;
        
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
            if (window.errorHandler) {
                window.errorHandler.handleError('NETWORK', error, {
                    action: 'send_message'
                });
            } else {
                this.showErrorMessage('Failed to send message. Please try again.');
            }
        }
    }
    
    showLessonSummary() {
        if (!window.lessonFlowManager || !window.lessonFlowManager.isActive()) {
            return;
        }
        
        const summary = window.lessonFlowManager.getLessonSummary();
        if (!summary) {
            return;
        }
        
        // Create summary message
        const summaryEl = document.createElement('div');
        summaryEl.className = 'message message--info';
        summaryEl.setAttribute('role', 'article');
        summaryEl.setAttribute('aria-label', 'Lesson summary');
        
        const bubble = document.createElement('div');
        bubble.className = 'message__bubble';
        
        let summaryText = `🎉 Lesson Complete!\n\n`;
        summaryText += `Lesson: ${summary.title}\n`;
        summaryText += `Dialogues completed: ${summary.completedDialogues}\n`;
        
        if (summary.avgScore !== null) {
            summaryText += `Average score: ${Math.round(summary.avgScore * 100)}%\n`;
        }
        
        summaryText += `\nGreat job! Keep practicing!`;
        
        bubble.textContent = summaryText;
        summaryEl.appendChild(bubble);
        
        this.chatMessages.appendChild(summaryEl);
        this.scrollToBottom();
        
        // Reset lesson state (but keep summary visible)
        // User can start a new lesson if needed
    }
    
    renderLearnerMessage(text) {
        this.lastUserMessage = text;
        const messageEl = this.createMessageElement('learner', text);
        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
        
        // Save session after user message
        if (window.sessionManager) {
            window.sessionManager.saveAfterResponse();
        }
    }
    
    renderTutorMessage(data, metadata) {
        // Debug: Log received data
        console.log('[Chat] Tutor message data:', data);
        
        // HANDLE COMMANDS FIRST
        if (data.command) {
            console.log('[Chat] Command received:', data.command);
            
            // Show the command response message
            const messageEl = this.createMessageElement('tutor', data.reply_text);
            this.chatMessages.appendChild(messageEl);
            this.scrollToBottom();
            
            // Execute the command
            switch (data.command) {
                case 'clear_chat':
                    setTimeout(() => {
                        this.chatMessages.innerHTML = '';
                        console.log('[Chat] Chat cleared');
                    }, 1000);
                    return;
                
                case 'restart_lesson':
                    setTimeout(() => {
                        // Reload the page to restart
                        window.location.reload();
                    }, 1000);
                    return;
                
                case 'repeat':
                    // Repeat current phrase (next_dialogue_id will be the same)
                    if (data.next_dialogue_id && window.lessonFlowManager) {
                        setTimeout(() => {
                            const dialogue = window.lessonFlowManager.getDialogue(data.next_dialogue_id);
                            if (dialogue) {
                                this.renderTutorDialogue(dialogue);
                            }
                        }, 1000);
                    }
                    return;
                
                case 'next':
                    // Move to next phrase (handled by next_dialogue_id below)
                    break;
                
                case 'help':
                    // Just show the help message (already in reply_text)
                    return;
                
                case 'lesson_info':
                    // Just show the lesson info message (already in reply_text)
                    return;
                
                case 'chat':
                    // AI assistant follow-up / clarification message already rendered
                    return;
                
                case 'create_lesson':
                    // Generate and load new AI lesson
                    const topic = data.lesson_topic || 'conversation';
                    console.log('[Chat] Generating lesson for topic:', topic);
                    
                    setTimeout(async () => {
                        try {
                            // Call API to generate lesson
                            const response = await fetch('/api/lesson/generate', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    topic: topic,
                                    level: 'A0',
                                    num_dialogues: 5
                                })
                            });
                            
                            if (!response.ok) {
                                throw new Error('Failed to generate lesson');
                            }
                            
                            const result = await response.json();
                            
                            if (result.status === 'success' && result.data) {
                                const lessonId = result.data.id;
                                console.log('[Chat] Lesson generated:', lessonId);
                                
                                // Show success message
                                const successMsg = this.createMessageElement('tutor', 
                                    `✅ Great! Your lesson about "${topic}" is ready! Let's start learning!`);
                                this.chatMessages.appendChild(successMsg);
                                this.scrollToBottom();
                                
                                // Load the new lesson after a brief moment
                                setTimeout(async () => {
                                    await this.startLesson(lessonId);

                                    const suggestionsText = [
                                        `Here are a few ways to get the most from your new lesson on "${topic}":`,
                                        `• Ask me to quiz you on the key vocabulary`,
                                        `• Request example dialogues for tricky situations`,
                                        `• Try responding in Polish and I'll give feedback`,
                                        `• Say "summarize lesson" any time for a quick recap`
                                    ].join('\n');

                                    const suggestionMessage = this.createMessageElement('tutor', suggestionsText);
                                    this.chatMessages.appendChild(suggestionMessage);
                                    this.scrollToBottom();
                                }, 1000);
                            } else {
                                throw new Error(result.message || 'Lesson generation failed');
                            }
                        } catch (error) {
                            console.error('[Chat] Failed to generate lesson:', error);
                            const errorMsg = this.createMessageElement('tutor', 
                                `❌ Sorry, I couldn't create that lesson. ${error.message}. Let's continue with the current lesson instead.`);
                            this.chatMessages.appendChild(errorMsg);
                            this.scrollToBottom();
                        }
                    }, 2000); // Wait 2 seconds to show the "generating" message
                    
                    return;
                
                default:
                    console.warn('[Chat] Unknown command:', data.command);
            }
        }
        
        // Record progress if lesson flow manager is available
        if (window.lessonFlowManager && window.lessonFlowManager.isActive()) {
            const userText = this.lastUserMessage || '';
            if (data.score !== undefined && data.feedback_type) {
                window.lessonFlowManager.recordProgress(
                    this.currentDialogueId,
                    userText,
                    data.score,
                    data.feedback_type
                );
            }
        }
        
        // Update current dialogue ID if provided
        if (data.next_dialogue_id) {
            this.currentDialogueId = data.next_dialogue_id;
            
            // Advance lesson flow
            if (window.lessonFlowManager && window.lessonFlowManager.isActive()) {
                const nextDialogue = window.lessonFlowManager.advanceToDialogue(data.next_dialogue_id);
                
                // Check if lesson is complete
                if (window.lessonFlowManager.isLessonComplete()) {
                    // Show lesson summary
                    setTimeout(() => {
                        this.showLessonSummary();
                    }, 1000);
                } else if (nextDialogue) {
                    // Show next dialogue after a short delay
                    setTimeout(() => {
                        this.renderTutorDialogue(nextDialogue);
                    }, 1500);
                }
            }
        }
        
        // Create tutor message
        const messageEl = this.createMessageElement('tutor', data.reply_text);
        const bubble = messageEl.querySelector('.message__bubble');
        
        const isFeedbackMessage = ['high', 'medium', 'low'].includes(data.feedback_type);

        if (isFeedbackMessage) {
            bubble.innerHTML = '';

            const feedbackContainer = document.createElement('div');
            feedbackContainer.className = `tutor-feedback tutor-feedback--${data.feedback_type}`;

            const feedbackText = document.createElement('div');
            feedbackText.className = 'tutor-feedback__text';
            feedbackText.textContent = data.reply_text || '';
            feedbackContainer.appendChild(feedbackText);

            if (data.score !== undefined) {
                const scoreBadge = this.createScoreIndicator(data.score, data.feedback_type);
                feedbackContainer.appendChild(scoreBadge);
            }

            bubble.appendChild(feedbackContainer);
        }

        // Show the Polish phrase being learned (if available) - this is what user should hear
        const tutorPhrase = data.tutor_phrase || (data.expected_phrase && data.expected_phrase.trim() ? data.expected_phrase : null);
        
        if (tutorPhrase && tutorPhrase.trim()) {
            const phraseCard = document.createElement('div');
            phraseCard.className = 'tutor-phrase';

            const header = document.createElement('div');
            header.className = 'tutor-phrase__header';
            header.innerHTML = '<span class="tutor-phrase__icon">🗣️</span><span class="tutor-phrase__title">Practice this phrase</span>';
            phraseCard.appendChild(header);

            const phraseText = document.createElement('div');
            phraseText.className = 'tutor-phrase__text';
            phraseText.textContent = tutorPhrase;
            phraseCard.appendChild(phraseText);

            if (translation && this.shouldShowTranslation(dialogue.id)) {
                const translationEl = document.createElement('div');
                translationEl.className = 'tutor-phrase__translation';
                translationEl.textContent = translation;
                phraseCard.appendChild(translationEl);
            }

            const helperRow = document.createElement('div');
            helperRow.className = 'tutor-phrase__helper';
            helperRow.innerHTML = '<span class="tutor-phrase__dot">•</span> Tap play to hear it in Polish, then try saying it yourself.';
            phraseCard.appendChild(helperRow);

            bubble.appendChild(phraseCard);
        } else if (translation && this.shouldShowTranslation(dialogue.id)) {
            const translationEl = document.createElement('div');
            translationEl.className = 'tutor-phrase__translation';
            translationEl.textContent = translation;
            bubble.appendChild(translationEl);
        }

        // Add score indicator if available
        if (data.score !== undefined) {
            if (!isFeedbackMessage) {
                const scoreEl = this.createScoreIndicator(data.score, data.feedback_type);
                bubble.appendChild(scoreEl);
            }
            
            if (this.translationMode === 'smart' && this.currentDialogueId && data.score >= 0.85) {
                this.successfulPhrases.add(this.currentDialogueId);
            }
            
            if (window.sessionManager) {
                window.sessionManager.saveAfterResponse();
            }
        }
        
        // ALWAYS show audio button for tutor Polish phrases
        // Check if we have tutor_phrase or audio - show button in either case
        // (tutorPhrase already declared above, reusing it)
        
        if (tutorPhrase && tutorPhrase.trim()) {
            const audioContainer = document.createElement('div');
            audioContainer.className = 'audio-controls';
            audioContainer.style.display = 'flex';
            audioContainer.style.alignItems = 'center';
            audioContainer.style.marginTop = 'var(--spacing-sm)';
            audioContainer.style.gap = 'var(--spacing-xs)';
            audioContainer.style.padding = 'var(--spacing-xs)';
            audioContainer.style.backgroundColor = 'var(--color-background-light, #f8f9fa)';
            audioContainer.style.borderRadius = 'var(--border-radius, 8px)';
            
            // Determine audio URL
            let audioUrl = null;
            if (data.audio && data.audio.length > 0) {
                audioUrl = data.audio[0];
            } else {
                // Generate audio on-demand - create a special button that generates audio when clicked
                audioUrl = null; // Will be generated on click
            }
            
            // Create audio button with on-demand generation if needed
            const audioButton = audioUrl 
                ? this.createAudioButton(audioUrl)
                : this.createAudioButtonWithGeneration(tutorPhrase, data.dialogue_id || this.currentDialogueId);
            audioContainer.appendChild(audioButton);
            
            // Add speed toggle
            const speedToggle = this.createSpeedToggle();
            audioContainer.appendChild(speedToggle);
            
            // Add label
            const audioLabel = document.createElement('span');
            audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
            audioLabel.style.color = 'var(--color-text-muted, #666)';
            audioLabel.style.marginLeft = 'var(--spacing-xs)';
            audioLabel.textContent = '🔊 Click to hear pronunciation';
            audioLabel.style.cursor = 'pointer';
            audioLabel.addEventListener('click', () => {
                audioButton.click();
            });
            audioContainer.appendChild(audioLabel);
            
            bubble.appendChild(audioContainer);
        } else if (data.audio && data.audio.length > 0) {
            // Fallback: show audio even if no tutor_phrase (for backwards compatibility)
            const audioContainer = document.createElement('div');
            audioContainer.className = 'audio-controls';
            audioContainer.style.display = 'flex';
            audioContainer.style.alignItems = 'center';
            audioContainer.style.marginTop = 'var(--spacing-xs)';
            audioContainer.style.gap = 'var(--spacing-xs)';
            audioContainer.style.padding = 'var(--spacing-xs)';
            audioContainer.style.backgroundColor = 'var(--color-background-light, #f8f9fa)';
            audioContainer.style.borderRadius = 'var(--border-radius, 8px)';
            
            const audioButton = this.createAudioButton(data.audio[0]);
            audioContainer.appendChild(audioButton);
            
            const speedToggle = this.createSpeedToggle();
            audioContainer.appendChild(speedToggle);
            
            const audioLabel = document.createElement('span');
            audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
            audioLabel.style.color = 'var(--color-text-muted, #666)';
            audioLabel.style.marginLeft = 'var(--spacing-xs)';
            audioLabel.textContent = '🔊 Click to hear pronunciation';
            audioLabel.style.cursor = 'pointer';
            audioLabel.addEventListener('click', () => {
                audioButton.click();
            });
            audioContainer.appendChild(audioLabel);
            
            bubble.appendChild(audioContainer);
        } else {
            // Last resort: Try to show audio button anyway if we have any Polish text
            // Extract Polish text from reply_text if it looks like Polish
            const replyText = data.reply_text || '';
            // Simple check: if reply contains Polish characters (ą, ć, ę, ł, ń, ó, ś, ź, ż)
            const hasPolishChars = /[ąćęłńóśźż]/i.test(replyText);
            if (hasPolishChars && replyText.length < 100) {
                // Might be a Polish phrase - show audio button
                console.log('[Chat] No tutor_phrase found, but detected Polish text, showing audio button');
                const audioContainer = document.createElement('div');
                audioContainer.className = 'audio-controls';
                audioContainer.style.display = 'flex';
                audioContainer.style.alignItems = 'center';
                audioContainer.style.marginTop = 'var(--spacing-xs)';
                audioContainer.style.gap = 'var(--spacing-xs)';
                audioContainer.style.padding = 'var(--spacing-xs)';
                audioContainer.style.backgroundColor = 'var(--color-background-light, #f8f9fa)';
                audioContainer.style.borderRadius = 'var(--border-radius, 8px)';
                
                // Extract Polish phrase (first sentence or up to 50 chars)
                const polishPhrase = replyText.split(/[.!?]/)[0].trim().substring(0, 50);
                const audioButton = this.createAudioButtonWithGeneration(polishPhrase, data.dialogue_id || this.currentDialogueId);
                audioContainer.appendChild(audioButton);
                
                const speedToggle = this.createSpeedToggle();
                audioContainer.appendChild(speedToggle);
                
                const audioLabel = document.createElement('span');
                audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
                audioLabel.style.color = 'var(--color-text-muted, #666)';
                audioLabel.style.marginLeft = 'var(--spacing-xs)';
                audioLabel.textContent = '🔊 Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.addEventListener('click', () => {
                    audioButton.click();
                });
                audioContainer.appendChild(audioLabel);
                
                bubble.appendChild(audioContainer);
            }
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
    
    createAudioButtonWithGeneration(tutorPhrase, dialogueId) {
        const button = document.createElement('button');
        button.className = 'audio-button';
        button.setAttribute('aria-label', 'Generate and play audio');
        button.setAttribute('title', 'Generate and play audio');
        
        const icon = document.createElement('i');
        icon.setAttribute('data-feather', 'play');
        icon.className = 'audio-button__icon';
        button.appendChild(icon);
        
        // Show loading state
        button.disabled = true;
        button.setAttribute('title', 'Generating audio...');
        
        button.addEventListener('click', async () => {
            if (button.disabled) return; // Already generating
            
            button.disabled = true;
            icon.setAttribute('data-feather', 'loader');
            feather.replace();
            
            try {
                const speed = window.audioManager ? window.audioManager.getSpeed() : 1.0;
                const response = await fetch('/api/audio/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: tutorPhrase,
                        lesson_id: this.currentLessonId,
                        phrase_id: dialogueId,
                        speed: speed,
                        user_id: this.userId,
                    }),
                });
                
                if (!response.ok) {
                    throw new Error(`Audio generation failed: ${response.statusText}`);
                }
                
                const result = await response.json();
                if (result.status === 'success' && result.data && result.data.audio_url) {
                    // Now play the generated audio
                    const messageEl = button.closest('.message');
                    if (window.audioManager && messageEl) {
                        window.audioManager.play(result.data.audio_url, button, messageEl);
                    }
                } else {
                    throw new Error('Invalid response from audio generation API');
                }
            } catch (error) {
                console.error('Failed to generate audio:', error);
                this.showErrorMessage('Failed to generate audio. Please try again.');
                icon.setAttribute('data-feather', 'play');
                feather.replace();
            } finally {
                button.disabled = false;
                button.setAttribute('title', 'Play audio');
            }
        });
        
        // Initialize feather icon after adding to DOM
        setTimeout(() => {
            feather.replace();
            button.disabled = false; // Enable after icon loads
        }, 0);
        
        return button;
    }
    
    createSpeedToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'audio-speed-toggle';
        toggle.setAttribute('aria-label', 'Toggle playback speed');
        toggle.setAttribute('title', 'Toggle playback speed (0.75× / 1.0×)');
        toggle.setAttribute('type', 'button');
        
        const label = document.createElement('span');
        label.className = 'audio-speed-toggle__label';
        
        const updateLabel = () => {
            if (window.audioManager) {
                const speed = window.audioManager.getSpeed();
                label.textContent = `${speed}×`;
            }
        };
        
        updateLabel();
        toggle.appendChild(label);
        
        toggle.addEventListener('click', () => {
            if (window.audioManager) {
                const newSpeed = window.audioManager.toggleSpeed();
                updateLabel();
                
                // Update current audio if playing
                if (window.audioManager.currentAudio) {
                    window.audioManager.currentAudio.playbackRate = newSpeed;
                }
            }
        });
        
        return toggle;
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
        if (!window.voiceInputManager) {
            this.showErrorMessage('Voice input not available. Please refresh the page.');
            return;
        }
        
        const voiceManager = window.voiceInputManager;
        
        // Check if supported
        if (!voiceManager.isSupported) {
            this.showErrorMessage('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        
        // CRITICAL: Tell error handler that mic is starting (before we actually start)
        if (window.errorHandler && !voiceManager.isCurrentlyListening()) {
            window.errorHandler.setMicStartupTime();
        }
        
        // Handle based on mic mode
        const micMode = voiceManager.getMicMode();
        
        if (micMode === 'tap') {
            // Tap-to-toggle mode
            voiceManager.toggleListening();
        } else {
            // Push-to-talk mode
            if (voiceManager.isCurrentlyListening()) {
                voiceManager.stopListening();
                // Clear startup time when stopping
                if (window.errorHandler) {
                    window.errorHandler.clearMicStartupTime();
                }
            } else {
                voiceManager.startListening('push');
            }
        }
    }
    
    /**
     * Enable text input mode (hide mic button, focus text input)
     * Called when microphone access is denied or voice input is unavailable
     */
    enableTextInputMode() {
        if (this.micButton) {
            this.micButton.style.display = 'none';
            this.micButton.setAttribute('aria-hidden', 'true');
        }
        
        if (this.messageInput) {
            // Ensure input is enabled
            this.messageInput.disabled = false;
            this.messageInput.setAttribute('aria-label', 'Type your message');
            
            // Update placeholder
            if (!this.messageInput.value) {
                this.messageInput.placeholder = 'Type your message...';
            }
            
            // Focus the input after a short delay to ensure UI is ready
            setTimeout(() => {
                this.messageInput.focus();
            }, 100);
        }
        
        // Ensure send button is enabled
        if (this.sendButton) {
            this.sendButton.disabled = false;
        }
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
    
    /**
     * Get audio URL, checking pre-recorded first, then generating via TTS if needed
     * @param {Object} dialogue - Dialogue object with audio filename
     * @param {string} preRecordedUrl - Pre-recorded audio URL to try first
     * @returns {Promise<string>} Audio URL (pre-recorded or generated)
     */
    async getAudioUrl(dialogue, preRecordedUrl) {
        // First, check if pre-recorded audio exists
        try {
            const response = await fetch(preRecordedUrl, { method: 'HEAD' });
            if (response.ok) {
                return preRecordedUrl;
            }
        } catch (error) {
            // File doesn't exist, continue to generate
        }
        
        // Pre-recorded audio doesn't exist, generate via TTS API
        const tutorText = dialogue.tutor || '';
        if (!tutorText) {
            throw new Error('No tutor text available for audio generation');
        }
        
        // Get current audio speed from settings or audio manager
        const speed = window.audioManager ? window.audioManager.getSpeed() : 0.75;
        
        try {
            const response = await fetch('/api/audio/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: tutorText,
                    lesson_id: this.currentLessonId,
                    phrase_id: dialogue.id,
                    speed: speed,
                    user_id: this.userId,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Audio generation failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.status === 'success' && result.data && result.data.audio_url) {
                return result.data.audio_url;
            }
            
            throw new Error('Invalid response from audio generation API');
        } catch (error) {
            console.error('Failed to generate audio:', error);
            // Fallback to pre-recorded URL even if it doesn't exist
            // The audio manager will handle the error gracefully
            return preRecordedUrl;
        }
    }
    
    playAudio(audioUrl, button) {
        // Find the message element containing this button
        const messageEl = button.closest('.message');
        if (!messageEl) {
            console.error('Could not find message element for audio button');
            return;
        }
        
        // Use AudioManager for playback
        if (window.audioManager) {
            // If clicking the same button, toggle play/pause
            if (window.audioManager.currentButton === button && window.audioManager.isPlaying()) {
                window.audioManager.toggle();
                return;
            }
            
            // Otherwise, play new audio
            window.audioManager.play(audioUrl, button, messageEl);
        } else {
            // Fallback if AudioManager not loaded
            console.error('AudioManager not available');
            this.showErrorMessage('Audio playback not available.');
        }
    }
    
    showInfoMessage(message) {
        const infoEl = this.createInfoMessage(message);
        this.chatMessages.appendChild(infoEl);
        this.scrollToBottom();
    }
}

// Initialize chat UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Chat] DOM loaded, initializing ChatUI...');
    try {
        window.chatUI = new ChatUI();
        console.log('[Chat] ChatUI initialized successfully');
        
        // Show a welcome message immediately so user knows something is happening
        setTimeout(() => {
            if (window.chatUI && window.chatUI.chatMessages) {
                const messages = window.chatUI.chatMessages.querySelectorAll('.message');
                if (messages.length === 0) {
                    // No messages yet, show loading message
                    window.chatUI.showInfoMessage('Loading lesson... Please wait.');
                }
            }
        }, 1000);
    } catch (error) {
        console.error('[Chat] Failed to initialize ChatUI:', error);
        // Show error message in the chat area
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message message--info';
            errorDiv.innerHTML = '<div class="message__bubble">⚠️ Failed to initialize chat. Please refresh the page.</div>';
            chatMessages.appendChild(errorDiv);
        }
    }
});

