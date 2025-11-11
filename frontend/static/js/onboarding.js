/**
 * Onboarding Manager
 * Handles the guided first-run experience for new users
 */

class OnboardingManager {
    constructor() {
        this.overlay = document.getElementById('onboarding-overlay');
        this.flowDemo = document.getElementById('onboarding-flow-demo');
        this.flowArrow = document.getElementById('onboarding-flow-arrow');
        this.steps = document.querySelectorAll('.onboarding-step');
        this.nextButton = document.getElementById('onboarding-next');
        this.skipButton = document.getElementById('onboarding-skip');
        this.progressBar = document.querySelector('.onboarding-progress__fill');
        this.progressDots = document.querySelectorAll('.onboarding-progress__dot');
        this.highlights = document.querySelectorAll('.onboarding-step__highlight');

        this.currentStep = 0;
        this.totalSteps = 3;
        this.isActive = false;

        this.init();
    }

    init() {
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
        const hasSkippedOnboarding = localStorage.getItem('onboarding_skipped');

        if (hasCompletedOnboarding || hasSkippedOnboarding) {
            return; // Don't show onboarding
        }

        // Show onboarding after a short delay to let the page load
        setTimeout(() => {
            this.show();
        }, 1500);

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.nextStep());
        }

        if (this.skipButton) {
            this.skipButton.addEventListener('click', () => this.skip());
        }

        // Close onboarding when user interacts with elements
        document.addEventListener('lessonSelected', () => {
            if (this.currentStep === 0) {
                this.nextStep();
            }
        });

        document.addEventListener('lessonStarted', () => {
            if (this.currentStep === 1) {
                this.nextStep();
            }
        });

        // Listen for first message sent
        document.addEventListener('firstMessageSent', () => {
            if (this.currentStep === 2) {
                this.complete();
            }
        });
    }

    show() {
        if (this.overlay) {
            this.overlay.setAttribute('aria-hidden', 'false');
            this.isActive = true;
            this.updateUI();
        }
    }

    hide() {
        if (this.overlay) {
            this.overlay.setAttribute('aria-hidden', 'true');
            this.isActive = false;
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps - 1) {
            this.showFlowAnimation();
            setTimeout(() => {
                this.currentStep++;
                this.updateUI();
                this.hideFlowAnimation();
            }, 1500);
        } else {
            this.complete();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateUI();
        }
    }

    updateUI() {
        // Update step classes
        this.steps.forEach((step, index) => {
            if (index === this.currentStep) {
                step.classList.add('onboarding-step--active');
            } else {
                step.classList.remove('onboarding-step--active');
            }
        });

        // Update progress bar
        const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }

        // Update progress dots
        this.progressDots.forEach((dot, index) => {
            if (index === this.currentStep) {
                dot.classList.add('onboarding-progress__dot--active');
            } else {
                dot.classList.remove('onboarding-progress__dot--active');
            }
        });

        // Update button text
        if (this.nextButton) {
            if (this.currentStep === this.totalSteps - 1) {
                this.nextButton.textContent = 'Get Started!';
            } else {
                this.nextButton.textContent = 'Next';
            }
        }

        // Show highlights for current step
        this.updateHighlights();
    }

    updateHighlights() {
        // Clear all highlights first
        this.highlights.forEach(highlight => {
            highlight.classList.remove('onboarding-step__highlight--active');
        });

        if (!this.isActive) return;

        const activeStep = this.steps[this.currentStep];
        if (!activeStep) return;

        const highlightTarget = activeStep.querySelector('.onboarding-step__highlight');
        if (!highlightTarget) return;

        const target = highlightTarget.dataset.target;
        if (!target) return;

        // Position highlight based on target
        const targetElement = document.querySelector(`[data-onboarding-target="${target}"]`) ||
                             document.getElementById(target) ||
                             this.getTargetElement(target);

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            highlightTarget.style.left = `${rect.left - 6}px`;
            highlightTarget.style.top = `${rect.top - 6}px`;
            highlightTarget.style.width = `${rect.width + 12}px`;
            highlightTarget.style.height = `${rect.height + 12}px`;
            highlightTarget.classList.add('onboarding-step__highlight--active');
        }
    }

    showFlowAnimation() {
        if (!this.flowDemo || !this.flowArrow) return;

        this.flowDemo.classList.add('onboarding-flow-demo--active');

        // Position arrow based on current step transition
        const transitions = [
            { from: 'lesson-select', to: 'start-button' },
            { from: 'start-button', to: 'input-area' },
            { from: 'input-area', to: null }
        ];

        const transition = transitions[this.currentStep];
        if (transition && transition.from && transition.to) {
            const fromElement = document.querySelector(`[data-onboarding-target="${transition.from}"]`) ||
                               this.getTargetElement(transition.from);
            const toElement = document.querySelector(`[data-onboarding-target="${transition.to}"]`) ||
                             this.getTargetElement(transition.to);

            if (fromElement && toElement) {
                const fromRect = fromElement.getBoundingClientRect();
                const toRect = toElement.getBoundingClientRect();

                const fromCenterX = fromRect.left + fromRect.width / 2;
                const fromCenterY = fromRect.top + fromRect.height / 2;
                const toCenterX = toRect.left + toRect.width / 2;
                const toCenterY = toRect.top + toRect.height / 2;

                const arrowX = (fromCenterX + toCenterX) / 2;
                const arrowY = (fromCenterY + toCenterY) / 2;

                this.flowArrow.style.left = `${arrowX - 20}px`;
                this.flowArrow.style.top = `${arrowY - 20}px`;
            }
        }
    }

    hideFlowAnimation() {
        if (this.flowDemo) {
            this.flowDemo.classList.remove('onboarding-flow-demo--active');
        }
    }

    getTargetElement(target) {
        switch (target) {
            case 'lesson-select':
                return document.getElementById('lesson-catalog-select');
            case 'start-button':
                return document.getElementById('start-lesson-button');
            case 'input-area':
                return document.querySelector('.input-bar');
            default:
                return null;
        }
    }

    skip() {
        localStorage.setItem('onboarding_skipped', 'true');
        this.hide();
    }

    complete() {
        localStorage.setItem('onboarding_completed', 'true');
        this.hide();

        // Show a congratulatory message
        setTimeout(() => {
            if (window.settingsManager) {
                window.settingsManager.showMessage(
                    'Great! You\'re all set to start learning Polish.',
                    'success'
                );
            }
        }, 500);
    }

    // Method to manually trigger onboarding (for testing)
    reset() {
        localStorage.removeItem('onboarding_completed');
        localStorage.removeItem('onboarding_skipped');
        this.currentStep = 0;
        this.show();
    }
}

// Initialize onboarding when DOM is ready
let onboardingManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        onboardingManager = new OnboardingManager();
        window.onboardingManager = onboardingManager;
    });
} else {
    onboardingManager = new OnboardingManager();
    window.onboardingManager = onboardingManager;
}
