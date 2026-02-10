/**
 * Execute Operation Handler
 * Handles business logic for batch operations
 * @class ExecuteOperationHandler
 */
class ExecuteOperationHandler {
    /**
     * @param {Object} validator - ValidationHelper instance
     * @param {Object} batchProcessor - BatchProcessor instance
     */
    constructor(validator, batchProcessor) {
        this.validator = validator;
        this.batchProcessor = batchProcessor;
    }

    /**
     * Validate operation before execution
     * @param {Array} selectedFiles - Array of selected files
     * @param {Array} addCategories - Categories to add
     * @param {Array} removeCategories - Categories to remove
     * @returns {Object} Validation result {valid: boolean, error?: string}
     */
    validateOperation(selectedFiles, addCategories, removeCategories) {
        if (!selectedFiles || selectedFiles.length === 0) {
            return { valid: false, error: 'Please select at least one file.' };
        }

        if (addCategories.length === 0 && removeCategories.length === 0) {
            return { valid: false, error: 'Please specify categories to add or remove.' };
        }

        return { valid: true };
    }

    /**
     * Prepare batch operation data
     * @param {Object} vueInstance - Vue component instance
     * @returns {Object} Preparation result
     */
    prepareOperation(vueInstance) {
        const filteredToAdd = this.validator.filterCircularCategories(vueInstance);

        if (filteredToAdd.length === 0 && vueInstance.removeCategory.selected.length === 0) {
            return { valid: false, error: 'No valid categories to add or remove.' };
        }

        return {
            valid: true,
            filteredToAdd,
            removeCategories: vueInstance.removeCategory.selected,
            filesCount: vueInstance.selectedFiles.length
        };
    }

    /**
     * Generate confirmation message
     * @param {number} filesCount - Number of files to process
     * @param {Array} addCategories - Categories to add
     * @param {Array} removeCategories - Categories to remove
     * @returns {string} Formatted confirmation message
     */
    generateConfirmMessage(filesCount, addCategories, removeCategories) {
        return `You are about to update ${filesCount} file(s).\n\n` +
            `Categories to add: ${addCategories.length > 0 ? addCategories.join(', ') : 'none'}\n` +
            `Categories to remove: ${removeCategories.length > 0 ? removeCategories.join(', ') : 'none'}\n\n` +
            'Do you want to proceed?';
    }

    /**
     * Execute batch processing
     * @param {Array} files - Files to process
     * @param {Array} addCategories - Categories to add
     * @param {Array} removeCategories - Categories to remove
     * @param {Object} callbacks - Progress callbacks
     * @returns {Promise<Object>} Processing results
     */
    async executeBatch(files, addCategories, removeCategories, callbacks) {
        return await this.batchProcessor.processBatch(
            files,
            addCategories,
            removeCategories,
            callbacks
        );
    }

    /**
     * Stop batch processing
     */
    stopBatch() {
        this.batchProcessor.stop();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecuteOperationHandler;
}
