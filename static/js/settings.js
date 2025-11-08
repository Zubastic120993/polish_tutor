/**
 * Settings Manager
 * Handles all settings UI and persistence
 */
class SettingsManager {
    constructor(userId = 1) {
        this.userId = userId;
        this.currentSettings = null;
        this.modal = null;
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

