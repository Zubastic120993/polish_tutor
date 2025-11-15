/**
 * Review System Manager
 * Handles SRS review queue, daily scheduler, browser notifications, and review interface
 */

class ReviewManager {
    constructor(userId = 1) {
        this.userId = userId;
        this.dueItems = [];
        this.currentReviewIndex = 0;
        this.reviewSessionStartTime = null;
        this.maxReviewTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.notificationPermission = null;
        
        this.init();
    }
    
    init() {
        // Request notification permission
        this.requestNotificationPermission();
        
        // Check for due reviews on load
        this.checkDueReviews();
        
        // Set up daily scheduler check (every hour)
        this.setupDailyScheduler();
        
        // Check for reviews every 30 minutes
        setInterval(() => {
            this.checkDueReviews();
        }, 30 * 60 * 1000);
        
        // Set up review button and modal
        this.setupUI();
    }
    
    /**
     * Setup UI event listeners
     */
    setupUI() {
        // Review button
        const reviewButton = document.getElementById('review-button');
        if (reviewButton) {
            reviewButton.addEventListener('click', () => this.openReviewModal());
        }
        
        // Review modal close
        const closeButton = document.getElementById('review-modal-close');
        const overlay = document.getElementById('review-modal-overlay');
        
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeReviewModal());
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => this.closeReviewModal());
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('review-modal');
            if (e.key === 'Escape' && modal && !modal.hasAttribute('aria-hidden')) {
                this.closeReviewModal();
            }
        });
    }
    
    /**
     * Request browser notification permission
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return;
        }
        
        if (Notification.permission === 'granted') {
            this.notificationPermission = 'granted';
        } else if (Notification.permission !== 'denied') {
            // Don't request immediately - wait for user interaction
            // Permission will be requested when showing review button
        }
    }
    
    /**
     * Request notification permission (call on user interaction)
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            return false;
        }
        
        if (Notification.permission === 'granted') {
            this.notificationPermission = 'granted';
            return true;
        }
        
        if (Notification.permission === 'denied') {
            return false;
        }
        
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        return permission === 'granted';
    }
    
    /**
     * Check for due reviews
     */
    async checkDueReviews() {
        try {
            const fetchFn = window.errorHandler?.fetchWithOfflineQueue
                ? window.errorHandler.fetchWithOfflineQueue.bind(window.errorHandler)
                : fetch;
            const response = await fetchFn(`/api/review/due?user_id=${this.userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch reviews: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                this.dueItems = result.data || [];
                
                // Update review button badge
                this.updateReviewButton();
                
                // Show notification if items are due
                if (this.dueItems.length > 0) {
                    this.showReviewNotification();
                }
                
                return this.dueItems;
            }
        } catch (error) {
            console.error('Error checking due reviews:', error);
            return [];
        }
    }
    
    /**
     * Update review button with badge
     */
    updateReviewButton() {
        const reviewButton = document.getElementById('review-button');
        if (!reviewButton) return;
        
        const badge = reviewButton.querySelector('.review-badge');
        if (this.dueItems.length > 0) {
            if (!badge) {
                const newBadge = document.createElement('span');
                newBadge.className = 'review-badge';
                newBadge.textContent = this.dueItems.length;
                reviewButton.appendChild(newBadge);
            } else {
                badge.textContent = this.dueItems.length;
            }
            reviewButton.classList.add('has-reviews');
        } else {
            if (badge) {
                badge.remove();
            }
            reviewButton.classList.remove('has-reviews');
        }
    }
    
    /**
     * Show browser notification for due reviews
     */
    async showReviewNotification() {
        if (!('Notification' in window)) {
            return;
        }
        
        // Request permission if not granted
        if (Notification.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                return;
            }
        }
        
        if (Notification.permission === 'granted' && this.dueItems.length > 0) {
            const count = this.dueItems.length;
            new Notification('Polish Tutor Review', {
                body: `You have ${count} phrase${count > 1 ? 's' : ''} ready for review!`,
                icon: '/static/favicon.ico', // Add favicon if available
                tag: 'review-notification',
                requireInteraction: false,
            });
        }
    }
    
    /**
     * Setup daily scheduler check
     */
    setupDailyScheduler() {
        // Check at 9 AM daily (or next 9 AM)
        const now = new Date();
        const nextCheck = new Date();
        nextCheck.setHours(9, 0, 0, 0);
        
        // If it's past 9 AM today, schedule for tomorrow
        if (now.getTime() > nextCheck.getTime()) {
            nextCheck.setDate(nextCheck.getDate() + 1);
        }
        
        const msUntilCheck = nextCheck.getTime() - now.getTime();
        
        setTimeout(() => {
            this.checkDueReviews();
            // Then check every 24 hours
            setInterval(() => {
                this.checkDueReviews();
            }, 24 * 60 * 60 * 1000);
        }, msUntilCheck);
    }
    
    /**
     * Open review modal
     */
    async openReviewModal() {
        // Check for due items
        await this.checkDueReviews();
        
        if (this.dueItems.length === 0) {
            this.showMessage('No items due for review! Great job!', 'info');
            return;
        }
        
        // Reset review session
        this.currentReviewIndex = 0;
        this.reviewSessionStartTime = Date.now();
        
        // Show review modal
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.removeAttribute('aria-hidden');
            modal.classList.add('modal--active');
            this.renderReviewInterface();
            feather.replace();
        }
    }
    
    /**
     * Close review modal
     */
    closeReviewModal() {
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('modal--active');
        }
    }
    
    /**
     * Render review interface
     */
    renderReviewInterface() {
        const content = document.getElementById('review-content');
        if (!content) return;
        
        if (this.currentReviewIndex >= this.dueItems.length) {
            this.showReviewComplete();
            return;
        }
        
        const item = this.dueItems[this.currentReviewIndex];
        const progress = ((this.currentReviewIndex + 1) / this.dueItems.length) * 100;
        
        // Check if review session exceeded time limit
        const elapsedTime = Date.now() - this.reviewSessionStartTime;
        if (elapsedTime > this.maxReviewTime) {
            this.showMessage('Review session time limit reached (5 minutes). Great progress!', 'info');
            this.closeReviewModal();
            return;
        }
        
        content.innerHTML = `
            <div class="review">
                <!-- Progress Bar -->
                <div class="review__progress">
                    <div class="review__progress-bar" style="width: ${progress}%"></div>
                    <div class="review__progress-text">
                        ${this.currentReviewIndex + 1} / ${this.dueItems.length}
                    </div>
                </div>
                
                <!-- Review Item -->
                <div class="review__item">
                    <div class="review__phrase">
                        <p class="review__phrase-text">${this.escapeHtml(item.phrase_text || item.phrase_id)}</p>
                        ${item.translation ? `<p class="review__phrase-translation">${this.escapeHtml(item.translation)}</p>` : ''}
                    </div>
                    
                    ${item.audio ? `
                        <div class="review__audio">
                            <button class="review__audio-button" id="review-audio-play">
                                <i data-feather="play" class="review__audio-icon"></i>
                            </button>
                            <span class="review__audio-label">Listen</span>
                        </div>
                    ` : ''}
                    
                    <!-- Quality Buttons -->
                    <div class="review__quality">
                        <p class="review__quality-label">How well did you remember this?</p>
                        <div class="review__quality-buttons">
                            <button class="review__quality-btn review__quality-btn--fail" data-quality="0">
                                <span class="review__quality-icon" aria-hidden="true"><i data-feather="x-circle"></i></span>
                                <span class="review__quality-text">Forgot</span>
                            </button>
                            <button class="review__quality-btn review__quality-btn--hard" data-quality="1">
                                <span class="review__quality-icon" aria-hidden="true"><i data-feather="trending-down"></i></span>
                                <span class="review__quality-text">Hard</span>
                            </button>
                            <button class="review__quality-btn review__quality-btn--medium" data-quality="2">
                                <span class="review__quality-icon" aria-hidden="true"><i data-feather="minus-circle"></i></span>
                                <span class="review__quality-text">Medium</span>
                            </button>
                            <button class="review__quality-btn review__quality-btn--good" data-quality="3">
                                <span class="review__quality-icon" aria-hidden="true"><i data-feather="thumbs-up"></i></span>
                                <span class="review__quality-text">Good</span>
                            </button>
                            <button class="review__quality-btn review__quality-btn--easy" data-quality="4">
                                <span class="review__quality-icon" aria-hidden="true"><i data-feather="check-circle"></i></span>
                                <span class="review__quality-text">Easy</span>
                            </button>
                            <button class="review__quality-btn review__quality-btn--perfect" data-quality="5">
                                <span class="review__quality-icon" aria-hidden="true"><i data-feather="star"></i></span>
                                <span class="review__quality-text">Perfect</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Confidence Slider -->
                    <div class="review__confidence">
                        <label class="review__confidence-label">
                            Confidence Level: <span id="review-confidence-value">3</span>
                        </label>
                        <input 
                            type="range" 
                            class="review__confidence-slider" 
                            id="review-confidence-slider"
                            min="1" 
                            max="5" 
                            value="3"
                        >
                        <div class="review__confidence-hint">
                            Lower = review sooner, Higher = review later
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="review__actions">
                        <button class="review__button review__button--secondary" id="review-skip">Skip</button>
                        <button class="review__button review__button--primary" id="review-submit" disabled>Submit</button>
                    </div>
                </div>
            </div>
        `;
        
        // Attach event listeners
        this.attachReviewListeners(item);
        feather.replace();
    }
    
    /**
     * Attach event listeners for review interface
     */
    attachReviewListeners(item) {
        // Quality buttons
        const qualityButtons = document.querySelectorAll('.review__quality-btn');
        const submitButton = document.getElementById('review-submit');
        
        qualityButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                qualityButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                // Enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
        });
        
        // Confidence slider
        const slider = document.getElementById('review-confidence-slider');
        const sliderValue = document.getElementById('review-confidence-value');
        if (slider && sliderValue) {
            slider.addEventListener('input', (e) => {
                sliderValue.textContent = e.target.value;
            });
        }
        
        // Audio playback
        const audioButton = document.getElementById('review-audio-play');
        if (audioButton && item.audio && item.lesson_id) {
            audioButton.addEventListener('click', () => {
                const audioUrl = `/static/audio/native/${item.lesson_id}/${item.audio}`;
                if (window.audioManager) {
                    window.audioManager.play(audioUrl, audioButton, audioButton.closest('.review__item'));
                } else {
                    // Fallback: create audio element
                    const audio = new Audio(audioUrl);
                    audio.play().catch(err => console.error('Audio play error:', err));
                }
            });
        }
        
        // Submit button
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const qualityBtn = document.querySelector('.review__quality-btn.active');
                if (!qualityBtn) {
                    this.showMessage('Please select how well you remembered this phrase.', 'error');
                    return;
                }
                
                const quality = parseInt(qualityBtn.dataset.quality);
                const confidence = parseInt(slider?.value || 3);
                
                this.submitReview(item, quality, confidence);
            });
        }
        
        // Skip button
        const skipButton = document.getElementById('review-skip');
        if (skipButton) {
            skipButton.addEventListener('click', () => {
                this.currentReviewIndex++;
                this.renderReviewInterface();
            });
        }
    }
    
    /**
     * Submit review
     */
    async submitReview(item, quality, confidence) {
        try {
            const response = await fetch('/api/review/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    phrase_id: item.phrase_id,
                    quality: quality,
                    confidence: confidence,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Failed to submit review: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                // Mark as forgotten if quality is 0
                if (quality === 0) {
                    this.markAsForgotten(item);
                }
                
                // Move to next item
                this.currentReviewIndex++;
                
                // Show feedback
                const nextReviewDate = new Date(result.data.next_review);
                const daysUntil = Math.ceil((nextReviewDate - new Date()) / (1000 * 60 * 60 * 24));
                this.showMessage(
                    `Review saved! Next review in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
                    'success'
                );
                
                // Render next item or complete
                setTimeout(() => {
                    this.renderReviewInterface();
                }, 1000);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            this.showMessage('Failed to submit review. Please try again.', 'error');
        }
    }
    
    /**
     * Mark item as forgotten (for reinjection into next lesson)
     */
    markAsForgotten(item) {
        // Store forgotten items in localStorage for reinjection
        const forgotten = JSON.parse(localStorage.getItem('forgottenItems') || '[]');
        if (!forgotten.find(i => i.phrase_id === item.phrase_id)) {
            forgotten.push({
                phrase_id: item.phrase_id,
                lesson_id: item.lesson_id,
                marked_at: new Date().toISOString(),
            });
            localStorage.setItem('forgottenItems', JSON.stringify(forgotten));
        }
    }
    
    /**
     * Show review complete screen
     */
    showReviewComplete() {
        const content = document.getElementById('review-content');
        if (!content) return;
        
        const completed = this.currentReviewIndex;
        const elapsedMinutes = Math.floor((Date.now() - this.reviewSessionStartTime) / 60000);
        
        content.innerHTML = `
            <div class="review review--complete">
                <div class="review__complete">
                    <div class="review__complete-icon" aria-hidden="true">
                        <i data-feather="award"></i>
                    </div>
                    <h2 class="review__complete-title">Review Complete!</h2>
                    <p class="review__complete-message">
                        You reviewed ${completed} phrase${completed !== 1 ? 's' : ''} in ${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''}.
                    </p>
                    <button class="review__button review__button--primary" id="review-close">Close</button>
                </div>
            </div>
        `;

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Close button
        const closeButton = document.getElementById('review-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeReviewModal();
                // Refresh review queue
                this.checkDueReviews();
            });
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Use settings manager's showMessage if available
        if (window.settingsManager && window.settingsManager.showMessage) {
            window.settingsManager.showMessage(message, type);
        } else {
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
}

// Initialize review manager when DOM is ready
let reviewManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        reviewManager = new ReviewManager(1); // Default user ID
        window.reviewManager = reviewManager;
    });
} else {
    reviewManager = new ReviewManager(1);
    window.reviewManager = reviewManager;
}
