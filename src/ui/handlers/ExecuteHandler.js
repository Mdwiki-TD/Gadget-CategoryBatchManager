/**
 * Execute Operation Handler
 * Handles business logic for batch operations
 * @class ExecuteHandler
 * @requires ChangeCalculator - For calculating which files will actually change
 */

import { BatchProcessor } from './../../services';

class ExecuteHandler {
    /**
     * @param {BatchProcessor} batch_processor - Batch processor instance for executing batch operations
     */
    constructor(batch_processor) {
        this.batch_processor = batch_processor;
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
        return await this.batch_processor.processBatch(
            files,
            addCategories,
            removeCategories,
            callbacks
        );
    }

    shouldStop() {
        return this.batch_processor.shouldStop;
    }
    /**
     * Stop batch processing
     */
    stopBatch() {
        this.batch_processor.stop();
    }
}

export default ExecuteHandler;
