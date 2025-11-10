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
        this.startButton = document.getElementById('start-lesson-button');
        this.lessonOverlay = document.getElementById('welcome-overlay');
        this.welcomeDismiss = document.getElementById('welcome-dismiss');
        this.welcomeStartButton = document.getElementById('welcome-start');
        this.welcomeStartIcon = this.welcomeStartButton
            ? this.welcomeStartButton.querySelector('.welcome-card__start-icon')
            : null;
        this.welcomeStartText = this.welcomeStartButton
            ? this.welcomeStartButton.querySelector('.welcome-card__start-text')
            : null;
        this.lessonTitleEl = document.getElementById('lesson-title');
        this.lessonLevelEl = document.getElementById('lesson-level');
        this.lessonGoalEl = document.getElementById('lesson-goal');
        this.lessonDurationEl = document.getElementById('lesson-duration');
        this.lessonFocusEl = document.getElementById('lesson-focus');
        this.startHintEl = document.getElementById('start-lesson-hint');
        this.progressTitleEl = document.getElementById('lesson-progress-title');
        this.progressValueEl = document.getElementById('lesson-progress-value');
        this.progressMeter = document.getElementById('lesson-progress-meter');
        this.progressStepEl = document.getElementById('lesson-progress-step');
        this.lessonCatalogPanel = document.getElementById('lesson-catalog-panel');
        this.lessonCatalogSelect = document.getElementById('lesson-catalog-select');
        this.lessonCatalogEmptyState = document.getElementById('lesson-catalog-empty');
        this.lessonCatalogPreview = document.getElementById('lesson-catalog-preview');
        this.lessonCatalogPreviewId = document.getElementById('lesson-preview-id');
        this.lessonCatalogPreviewTitle = document.getElementById('lesson-preview-title');
        this.lessonCatalogPreviewSubtitle = document.getElementById('lesson-preview-subtitle');
        this.lessonCatalogPreviewMeta = document.getElementById('lesson-preview-meta');
        this.lessonCatalogRefreshButton = document.getElementById('lesson-catalog-refresh');
        this.lessonLibraryCollapsedView = document.getElementById('lesson-library-collapsed');
        this.lessonLibraryToggleButton = document.getElementById('lesson-library-toggle');
        this.activeLessonLabel = document.getElementById('active-lesson-label');
        this.micIndicator = document.getElementById('mic-indicator');
        this.feedbackDeck = document.getElementById('feedback-deck');
        this.feedbackCards = {
            success: document.getElementById('feedback-success'),
            coach: document.getElementById('feedback-coach'),
            retry: document.getElementById('feedback-retry')
        };
        this.supportButtons = {
            repeat: document.getElementById('support-repeat'),
            hint: document.getElementById('support-hint'),
            slow: document.getElementById('support-slow'),
            topic: document.getElementById('support-topic'),
            culture: document.getElementById('support-culture')
        };
        
        this.chatMessages = document.getElementById('chat-messages');
        this.connectionStatus = document.getElementById('connection-status');
        this.connectionStatusText = document.getElementById('connection-status-text');
        this.isTyping = false;
        this.translationMode = 'smart'; // 'show', 'hide', or 'smart'
        this.successfulPhrases = new Set(); // Track phrases that were answered correctly
        this.lessonScenarioShown = false;
        this.hasShownFirstPromptGuide = false;
        this.isLessonActive = false;
        this.defaultLessonId = 'coffee_001';
        this.isSlowMode = false;
        this.hasShownStartReminder = false;
        this.lessonCatalogEntries = [];
        this.selectedLessonEntry = null;
        this.chatPlaceholder = document.getElementById('chat-placeholder');
        this.floatingHintText = document.getElementById('floating-hint-text');
        this.startTooltip = document.getElementById('start-tooltip');
        
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
        
        this.disableInteraction();
        this.resetFeedbackDeck();
        this.resetLessonProgressIndicator();
        this.setMicIndicatorState(false);
        this.setStartButtonState('select');
        this.showPlaceholderMessage();
        
        this.init();
        this.initVoiceInput();
    }
    
    init() {
        console.log('[Chat] Initializing...');

        this.initWebSocket();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize lesson flow
        this.initLessonFlow();
        
        // Load lesson catalog so learner can choose a lesson
        this.loadLessonCatalog();
    }
    
    async initLessonFlow() {
        // Wait for lesson flow manager to be available
        setTimeout(() => {
            if (typeof window.lessonFlowManager === 'undefined') {
                console.warn('LessonFlowManager not loaded. Lesson flow will not be available.');
                return;
            }
            
            this.currentDialogueId = null;
            console.log('[Chat] Lesson manager ready. Waiting for learner to select a lesson.');
        }, 300);
    }

    async loadLessonCatalog(force = false) {
        if (!this.lessonCatalogSelect) {
            return;
        }

        if (!this.lessonCatalogEntries.length || force) {
            if (this.lessonCatalogEmptyState) {
                this.lessonCatalogEmptyState.hidden = false;
                this.lessonCatalogEmptyState.textContent = 'Loading lessons...';
            }
            this.lessonCatalogSelect.disabled = true;
            this.lessonCatalogSelect.innerHTML = '<option value="">Loading lessons...</option>';
        }

        try {
            const response = await fetch('/api/lesson/catalog');
            if (!response.ok) {
                throw new Error(`Failed to fetch catalog: ${response.status}`);
            }
            const payload = await response.json();
            const entries = payload?.data?.entries || [];
            this.lessonCatalogEntries = entries;
            this.renderLessonCatalog();
        } catch (error) {
            console.error('[Chat] Failed to load lesson catalog:', error);
            if (this.lessonCatalogEmptyState) {
                this.lessonCatalogEmptyState.hidden = false;
                this.lessonCatalogEmptyState.textContent = 'Unable to load lessons. Tap refresh to try again.';
            }
            // Allow fallback to default lesson if available
            if (!this.currentLessonId && this.defaultLessonId) {
                this.currentLessonId = this.defaultLessonId;
                this.setStartButtonState('ready');
            }
        }
    }

    renderLessonCatalog() {
        if (!this.lessonCatalogSelect) {
            return;
        }

        const previousValue = this.lessonCatalogSelect.value;
        this.lessonCatalogSelect.innerHTML = '';

        if (!this.lessonCatalogEntries.length) {
            if (this.lessonCatalogEmptyState) {
                this.lessonCatalogEmptyState.hidden = false;
                this.lessonCatalogEmptyState.textContent = 'No lessons available yet.';
            }
            if (this.lessonCatalogPreview) {
                this.lessonCatalogPreview.hidden = true;
            }
            this.lessonCatalogSelect.disabled = true;
            return;
        }

        if (this.lessonCatalogEmptyState) {
            this.lessonCatalogEmptyState.hidden = true;
        }
        this.lessonCatalogSelect.disabled = false;

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select a lesson';
        placeholderOption.disabled = true;
        placeholderOption.selected = !this.currentLessonId;
        this.lessonCatalogSelect.appendChild(placeholderOption);

        this.lessonCatalogEntries.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.id;
            const title = entry.title_pl || entry.title_en || entry.id;
            const detail = entry.title_en && entry.title_en !== title ? ` – ${entry.title_en}` : '';
            option.textContent = `${title}${detail ? detail : ''} (${entry.id})`;
            this.lessonCatalogSelect.appendChild(option);
        });

        const hasPrevious = this.lessonCatalogEntries.some((entry) => entry.id === previousValue);
        if (hasPrevious && previousValue) {
            this.lessonCatalogSelect.value = previousValue;
            const entry = this.lessonCatalogEntries.find((item) => item.id === previousValue);
            if (entry) {
                this.handleLessonSelection(entry);
            }
        } else if (this.currentLessonId) {
            this.lessonCatalogSelect.value = this.currentLessonId;
            const entry = this.lessonCatalogEntries.find((item) => item.id === this.currentLessonId);
            if (entry) {
                this.handleLessonSelection(entry);
            }
        }
    }

    handleLessonSelection(entry) {
        if (!entry) {
            return;
        }

        this.currentLessonId = entry.id;
        this.selectedLessonEntry = entry;

        if (this.isLessonActive) {
            this.resetActiveLessonSession('Switched to a new lesson. Press ▶ Start when ready.');
        }

        this.previewSelectedLesson(entry);
        this.setStartButtonState('ready');
        this.updateFloatingHint('Great choice! Press ▶ Start Lesson to begin.');
    }

    previewSelectedLesson(entry) {
        if (!entry) {
            return;
        }
        const derivedLevel = this.deriveLevelFromLessonId(entry.id);
        const tags = [entry.part, entry.module].filter(Boolean);
        const previewLesson = {
            title: entry.title_pl || entry.title_en || entry.id,
            level: derivedLevel,
            tags,
            cefr_goal: entry.title_en ? `Practice: ${entry.title_en}` : undefined,
        };
        this.updateLessonOverviewCard(previewLesson);
        if (this.lessonFocusEl && entry.title_en) {
            this.lessonFocusEl.textContent = entry.title_en;
        }
        this.updateLessonPreviewDetails(entry, derivedLevel, tags);
    }

    deriveLevelFromLessonId(lessonId) {
        if (!lessonId) {
            return 'A0';
        }
        const match = lessonId.match(/([A-C]\d)/i);
        return match ? match[1].toUpperCase() : 'A0';
    }

    updateLessonPreviewDetails(entry, level, tags) {
        if (!this.lessonCatalogPreview) {
            return;
        }

        const title = entry.title_pl || entry.title_en || entry.id;
        const subtitle = entry.title_en && entry.title_en !== title ? entry.title_en : entry.part;
        const metaBits = [
            level ? `Level ${level}` : null,
            entry.module ? this.formatLabel(entry.module) : null,
            entry.status ? this.formatLabel(entry.status) : null,
        ].filter(Boolean);

        if (this.lessonCatalogPreviewId) {
            this.lessonCatalogPreviewId.textContent = entry.id;
        }
        if (this.lessonCatalogPreviewTitle) {
            this.lessonCatalogPreviewTitle.textContent = title;
        }
        if (this.lessonCatalogPreviewSubtitle) {
            this.lessonCatalogPreviewSubtitle.textContent = subtitle || '';
            this.lessonCatalogPreviewSubtitle.hidden = !subtitle;
        }
        if (this.lessonCatalogPreviewMeta) {
            this.lessonCatalogPreviewMeta.textContent = metaBits.join(' • ');
        }

        this.lessonCatalogPreview.hidden = false;
    }

    async handleStartLesson() {
        if (this.isLessonActive) {
            return;
        }

        const lessonId = this.currentLessonId || null;
        if (!lessonId) {
            this.showInfoMessage('Choose a lesson from the library on the left to begin.');
            this.setStartButtonState('select');
            return;
        }

        this.setStartButtonState('loading');

        try {
            await this.startLesson(lessonId);
        } catch (error) {
            console.error('[Chat] Failed to start lesson:', error);
            this.isLessonActive = false;
            this.setStartButtonState('ready');
            this.resetLessonProgressIndicator();
            if (window.errorHandler) {
                window.errorHandler.handleError('LESSON_DATA', error, { lessonId });
            }
            this.showErrorMessage('Failed to start the lesson. Please try again in a moment.');
        }
    }
    
    async startLesson(lessonId) {
        if (!window.lessonFlowManager) {
            throw new Error('LessonFlowManager not available');
        }
        
        this.resetLessonProgressIndicator();
        const lessonData = await window.lessonFlowManager.startLesson(lessonId);
        
        this.hasShownFirstPromptGuide = false;
        this.lessonScenarioShown = false;
        this.isLessonActive = true;
        this.hasShownStartReminder = false;
        this.currentLessonId = lessonData.lesson.id;
        this.currentDialogueId = lessonData.dialogue.id;
        
        this.enableInteraction();
        this.dismissWelcomeOverlay();
        this.setStartButtonState('active');
        this.collapseLessonLibrary();
        this.hidePlaceholderMessage();
        this.updateFloatingHint('Tutor is listening. Answer in Polish and get instant feedback.');
        this.updateLessonOverviewCard(lessonData.lesson);
        this.resetFeedbackDeck();

        // Show intro message
        this.renderLessonScenarioCard(lessonData);

        // Show first tutor message
        this.renderTutorDialogue(lessonData.dialogue);
        this.updateLessonProgressIndicator();
        
        return lessonData;
    }

    setStartButtonState(state) {
        if (!this.startButton) {
            return;
        }

        const updateOverlayStart = (text, disabled, icon = '▶') => {
            if (this.welcomeStartButton) {
                this.welcomeStartButton.disabled = disabled;
                this.welcomeStartButton.dataset.state = state;
            }
            if (this.welcomeStartText) {
                this.welcomeStartText.textContent = text;
            }
            if (this.welcomeStartIcon) {
                this.welcomeStartIcon.textContent = icon;
            }
        };

        this.startButton.dataset.state = state;

        switch (state) {
            case 'loading':
                this.startButton.disabled = true;
                this.startButton.textContent = '⏳ Starting...';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'Loading your lesson. Hang tight!';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'none';
                }
                updateOverlayStart('Starting...', true, '⏳');
                break;
            case 'active':
                this.startButton.disabled = true;
                this.startButton.textContent = '✅ Lesson in progress';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'Jump back in any time. Try the helper buttons if you need support.';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'none';
                }
                updateOverlayStart('Lesson in progress', true, '✅');
                break;
            case 'select':
                this.startButton.disabled = true;
                this.startButton.textContent = 'Choose a lesson';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'Pick any lesson card from the library to enable the tutor.';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'inline-flex';
                }
                updateOverlayStart('Choose a lesson first', true, '🎯');
                break;
            default:
                this.startButton.disabled = false;
                this.startButton.textContent = '▶ Start Lesson';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'We’ll guide you step-by-step. Click start when you’re ready.';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'none';
                }
                updateOverlayStart('Start Lesson', false, '▶');
                break;
        }
    }

    disableInteraction() {
        if (this.messageInput) {
            this.messageInput.disabled = true;
            this.messageInput.placeholder = 'Tap ▶ Start Lesson to reply…';
        }
        if (this.sendButton) {
            this.sendButton.disabled = true;
        }
        if (this.micButton) {
            this.micButton.disabled = true;
        }
        Object.entries(this.supportButtons).forEach(([action, button]) => {
            if (!button) return;
            button.disabled = true;
            button.classList.remove('is-active');
            if (action === 'slow') {
                button.textContent = '🐢 Slow Polish';
            }
        });
        if (window.audioManager) {
            window.audioManager.setSpeed(1.0);
        }
        this.isSlowMode = false;
        this.setMicIndicatorState(false);
    }

    enableInteraction() {
        if (this.messageInput) {
            this.messageInput.disabled = false;
            this.messageInput.placeholder = '💬 Type or dictate your reply…';
            setTimeout(() => this.messageInput.focus({ preventScroll: true }), 150);
        }
        if (this.sendButton) {
            this.sendButton.disabled = false;
        }
        if (this.micButton) {
            this.micButton.disabled = false;
        }
        Object.values(this.supportButtons).forEach((button) => {
            if (!button) return;
            button.disabled = false;
        });
        this.setMicIndicatorState(false);
    }

    dismissWelcomeOverlay() {
        if (this.lessonOverlay) {
            this.lessonOverlay.classList.add('is-hidden');
        }
    }

    updateLessonOverviewCard(lesson) {
        if (!lesson) {
            return;
        }

        if (this.lessonTitleEl && lesson.title) {
            this.lessonTitleEl.textContent = lesson.title;
        }
        if (this.progressTitleEl && lesson.title) {
            this.progressTitleEl.textContent = lesson.title;
        }

        if (this.lessonLevelEl) {
            const level = (lesson.level || 'A0').toUpperCase();
            const focusLabel = lesson.tags && lesson.tags.length
                ? lesson.tags.map((tag) => this.formatLabel(tag)).join(' • ')
                : (lesson.theme ? this.formatLabel(lesson.theme) : 'Beginner');
            this.lessonLevelEl.textContent = `Level ${level} • ${focusLabel}`;
        }

        if (this.lessonGoalEl) {
            const goal = lesson.cefr_goal || lesson.goal || this.lessonGoalEl.textContent;
            this.lessonGoalEl.textContent = goal;
        }

        if (this.lessonDurationEl) {
            if (lesson.estimated_minutes) {
                this.lessonDurationEl.textContent = `${lesson.estimated_minutes} minutes`;
            } else {
                this.lessonDurationEl.textContent = '3 minutes';
            }
        }

        if (this.lessonFocusEl) {
            if (lesson.tags && lesson.tags.length) {
                this.lessonFocusEl.textContent = lesson.tags.map((tag) => this.formatLabel(tag)).join(', ');
            } else if (lesson.theme) {
                this.lessonFocusEl.textContent = this.formatLabel(lesson.theme);
            }
        }
    }

    handleLessonComplete() {
        this.isLessonActive = false;
        this.expandLessonLibrary();
        this.setStartButtonState('ready');
        this.updateFloatingHint('Lesson complete! Choose another lesson to keep practicing.');
        this.showPlaceholderMessage();
    }

    formatLabel(value) {
        if (!value) return '';
        const human = value.replace(/[_-]+/g, ' ');
        return human.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    updateFloatingHint(message) {
        if (this.floatingHintText && message) {
            this.floatingHintText.textContent = message;
        }
    }

    collapseLessonLibrary() {
        if (this.lessonCatalogPanel) {
            this.lessonCatalogPanel.classList.add('is-collapsed');
        }
        if (this.lessonLibraryCollapsedView) {
            if (this.activeLessonLabel && this.lessonTitleEl) {
                this.activeLessonLabel.textContent = this.lessonTitleEl.textContent || this.currentLessonId || 'Lesson';
            }
            this.lessonLibraryCollapsedView.hidden = false;
        }
    }

    expandLessonLibrary() {
        if (this.lessonCatalogPanel) {
            this.lessonCatalogPanel.classList.remove('is-collapsed');
        }
        if (this.lessonLibraryCollapsedView) {
            this.lessonLibraryCollapsedView.hidden = true;
        }
    }

    resetActiveLessonSession(reason = '') {
        if (window.lessonFlowManager && typeof window.lessonFlowManager.reset === 'function') {
            window.lessonFlowManager.reset();
        }
        this.isLessonActive = false;
        this.currentDialogueId = null;
        this.disableInteraction();
        this.resetLessonProgressIndicator();
        this.resetFeedbackDeck();
        this.expandLessonLibrary();
        this.setStartButtonState(this.currentLessonId ? 'ready' : 'select');
        this.showPlaceholderMessage();
        if (reason) {
            this.showInfoMessage(reason);
        }
        this.updateFloatingHint('Pick a lesson to begin, then press ▶ Start.');
    }

    hidePlaceholderMessage() {
        if (this.chatPlaceholder) {
            this.chatPlaceholder.hidden = true;
        }
    }

    showPlaceholderMessage() {
        if (this.chatPlaceholder) {
            this.chatPlaceholder.hidden = false;
        }
    }

    resetLessonProgressIndicator() {
        if (this.progressMeter) {
            this.progressMeter.style.width = '0%';
            if (this.progressMeter.parentElement) {
                this.progressMeter.parentElement.setAttribute('aria-valuenow', '0');
                this.progressMeter.parentElement.setAttribute('aria-valuetext', '0 percent complete');
            }
        }
        if (this.progressValueEl) {
            this.progressValueEl.textContent = '0% complete';
        }
        if (this.progressStepEl) {
            this.progressStepEl.textContent = 'Waiting to begin';
        }
    }

    updateLessonProgressIndicator() {
        if (!this.progressMeter || !window.lessonFlowManager) {
            return;
        }

        if (typeof window.lessonFlowManager.getLessonSummary !== 'function') {
            return;
        }

        const summary = window.lessonFlowManager.getLessonSummary();
        if (!summary) {
            return;
        }

        const total = summary.totalDialogues || 0;
        const completedUnique = summary.uniqueDialogues || 0;
        const percent = total > 0 ? Math.min(100, Math.round((completedUnique / total) * 100)) : 0;

        this.progressMeter.style.width = `${percent}%`;
        if (this.progressMeter.parentElement) {
            this.progressMeter.parentElement.setAttribute('aria-valuenow', String(percent));
            this.progressMeter.parentElement.setAttribute('aria-valuetext', `${percent} percent complete`);
        }
        if (this.progressValueEl) {
            this.progressValueEl.textContent = `${percent}% complete`;
        }
        if (this.progressStepEl) {
            if (total > 0) {
                const step = Math.max(1, Math.min(completedUnique || 1, total));
                this.progressStepEl.textContent = `Step ${step} of ${total}`;
            } else {
                this.progressStepEl.textContent = 'In progress';
            }
        }
    }

    setMicIndicatorState(isActive) {
        if (!this.micIndicator) {
            return;
        }
        if (isActive) {
            this.micIndicator.hidden = false;
            this.micIndicator.classList.add('is-active');
        } else {
            this.micIndicator.classList.remove('is-active');
            this.micIndicator.hidden = true;
        }
    }

    resetFeedbackDeck() {
        Object.values(this.feedbackCards).forEach((card) => {
            if (!card) return;
            card.hidden = true;
            const textEl = card.querySelector('.feedback-card__text');
            if (textEl) {
                textEl.textContent = '';
            }
        });
    }

    updateFeedbackDeck(data) {
        if (!this.feedbackDeck) {
            return;
        }

        const type = data?.feedback_type;
        if (!type) {
            this.resetFeedbackDeck();
            return;
        }

        const mapping = {
            high: 'success',
            medium: 'coach',
            low: 'retry'
        };

        const cardKey = mapping[type];
        if (!cardKey || !this.feedbackCards[cardKey]) {
            this.resetFeedbackDeck();
            return;
        }

        Object.values(this.feedbackCards).forEach((card) => {
            if (card) card.hidden = true;
        });

        const card = this.feedbackCards[cardKey];
        const textEl = card.querySelector('.feedback-card__text');
        if (textEl) {
            const message = data.feedback_summary || data.reply_text || '';
            textEl.textContent = message.trim();
        }
        card.hidden = false;
    }

    handleSupportAction(action) {
        if (!this.isLessonActive && action !== 'slow') {
            this.handleStartLesson();
            return;
        }

        switch (action) {
            case 'repeat':
                this.handleRepeat();
                break;
            case 'hint':
                this.sendCommand('hint');
                break;
            case 'topic':
                this.sendCommand('change topic');
                break;
            case 'culture':
                this.sendCommand('teach me about coffee');
                break;
            case 'slow':
                this.toggleSlowMode();
                break;
            default:
                console.warn('[Chat] Unknown support action:', action);
        }
    }

    toggleSlowMode() {
        const slowButton = this.supportButtons.slow;
        if (!window.audioManager) {
            this.showInfoMessage('Audio controls are still loading. Try again in a moment.');
            return;
        }

        this.isSlowMode = !this.isSlowMode;
        const newSpeed = this.isSlowMode ? 0.75 : 1.0;
        window.audioManager.setSpeed(newSpeed);

        if (slowButton) {
            slowButton.classList.toggle('is-active', this.isSlowMode);
            slowButton.textContent = this.isSlowMode ? '🐢 Slow Polish ON' : '🐢 Slow Polish';
        }

        if (this.isSlowMode) {
            this.showInfoMessage('Playing tutor audio at 0.75× speed. Tap again to return to normal.');
        } else {
            this.showInfoMessage('Back to normal pace. You can slow it down anytime.');
        }
    }

    sendCommand(commandText) {
        if (!commandText) {
            return;
        }

        if (!this.wsClient || !this.wsClient.isConnected()) {
            this.showErrorMessage('Not connected. Please wait...');
            return;
        }

        this.resetFeedbackDeck();
        this.lastUserMessage = commandText;
        this.renderLearnerMessage(commandText);
        this.setMicIndicatorState(false);

        try {
            this.wsClient.sendMessage(
                commandText,
                this.currentLessonId,
                this.currentDialogueId,
                window.audioManager ? window.audioManager.getSpeed() : 1.0,
                null
            );
        } catch (error) {
            console.error('Error sending command:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError('NETWORK', error, {
                    action: 'send_command'
                });
            } else {
                this.showErrorMessage('Failed to send command. Please try again.');
            }
        }
    }

    async changeLesson(lessonId) {
        if (!lessonId) {
            return;
        }

        if (!window.lessonFlowManager) {
            throw new Error('LessonFlowManager not available');
        }

        let loadingMessage = null;

        // Clear existing lesson context
        try {
            if (window.lessonFlowManager.reset) {
                window.lessonFlowManager.reset();
            }

            if (this.chatMessages) {
                this.chatMessages.innerHTML = '';
            }
            this.resetLessonProgressIndicator();

            if (this.chatMessages) {
                loadingMessage = this.createInfoMessage(`Loading lesson ${lessonId}...`);
            }

            if (this.chatMessages) {
                this.chatMessages.appendChild(loadingMessage);
                this.scrollToBottom();
            }

            const lessonData = await this.startLesson(lessonId);

            if (loadingMessage && loadingMessage.parentElement) {
                loadingMessage.remove();
            }

            const lessonTitle = lessonData?.lesson?.title || lessonId;
            this.showInfoMessage(`Now practicing: ${lessonTitle}`);

            return lessonData;
        } catch (error) {
            console.error('[Chat] Failed to change lesson:', error);
            if (loadingMessage && loadingMessage.parentElement) {
                loadingMessage.remove();
            }
            this.showErrorMessage(`Failed to load lesson "${lessonId}". Please try again.`);
            throw error;
        }
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

        const { messageDiv, bubbleDiv } = this.buildMessageStructure('info', {
            avatarType: 'info',
            avatar: '☕',
            ariaLabel: 'Lesson introduction',
            includeMeta: false
        });
        messageDiv.classList.add('lesson-scenario');

        const wrapper = document.createElement('div');
        wrapper.style.display = 'grid';
        wrapper.style.gap = '0.75rem';
        wrapper.style.color = 'rgba(68, 40, 26, 0.95)';

        const heading = document.createElement('div');
        heading.style.fontWeight = '700';
        heading.style.fontSize = '1.05rem';
        heading.textContent = `Welcome to ${title}! (Level ${level})`;
        wrapper.appendChild(heading);

        const goalBox = document.createElement('div');
        goalBox.style.background = 'rgba(248, 225, 196, 0.5)';
        goalBox.style.borderRadius = '16px';
        goalBox.style.padding = '0.75rem 1rem';
        goalBox.style.fontWeight = '500';
        goalBox.innerHTML = `<span style="display:block; font-size:0.85rem; letter-spacing:0.08em; text-transform:uppercase; color:rgba(124,58,18,0.75);">Goal</span><span>🎯 ${goal}</span>`;
        wrapper.appendChild(goalBox);

        const steps = document.createElement('div');
        steps.style.display = 'grid';
        steps.style.gap = '0.45rem';
        steps.innerHTML = [
            `<div><strong>1.</strong> Tap <span style="white-space:nowrap;">🔊 Play</span> to hear your tutor.</div>`,
            `<div><strong>2.</strong> Speak or type your reply — Polish or English is fine.</div>`,
            `<div><strong>3.</strong> Use the helper buttons when you need a boost.</div>`
        ].join('');
        wrapper.appendChild(steps);

        const chipRow = document.createElement('div');
        chipRow.style.display = 'flex';
        chipRow.style.flexWrap = 'wrap';
        chipRow.style.gap = '0.5rem';
        chipRow.style.marginTop = '0.5rem';

        const chipConfigs = [
            { label: '🔁 Repeat', action: 'repeat' },
            { label: '💡 Hint', action: 'hint' },
            { label: '🐢 Slow Polish', action: 'slow' },
            { label: '☕ Change topic', action: 'topic' }
        ];

        chipConfigs.forEach(({ label, action }) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'scenario-chip';
            chip.textContent = label;
            chip.addEventListener('click', () => this.handleSupportAction(action));
            chipRow.appendChild(chip);
        });

        wrapper.appendChild(chipRow);
        bubbleDiv.appendChild(wrapper);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        this.lessonScenarioShown = true;
    }

    renderTutorDialogue(dialogue) {
        if (!dialogue) return;
        this.hidePlaceholderMessage();
        
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
        const audioLabel = document.createElement('span');
        audioLabel.style.fontSize = 'var(--font-size-small, 0.875rem)';
        audioLabel.style.color = 'var(--color-text-muted, #666)';
        audioLabel.style.marginLeft = 'var(--spacing-xs)';
        audioLabel.textContent = '🔊 Loading tutor audio...';

        const loadingButton = this.createLoadingAudioButton();
        audioContainer.appendChild(loadingButton);
        audioContainer.appendChild(audioLabel);
        messageBubble.appendChild(audioContainer);

        if (dialogue.audio) {
            const preRecordedUrl = `/static/audio/native/${this.currentLessonId}/${dialogue.audio}`;
            this.getAudioUrl(dialogue, preRecordedUrl).then(audioUrl => {
                const audioButton = this.createAudioButton(audioUrl);
                audioContainer.replaceChild(audioButton, loadingButton);

                // Add speed toggle
                const speedToggle = this.createSpeedToggle();
                audioContainer.insertBefore(speedToggle, audioLabel);

                audioLabel.textContent = '🔊 Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.onclick = () => audioButton.click();
            }).catch(error => {
                console.error('Failed to get audio URL:', error);
                // Fallback: generate on-demand
                const audioButton = this.createAudioButtonWithGeneration(tutorText, dialogue.id);
                audioContainer.replaceChild(audioButton, loadingButton);

                const speedToggle = this.createSpeedToggle();
                audioContainer.insertBefore(speedToggle, audioLabel);

                audioLabel.textContent = '🔊 Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.onclick = () => audioButton.click();
            });
        } else if (tutorText && tutorText.trim()) {
            // No pre-recorded audio, generate on-demand
            const audioButton = this.createAudioButtonWithGeneration(tutorText, dialogue.id);
            audioContainer.replaceChild(audioButton, loadingButton);

            const speedToggle = this.createSpeedToggle();
            audioContainer.insertBefore(speedToggle, audioLabel);

            audioLabel.textContent = '🔊 Click to hear pronunciation';
            audioLabel.style.cursor = 'pointer';
            audioLabel.onclick = () => audioButton.click();
        } else {
            // No audio and no text – keep placeholder but disable button
            loadingButton.disabled = true;
            audioLabel.textContent = 'Audio unavailable for this prompt.';
        }
        
        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
        this.updateLessonProgressIndicator();
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
        this.setMicIndicatorState(isListening);
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
        if (this.sendButton) {
            // Send button click
            this.sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        if (this.messageInput) {
            // Enter key to send (Shift+Enter for new line)
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Auto-resize textarea
            this.messageInput.addEventListener('input', () => {
                this.autoResizeTextarea();
            });
        }
        
        // Mic button
        if (this.micButton) {
            this.micButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleMicClick();
            });
        }
        
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.handleStartLesson());
        }

        if (this.welcomeStartButton) {
            this.welcomeStartButton.addEventListener('click', () => this.handleStartLesson());
        }
        
        if (this.welcomeDismiss) {
            this.welcomeDismiss.addEventListener('click', () => this.dismissWelcomeOverlay());
        }
        
        if (this.lessonCatalogRefreshButton) {
            this.lessonCatalogRefreshButton.addEventListener('click', () => this.loadLessonCatalog(true));
        }

        if (this.lessonCatalogSelect) {
            this.lessonCatalogSelect.addEventListener('change', (event) => {
                const selectedId = event.target.value;
                const entry = this.lessonCatalogEntries.find((item) => item.id === selectedId);
                if (entry) {
                    this.handleLessonSelection(entry);
                }
            });
        }

        if (this.lessonLibraryToggleButton) {
            this.lessonLibraryToggleButton.addEventListener('click', () => {
                this.expandLessonLibrary();
                this.updateFloatingHint('Pick another lesson and press ▶ Start to continue.');
                this.setStartButtonState('ready');
            });
        }
        
        Object.entries(this.supportButtons).forEach(([action, button]) => {
            if (!button) return;
            button.addEventListener('click', () => this.handleSupportAction(action));
        });
    }
    
    sendMessage() {
        if (!this.messageInput) {
            return;
        }
        
        const text = this.messageInput.value.trim();
        
        if (!text) {
            return;
        }

        if (!this.isLessonActive) {
            if (!this.hasShownStartReminder) {
                this.showInfoMessage('Tap ▶️ Start Lesson to meet your tutor.');
                this.hasShownStartReminder = true;
            }
            this.setMicIndicatorState(false);
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
        this.resetFeedbackDeck();
        this.setMicIndicatorState(false);
        
        // Send via WebSocket
        try {
            const playbackSpeed = window.audioManager ? window.audioManager.getSpeed() : 1.0;
            this.wsClient.sendMessage(
                text,
                this.currentLessonId,
                this.currentDialogueId,
                playbackSpeed,
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
        this.isLessonActive = false;
        this.setStartButtonState('ready');
        this.disableInteraction();
        this.updateLessonProgressIndicator();
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
        this.hidePlaceholderMessage();
        this.updateFeedbackDeck(data);
        const phraseId = data.dialogue_id || this.currentDialogueId;
        const translation = data.translation || data.expected_translation || '';
        
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
                
                case 'load_lesson':
                    if (data.lesson_id) {
                        setTimeout(async () => {
                            try {
                                await this.changeLesson(data.lesson_id);
                            } catch (error) {
                                console.error('[Chat] Failed to change lesson:', error);
                                this.showErrorMessage(`Failed to load lesson "${data.lesson_id}". Please try again.`);
                            }
                        }, 500);
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
                        this.handleLessonComplete();
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
            
            if (translation && this.shouldShowTranslation(phraseId)) {
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
        } else if (translation && this.shouldShowTranslation(phraseId)) {
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
            
            if (this.translationMode === 'smart' && phraseId && data.score >= 0.85) {
                this.successfulPhrases.add(phraseId);
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
        this.updateLessonProgressIndicator();
        this.scrollToBottom();
    }
    
    getAvatarForType(type) {
        switch (type) {
            case 'tutor':
                return '☕';
            case 'learner':
                return '🧑';
            case 'hint':
                return '💡';
            case 'error':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    }

    buildMessageStructure(type, options = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${type}`;
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', options.ariaLabel || (type === 'tutor' ? 'Tutor message' : type === 'learner' ? 'Your message' : 'Message'));

        const wrapper = document.createElement('div');
        wrapper.className = 'message__wrapper';

        const avatarType = options.avatarType || type;
        const avatar = document.createElement('div');
        avatar.className = `message__avatar message__avatar--${avatarType}`;
        avatar.textContent = options.avatar || this.getAvatarForType(avatarType);

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message__bubble';

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubbleDiv);
        messageDiv.appendChild(wrapper);

        let metaDiv = null;
        if (options.includeMeta !== false && (type === 'tutor' || type === 'learner')) {
            metaDiv = document.createElement('div');
            metaDiv.className = 'message__meta';
            const timeEl = document.createElement('time');
            timeEl.setAttribute('datetime', new Date().toISOString());
            timeEl.textContent = 'Just now';
            metaDiv.appendChild(timeEl);
            messageDiv.appendChild(metaDiv);
        }

        return { messageDiv, bubbleDiv, metaDiv };
    }

    createMessageElement(type, text) {
        const { messageDiv, bubbleDiv } = this.buildMessageStructure(type);
        bubbleDiv.innerHTML = this.formatMessageText(text);
        return messageDiv;
    }

    formatMessageText(text) {
        const escapeHtml = (unsafe) =>
            unsafe
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

        if (!text || typeof text !== 'string') {
            return '<p></p>';
        }

        const lines = text.split(/\n+/);
        const htmlParts = [];
        let listItems = [];

        const flushList = () => {
            if (listItems.length > 0) {
                htmlParts.push(`<ul class="message__list">${listItems.join('')}</ul>`);
                listItems = [];
            }
        };

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                flushList();
                continue;
            }

            if (trimmed.startsWith('•')) {
                const itemText = escapeHtml(trimmed.replace(/^•\s*/, ''));
                listItems.push(`<li>${itemText}</li>`);
            } else {
                flushList();
                htmlParts.push(`<p>${escapeHtml(trimmed)}</p>`);
            }
        }

        flushList();

        if (htmlParts.length === 0) {
            htmlParts.push(`<p>${escapeHtml(text)}</p>`);
        }

        return htmlParts.join('');
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
    
    createLoadingAudioButton() {
        const button = document.createElement('button');
        button.className = 'audio-button audio-button--loading';
        button.setAttribute('aria-label', 'Loading audio');
        button.setAttribute('title', 'Loading audio');
        button.disabled = true;

        const icon = document.createElement('i');
        icon.setAttribute('data-feather', 'loader');
        icon.className = 'audio-button__icon audio-button__icon--spinning';
        button.appendChild(icon);

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
        const { messageDiv, bubbleDiv } = this.buildMessageStructure('hint', {
            avatarType: 'hint',
            avatar: '💡',
            ariaLabel: 'Hint',
            includeMeta: false
        });
        bubbleDiv.textContent = hint.startsWith('💡') ? hint : `💡 ${hint}`;
        messageDiv.classList.add('message--info');
        return messageDiv;
    }
    
    createInfoMessage(info) {
        const { messageDiv, bubbleDiv } = this.buildMessageStructure('info', {
            avatarType: 'info',
            avatar: '📚',
            ariaLabel: 'Information',
            includeMeta: false
        });
        bubbleDiv.textContent = info.startsWith('📚') ? info : `📚 ${info}`;
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
        const { messageDiv, bubbleDiv } = this.buildMessageStructure('info', {
            avatarType: 'error',
            avatar: '⚠️',
            ariaLabel: 'Error message',
            includeMeta: false
        });
        messageDiv.classList.add('message--error');
        bubbleDiv.textContent = message.startsWith('⚠️') ? message : `⚠️ ${message}`;
        bubbleDiv.style.backgroundColor = 'var(--color-error)';
        bubbleDiv.style.color = 'white';
        this.chatMessages.appendChild(messageDiv);
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
        this.setMicIndicatorState(false);
        
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
        this.sendCommand('repeat');
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
                    // No messages yet, encourage lesson selection
                    window.chatUI.showInfoMessage('Browse the lesson library on the left and pick a lesson to begin.');
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
