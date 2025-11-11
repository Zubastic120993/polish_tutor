/**
 * Button Component
 * Reusable button component with consistent styling and behavior
 */

export class ButtonComponent {
    constructor(options = {}) {
        this.options = {
            text: '',
            variant: 'primary', // primary, secondary, danger
            size: 'medium', // small, medium, large
            disabled: false,
            icon: null, // feather icon name
            onClick: null,
            className: '',
            ...options
        };

        this.element = null;
    }

    /**
     * Render the button component
     * @returns {HTMLElement} The rendered button element
     */
    render() {
        const button = document.createElement('button');
        button.type = 'button';

        // Base classes
        const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        // Variant classes
        const variantClasses = {
            primary: 'bg-cafe-espresso text-white hover:bg-cafe-mocha focus:ring-cafe-espresso',
            secondary: 'border border-cafe-mocha text-cafe-mocha hover:bg-cafe-mocha hover:text-white focus:ring-cafe-mocha',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600'
        };

        // Size classes
        const sizeClasses = {
            small: 'px-3 py-1.5 text-sm',
            medium: 'px-4 py-2 text-base',
            large: 'px-6 py-3 text-lg'
        };

        button.className = `${baseClasses} ${variantClasses[this.options.variant]} ${sizeClasses[this.options.size]} ${this.options.className}`;

        // Disabled state
        if (this.options.disabled) {
            button.disabled = true;
        }

        // Icon
        if (this.options.icon) {
            const iconElement = document.createElement('i');
            iconElement.setAttribute('data-feather', this.options.icon);
            iconElement.className = 'w-4 h-4 mr-2';
            button.appendChild(iconElement);
        }

        // Text
        if (this.options.text) {
            const textSpan = document.createElement('span');
            textSpan.textContent = this.options.text;
            button.appendChild(textSpan);
        }

        // Click handler
        if (this.options.onClick && typeof this.options.onClick === 'function') {
            button.addEventListener('click', this.options.onClick);
        }

        this.element = button;
        return button;
    }

    /**
     * Update button properties
     * @param {Object} newOptions - Updated options
     */
    update(newOptions = {}) {
        Object.assign(this.options, newOptions);

        // Re-render if element exists
        if (this.element && this.element.parentNode) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
            this.element = newElement;
        }
    }

    /**
     * Enable the button
     */
    enable() {
        this.update({ disabled: false });
    }

    /**
     * Disable the button
     */
    disable() {
        this.update({ disabled: true });
    }

    /**
     * Set loading state
     * @param {boolean} loading - Whether to show loading state
     */
    setLoading(loading) {
        if (loading) {
            this.update({
                disabled: true,
                text: 'Loading...',
                icon: 'loader'
            });
        } else {
            this.update({
                disabled: false,
                text: this.options.originalText || this.options.text,
                icon: this.options.originalIcon || this.options.icon
            });
        }
    }

    /**
     * Remove the button from DOM
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

/**
 * Convenience functions for creating common button types
 */
export function createPrimaryButton(text, onClick, options = {}) {
    return new ButtonComponent({
        text,
        variant: 'primary',
        onClick,
        ...options
    });
}

export function createSecondaryButton(text, onClick, options = {}) {
    return new ButtonComponent({
        text,
        variant: 'secondary',
        onClick,
        ...options
    });
}

export function createDangerButton(text, onClick, options = {}) {
    return new ButtonComponent({
        text,
        variant: 'danger',
        onClick,
        ...options
    });
}
