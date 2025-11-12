/**
 * Lesson Card Component
 * Displays lesson information in the catalog
 */

export class LessonCardComponent {
    constructor(lessonData, onSelect) {
        this.lessonData = lessonData;
        this.onSelect = onSelect;
        this.element = null;
    }

    /**
     * Render the lesson card component
     * @returns {HTMLElement} The rendered card element
     */
    render() {
        const card = document.createElement('div');
        card.className = 'lesson-card bg-white border border-cafe-latte rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer';

        // Lesson header
        const header = document.createElement('div');
        header.className = 'lesson-header mb-3';

        const title = document.createElement('h3');
        title.className = 'font-semibold text-cafe-espresso text-lg mb-1';
        title.textContent = this.lessonData.title;

        const level = document.createElement('span');
        level.className = 'inline-block px-2 py-1 bg-cafe-latte text-cafe-espresso text-xs rounded-full';
        level.textContent = this.lessonData.level || 'A0';

        header.appendChild(title);
        header.appendChild(level);

        // Lesson metadata
        const meta = document.createElement('div');
        meta.className = 'lesson-meta text-sm text-cafe-mocha space-y-1';

        if (this.lessonData.cefr_goal) {
            const goal = document.createElement('p');
            goal.textContent = `Goal: ${this.lessonData.cefr_goal}`;
            meta.appendChild(goal);
        }

        if (this.lessonData.tags && this.lessonData.tags.length > 0) {
            const tags = document.createElement('div');
            tags.className = 'flex flex-wrap gap-1 mt-2';

            this.lessonData.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'px-2 py-1 bg-cafe-foam text-cafe-espresso text-xs rounded';
                tagElement.textContent = tag;
                tags.appendChild(tagElement);
            });

            meta.appendChild(tags);
        }

        // Lesson actions
        const actions = document.createElement('div');
        actions.className = 'lesson-actions mt-3 flex justify-between items-center';

        const startButton = document.createElement('button');
        startButton.className = 'px-4 py-2 bg-cafe-espresso text-white text-sm rounded-lg hover:bg-cafe-mocha transition-colors';
        startButton.textContent = 'Start Lesson';
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onSelect(this.lessonData);
        });

        const previewButton = document.createElement('button');
        previewButton.className = 'px-3 py-2 border border-cafe-mocha text-cafe-mocha text-sm rounded-lg hover:bg-cafe-mocha hover:text-white transition-colors';
        previewButton.textContent = 'Preview';
        previewButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPreview();
        });

        actions.appendChild(previewButton);
        actions.appendChild(startButton);

        // Assemble card
        card.appendChild(header);
        card.appendChild(meta);
        card.appendChild(actions);

        // Add click handler for the whole card
        card.addEventListener('click', () => {
            this.onSelect(this.lessonData);
        });

        this.element = card;
        return card;
    }

    /**
     * Show lesson preview
     */
    showPreview() {
        // Create a modal or overlay with lesson details
        const previewModal = document.createElement('div');
        previewModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4';

        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto';

        const header = document.createElement('div');
        header.className = 'p-6 border-b border-cafe-latte';
        header.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-xl font-semibold text-cafe-espresso">${this.lessonData.title}</h2>
                    <p class="text-cafe-mocha mt-1">${this.lessonData.cefr_goal || ''}</p>
                </div>
                <button class="preview-close p-2 text-cafe-mocha hover:text-cafe-espresso">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'p-6';
        body.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold text-cafe-espresso mb-2">Lesson Details</h3>
                    <p class="text-cafe-mocha">Level: ${this.lessonData.level || 'Not specified'}</p>
                    <p class="text-cafe-mocha">Tags: ${this.lessonData.tags ? this.lessonData.tags.join(', ') : 'None'}</p>
                </div>
                <div>
                    <h3 class="font-semibold text-cafe-espresso mb-2">Sample Dialogue</h3>
                    <p class="text-cafe-mocha italic">Preview content would be loaded here...</p>
                </div>
            </div>
        `;

        modalContent.appendChild(header);
        modalContent.appendChild(body);
        previewModal.appendChild(modalContent);

        // Close handlers
        const closeBtn = header.querySelector('.preview-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(previewModal);
        });

        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                document.body.removeChild(previewModal);
            }
        });

        document.body.appendChild(previewModal);

        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Update the lesson card with new data
     * @param {Object} newData - Updated lesson data
     */
    update(newData) {
        Object.assign(this.lessonData, newData);
        // Re-render if needed
        if (this.element && this.element.parentNode) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
            this.element = newElement;
        }
    }

    /**
     * Remove the card from DOM
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
