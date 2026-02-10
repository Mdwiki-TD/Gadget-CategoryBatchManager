/**
 * Preview Handler
 *
 * @description
 * Handles all preview-related functionality for BatchManager.
 * Manages preview generation, modal display, and validation.
 *
 * @requires ValidationHelper - For common validation logic
 * @requires ChangeCalculator - For calculating category changes
 */

/* global ValidationHelper, ChangeCalculator, Validator */

class PreviewHandler {
    /**
     */
    constructor(validator, changes_handler) {
        this.validator = validator;
        this.changes_handler = changes_handler;
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */

    getPreparation(
        sourceCategory,
        selectedFiles,
        addCategorySelected,
        removeCategorySelected,
        callbacks = {}
    ) {
        const preparation = this.changes_handler.validateAndPrepare(
            sourceCategory,
            selectedFiles,
            addCategorySelected,
            removeCategorySelected,
            callbacks
        );
        if (!preparation) {
            return
        }
    }

    filterFilesToProcess(filesToProcess) {
        return filesToProcess
            .map(item => ({
                file: item.file,
                currentCategories: [...item.currentCategories],
                newCategories: [...item.newCategories],
                diff: item.newCategories.length - item.currentCategories.length
            }));
    }

    /**
     * Preview changes without actually editing
     * @param {Array} files - Files to preview
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Promise<Array>} Preview of changes
     */
    async previewChanges(files, categoriesToAdd, categoriesToRemove) {
        // Use shared ChangeCalculator utility
        return ChangeCalculator.previewChanges(files, categoriesToAdd, categoriesToRemove);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewHandler;
}
