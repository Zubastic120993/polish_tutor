/**
 * Settings Manager
 * Handles all settings UI and persistence
 */
class SettingsManager {
    constructor(userId = 1) {
        this.userId = userId;
        this.currentSettings = null;
        this.modal = null;
        this.lessonCatalog = [];
        this.lessonCatalogLoaded = false;
        this.lessonCatalogLoading = false;
        this.lessonCatalogError = null;
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('settings-modal');
        const settingsButton = document.getElementById('settings-button');
        const closeButton = document.getElementById('settings-modal-close');
        const overlay = document.getElementById('settings-modal-overlay');
        
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.open());
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.hasAttribute('aria-hidden')) {
                this.close();
            }
        });
        
        // Load settings on init
        this.loadSettings();
    }
    
    /**
     * Load settings from API
     */
    async loadSettings() {
        try {
            const response = await fetch(`/api/settings/get?user_id=${this.userId}`);
            if (!response.ok) {
                throw new Error(`Failed to load settings: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                this.currentSettings = result.data;
                this.applySettings(this.currentSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    /**
     * Open settings modal
     */
    async open() {
        if (!this.currentSettings) {
            await this.loadSettings();
        }
        
        if (this.modal) {
            this.modal.removeAttribute('aria-hidden');
            this.modal.classList.add('modal--active');
            this.render();
            feather.replace(); // Update icons
            await this.populateLessonCatalog(false);
        }
    }
    
    /**
     * Close settings modal
     */
    close() {
        if (this.modal) {
            this.modal.setAttribute('aria-hidden', 'true');
            this.modal.classList.remove('modal--active');
        }
    }
    
    /**
     * Render settings UI
     */
    render() {
        const content = document.getElementById('settings-content');
        if (!content) return;
        
        const settings = this.currentSettings || this.getDefaultSettings();
        
        content.innerHTML = `
            <div class="settings">
                <!-- User Profile -->
                <section class="settings__section">
                    <h3 class="settings__section-title">User Profile</h3>
                    <div class="settings__group">
                        <label class="settings__label">Active User</label>
                        <select class="settings__select" name="user_profile" id="user-profile-select">
                            <option value="1" ${settings.user_id === 1 || !settings.user_id ? 'selected' : ''}>User 1</option>
                            <option value="2" ${settings.user_id === 2 ? 'selected' : ''}>User 2</option>
                            <option value="3" ${settings.user_id === 3 ? 'selected' : ''}>User 3</option>
                        </select>
                        <small class="settings__help" style="display: block; margin-top: var(--spacing-xs); color: var(--color-text-muted); font-size: var(--font-size-small);">
                            Switch between different user profiles. Each profile has separate progress and settings.
                        </small>
                    </div>
                </section>
                
                <!-- Profile Templates -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Profile Templates</h3>
                    <div class="settings__group">
                        <div class="settings__radio-group">
                            <label class="settings__radio">
                                <input type="radio" name="profile_template" value="kid" ${settings.profile_template === 'kid' ? 'checked' : ''}>
                                <span>Kid</span>
                            </label>
                            <label class="settings__radio">
                                <input type="radio" name="profile_template" value="adult" ${settings.profile_template === 'adult' || !settings.profile_template ? 'checked' : ''}>
                                <span>Adult</span>
                            </label>
                            <label class="settings__radio">
                                <input type="radio" name="profile_template" value="teacher" ${settings.profile_template === 'teacher' ? 'checked' : ''}>
                                <span>Teacher</span>
                            </label>
                        </div>
                    </div>
                </section>
                
                <!-- Audio Settings -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Audio Settings</h3>
                    
                    <div class="settings__group">
                        <label class="settings__label">Speed</label>
                        <select class="settings__select" name="audio_speed">
                            <option value="slow" ${settings.audio_speed === 'slow' ? 'selected' : ''}>Slow</option>
                            <option value="normal" ${settings.audio_speed === 'normal' || !settings.audio_speed ? 'selected' : ''}>Normal</option>
                            <option value="fast" ${settings.audio_speed === 'fast' ? 'selected' : ''}>Fast</option>
                        </select>
                    </div>
                    
                    <div class="settings__group">
                        <label class="settings__label">Voice Type</label>
                        <select class="settings__select" name="voice">
                            <option value="male" ${settings.voice === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${settings.voice === 'female' ? 'selected' : ''}>Female</option>
                            <option value="neutral" ${settings.voice === 'neutral' || !settings.voice ? 'selected' : ''}>Neutral</option>
                        </select>
                    </div>
                    
                    <div class="settings__group">
                        <label class="settings__label">Audio Output</label>
                        <select class="settings__select" name="audio_output">
                            <option value="speakers" ${settings.audio_output === 'speakers' || !settings.audio_output ? 'selected' : ''}>Speakers</option>
                            <option value="headphones" ${settings.audio_output === 'headphones' ? 'selected' : ''}>Headphones</option>
                        </select>
                    </div>
                    
                    <div class="settings__group">
                        <label class="settings__label">Voice Mode</label>
                        <select class="settings__select" name="voice_mode">
                            <option value="offline" ${settings.voice_mode === 'offline' || !settings.voice_mode ? 'selected' : ''}>Offline (pyttsx3 - Lower Quality)</option>
                            <option value="online" ${settings.voice_mode === 'online' ? 'selected' : ''}>Online (gTTS - Better Quality) ⭐</option>
                        </select>
                        <small class="settings__help" style="display: block; margin-top: var(--spacing-xs); color: var(--color-text-muted); font-size: var(--font-size-small);">
                            Online mode uses Google TTS for much better Polish pronunciation. Requires internet connection.
                        </small>
                    </div>
                </section>
                
                <!-- Input Settings -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Input Settings</h3>
                    
                    <div class="settings__group">
                        <label class="settings__label">Microphone Mode</label>
                        <select class="settings__select" name="mic_mode">
                            <option value="tap" ${settings.mic_mode === 'tap' || !settings.mic_mode ? 'selected' : ''}>Tap to Toggle</option>
                            <option value="hold" ${settings.mic_mode === 'hold' ? 'selected' : ''}>Hold to Record</option>
                        </select>
                    </div>
                    
                    <div class="settings__group">
                        <label class="settings__label">Translation</label>
                        <select class="settings__select" name="translation">
                            <option value="show" ${settings.translation === 'show' ? 'selected' : ''}>Always Show</option>
                            <option value="hide" ${settings.translation === 'hide' ? 'selected' : ''}>Always Hide</option>
                            <option value="smart" ${settings.translation === 'smart' || !settings.translation ? 'selected' : ''}>Smart (Auto-hide after success)</option>
                        </select>
                    </div>
                </section>
                
                <!-- Lesson Library -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Lesson Library</h3>
                    <div class="settings__group">
                        <label class="settings__label" for="lesson-library-search">Find a Lesson</label>
                        <input 
                            type="text" 
                            class="settings__input" 
                            id="lesson-library-search" 
                            placeholder="Search by Polish or English title, part, or module">
                        <small class="settings__help" style="display: block; margin-top: var(--spacing-xs); color: var(--color-text-muted); font-size: var(--font-size-small);">
                            Pick a lesson to load it instantly in the main tutor chat.
                        </small>
                    </div>
                    <div class="settings__group" style="display: flex; gap: var(--spacing-sm); align-items: center;">
                        <button class="settings__button settings__button--secondary" id="lesson-library-reload" type="button">
                            Reload lessons
                        </button>
                        <span id="lesson-library-status" class="settings__help" style="flex: 1; color: var(--color-text-muted); font-size: var(--font-size-small);">
                            Loading lessons...
                        </span>
                    </div>
                    <div class="settings__group">
                        <ul id="lesson-library-list" class="lesson-library__list"></ul>
                    </div>
                </section>
                
                <!-- Tutor Settings -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Tutor Mode</h3>
                    
                    <div class="settings__group">
                        <label class="settings__label">Tutor Style</label>
                        <select class="settings__select" name="tutor_mode">
                            <option value="coach" ${settings.tutor_mode === 'coach' || !settings.tutor_mode ? 'selected' : ''}>Coach (Gentle)</option>
                            <option value="drill" ${settings.tutor_mode === 'drill' ? 'selected' : ''}>Drill (Direct)</option>
                            <option value="teacher" ${settings.tutor_mode === 'teacher' ? 'selected' : ''}>Teacher (Mixed)</option>
                        </select>
                    </div>
                    
                    <div class="settings__group">
                        <label class="settings__label">Confidence Slider</label>
                        <input 
                            type="range" 
                            class="settings__slider" 
                            name="confidence_slider" 
                            min="1" 
                            max="5" 
                            value="${settings.confidence_slider || 3}"
                        >
                        <div class="settings__slider-value">${settings.confidence_slider || 3}</div>
                    </div>
                </section>
                
                <!-- Appearance Settings -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Appearance</h3>
                    
                    <div class="settings__group">
                        <label class="settings__label">Theme</label>
                        <select class="settings__select" name="theme">
                            <option value="light" ${settings.theme === 'light' || !settings.theme ? 'selected' : ''}>Light</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="dyslexia" ${settings.theme === 'dyslexia' ? 'selected' : ''}>Dyslexia-Friendly</option>
                        </select>
                    </div>
                    
                    <div class="settings__group">
                        <label class="settings__label">Language</label>
                        <select class="settings__select" name="language">
                            <option value="en" ${settings.language === 'en' || !settings.language ? 'selected' : ''}>English</option>
                            <option value="pl" ${settings.language === 'pl' ? 'selected' : ''}>Polski</option>
                        </select>
                    </div>
                </section>
                
                <!-- Developer Options -->
                <section class="settings__section">
                    <h3 class="settings__section-title">Developer Options</h3>
                    <div class="settings__group">
                        <label class="settings__radio">
                            <input type="checkbox" id="developer-mode-toggle" ${localStorage.getItem('developerMode') === 'true' ? 'checked' : ''}>
                            <span>Enable Developer Mode</span>
                        </label>
                        <small class="settings__help" style="display: block; margin-top: var(--spacing-xs); color: var(--color-text-muted); font-size: var(--font-size-small);">
                            Shows detailed error information and debug logs. For troubleshooting only.
                        </small>
                    </div>
                </section>
                
                <!-- Actions -->
                <section class="settings__section">
                    <div class="settings__actions">
                        <button class="settings__button settings__button--primary" id="settings-save">Save Settings</button>
                        <button class="settings__button settings__button--secondary" id="settings-export">Export Settings</button>
                        <button class="settings__button settings__button--secondary" id="settings-import">Import Settings</button>
                        <button class="settings__button settings__button--secondary" id="settings-clear-audio-cache">Clear Audio Cache</button>
                        <button class="settings__button settings__button--danger" id="settings-reset">Reset to Defaults</button>
                    </div>
                    <input type="file" id="settings-import-file" accept=".json" style="display: none;">
                </section>
            </div>
        `;
        
        // Attach event listeners
        this.attachEventListeners();
    }
    
    /**
     * Attach event listeners to settings form
     */
    attachEventListeners() {
        // Confidence slider value display
        const slider = document.querySelector('input[name="confidence_slider"]');
        const sliderValue = document.querySelector('.settings__slider-value');
        if (slider && sliderValue) {
            slider.addEventListener('input', (e) => {
                sliderValue.textContent = e.target.value;
            });
        }
        
        // Save button
        const saveButton = document.getElementById('settings-save');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveSettings());
        }
        
        // Export button
        const exportButton = document.getElementById('settings-export');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportSettings());
        }
        
        // Import button
        const importButton = document.getElementById('settings-import');
        const importFile = document.getElementById('settings-import-file');
        if (importButton && importFile) {
            importButton.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => this.importSettings(e));
        }
        
        // Reset button
        const resetButton = document.getElementById('settings-reset');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetSettings());
        }
        
        // Clear audio cache button
        const clearCacheButton = document.getElementById('settings-clear-audio-cache');
        if (clearCacheButton) {
            clearCacheButton.addEventListener('click', () => this.clearAudioCache());
        }
        
        // Profile template change handler
        const profileRadios = document.querySelectorAll('input[name="profile_template"]');
        profileRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.applyProfileTemplate(e.target.value);
                }
            });
        });
        
        // User profile switcher
        const userProfileSelect = document.getElementById('user-profile-select');
        if (userProfileSelect) {
            userProfileSelect.addEventListener('change', (e) => {
                const newUserId = parseInt(e.target.value);
                if (newUserId !== this.userId && window.sessionManager) {
                    window.sessionManager.switchProfile(newUserId);
                    this.userId = newUserId;
                    // Reload settings for new user
                    this.loadSettings();
                }
            });
        }
        
        // Developer mode toggle
        const devModeToggle = document.getElementById('developer-mode-toggle');
        if (devModeToggle) {
            devModeToggle.addEventListener('change', (e) => {
                if (window.errorHandler) {
                    window.errorHandler.toggleDeveloperMode();
                    this.showMessage(
                        e.target.checked ? 'Developer mode enabled' : 'Developer mode disabled',
                        'info'
                    );
                }
            });
        }

        // Lesson library search
        const lessonSearchInput = document.getElementById('lesson-library-search');
        if (lessonSearchInput) {
            lessonSearchInput.addEventListener('input', (e) => {
                this.filterLessonCatalog(e.target.value || '');
            });
        }

        // Lesson library reload
        const lessonReloadButton = document.getElementById('lesson-library-reload');
        if (lessonReloadButton) {
            lessonReloadButton.addEventListener('click', async () => {
                await this.populateLessonCatalog(true);
            });
        }
    }
    
    async populateLessonCatalog(force = false) {
        const statusEl = document.getElementById('lesson-library-status');
        const listEl = document.getElementById('lesson-library-list');

        if (!statusEl || !listEl) {
            return;
        }

        if (!force && this.lessonCatalogLoaded && this.lessonCatalog.length) {
            statusEl.style.display = 'none';
            this.renderLessonCatalog(this.lessonCatalog);
            return;
        }

        statusEl.style.display = 'block';
        statusEl.textContent = 'Loading lessons...';
        listEl.innerHTML = '';

        try {
            const entries = await this.loadLessonCatalog(force);

            if (!entries.length) {
                statusEl.textContent = 'No lessons found yet. Add lesson JSON files to data/lessons/.';
                return;
            }

            statusEl.style.display = 'none';
            this.renderLessonCatalog(entries);
        } catch (error) {
            console.error('Error loading lesson catalog:', error);
            this.lessonCatalogError = error;
            statusEl.textContent = 'Failed to load lessons. Please try again.';
        }
    }

    async loadLessonCatalog(force = false) {
        if (!force && this.lessonCatalogLoaded && !this.lessonCatalogError) {
            return this.lessonCatalog;
        }

        this.lessonCatalogLoading = true;
        this.lessonCatalogError = null;

        try {
            const response = await fetch('/api/lesson/catalog');
            if (!response.ok) {
                throw new Error(`Failed to load catalog: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const entries = result?.data?.entries || [];
            this.lessonCatalog = entries;
            this.lessonCatalogLoaded = true;
            return this.lessonCatalog;
        } catch (error) {
            this.lessonCatalogLoaded = false;
            throw error;
        } finally {
            this.lessonCatalogLoading = false;
        }
    }

    renderLessonCatalog(entries, options = {}) {
        const listEl = document.getElementById('lesson-library-list');
        const statusEl = document.getElementById('lesson-library-status');

        if (!listEl || !statusEl) {
            return;
        }

        listEl.innerHTML = '';
        listEl.style.listStyle = 'none';
        listEl.style.margin = '0';
        listEl.style.padding = '0';

        if (!entries || entries.length === 0) {
            statusEl.textContent = options.filtered
                ? 'No lessons match your search.'
                : 'No lessons available yet.';
            statusEl.style.display = 'block';
            return;
        }

        statusEl.style.display = 'none';

        entries.forEach((entry) => {
            const listItem = document.createElement('li');
            listItem.className = 'lesson-library__item';
            listItem.dataset.lessonId = entry.id;
            listItem.style.display = 'flex';
            listItem.style.justifyContent = 'space-between';
            listItem.style.alignItems = 'center';
            listItem.style.gap = 'var(--spacing-sm)';
            listItem.style.padding = 'var(--spacing-sm) 0';
            listItem.style.borderBottom = '1px solid var(--color-border-muted)';

            const infoContainer = document.createElement('div');
            infoContainer.className = 'lesson-library__info';
            infoContainer.style.display = 'flex';
            infoContainer.style.flexDirection = 'column';
            infoContainer.style.gap = '2px';

            const titleLine = document.createElement('div');
            titleLine.textContent = entry.title_pl || entry.id;
            titleLine.style.fontWeight = '600';
            infoContainer.appendChild(titleLine);

            if (entry.title_en) {
                const subtitle = document.createElement('div');
                subtitle.textContent = entry.title_en;
                subtitle.style.fontSize = '0.875rem';
                subtitle.style.color = 'var(--color-text-muted)';
                infoContainer.appendChild(subtitle);
            }

            const metaParts = [];
            if (entry.part) metaParts.push(entry.part);
            if (entry.module) metaParts.push(entry.module);
            if (entry.status) metaParts.push(`Status: ${entry.status.replace(/_/g, ' ')}`);
            if (metaParts.length) {
                const metaLine = document.createElement('div');
                metaLine.textContent = metaParts.join(' • ');
                metaLine.style.fontSize = '0.75rem';
                metaLine.style.color = 'var(--color-text-muted)';
                infoContainer.appendChild(metaLine);
            }

            const startButton = document.createElement('button');
            startButton.type = 'button';
            startButton.className = 'settings__button settings__button--secondary lesson-library__start';
            startButton.dataset.lessonId = entry.id;
            startButton.textContent = 'Start lesson';
            startButton.style.whiteSpace = 'nowrap';
            startButton.addEventListener('click', () => this.startLessonFromLibrary(entry.id));

            listItem.appendChild(infoContainer);
            listItem.appendChild(startButton);
            listEl.appendChild(listItem);
        });
    }

    filterLessonCatalog(query) {
        const normalized = (query || '').trim().toLowerCase();

        if (!this.lessonCatalogLoaded || !this.lessonCatalog.length) {
            return;
        }

        if (!normalized) {
            this.renderLessonCatalog(this.lessonCatalog);
            return;
        }

        const filtered = this.lessonCatalog.filter((entry) => {
            return [entry.id, entry.title_pl, entry.title_en, entry.part, entry.module, entry.status]
                .some((value) => value && value.toLowerCase().includes(normalized));
        });

        this.renderLessonCatalog(filtered, { filtered: true });
    }

    async startLessonFromLibrary(lessonId) {
        if (!lessonId) {
            return;
        }

        if (!window.chatUI || typeof window.chatUI.changeLesson !== 'function') {
            this.showMessage('Tutor is not ready yet. Please wait a moment and try again.', 'error');
            return;
        }

        try {
            const lessonData = await window.chatUI.changeLesson(lessonId);

            const catalogEntry = this.lessonCatalog.find((entry) => entry.id === lessonId);
            const lessonTitle = catalogEntry?.title_pl || catalogEntry?.title_en || lessonId;

            this.showMessage(`Lesson "${lessonTitle}" is ready!`, 'success');
            this.close();

            return lessonData;
        } catch (error) {
            console.error('Failed to start lesson from library:', error);
            this.showMessage('Failed to start lesson. Please try again.', 'error');
        }
    }
    
    /**
     * Get current form values
     */
    getFormValues() {
        const form = document.querySelector('.settings');
        if (!form) return null;
        
        const values = {
            user_id: this.userId,
            audio_speed: form.querySelector('select[name="audio_speed"]')?.value,
            translation: form.querySelector('select[name="translation"]')?.value,
            mic_mode: form.querySelector('select[name="mic_mode"]')?.value,
            tutor_mode: form.querySelector('select[name="tutor_mode"]')?.value,
            voice: form.querySelector('select[name="voice"]')?.value,
            audio_output: form.querySelector('select[name="audio_output"]')?.value,
            theme: form.querySelector('select[name="theme"]')?.value,
            language: form.querySelector('select[name="language"]')?.value,
            voice_mode: form.querySelector('select[name="voice_mode"]')?.value,
            confidence_slider: parseInt(form.querySelector('input[name="confidence_slider"]')?.value || '3'),
            profile_template: form.querySelector('input[name="profile_template"]:checked')?.value || null,
        };
        
        return values;
    }
    
    /**
     * Save settings to API
     */
    async saveSettings() {
        const values = this.getFormValues();
        if (!values) return;
        
        try {
            const response = await fetch('/api/settings/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save settings: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                this.currentSettings = result.data;
                this.applySettings(this.currentSettings);
                this.showMessage('Settings saved successfully!', 'success');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showMessage('Failed to save settings. Please try again.', 'error');
        }
    }
    
    /**
     * Apply settings to the application
     */
    applySettings(settings) {
        // Apply theme
        if (settings.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme);
            localStorage.setItem('theme', settings.theme);
            
            // Update theme toggle icon if it exists
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-feather', settings.theme === 'dark' ? 'sun' : 'moon');
                    feather.replace();
                }
            }
        }
        
        // Apply audio speed (convert to numeric value for audio manager)
        if (settings.audio_speed && window.audioManager) {
            const speedMap = { slow: 0.75, normal: 1.0, fast: 1.25 };
            const speed = speedMap[settings.audio_speed] || 1.0;
            window.audioManager.setSpeed(speed);
            localStorage.setItem('audioSpeed', speed.toString());
        }
        
        // Apply mic mode
        if (settings.mic_mode && window.voiceInputManager) {
            window.voiceInputManager.setMicMode(settings.mic_mode);
            localStorage.setItem('micMode', settings.mic_mode);
        }
        
        // Store settings in localStorage for quick access
        localStorage.setItem('userSettings', JSON.stringify(settings));
        
        // Broadcast settings change event
        const event = new CustomEvent('settingsChanged', { detail: settings });
        document.dispatchEvent(event);
    }
    
    /**
     * Apply profile template
     */
    applyProfileTemplate(template) {
        const templates = {
            kid: {
                audio_speed: 'slow',
                tutor_mode: 'coach',
                translation: 'show',
                mic_mode: 'tap',
            },
            adult: {
                audio_speed: 'normal',
                tutor_mode: 'coach',
                translation: 'smart',
                mic_mode: 'tap',
            },
            teacher: {
                audio_speed: 'normal',
                tutor_mode: 'teacher',
                translation: 'hide',
                mic_mode: 'hold',
            },
        };
        
        const templateSettings = templates[template];
        if (!templateSettings) return;
        
        // Update form values
        Object.keys(templateSettings).forEach(key => {
            const select = document.querySelector(`select[name="${key}"]`);
            if (select) {
                select.value = templateSettings[key];
            }
        });
    }
    
    /**
     * Export settings to JSON file
     */
    exportSettings() {
        const settings = this.currentSettings || this.getDefaultSettings();
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `polish-tutor-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showMessage('Settings exported successfully!', 'success');
    }
    
    /**
     * Import settings from JSON file
     */
    async importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const settings = JSON.parse(text);
            
            // Validate settings structure
            if (!settings || typeof settings !== 'object') {
                throw new Error('Invalid settings file');
            }
            
            // Update form with imported settings
            Object.keys(settings).forEach(key => {
                if (key === 'user_id') return;
                
                const select = document.querySelector(`select[name="${key}"]`);
                const radio = document.querySelector(`input[name="${key}"][value="${settings[key]}"]`);
                const slider = document.querySelector(`input[name="${key}"]`);
                
                if (select && settings[key]) {
                    select.value = settings[key];
                } else if (radio) {
                    radio.checked = true;
                } else if (slider && typeof settings[key] === 'number') {
                    slider.value = settings[key];
                    const sliderValue = document.querySelector('.settings__slider-value');
                    if (sliderValue) {
                        sliderValue.textContent = settings[key];
                    }
                }
            });
            
            // Save imported settings
            await this.saveSettings();
            this.showMessage('Settings imported successfully!', 'success');
        } catch (error) {
            console.error('Error importing settings:', error);
            this.showMessage('Failed to import settings. Invalid file format.', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }
        
        const defaults = this.getDefaultSettings();
        this.currentSettings = defaults;
        this.render();
        await this.saveSettings();
        this.showMessage('Settings reset to defaults!', 'success');
    }
    
    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            user_id: this.userId,
            voice_mode: 'offline',
            audio_speed: 'normal',
            translation: 'smart',
            mic_mode: 'tap',
            tutor_mode: 'coach',
            voice: 'neutral',
            audio_output: 'speakers',
            theme: 'light',
            language: 'en',
            confidence_slider: 3,
            profile_template: null,
        };
    }
    
    /**
     * Clear audio cache (forces regeneration with new settings)
     */
    async clearAudioCache() {
        if (!confirm('Clear all cached audio files? This will force regeneration of audio with your current settings (e.g., online/offline mode).')) {
            return;
        }
        
        try {
            const response = await fetch('/api/audio/clear-cache', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`Failed to clear cache: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                const count = result.data?.files_cleared || 0;
                this.showMessage(`Cleared ${count} cached audio files. New audio will be generated with your current settings.`, 'success');
            } else {
                throw new Error(result.message || 'Failed to clear cache');
            }
        } catch (error) {
            console.error('Error clearing audio cache:', error);
            this.showMessage('Failed to clear audio cache. Please try again.', 'error');
        }
    }
    
    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
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

// Initialize settings manager when DOM is ready
let settingsManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        settingsManager = new SettingsManager(1); // Default user ID
        window.settingsManager = settingsManager;
    });
} else {
    settingsManager = new SettingsManager(1);
    window.settingsManager = settingsManager;
}

