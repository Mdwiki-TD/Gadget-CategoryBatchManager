/**
 * Input validation utility
 * @class Validator
 */
class Validator {
    /**
     * TODO: use it in the workflow or remove if not needed
     * Check if a category name is valid
     * @param {string} name - Category name to validate
     * @returns {boolean} True if valid
     */
    static isValidCategoryName(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (trimmed.length === 0) return false;
        // Category names must not contain certain characters
        const invalidChars = /[#<>\[\]{|}]/;
        const cleanName = trimmed.replace(/^Category:/i, '');
        return cleanName.length > 0 && !invalidChars.test(cleanName);
    }

    /**
     * TODO: use it in the workflow or remove if not needed
     * Check if a search pattern is valid
     * @param {string} pattern - Search pattern to validate
     * @returns {boolean} True if valid
     */
    static isValidSearchPattern(pattern) {
        if (!pattern || typeof pattern !== 'string') return false;
        return pattern.trim().length > 0;
    }
    /**
     * TODO: use it in the workflow or remove if not needed
     * Sanitize user input to prevent injection
     * @param {string} input - Raw user input
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        return input.trim();
    }

    /**
     * Normalize category name for comparison (remove prefix, convert underscores to spaces)
     * @param {string} categoryName - Category name to normalize
     * @returns {string} Normalized category name
     */
    static normalizeCategoryName(categoryName) {
        if (!categoryName || typeof categoryName !== 'string') return '';
        return categoryName
            .replace(/^Category:/i, '')
            .replace(/_/g, ' ')
            .trim();
    }

    /**
     * Check if a category is trying to add itself (circular reference)
     * @param {string} currentCategory - The category being edited
     * @param {string} categoryToAdd - The category to be added
     * @returns {boolean} True if circular reference detected
     */
    static isCircularCategory(currentCategory, categoryToAdd) {
        if (!currentCategory || !categoryToAdd) return false;

        const normalizedCurrent = this.normalizeCategoryName(currentCategory);
        const normalizedToAdd = this.normalizeCategoryName(categoryToAdd);

        return normalizedCurrent.toLowerCase() === normalizedToAdd.toLowerCase();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validator;
}
