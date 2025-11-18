/**
 * Chat UI Functionality
 * Handles WebSocket connection, message rendering, and user interactions
 */

class ChatUI {
    constructor() {
        this.wsClient = null;
        this.wsInitRetries = 0;
        this.maxWsInitRetries = 20; // Max 2 seconds of retries (20 * 100ms)
        this.wsReadyListenerAttached = false;
        this.userId = 1; // Default user ID (will be configurable later)
        this.currentLessonId = null;
        this.currentDialogueId = null;
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.micButton = document.getElementById('micBtn') || document.getElementById('mic-button');
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
        this.progressDetailsEl = document.getElementById('lesson-progress-details');
        this.segmentsCompletedEl = document.getElementById('segments-completed');
        this.totalAttemptsEl = document.getElementById('total-attempts');
        this.lastPracticedEl = document.getElementById('last-practiced');
        this.lessonCatalogPanel = document.getElementById('lesson-catalog-panel');
        this.lessonCatalogSelect = document.getElementById('lesson-catalog-select');
        this.lessonCatalogList = document.getElementById('lesson-catalog-list'); // For dashboard template
        this.lessonCatalogEmptyState = document.getElementById('lesson-catalog-empty');
        this.lessonCatalogPreview = document.getElementById('lesson-catalog-preview');
        this.lessonCatalogPreviewId = document.getElementById('lesson-preview-id');
        this.lessonCatalogPreviewTitle = document.getElementById('lesson-preview-title');
        this.lessonCatalogPreviewSubtitle = document.getElementById('lesson-preview-subtitle');
        this.lessonCatalogPreviewMeta = document.getElementById('lesson-preview-meta');
        this.lessonPreviewGoal = document.getElementById('lesson-preview-goal');
        this.lessonPreviewTime = document.getElementById('lesson-preview-time');
        this.lessonPreviewLevel = document.getElementById('lesson-preview-level');
        this.lessonPreviewIcon = document.getElementById('lesson-preview-icon');
        this.lessonCatalogRefreshButton = document.getElementById('lesson-catalog-refresh');
        this.lessonSearchInput = document.getElementById('lesson-search-input');
        this.lessonQuickAccess = document.getElementById('lesson-quick-access');
        this.recommendedLessonsList = document.getElementById('recommended-lessons');
        this.recentCarousel = document.getElementById('recent-carousel');
        this.recentTrack = document.getElementById('recent-track');
        this.recentPrevBtn = document.getElementById('recent-prev');
        this.recentNextBtn = document.getElementById('recent-next');
        this.recentCurrentIndex = 0;
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
        this.recommendedLessonCard = document.getElementById('recommended-lesson-card');
        this.recommendedLessonTitle = document.getElementById('recommended-lesson-title');
        this.recommendedLessonSubtitle = document.getElementById('recommended-lesson-subtitle');
        this.recommendedLessonLevel = document.getElementById('recommended-lesson-level');
        this.recommendedLessonDuration = document.getElementById('recommended-lesson-duration');
        this.recommendedLessonPhrases = document.getElementById('recommended-lesson-phrases');
        this.recommendedLessonIconEl = document.getElementById('recommended-lesson-icon');
        this.recommendedLessonButton = document.getElementById('start-first-lesson');
        this.voiceInstructions = document.getElementById('voice-instructions');
        this.roadmapSteps = document.querySelectorAll('[data-roadmap-step]');
        this.roadmapLevelLabel = document.getElementById('roadmap-level-label');
        this.supportButtons = {
            repeat: document.getElementById('support-repeat'),
            hint: document.getElementById('show-hints-button') || document.getElementById('support-hint'),
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
        this.recommendedLessonEntry = null;
        this.selectedLessonEntry = null;
        this.chatPlaceholder = document.getElementById('chat-placeholder');
        this.floatingHintText = document.getElementById('floating-hint-text');
        this.startTooltip = document.getElementById('start-tooltip');
        this.voiceTranscriptionEl = document.getElementById('voice-transcription');
        this.voiceTranscriptionTextEl = document.getElementById('voice-transcription-text');
        this.voiceTranscriptionCloseEl = document.getElementById('voice-transcription-close');
        this.errorDisplayEl = document.getElementById('error-display');
        this.errorMessageEl = document.getElementById('error-message');
        this.errorDetailsEl = document.getElementById('error-details');
        this.errorRetryEl = document.getElementById('error-retry');
        this.lastErrorAction = null;
        
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
        const initialLevelText = document.getElementById('progress-level')?.textContent || document.getElementById('main-progress-level')?.textContent || 'A0';
        this.updateRoadmap(initialLevelText);
        this.showPlaceholderMessage();
        
        this.init();
        this.initVoiceInput();
        this.hideLoadingScreen();
        this.bindLessonCardEvents();
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

        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            loadingScreen.setAttribute('aria-hidden', 'true');
            loadingScreen.style.display = 'none';
        }
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
        // Support both select dropdown (index.html) and list (dashboard.html) templates
        if (!this.lessonCatalogSelect && !this.lessonCatalogList) {
            console.warn('[Chat] No lesson catalog container found');
            return;
        }

        if (!this.lessonCatalogEntries.length || force) {
            if (this.lessonCatalogEmptyState) {
                this.lessonCatalogEmptyState.hidden = false;
                this.lessonCatalogEmptyState.textContent = 'Loading lessons...';
            }
            if (this.lessonCatalogSelect) {
                this.lessonCatalogSelect.disabled = true;
                this.lessonCatalogSelect.innerHTML = '<option value="">Loading lessons...</option>';
            }
            if (this.lessonCatalogList) {
                this.lessonCatalogList.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 text-cafe-mocha">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cafe-espresso mb-3"></div>
                        <p class="text-sm">Loading lessons...</p>
                        <p class="text-xs text-cafe-mocha mt-1">Please wait</p>
                    </div>
                `;
            }
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
            this.populateQuickAccessLessons();
            
            // Update navigation manager for dashboard.html
            if (window.navigationManager && typeof window.navigationManager.buildNavigationTree === 'function') {
                // Convert catalog entries to navigation format
                const navLessons = entries.map(entry => ({
                    id: entry.id,
                    title: entry.title_pl || entry.title_en || entry.id,
                    title_pl: entry.title_pl,
                    title_en: entry.title_en,
                    level: this.deriveLevelFromLessonId(entry.id) || 'A0',
                    module: entry.module,
                    part: entry.part
                }));
                window.navigationManager.buildNavigationTree(navLessons);
            }
        } catch (error) {
            console.error('[Chat] Failed to load lesson catalog:', error);
            if (this.lessonCatalogEmptyState) {
                this.lessonCatalogEmptyState.hidden = false;
                this.lessonCatalogEmptyState.textContent = 'Unable to load lessons. Tap refresh to try again.';
            }
            if (this.lessonCatalogList) {
                this.lessonCatalogList.innerHTML = '<div class="text-center py-4 text-cafe-mocha">Unable to load lessons. Please refresh.</div>';
            }
            // Allow fallback to default lesson if available
            if (!this.currentLessonId && this.defaultLessonId) {
                this.currentLessonId = this.defaultLessonId;
                this.setStartButtonState('ready');
            }
        }
    }

    renderLessonCatalog() {
        // Render for select dropdown (index.html template)
        if (this.lessonCatalogSelect) {
            this.renderLessonCatalogSelect();
        }
        
        // Render for list (dashboard.html template)
        if (this.lessonCatalogList) {
            this.renderLessonCatalogList();
        }
        this.renderRecommendedLesson();

        // If neither exists, return early
        if (!this.lessonCatalogSelect && !this.lessonCatalogList) {
            return;
        }
    }
    
    renderLessonCatalogSelect() {
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

        // Group lessons by part and module
        const groupedLessons = this.groupLessonsByPartAndModule(this.lessonCatalogEntries);

        // Create optgroups for each part/module combination
        Object.keys(groupedLessons).sort().forEach(groupKey => {
            const lessons = groupedLessons[groupKey];
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupKey;

            lessons.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.id;
                const title = entry.title_pl || entry.title_en || entry.id;
                const detail = entry.title_en && entry.title_en !== title ? ` – ${entry.title_en}` : '';
                option.textContent = `${title}${detail ? detail : ''}`;
                optgroup.appendChild(option);
            });

            this.lessonCatalogSelect.appendChild(optgroup);
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
    
    renderLessonCatalogList() {
        if (!this.lessonCatalogList) {
            return;
        }
        
        if (!this.lessonCatalogEntries.length) {
            if (this.lessonCatalogEmptyState) {
                this.lessonCatalogEmptyState.hidden = false;
                this.lessonCatalogEmptyState.textContent = 'No lessons available yet.';
            }
            this.lessonCatalogList.innerHTML = '';
            return;
        }
        
        if (this.lessonCatalogEmptyState) {
            this.lessonCatalogEmptyState.hidden = true;
        }
        
        // Clear the list
        this.lessonCatalogList.innerHTML = '';
        
        // Group lessons by part and module
        const groupedLessons = this.groupLessonsByPartAndModule(this.lessonCatalogEntries);
        
        // Render lessons as clickable list items with collapsible categories
        let isFirstLesson = true;
        const sortedGroups = Object.keys(groupedLessons).sort();
        
        sortedGroups.forEach((groupKey, groupIndex) => {
            const lessons = groupedLessons[groupKey];
            
            // Create collapsible group container if there are multiple groups
            if (sortedGroups.length > 1) {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'lesson-group';
                groupContainer.dataset.groupKey = groupKey;
                
                // Group header (clickable to toggle)
                const groupHeader = document.createElement('button');
                groupHeader.type = 'button';
                groupHeader.className = 'lesson-group-header w-full flex items-center justify-between px-3 py-2 mt-4 mb-2 text-xs font-bold text-gray-700 uppercase tracking-wide bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-none cursor-pointer';
                groupHeader.innerHTML = `
                    <span>${groupKey}</span>
                    <i data-feather="chevron-down" class="lesson-group-icon w-4 h-4 text-gray-600 transition-transform duration-200"></i>
                `;
                
                // Group content (collapsible)
                const groupContent = document.createElement('div');
                groupContent.className = 'lesson-group-content';
                // Expand first category by default, collapse others
                const isFirstGroup = groupIndex === 0;
                groupContent.style.cssText = isFirstGroup ? 'display: block;' : 'display: none;';
                
                // Set initial icon rotation for first group
                const initialIcon = groupHeader.querySelector('.lesson-group-icon');
                if (initialIcon && !isFirstGroup) {
                    initialIcon.style.transform = 'rotate(-90deg)';
                }
                
                // Toggle collapse on header click
                groupHeader.addEventListener('click', () => {
                    const isCollapsed = groupContent.style.display === 'none';
                    groupContent.style.display = isCollapsed ? 'block' : 'none';
                    const icon = groupHeader.querySelector('.lesson-group-icon');
                    if (icon) {
                        icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
                    }
                });
                
                // Render lessons inside group
                lessons.forEach((entry, lessonIndex) => {
                    const lessonItem = this.createLessonItem(entry, isFirstLesson && groupIndex === 0 && lessonIndex === 0);
                    groupContent.appendChild(lessonItem);
                    isFirstLesson = false;
                });
                
                groupContainer.appendChild(groupHeader);
                groupContainer.appendChild(groupContent);
                this.lessonCatalogList.appendChild(groupContainer);
                
                // Initialize feather icons for the chevron
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            } else {
                // Single group - no collapse needed, just render lessons
                lessons.forEach((entry, lessonIndex) => {
                    const lessonItem = this.createLessonItem(entry, isFirstLesson && lessonIndex === 0);
                    this.lessonCatalogList.appendChild(lessonItem);
                    isFirstLesson = false;
                });
            }
        });
    }

    renderRecommendedLesson() {
        if (!this.recommendedLessonCard) {
            return;
        }

        const recommendation = this.pickRecommendedLesson();
        if (!recommendation) {
            this.recommendedLessonCard.classList.add('hidden');
            this.recommendedLessonEntry = null;
            return;
        }

        this.recommendedLessonEntry = recommendation;
        const title = recommendation.title_pl || recommendation.title_en || recommendation.id;
        const subtitle = recommendation.title_en && recommendation.title_en !== title ? recommendation.title_en : (recommendation.module || recommendation.part || 'Short lesson to warm up');
        const level = recommendation.level || this.deriveLevelFromLessonId(recommendation.id);
        const estimatedMinutes = recommendation.estimated_minutes || recommendation.duration_minutes || 3;
        const phraseCount = recommendation.phrases?.length || recommendation.dialogues?.length || recommendation.examples?.length || null;
        const progress = this.loadLessonProgress(recommendation.id);
        const completion = progress?.completion || 0;
        const lessonTag = this.getLessonTag(recommendation);
        const lessonEmoji = this.mapIconToEmoji(lessonTag.icon);

        if (this.recommendedLessonTitle) {
            this.recommendedLessonTitle.textContent = title;
        }
        if (this.recommendedLessonSubtitle) {
            this.recommendedLessonSubtitle.textContent = subtitle;
        }
        if (this.recommendedLessonLevel) {
            this.recommendedLessonLevel.textContent = `Level ${level}`;
        }
        if (this.recommendedLessonDuration) {
            this.recommendedLessonDuration.textContent = `⏱ ${estimatedMinutes} min`;
        }
        if (this.recommendedLessonPhrases) {
            if (phraseCount) {
                this.recommendedLessonPhrases.textContent = `💬 ${phraseCount} phrases`;
                this.recommendedLessonPhrases.classList.remove('hidden');
            } else {
                this.recommendedLessonPhrases.classList.add('hidden');
            }
        }
        if (this.recommendedLessonIconEl) {
            this.recommendedLessonIconEl.textContent = lessonEmoji;
        }
        if (this.recommendedLessonButton) {
            this.recommendedLessonButton.textContent = completion > 0 ? 'Resume lesson' : 'Start lesson';
        }

        if (this.roadmapLevelLabel) {
            this.roadmapLevelLabel.textContent = `Level ${level}`;
        }
        this.updateRoadmap(level);

        this.recommendedLessonCard.classList.remove('hidden');
    }

    pickRecommendedLesson() {
        if (!this.lessonCatalogEntries.length) {
            return null;
        }

        const inProgress = this.lessonCatalogEntries.find((entry) => {
            const progress = this.loadLessonProgress(entry.id);
            return progress && progress.completion > 0 && progress.completion < 100;
        });
        if (inProgress) {
            return inProgress;
        }

        const notStarted = this.lessonCatalogEntries.find((entry) => {
            const progress = this.loadLessonProgress(entry.id);
            return !progress || progress.completion === 0;
        });
        if (notStarted) {
            return notStarted;
        }

        return this.lessonCatalogEntries[0];
    }

    createLessonItem(entry, isFirstLesson = false) {
        const lessonItem = document.createElement('div');
        lessonItem.className = 'lesson-card';
        lessonItem.dataset.lessonId = entry.id;
        
        // Load progress for this lesson
        const progress = this.loadLessonProgress(entry.id);
        const completion = progress?.completion || 0;
        const lastPracticed = progress?.lastPracticed ? new Date(progress.lastPracticed) : null;
        const canResume = completion > 0 && completion < 100;
        const isSelected = entry.id === this.currentLessonId;
        
        const lessonTag = this.getLessonTag(entry);
        const lessonIcon = this.mapIconToEmoji(lessonTag.icon);

        // Apply CSS classes for modern styling
        if (isSelected) {
            lessonItem.classList.add('selected');
        }
        
        const title = entry.title_pl || entry.title_en || entry.id;
        const subtitle = entry.title_en && entry.title_en !== title ? entry.title_en : '';
        const duration = entry.estimated_minutes ? `${entry.estimated_minutes} min` : '';
        const level = entry.level || entry.part || '';
        
        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        // Progress indicator
        let progressBadgeText = '';
        let progressBadgeClass = '';
        if (completion >= 100) {
            progressBadgeText = '✓ Complete';
            progressBadgeClass = 'complete';
        } else if (completion > 0) {
            progressBadgeText = `${completion}%`;
        }
        
        // Use Tailwind classes for modern card styling with proper hierarchy
        lessonItem.className = `lesson-card p-5 bg-white rounded-xl border ${isSelected ? 'border-indigo-500 border-l-4 bg-indigo-50 shadow-md' : 'border-gray-200'} shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all mb-4`;

        lessonItem.innerHTML = `
            <!-- Card Header with Title -->
            <div class="flex items-start gap-4 mb-4">
                <div class="lesson-card-icon" aria-hidden="true">${lessonIcon}</div>
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-1 leading-tight">${escapeHtml(title)}</h3>
                    ${subtitle ? `<p class="text-sm text-gray-600 mb-2 font-medium">${escapeHtml(subtitle)}</p>` : ''}
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                        ${lessonTag.label ? `<span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">${lessonTag.label}</span>` : ''}
                        ${level ? `<span>${escapeHtml(level)}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Card Meta Information -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2 text-xs text-gray-500">
                    ${level ? `<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-semibold">${escapeHtml(level)}</span>` : ''}
                    ${duration ? `<span class="text-gray-500">${duration}</span>` : ''}
                </div>
                ${progressBadgeText ? `
                    <span class="px-3 py-1 text-xs font-bold rounded-full ${completion >= 100 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}">
                        ${progressBadgeText}
                    </span>
                ` : ''}
            </div>
            
            <!-- Progress Bar (if in progress) -->
            ${completion > 0 && completion < 100 ? `
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-medium text-gray-600">Progress</span>
                        <span class="text-xs font-bold text-indigo-600">${completion}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full transition-all duration-300" style="width: ${completion}%;"></div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Action Button -->
            <button class="lesson-start-btn w-full px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all text-sm">
                ${canResume ? '▶ Resume Lesson' : '▶ Start Lesson'}
            </button>
        `;
        
        // Button hover effect (handled via CSS, but adding for extra polish)
        const startBtn = lessonItem.querySelector('.lesson-start-btn');
        if (startBtn) {
            startBtn.addEventListener('mouseenter', () => {
                startBtn.style.transform = 'translateY(-1px)';
                startBtn.style.boxShadow = '0 6px 12px rgba(79, 70, 229, 0.3)';
            });
            startBtn.addEventListener('mouseleave', () => {
                startBtn.style.transform = 'translateY(0)';
                startBtn.style.boxShadow = '0 4px 6px rgba(79, 70, 229, 0.2)';
            });
        }
        
        // Note: Button clicks are handled by global event delegation in dashboard.html
        // This avoids duplicate handlers and conflicts
        
        return lessonItem;
    }

    groupLessonsByPartAndModule(entries) {
        const groups = {};

        entries.forEach(entry => {
            let groupKey = 'Other Lessons';

            if (entry.part && entry.module) {
                // Format: "Part: Module" (e.g., "A1: Daily Life")
                const partShort = entry.part.includes('–') ? entry.part.split('–')[0].trim() : entry.part;
                groupKey = `${partShort}: ${entry.module}`;
            } else if (entry.part) {
                // Just part
                const partShort = entry.part.includes('–') ? entry.part.split('–')[0].trim() : entry.part;
                groupKey = partShort;
            } else if (entry.module) {
                // Just module
                groupKey = entry.module;
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(entry);
        });

        return groups;
    }

    filterLessons(searchTerm) {
        // Apply all filters (search, level, status)
        this.applyLessonFilters(searchTerm);
    }

    applyLessonFilters(searchTerm = null) {
        const searchValue = searchTerm !== null ? searchTerm : (this.lessonSearchInput?.value || '');
        const levelFilter = this.lessonFilterLevel?.value || '';
        const statusFilter = this.lessonFilterStatus?.value || '';

        const searchLower = searchValue.toLowerCase().trim();

        let filteredEntries = this.lessonCatalogEntries.filter(entry => {
            // Search filter
            if (searchLower) {
                const titlePl = (entry.title_pl || '').toLowerCase();
                const titleEn = (entry.title_en || '').toLowerCase();
                const module = (entry.module || '').toLowerCase();
                const part = (entry.part || '').toLowerCase();
                
                const matchesSearch = titlePl.includes(searchLower) ||
                                    titleEn.includes(searchLower) ||
                                    module.includes(searchLower) ||
                                    part.includes(searchLower) ||
                                    entry.id.toLowerCase().includes(searchLower);
                
                if (!matchesSearch) return false;
            }

            // Level filter
            if (levelFilter) {
                const entryLevel = (entry.level || entry.part || '').toUpperCase();
                if (!entryLevel.includes(levelFilter.toUpperCase())) {
                    return false;
                }
            }

            // Status filter
            if (statusFilter) {
                const progress = this.loadLessonProgress(entry.id);
                const completion = progress?.completion || 0;
                
                if (statusFilter === 'completed' && completion < 100) {
                    return false;
                } else if (statusFilter === 'in_progress' && (completion === 0 || completion >= 100)) {
                    return false;
                } else if (statusFilter === 'not_started' && completion > 0) {
                    return false;
                }
            }

            return true;
        });

        if (searchLower || levelFilter || statusFilter) {
            this.renderFilteredCatalog(filteredEntries);
        } else {
            this.renderLessonCatalog();
        }

        if (searchLower) {
            this.filterQuickAccessLessons(searchLower);
        } else {
            this.showAllQuickAccessLessons();
        }
    }

    filterQuickAccessLessons(searchTerm) {
        // Filter recommended lessons
        if (this.recommendedLessonsList) {
            const recommendedCards = this.recommendedLessonsList.querySelectorAll('.lesson-quick-lesson');
            this.filterLessonCards(recommendedCards, searchTerm);
        }

        // Filter recent carousel lessons
        if (this.recentTrack) {
            const carouselItems = this.recentTrack.querySelectorAll('.lesson-carousel-item');
            this.filterCarouselItems(carouselItems, searchTerm);
        }
    }

    filterCarouselItems(items, searchTerm) {
        items.forEach(item => {
            const title = item.querySelector('.lesson-carousel-item__title')?.textContent || '';
            const subtitle = item.querySelector('.lesson-carousel-item__subtitle')?.textContent || '';

            const matches = title.toLowerCase().includes(searchTerm) ||
                           subtitle.toLowerCase().includes(searchTerm);

            item.style.display = matches ? 'flex' : 'none';

            // Add fade animation
            if (matches) {
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            } else {
                item.style.opacity = '0.3';
                item.style.transform = 'scale(0.95)';
            }
        });
    }

    filterLessonCards(cards, searchTerm) {
        cards.forEach(card => {
            const title = card.querySelector('.lesson-quick-lesson__title')?.textContent || '';
            const subtitle = card.querySelector('.lesson-quick-lesson__subtitle')?.textContent || '';
            const tag = card.querySelector('.lesson-quick-lesson__tag')?.title || '';

            const matches = title.toLowerCase().includes(searchTerm) ||
                           subtitle.toLowerCase().includes(searchTerm) ||
                           tag.toLowerCase().includes(searchTerm);

            card.style.display = matches ? 'flex' : 'none';

            // Add fade animation
            if (matches) {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            } else {
                card.style.opacity = '0.3';
                card.style.transform = 'scale(0.95)';
            }
        });
    }

    showAllQuickAccessLessons() {
        // Show all recommended lessons
        if (this.recommendedLessonsList) {
            const recommendedCards = this.recommendedLessonsList.querySelectorAll('.lesson-quick-lesson');
            recommendedCards.forEach(card => {
                card.style.display = 'flex';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        }

        // Show all recent carousel lessons
        if (this.recentTrack) {
            const carouselItems = this.recentTrack.querySelectorAll('.lesson-carousel-item');
            carouselItems.forEach(item => {
                item.style.display = 'flex';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            });
        }
    }

    renderFilteredCatalog(filteredEntries) {
        if (!this.lessonCatalogSelect) {
            return;
        }

        const previousValue = this.lessonCatalogSelect.value;
        this.lessonCatalogSelect.innerHTML = '';

        if (!filteredEntries.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No lessons match your search';
            option.disabled = true;
            this.lessonCatalogSelect.appendChild(option);
            this.lessonCatalogSelect.disabled = true;
            return;
        }

        this.lessonCatalogSelect.disabled = false;

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select a lesson';
        placeholderOption.disabled = true;
        placeholderOption.selected = !this.currentLessonId;
        this.lessonCatalogSelect.appendChild(placeholderOption);

        filteredEntries.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.id;
            const title = entry.title_pl || entry.title_en || entry.id;
            const detail = entry.title_en && entry.title_en !== title ? ` – ${entry.title_en}` : '';
            option.textContent = `${title}${detail ? detail : ''} (${entry.id})`;
            this.lessonCatalogSelect.appendChild(option);
        });

        // Restore previous selection if it exists in filtered results
        if (previousValue && filteredEntries.some(entry => entry.id === previousValue)) {
            this.lessonCatalogSelect.value = previousValue;
        }
    }

    populateQuickAccessLessons() {
        if (!this.lessonCatalogEntries.length) {
            return;
        }

        this.populateRecommendedLessons();
        this.populateRecentLessons();
    }

    populateRecommendedLessons() {
        if (!this.recommendedLessonsList) return;

        const activeLessons = this.lessonCatalogEntries.filter(entry => entry.status === 'in_progress');
        const readyLessons = this.lessonCatalogEntries.filter(entry => entry.status !== 'in_progress');
        const prioritized = [...activeLessons, ...readyLessons];
        const recommendedEntries = this.selectDiverseLessons(prioritized, 3);

        this.renderQuickAccessLessons(this.recommendedLessonsList, recommendedEntries, 'Start');
    }

    populateRecentLessons() {
        if (!this.recentTrack) return;

        // Get recently accessed lessons from localStorage
        const recentLessonIds = this.getRecentLessons();
        const recentEntries = recentLessonIds
            .map(id => this.lessonCatalogEntries.find(entry => entry.id === id))
            .filter(Boolean)
            .slice(0, 5); // Show up to 5 in carousel

        this.renderCarouselLessons(this.recentTrack, recentEntries);
        this.updateCarouselNavigation();
    }

    renderCarouselLessons(container, entries) {
        container.innerHTML = '';

        if (!entries.length) {
            const emptySlide = document.createElement('div');
            emptySlide.className = 'lesson-carousel-item';
            emptySlide.innerHTML = '<p style="text-align: center; color: rgba(91, 61, 43, 0.6); margin: 0;">No recent lessons</p>';
            container.appendChild(emptySlide);
            return;
        }

        entries.forEach(entry => {
            const slide = document.createElement('div');
            slide.className = 'lesson-carousel-item';
            slide.addEventListener('click', () => {
                this.handleLessonSelection(entry);
            });

            const tag = this.getLessonTag(entry);

            slide.innerHTML = `
                <div class="lesson-carousel-item__thumbnail">
                    <i data-feather="${tag.icon}" aria-hidden="true"></i>
                </div>
                <div class="lesson-carousel-item__content">
                    <p class="lesson-carousel-item__title">${entry.title_pl || entry.title_en || entry.id}</p>
                    <p class="lesson-carousel-item__subtitle">${entry.module || entry.part || 'Lesson'}</p>
                    <div class="lesson-carousel-item__meta">
                        <span class="lesson-carousel-item__level lesson-carousel-item__level--${this.deriveLevelFromLessonId(entry.id).toLowerCase()}">${this.deriveLevelFromLessonId(entry.id)}</span>
                        ${this.getLessonCompletion(entry.id) > 0 ? `<span class="lesson-carousel-item__completion">${this.getLessonCompletion(entry.id)}%</span>` : ''}
                    </div>
                </div>
                <button class="lesson-carousel-item__action">Resume</button>
            `;

            container.appendChild(slide);
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    navigateCarousel(direction) {
        if (!this.recentTrack) return;

        const slides = this.recentTrack.children;
        if (slides.length <= 1) return;

        this.recentCurrentIndex = Math.max(0, Math.min(slides.length - 1, this.recentCurrentIndex + direction));
        this.updateCarouselPosition();
        this.updateCarouselNavigation();
    }

    updateCarouselPosition() {
        if (!this.recentTrack) return;

        const translateX = -this.recentCurrentIndex * 100;
        this.recentTrack.style.transform = `translateX(${translateX}%)`;
    }

    updateCarouselNavigation() {
        if (!this.recentPrevBtn || !this.recentNextBtn || !this.recentTrack) return;

        const slides = this.recentTrack.children;
        const hasMultipleSlides = slides.length > 1;

        this.recentPrevBtn.disabled = !hasMultipleSlides || this.recentCurrentIndex === 0;
        this.recentNextBtn.disabled = !hasMultipleSlides || this.recentCurrentIndex === slides.length - 1;
    }

    getRecentLessons() {
        try {
            const recent = localStorage.getItem('recent_lessons');
            return recent ? JSON.parse(recent) : [];
        } catch (e) {
            return [];
        }
    }

    getLessonCompletion(lessonId) {
        // This would typically fetch from a progress database
        // For now, return mock data based on localStorage or random for demo
        try {
            const progressKey = `lesson_progress_${lessonId}`;
            const progress = localStorage.getItem(progressKey);
            if (progress) {
                const data = JSON.parse(progress);
                return data.completion || 0;
            }
        } catch (e) {
            // Ignore errors
        }

        // For demo purposes, randomly assign completion to some lessons
        const mockCompletion = Math.random();
        if (mockCompletion > 0.7) {
            const completionPercent = Math.floor(mockCompletion * 100);
            // Cache it for consistency
            try {
                localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify({ completion: completionPercent }));
            } catch (e) {
                // Ignore
            }
            return completionPercent;
        }

        return 0;
    }

    saveRecentLesson(lessonId) {
        try {
            const recent = this.getRecentLessons();
            const filtered = recent.filter(id => id !== lessonId);
            filtered.unshift(lessonId); // Add to beginning
            const limited = filtered.slice(0, 10); // Keep only 10 most recent
            localStorage.setItem('recent_lessons', JSON.stringify(limited));
        } catch (e) {
            // Ignore errors
        }
    }

    renderQuickAccessLessons(container, entries, actionText) {
        container.innerHTML = '';

        if (!entries.length) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'lesson-library__empty';
            emptyMessage.textContent = 'None yet';
            container.appendChild(emptyMessage);
            return;
        }

        entries.forEach(entry => {
            const lessonEl = document.createElement('div');
            lessonEl.className = 'lesson-quick-lesson';
            lessonEl.addEventListener('click', () => {
                this.handleLessonSelection(entry);
            });

            const content = document.createElement('div');
            content.className = 'lesson-quick-lesson__content';

            // Add tag/icon at the top
            const tag = this.getLessonTag(entry);
            if (tag) {
                const tagEl = document.createElement('div');
                tagEl.className = 'lesson-quick-lesson__tag';
                tagEl.title = tag.label;
                const iconEl = document.createElement('i');
                iconEl.setAttribute('data-feather', tag.icon);
                iconEl.setAttribute('aria-hidden', 'true');
                tagEl.appendChild(iconEl);
                content.appendChild(tagEl);
            }

            const title = document.createElement('p');
            title.className = 'lesson-quick-lesson__title';
            title.textContent = entry.title_pl || entry.title_en || entry.id;

            const subtitle = document.createElement('p');
            subtitle.className = 'lesson-quick-lesson__subtitle';
            subtitle.textContent = entry.module || entry.part || 'Lesson';

            // Add difficulty badge and completion info
            const metaRow = document.createElement('div');
            metaRow.className = 'lesson-quick-lesson__meta';

            const level = this.deriveLevelFromLessonId(entry.id);
            const levelBadge = document.createElement('span');
            levelBadge.className = `lesson-quick-lesson__level lesson-quick-lesson__level--${level.toLowerCase()}`;
            levelBadge.textContent = level;
            metaRow.appendChild(levelBadge);

            // Add completion percentage if available
            const completion = this.getLessonCompletion(entry.id);
            if (completion > 0) {
                const completionEl = document.createElement('span');
                completionEl.className = 'lesson-quick-lesson__completion';
                completionEl.textContent = `${completion}%`;
                metaRow.appendChild(completionEl);
            }

            content.appendChild(title);
            content.appendChild(subtitle);
            content.appendChild(metaRow);

            const action = document.createElement('div');
            action.className = 'lesson-quick-lesson__action';
            const label = entry.status === 'in_progress'
                ? 'Resume'
                : completion >= 60
                    ? 'Continue'
                    : actionText || 'Start';
            action.textContent = label;
            action.setAttribute('aria-label', `${label} ${entry.title_pl || entry.title_en || entry.id}`);

            lessonEl.appendChild(content);
            lessonEl.appendChild(action);

            container.appendChild(lessonEl);
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    selectDiverseLessons(entries, limit = 3) {
        if (!Array.isArray(entries) || !entries.length) {
            return [];
        }

        const curated = [];
        const seenKeys = new Set();

        for (const entry of entries) {
            if (!entry) continue;
            const key = (entry.module || entry.part || this.deriveLevelFromLessonId(entry.id) || entry.id).toLowerCase();
            if (seenKeys.has(key)) {
                continue;
            }
            curated.push(entry);
            seenKeys.add(key);
            if (curated.length === limit) {
                return curated;
            }
        }

        for (const entry of entries) {
            if (!entry || curated.includes(entry)) continue;
            curated.push(entry);
            if (curated.length === limit) {
                break;
            }
        }

        return curated;
    }

    getLessonTag(entry) {
        const title = (entry.title_pl || entry.title_en || '').toLowerCase();
        const id = entry.id.toLowerCase();

        // Define tag mappings based on lesson content
        const tagMappings = [
            { keywords: ['powitania', 'pożegnania', 'greetings'], icon: 'smile', label: 'Greetings' },
            { keywords: ['przedstawianie', 'introduce'], icon: 'user-plus', label: 'Introductions' },
            { keywords: ['pochodzenie', 'country'], icon: 'globe', label: 'Origins' },
            { keywords: ['samopoczucie', 'feelings'], icon: 'heart', label: 'Feelings' },
            { keywords: ['rodzina', 'family'], icon: 'users', label: 'Family' },
            { keywords: ['zawody', 'zajęcia', 'occupations', 'jobs'], icon: 'briefcase', label: 'Work' },
            { keywords: ['liczby', 'numbers'], icon: 'hash', label: 'Numbers' },
            { keywords: ['dni', 'miesiące', 'pora', 'time', 'days', 'months'], icon: 'clock', label: 'Time' },
            { keywords: ['dzień', 'day'], icon: 'map-pin', label: 'Daily Life' },
            { keywords: ['artykuły spożywcze', 'zakupy', 'pieniądze', 'shopping', 'food'], icon: 'shopping-bag', label: 'Shopping' },
            { keywords: ['przy stole', 'restaurant', 'table'], icon: 'coffee', label: 'Dining' },
            { keywords: ['ciało', 'body'], icon: 'activity', label: 'Health' },
            { keywords: ['lekarza', 'doctor'], icon: 'life-buoy', label: 'Medical' },
            { keywords: ['pogoda', 'weather'], icon: 'cloud', label: 'Weather' },
            { keywords: ['ubrania', 'clothes'], icon: 'layers', label: 'Clothing' },
            { keywords: ['mieszkanie', 'housing', 'home'], icon: 'home', label: 'Home' },
            { keywords: ['w mieście', 'city'], icon: 'map', label: 'City' },
            { keywords: ['okolica', 'neighborhood'], icon: 'compass', label: 'Neighborhood' },
            { keywords: ['transport', 'transportation'], icon: 'navigation', label: 'Transport' },
            { keywords: ['czas wolny', 'free time'], icon: 'star', label: 'Leisure' }
        ];

        for (const mapping of tagMappings) {
            if (mapping.keywords.some(keyword => title.includes(keyword) || id.includes(keyword))) {
                return { icon: mapping.icon, label: mapping.label };
            }
        }

        // Default tag
        return { icon: 'bookmark', label: 'General' };
    }

    mapIconToEmoji(iconName) {
        const emojiMap = {
            smile: '😊',
            'user-plus': '🤝',
            globe: '🌍',
            heart: '❤️',
            users: '👥',
            briefcase: '💼',
            hash: '🔢',
            clock: '⏰',
            'shopping-bag': '🛒',
            coffee: '☕️',
            activity: '💪',
            'life-buoy': '🩺',
            cloud: '🌦️',
            layers: '👗',
            home: '🏠',
            map: '🗺️',
            compass: '🧭',
            navigation: '🚌',
            star: '⭐️',
            bookmark: '📘'
        };
        return emojiMap[iconName] || '📚';
    }

    updateRoadmap(levelText = 'A0') {
        if (!this.roadmapSteps || !this.roadmapSteps.length) {
            return;
        }
        const normalized = levelText.split('→')[0]?.trim() || 'A0';
        const ordering = ['A0', 'A0.5', 'A1', 'A1.5', 'A2'];
        const currentIndex = ordering.findIndex((label) => normalized.startsWith(label.replace('.', '')));
        this.roadmapSteps.forEach((step, index) => {
            step.classList.toggle('active', currentIndex === -1 ? index === 0 : index === currentIndex);
            step.classList.toggle('completed', currentIndex !== -1 && index < currentIndex);
        });
    }

    scrollToActiveLessonCard() {
        const card = document.getElementById('active-lesson-card');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    handleLessonSelection(entry) {
        if (!entry) {
            return;
        }

        this.currentLessonId = entry.id;
        this.selectedLessonEntry = entry;

        if (this.isLessonActive) {
            this.resetActiveLessonSession('Switched to a new lesson. Press Start when ready.');
        }

        // Show active lesson card, hide hero card
        const heroCard = document.getElementById('hero-card');
        const activeLessonCard = document.getElementById('active-lesson-card');
        if (heroCard) heroCard.classList.add('hidden');
        if (activeLessonCard) activeLessonCard.classList.remove('hidden');

        this.previewSelectedLesson(entry);
        this.setStartButtonState('ready');
        this.updateFloatingHint('Great choice! Press Start Lesson to begin.');
        this.renderRecommendedLesson();

        // Emit event for onboarding
        document.dispatchEvent(new CustomEvent('lessonSelected', { detail: entry }));
    }

    async previewSelectedLesson(entry) {
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
        
        // Update active lesson card title and subtitle
        const lessonTitleEl = document.getElementById('lesson-title');
        const lessonSubtitleEl = document.getElementById('lesson-subtitle');
        if (lessonTitleEl) {
            lessonTitleEl.textContent = entry.title_pl || entry.title_en || entry.id;
        }
        if (lessonSubtitleEl) {
            lessonSubtitleEl.textContent = entry.title_en && entry.title_en !== (entry.title_pl || entry.id) 
                ? entry.title_en 
                : (entry.module || entry.part || '');
        }
        
        if (this.lessonFocusEl && entry.title_en) {
            this.lessonFocusEl.textContent = entry.title_en;
        }
        await this.updateLessonPreviewDetails(entry, derivedLevel, tags);
    }

    deriveLevelFromLessonId(lessonId) {
        if (!lessonId) {
            return 'A0';
        }
        const match = lessonId.match(/([A-C]\d)/i);
        return match ? match[1].toUpperCase() : 'A0';
    }

    async updateLessonPreviewDetails(entry, level, tags) {
        if (!this.lessonCatalogPreview) {
            return;
        }

        const title = entry.title_pl || entry.title_en || entry.id;
        const subtitle = entry.title_en && entry.title_en !== title ? entry.title_en : entry.part;

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

        // Set situational icon
        if (this.lessonPreviewIcon) {
            const tag = this.getLessonTag(entry);
            this.lessonPreviewIcon.textContent = tag.icon;
            this.lessonPreviewIcon.title = tag.label;
        }

        // Populate metadata fields
        if (this.lessonPreviewLevel) {
            this.lessonPreviewLevel.textContent = level || 'A1';
        }

        if (this.lessonPreviewTime) {
            this.lessonPreviewTime.textContent = '3-5 minutes'; // Default, could be made dynamic
        }

        // Try to get lesson goal from the API
        if (this.lessonPreviewGoal) {
            try {
                const response = await fetch(`/api/lesson/get?lesson_id=${encodeURIComponent(entry.id)}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.status === 'success' && result.data) {
                        const lessonData = result.data;
                        const goal = lessonData.cefr_goal || 'Practice conversational Polish';
                        this.lessonPreviewGoal.textContent = goal.length > 60 ? goal.substring(0, 60) + '...' : goal;
                    } else {
                        this.lessonPreviewGoal.textContent = 'Practice conversational Polish';
                    }
                } else {
                    this.lessonPreviewGoal.textContent = 'Practice conversational Polish';
                }
            } catch (error) {
                console.warn('Failed to fetch lesson details for preview:', error);
                this.lessonPreviewGoal.textContent = 'Practice conversational Polish';
            }
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
            // Hide bottom input bar on error
            const bottomInputBar = document.getElementById('bottom-input-bar');
            if (bottomInputBar) bottomInputBar.classList.add('hidden');
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
        
        // Show bottom input bar when lesson is active
        const bottomInputBar = document.getElementById('bottom-input-bar');
        if (bottomInputBar) bottomInputBar.classList.remove('hidden');
        
        this.enableInteraction();
        this.dismissWelcomeOverlay();
        this.setStartButtonState('active');
        this.collapseLessonLibrary();
        this.hidePlaceholderMessage();
        this.updateFloatingHint('Tutor is listening. Answer in Polish and get instant feedback.');
        this.updateLessonOverviewCard(lessonData.lesson);
        this.resetFeedbackDeck();

        // Save to recent lessons
        this.saveRecentLesson(lessonData.lesson.id);

        // Emit event for onboarding
        document.dispatchEvent(new CustomEvent('lessonStarted', { detail: lessonData }));

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

        const updateOverlayStart = (text, disabled) => {
            if (this.welcomeStartButton) {
                this.welcomeStartButton.disabled = disabled;
                this.welcomeStartButton.dataset.state = state;
            }
            if (this.welcomeStartText) {
                this.welcomeStartText.textContent = text;
            }
        };

        this.startButton.dataset.state = state;

        switch (state) {
            case 'loading':
                this.startButton.disabled = true;
                this.startButton.textContent = 'Starting...';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'Loading your lesson. Hang tight!';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'none';
                }
                updateOverlayStart('Starting...', true);
                break;
            case 'active':
                this.startButton.disabled = true;
                this.startButton.textContent = 'Lesson in progress';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'Jump back in any time. Try the helper buttons if you need support.';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'none';
                }
                updateOverlayStart('Lesson in progress', true);
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
                updateOverlayStart('Choose a lesson first', true);
                break;
            default:
                this.startButton.disabled = false;
                this.startButton.textContent = 'Start Lesson';
                this.startButton.title = 'Speak or type in Polish';
                if (this.startHintEl) {
                    this.startHintEl.textContent = 'We\'ll guide you step-by-step. Click start when you\'re ready.';
                }
                if (this.startTooltip) {
                    this.startTooltip.style.display = 'none';
                }
                updateOverlayStart('Start Lesson', false);
                break;
        }
    }

    disableInteraction() {
        if (this.messageInput) {
            this.messageInput.disabled = true;
            this.messageInput.placeholder = 'Tap Start Lesson to reply…';
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
                button.textContent = 'Slow Polish';
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
            this.messageInput.placeholder = 'Type or dictate your reply…';
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
        // Hide bottom input bar when lesson completes
        const bottomInputBar = document.getElementById('bottom-input-bar');
        if (bottomInputBar) bottomInputBar.classList.add('hidden');
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
        // Hide bottom input bar when lesson is reset
        const bottomInputBar = document.getElementById('bottom-input-bar');
        if (bottomInputBar) bottomInputBar.classList.add('hidden');
        this.disableInteraction();
        this.resetLessonProgressIndicator();
        this.resetFeedbackDeck();
        this.expandLessonLibrary();
        this.setStartButtonState(this.currentLessonId ? 'ready' : 'select');
        this.showPlaceholderMessage();
        if (reason) {
            this.showInfoMessage(reason);
        }
        this.updateFloatingHint('Pick a lesson to begin, then press Start.');
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
        const totalAttempts = summary.completedDialogues || completedUnique || 0;
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

        // Update detailed progress
        if (this.progressDetailsEl) {
            this.progressDetailsEl.classList.remove('hidden');
        }
        if (this.segmentsCompletedEl) {
            this.segmentsCompletedEl.textContent = `${completedUnique} / ${total}`;
        }
        if (this.totalAttemptsEl) {
            this.totalAttemptsEl.textContent = String(totalAttempts);
        }
        if (this.lastPracticedEl) {
            const now = new Date();
            this.lastPracticedEl.textContent = now.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Auto-save progress
        if (this.currentLessonId) {
            this.saveLessonProgress(this.currentLessonId, {
                completion: percent,
                segmentsCompleted: completedUnique,
                totalSegments: total,
                totalAttempts: totalAttempts,
                lastPracticed: new Date().toISOString()
            });
        }
    }

    saveLessonProgress(lessonId, progress) {
        try {
            const progressKey = `lesson_progress_${lessonId}`;
            const existing = JSON.parse(localStorage.getItem(progressKey) || '{}');
            const updated = {
                ...existing,
                ...progress,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(progressKey, JSON.stringify(updated));
        } catch (e) {
            console.warn('Failed to save lesson progress:', e);
        }
    }

    loadLessonProgress(lessonId) {
        try {
            const progressKey = `lesson_progress_${lessonId}`;
            const progress = localStorage.getItem(progressKey);
            if (progress) {
                return JSON.parse(progress);
            }
        } catch (e) {
            console.warn('Failed to load lesson progress:', e);
        }
        return null;
    }

    setMicIndicatorState(isActive) {
        if (this.voiceInstructions) {
            this.voiceInstructions.textContent = isActive
                ? 'Listening… speak now.'
                : 'Press the mic to start speaking.';
        }
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
            slowButton.textContent = this.isSlowMode ? 'Slow Polish ON' : 'Slow Polish';
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
        goalBox.innerHTML = `<span style="display:block; font-size:0.85rem; letter-spacing:0.08em; text-transform:uppercase; color:rgba(124,58,18,0.75);">Goal</span><span>${goal}</span>`;
        wrapper.appendChild(goalBox);

        const steps = document.createElement('div');
        steps.style.display = 'grid';
        steps.style.gap = '0.45rem';
        steps.innerHTML = [
            `<div><strong>1.</strong> Tap Play to hear your tutor.</div>`,
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
            { label: 'Repeat', action: 'repeat' },
            { label: 'Hint', action: 'hint' },
            { label: 'Slow Polish', action: 'slow' },
            { label: 'Change topic', action: 'topic' }
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
                `<span>Your turn!</span></div>` +
                `<div style="margin-top:0.65rem; display:grid; gap:0.45rem; line-height:1.55;">` +
                `<div><span style="font-weight:600;">1. Listen.</span> Tap the green play button for the tutor's Polish audio.</div>` +
                `<div><span style="font-weight:600;">2. Reply.</span> Speak with the microphone or type your best answer below — English is okay if you're unsure.</div>` +
                `<div><span style="font-weight:600;">3. Need help?</span> Type “hint”, “repeat”, or ask for another topic.</div>` +
                `</div>` +
                `<div style="margin-top:0.6rem; font-size:0.85rem; color:var(--color-text-muted, #6b7280);">I’ll listen and give you gentle feedback after every reply.</div>`;
            messageBubble.appendChild(guide);
            this.hasShownFirstPromptGuide = true;
        }

        // Show the Polish phrase being learned in a highlighted box
        if (tutorText && tutorText.trim()) {
            const phraseCard = document.createElement('div');
            phraseCard.className = 'tutor-phrase';

            const header = document.createElement('div');
            header.className = 'tutor-phrase__header';
        header.innerHTML = '<span class="tutor-phrase__icon" aria-hidden="true"><i data-feather="mic"></i></span><span class="tutor-phrase__title">Practice this phrase</span>';
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
        audioLabel.textContent = 'Loading tutor audio...';

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

                audioLabel.textContent = 'Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.onclick = () => audioButton.click();
            }).catch(error => {
                console.error('Failed to get audio URL:', error);
                // Fallback: generate on-demand
                const audioButton = this.createAudioButtonWithGeneration(tutorText, dialogue.id);
                audioContainer.replaceChild(audioButton, loadingButton);

                const speedToggle = this.createSpeedToggle();
                audioContainer.insertBefore(speedToggle, audioLabel);

                audioLabel.textContent = 'Click to hear pronunciation';
                audioLabel.style.cursor = 'pointer';
                audioLabel.onclick = () => audioButton.click();
            });
        } else if (tutorText && tutorText.trim()) {
            // No pre-recorded audio, generate on-demand
            const audioButton = this.createAudioButtonWithGeneration(tutorText, dialogue.id);
            audioContainer.replaceChild(audioButton, loadingButton);

            const speedToggle = this.createSpeedToggle();
            audioContainer.insertBefore(speedToggle, audioLabel);

            audioLabel.textContent = 'Click to hear pronunciation';
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
                // Show transcription display
                this.showVoiceTranscription(transcript);
                
                // Set transcript in input field
                if (this.messageInput) {
                    this.messageInput.value = transcript;
                    this.autoResizeTextarea();
                }
                
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
                this.showErrorWithRetry(errorMessage, () => {
                    if (!voiceManager.isCurrentlyListening()) {
                        voiceManager.startListening(voiceManager.getMicMode());
                    }
                });
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

    resolveWebSocketClient() {
        if (typeof TutorWebSocketClient !== 'undefined') {
            return TutorWebSocketClient;
        }
        if (typeof window !== 'undefined' && window.TutorWebSocketClient) {
            return window.TutorWebSocketClient;
        }
        if (typeof globalThis !== 'undefined' && globalThis.TutorWebSocketClient) {
            return globalThis.TutorWebSocketClient;
        }
        if (typeof self !== 'undefined' && self.TutorWebSocketClient) {
            return self.TutorWebSocketClient;
        }
        return null;
    }
    
    initWebSocket() {
        // Wait for TutorWebSocketClient to be available (handles script loading race condition)
        const TutorWebSocketClientClass = this.resolveWebSocketClient();
        
        if (!TutorWebSocketClientClass) {
            this.wsInitRetries++;
            if (this.wsInitRetries >= this.maxWsInitRetries) {
                console.error('[Chat] TutorWebSocketClient not found after multiple retries. Make sure websocket_client_example.js is loaded before chat.js.');
                console.error('[Chat] Check browser console for script loading errors.');
                // Check if script tag exists
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const wsScript = scripts.find(s => s.src && s.src.includes('websocket_client_example'));
                if (!wsScript) {
                    console.error('[Chat] websocket_client_example.js script tag not found in HTML!');
                } else {
                    console.warn('[Chat] Script tag found but class not available. Check for JavaScript errors in websocket_client_example.js');
                }
                return;
            }
            console.warn(`[Chat] TutorWebSocketClient not found yet, retrying in 100ms... (${this.wsInitRetries}/${this.maxWsInitRetries})`);
            // Retry after a short delay to allow scripts to finish loading
            setTimeout(() => this.initWebSocket(), 100);

            // Subscribe to readiness event once so we can short-circuit retries when the script finishes loading
            if (!this.wsReadyListenerAttached && typeof document !== 'undefined') {
                this.wsReadyListenerAttached = true;
                document.addEventListener(
                    'tutor-websocket-ready',
                    () => {
                        this.wsReadyListenerAttached = false;
                        this.initWebSocket();
                    },
                    { once: true }
                );
            }
            return;
        }
        
        // Reset retry counter on success
        this.wsInitRetries = 0;
        
        const wsUrl = `ws://${window.location.host}/ws/chat`;
        this.wsClient = new TutorWebSocketClientClass(wsUrl);
        
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
                this.updateConnectionStatus('connected', 'Ready to learn');
                console.log('WebSocket connected');
            },
            (event) => {
                this.updateConnectionStatus('disconnected', 'Tutor is offline');
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

        if (this.lessonSearchInput) {
            this.lessonSearchInput.addEventListener('input', (e) => this.filterLessons(e.target.value));
        }

        if (this.lessonFilterLevel) {
            this.lessonFilterLevel.addEventListener('change', () => this.applyLessonFilters());
        }

        if (this.lessonFilterStatus) {
            this.lessonFilterStatus.addEventListener('change', () => this.applyLessonFilters());
        }

        if (this.voiceTranscriptionCloseEl) {
            this.voiceTranscriptionCloseEl.addEventListener('click', () => this.hideVoiceTranscription());
        }

        if (this.errorRetryEl) {
            this.errorRetryEl.addEventListener('click', () => {
                if (this.lastErrorAction) {
                    this.lastErrorAction();
                    this.hideError();
                }
            });
        }

        if (this.recentPrevBtn) {
            this.recentPrevBtn.addEventListener('click', () => this.navigateCarousel(-1));
        }

        if (this.recentNextBtn) {
            this.recentNextBtn.addEventListener('click', () => this.navigateCarousel(1));
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
                this.updateFloatingHint('Pick another lesson and press Start to continue.');
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
                this.showInfoMessage('Tap Start Lesson to meet your tutor.');
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

        // Check if this is the first message sent (for onboarding)
        const isFirstMessage = !this.hasSentFirstMessage;
        this.hasSentFirstMessage = true;

        // Render learner message immediately
        this.renderLearnerMessage(text);

        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.resetFeedbackDeck();
        this.setMicIndicatorState(false);

        // Emit event for onboarding if this is the first message
        if (isFirstMessage) {
            document.dispatchEvent(new CustomEvent('firstMessageSent', { detail: { message: text } }));
        }

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
        
        let summaryText = `Lesson Complete!\n\n`;
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
                                    `Great! Your lesson about "${topic}" is ready! Let's start learning!`);
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
        header.innerHTML = '<span class="tutor-phrase__icon" aria-hidden="true"><i data-feather="mic"></i></span><span class="tutor-phrase__title">Practice this phrase</span>';
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
            audioLabel.textContent = 'Click to hear pronunciation';
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
            audioLabel.textContent = 'Click to hear pronunciation';
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
                audioLabel.textContent = 'Click to hear pronunciation';
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
                return { icon: 'coffee', label: 'Tutor' };
            case 'learner':
                return { icon: 'user', label: 'You' };
            case 'hint':
                return { icon: 'help-circle', label: 'Hint' };
            case 'error':
                return { icon: 'alert-triangle', label: 'Error' };
            case 'info':
            default:
                return { icon: 'info', label: 'Info' };
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
        const avatarContent = options.avatar || this.getAvatarForType(avatarType);
        if (avatarContent && typeof avatarContent === 'object' && avatarContent.icon && typeof feather !== 'undefined' && feather.icons && feather.icons[avatarContent.icon]) {
            avatar.innerHTML = feather.icons[avatarContent.icon].toSvg({ width: 18, height: 18 });
            avatar.setAttribute('aria-label', avatarContent.label || '');
        } else if (avatarContent) {
            avatar.textContent = avatarContent.label || avatarContent;
        }

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
            ariaLabel: 'Hint',
            includeMeta: false
        });
        bubbleDiv.textContent = hint;
        messageDiv.classList.add('message--info');
        return messageDiv;
    }
    
    createInfoMessage(info) {
        const { messageDiv, bubbleDiv } = this.buildMessageStructure('info', {
            avatarType: 'info',
            ariaLabel: 'Information',
            includeMeta: false
        });
        bubbleDiv.textContent = info;
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
    
    showVoiceTranscription(transcript) {
        if (this.voiceTranscriptionEl && this.voiceTranscriptionTextEl) {
            this.voiceTranscriptionTextEl.textContent = transcript;
            this.voiceTranscriptionEl.classList.remove('hidden');
            
            // Make transcription clickable to edit
            this.voiceTranscriptionTextEl.style.cursor = 'pointer';
            const clickHandler = () => {
                if (this.messageInput) {
                    this.messageInput.focus();
                }
            };
            // Remove old listener and add new one
            this.voiceTranscriptionTextEl.removeEventListener('click', clickHandler);
            this.voiceTranscriptionTextEl.addEventListener('click', clickHandler);
        }
    }

    hideVoiceTranscription() {
        if (this.voiceTranscriptionEl) {
            this.voiceTranscriptionEl.classList.add('hidden');
        }
    }

    showErrorWithRetry(message, retryAction = null, details = '') {
        // Show in error display if available (for voice/audio errors)
        if (this.errorDisplayEl && this.errorMessageEl) {
            this.errorMessageEl.textContent = message;
            if (this.errorDetailsEl && details) {
                this.errorDetailsEl.textContent = details;
                this.errorDetailsEl.classList.remove('hidden');
            } else if (this.errorDetailsEl) {
                this.errorDetailsEl.classList.add('hidden');
            }
            this.errorDisplayEl.classList.remove('hidden');
            this.lastErrorAction = retryAction;
            
            // Hide error after 10 seconds if no action
            setTimeout(() => {
                if (this.errorDisplayEl && !this.errorDisplayEl.classList.contains('hidden')) {
                    this.hideError();
                }
            }, 10000);
        }
        
        // Also show in chat messages for visibility
        this.showErrorMessage(message);
    }

    hideError() {
        if (this.errorDisplayEl) {
            this.errorDisplayEl.classList.add('hidden');
        }
        this.lastErrorAction = null;
    }

    showErrorMessage(message) {
        const { messageDiv, bubbleDiv } = this.buildMessageStructure('info', {
            avatarType: 'error',
            ariaLabel: 'Error message',
            includeMeta: false
        });
        messageDiv.classList.add('message--error');
        bubbleDiv.textContent = message;
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
        // Check if elements exist before updating (they may not be in all templates)
        if (!this.connectionStatus || !this.connectionStatusText) {
            console.warn('[Chat] Connection status elements not found in DOM, skipping status update');
            return;
        }
        
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

    bindLessonCardEvents() {
        if (this.lessonCardClickHandler) {
            return;
        }

        this.lessonCardClickHandler = (event) => {
            const startBtn = event.target.closest('.lesson-start-btn');
            const lessonCard = event.target.closest('.lesson-card');
            if (!startBtn && !lessonCard) {
                return;
            }

            const targetCard = startBtn ? startBtn.closest('.lesson-card') : lessonCard;
            const lessonId = targetCard?.dataset.lessonId;
            if (!lessonId) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (startBtn) {
                this.startLessonFromCard(lessonId);
            } else {
                this.handleLessonSelectionById(lessonId);
            }
        };

        document.addEventListener('click', this.lessonCardClickHandler);
    }

    handleLessonSelectionById(lessonId) {
        if (!lessonId) {
            return;
        }
        const entry = this.lessonCatalogEntries.find((item) => item.id === lessonId);
        if (!entry) {
            console.warn('[Chat] Lesson entry not found for id:', lessonId);
            return;
        }
        this.handleLessonSelection(entry);
    }

    startLessonFromCard(lessonId) {
        this.handleLessonSelectionById(lessonId);
        if (this.startButton && !this.isLessonActive) {
            try {
                this.startButton.click();
            } catch (error) {
                console.warn('[Chat] Unable to auto-start lesson:', error);
            }
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
                    window.chatUI.showInfoMessage('Select a lesson from the left panel to begin learning. The tutor will guide you step-by-step.');
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
            errorDiv.innerHTML = '<div class="message__bubble">Failed to initialize chat. Please refresh the page.</div>';
            chatMessages.appendChild(errorDiv);
        }
    }
});
