/**
 * Lesson Flow Manager
 * Handles lesson loading, dialogue flow, branching, and completion tracking
 */

class LessonFlowManager {
    constructor() {
        this.currentLesson = null;
        this.currentDialogue = null;
        this.lessonProgress = [];
        this.isLessonActive = false;
        this.dialogueHistory = [];
    }
    
    /**
     * Load a lesson from the API
     * @param {string} lessonId - Lesson ID to load
     * @returns {Promise<Object>} Lesson data
     */
    async loadLesson(lessonId) {
        try {
            const response = await fetch(`/api/lesson/get?lesson_id=${encodeURIComponent(lessonId)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load lesson: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status !== 'success') {
                throw new Error(result.message || 'Failed to load lesson');
            }
            
            this.currentLesson = result.data;
            this.isLessonActive = true;
            this.lessonProgress = [];
            this.dialogueHistory = [];
            
            return this.currentLesson;
        } catch (error) {
            console.error('Error loading lesson:', error);
            throw error;
        }
    }
    
    /**
     * Start a lesson - show intro and first dialogue
     * @param {string} lessonId - Lesson ID to start
     * @returns {Promise<Object>} First dialogue data
     */
    async startLesson(lessonId) {
        await this.loadLesson(lessonId);
        
        // Get first dialogue
        const firstDialogue = this.getFirstDialogue();
        if (!firstDialogue) {
            throw new Error('Lesson has no dialogues');
        }
        
        this.currentDialogue = firstDialogue;
        this.dialogueHistory.push(firstDialogue.id);
        
        return {
            lesson: this.currentLesson,
            dialogue: firstDialogue,
            intro: this.getLessonIntro()
        };
    }
    
    /**
     * Get lesson intro message
     * @returns {string} Intro message
     */
    getLessonIntro() {
        if (!this.currentLesson) {
            return null;
        }
        
        const title = this.currentLesson.title || 'Lesson';
        const level = this.currentLesson.level || '';
        const cefrGoal = this.currentLesson.cefr_goal || '';
        
        let intro = `Welcome to "${title}"`;
        if (level) {
            intro += ` (Level: ${level})`;
        }
        if (cefrGoal) {
            intro += `\n\nGoal: ${cefrGoal}`;
        }
        intro += '\n\nLet\'s begin!';
        
        return intro;
    }
    
    /**
     * Get first dialogue in lesson
     * @returns {Object|null} First dialogue or null
     */
    getFirstDialogue() {
        if (!this.currentLesson || !this.currentLesson.dialogues || this.currentLesson.dialogues.length === 0) {
            return null;
        }
        
        return this.currentLesson.dialogues[0];
    }
    
    /**
     * Get dialogue by ID
     * @param {string} dialogueId - Dialogue ID
     * @returns {Object|null} Dialogue or null
     */
    getDialogue(dialogueId) {
        if (!this.currentLesson || !this.currentLesson.dialogues) {
            return null;
        }
        
        return this.currentLesson.dialogues.find(d => d.id === dialogueId) || null;
    }
    
    /**
     * Advance to next dialogue
     * @param {string} nextDialogueId - Next dialogue ID from tutor response
     * @returns {Object|null} Next dialogue or null
     */
    advanceToDialogue(nextDialogueId) {
        if (!nextDialogueId) {
            return null;
        }
        
        const nextDialogue = this.getDialogue(nextDialogueId);
        
        if (nextDialogue) {
            this.currentDialogue = nextDialogue;
            this.dialogueHistory.push(nextDialogueId);
            return nextDialogue;
        }
        
        // If dialogue not found, might be end of lesson or branching to another lesson
        console.warn(`Dialogue ${nextDialogueId} not found in current lesson`);
        return null;
    }
    
    /**
     * Check if lesson is complete
     * @returns {boolean} True if lesson is complete
     */
    isLessonComplete() {
        if (!this.currentLesson || !this.currentDialogue) {
            return false;
        }
        
        // Check if current dialogue has no next options or next points to itself (end)
        const options = this.currentDialogue.options || [];
        if (options.length === 0) {
            return true;
        }
        
        // Check if all options point to the same dialogue (end loop)
        const nextIds = options.map(opt => opt.next).filter(Boolean);
        if (nextIds.length > 0 && nextIds.every(id => id === this.currentDialogue.id)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get lesson summary
     * @returns {Object} Summary data
     */
    getLessonSummary() {
        if (!this.currentLesson) {
            return null;
        }
        
        const totalDialogues = this.currentLesson.dialogues?.length || 0;
        const completedDialogues = this.dialogueHistory.length;
        const uniqueDialogues = new Set(this.dialogueHistory).size;
        
        // Calculate average score if available
        const scores = this.lessonProgress
            .filter(p => p.score !== undefined)
            .map(p => p.score);
        const avgScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;
        
        return {
            lessonId: this.currentLesson.id,
            title: this.currentLesson.title,
            totalDialogues,
            completedDialogues,
            uniqueDialogues,
            avgScore,
            dialogueHistory: [...this.dialogueHistory]
        };
    }
    
    /**
     * Record progress for a dialogue attempt
     * @param {string} dialogueId - Dialogue ID
     * @param {string} userText - User input
     * @param {number} score - Feedback score
     * @param {string} feedbackType - Feedback type (high/medium/low)
     */
    recordProgress(dialogueId, userText, score, feedbackType) {
        this.lessonProgress.push({
            dialogueId,
            userText,
            score,
            feedbackType,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Reset lesson state
     */
    reset() {
        this.currentLesson = null;
        this.currentDialogue = null;
        this.lessonProgress = [];
        this.isLessonActive = false;
        this.dialogueHistory = [];
    }
    
    /**
     * Get current lesson data
     * @returns {Object|null} Current lesson
     */
    getCurrentLesson() {
        return this.currentLesson;
    }
    
    /**
     * Get current dialogue data
     * @returns {Object|null} Current dialogue
     */
    getCurrentDialogue() {
        return this.currentDialogue;
    }
    
    /**
     * Check if a lesson is currently active
     * @returns {boolean} True if lesson is active
     */
    isActive() {
        return this.isLessonActive && this.currentLesson !== null;
    }
}

// Global lesson flow manager instance
window.lessonFlowManager = new LessonFlowManager();

