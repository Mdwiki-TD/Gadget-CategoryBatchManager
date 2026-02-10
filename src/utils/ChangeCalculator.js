/**
 * Change Calculator Utility
 *
 * @description
 * Calculates category changes for files. Used by both PreviewHandler and ExecuteHandler
 * to ensure consistent behavior between preview and actual execution.
 *
 * @requires Validator - For category name normalization and comparison
 */

/* global Validator */

class ChangeCalculator {
    /**
     * Find a category in a list (with normalization)
     * @param {string} category - Category to find
     * @param {Array<string>} categoryList - List to search in
     * @returns {number} Index of the category in the list, or -1 if not found
     */
    static findCategoryIndex(category, categoryList) {
        const normalized = Validator.normalizeCategoryName(category);
        return categoryList.findIndex(cat => {
            return Validator.normalizeCategoryName(cat).toLowerCase() === normalized.toLowerCase();
        });
    }

    /**
     * Check if category exists in a list (with normalization)
     * @param {string} category - Category to check
     * @param {Array<string>} categoryList - List to search in
     * @returns {boolean} True if category exists in the list
     */
    static categoryExists(category, categoryList) {
        return this.findCategoryIndex(category, categoryList) !== -1;
    }

    /**
     * Calculate changes for a file without actually editing
     * @param {Object} file - File object with title and currentCategories
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Object} Change result { currentCategories, newCategories, willChange }
     */
    static calculateFileChanges(file, categoriesToAdd, categoriesToRemove) {
        const current = file.currentCategories || [];
        const after = [...current];

        // Simulate removal (with normalization for matching)
        categoriesToRemove.forEach(cat => {
            const index = this.findCategoryIndex(cat, after);
            if (index > -1) after.splice(index, 1);
        });

        // Simulate addition (with normalization for checking duplicates)
        categoriesToAdd.forEach(cat => {
            if (!this.categoryExists(cat, after)) after.push(cat);
        });

        return {
            file: file.title,
            currentCategories: current,
            newCategories: after,
            willChange: JSON.stringify(current) !== JSON.stringify(after)
        };
    }

    /**
     * Calculate preview changes for multiple files
     * @param {Array} files - Files to preview
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Array<Object>} Preview of changes for each file
     */
    static previewChanges(files, categoriesToAdd, categoriesToRemove) {
        const previews = [];

        for (const file of files) {
            const change = this.calculateFileChanges(file, categoriesToAdd, categoriesToRemove);
            previews.push(change);
        }

        return previews;
    }

    /**
     * Filter files to only those that will actually change
     * @param {Array} files - Files to filter
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Array<Object>} Files that will actually be modified
     */
    static filterFilesThatWillChange(files, categoriesToAdd, categoriesToRemove) {
        const previews = this.previewChanges(files, categoriesToAdd, categoriesToRemove);
        const fileTitlesThatWillChange = new Set(
            previews
                .filter(p => p.willChange)
                .map(p => p.file)
        );
        return files.filter(f => fileTitlesThatWillChange.has(f.title));
    }

    /**
     * Get count of files that will actually change
     * @param {Array} files - Files to count
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {number} Count of files that will be modified
     */
    static countFilesThatWillChange(files, categoriesToAdd, categoriesToRemove) {
        const previews = this.previewChanges(files, categoriesToAdd, categoriesToRemove);
        return previews.filter(p => p.willChange).length;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChangeCalculator;
}
