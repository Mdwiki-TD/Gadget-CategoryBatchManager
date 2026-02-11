/**
 * Batch processor for handling multiple file operations
 * @class BatchProcessor
 */

import RateLimiter from './../utils/RateLimiter.js';
import CategoryService from './../services/CategoryService.js';

class BatchProcessor {
    /**
     * @param {CategoryService} category_service - Category service instance
     */
    constructor(category_service) {
        this.category_service = category_service;
        this.rate_limiter = new RateLimiter();
        this.shouldStop = false;
    }

    /**
     * Stop the current batch processing
     */
    stop() {
        this.shouldStop = true;
    }

    /**
     * Reset the stop flag for a new batch operation
     */
    reset() {
        this.shouldStop = false;
    }

    /**
     * Process a batch of files with category updates
     * @param {Array} files - Files to process
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @param {Object} [callbacks={}] - Callback functions
     * @param {Function} [callbacks.onProgress] - Progress callback (percentage, results)
     * @param {Function} [callbacks.onFileComplete] - File complete callback (file, success)
     * @param {Function} [callbacks.onError] - Error callback (file, error)
     * @returns {Promise<Object>} Results with total, processed, successful, failed, errors
     */
    async processBatch(files, categoriesToAdd, categoriesToRemove, callbacks = {}) {
        const {
            onProgress = () => { },
            onFileComplete = () => { },
            onError = () => { }
        } = callbacks;

        this.reset();

        const results = {
            total: files.length,
            processed: 0,
            successful: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        // Process files sequentially with throttling
        for (const file of files) {
            // Check if we should stop
            if (this.shouldStop) {
                console.log('[CBM-BP] Batch processing stopped by user');
                break;
            }

            try {
                // Wait to respect rate limits (1 edit per 2 seconds)
                // await this.rate_limiter.wait();

                // Update categories
                const result = await this.category_service.updateCategories(
                    file.title,
                    categoriesToAdd,
                    categoriesToRemove
                );

                results.processed++;
                if (result.success) {
                    if (result.modified) {
                        results.successful++;
                        onFileComplete(file, true);
                    } else {
                        results.skipped++;
                        onFileComplete(file, false);
                    }
                }

                // Update progress
                const progress = (results.processed / results.total) * 100;
                onProgress(progress, results);

            } catch (error) {
                results.processed++;
                results.failed++;
                results.errors.push({
                    file: file.title,
                    error: error.message
                });

                onError(file, error);
                onProgress((results.processed / results.total) * 100, results);
            }
        }

        return results;
    }

}

export default BatchProcessor;
