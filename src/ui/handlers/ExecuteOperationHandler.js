/**
 * Execute Operation Handler
 * Handles business logic for batch operations
 */
class ExecuteOperationHandler {
    constructor(validator, batchProcessor) {
        this.validator = validator;
        this.batchProcessor = batchProcessor;
    }

    /**
     * Validate operation before execution
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
     */
    generateConfirmMessage(filesCount, addCategories, removeCategories) {
        return `You are about to update ${filesCount} file(s).\n\n` +
            `Categories to add: ${addCategories.length > 0 ? addCategories.join(', ') : 'none'}\n` +
            `Categories to remove: ${removeCategories.length > 0 ? removeCategories.join(', ') : 'none'}\n\n` +
            'Do you want to proceed?';
    }

    /**
     * Execute batch processing
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
