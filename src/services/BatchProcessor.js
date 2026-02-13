/**
 * Batch processor for handling multiple file operations
 * @class BatchProcessor
 */

import RateLimiter from './../utils/RateLimiter.js';
import CategoryService from './../services/CategoryService.js';
import { FILE_STATUS } from './../utils/Constants.js';

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
     * Fetch live rate limits from the API and configure the RateLimiter.
     * Should be called once before each processBatch() run.
     *
     * Delegates to APIService.fetchUserRateLimits() so the limit data
     * always comes from a single authoritative source.
     *
     * @returns {Promise<void>}
     */
    async initRateLimiter() {
        if (this.rate_limiter.isConfigured()) {
            return; // Already configured — skip extra API call
        }
        const limit = await this.category_service.api.fetchUserRateLimits();
        this.rate_limiter.configure(limit);
    }

    /**
     * Process a batch of files with category updates.
     * Automatically fetches and applies the user's live rate limits before
     * starting, then runs files in concurrent batches via RateLimiter.batch().
     *
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

        // Fetch live rate limits and configure the limiter (no-op if already done)
        await this.initRateLimiter();

        const results = {
            total: files.length,
            processed: 0,
            successful: 0,
            skipped: 0,
            failed: 0,
            errors: [],
            fileResults: [] // Detailed per-file results
        };

        /**
         * Process a single file and update shared results.
         * Wrapped so it can be passed directly to RateLimiter.batch().
         * @param {Object} file
         */
        const processFile = async (file) => {
            if (this.shouldStop) return;

            try {
                const result = await this.category_service.updateCategories(
                    file.title,
                    categoriesToAdd,
                    categoriesToRemove
                );

                results.processed++;
                if (result.success) {
                    if (result.modified) {
                        results.successful++;
                        results.fileResults.push({
                            file: file.title,
                            status: FILE_STATUS.SUCCESS,
                            message: 'Modified successfully'
                        });
                        onFileComplete(file, true);
                    } else {
                        results.skipped++;
                        results.fileResults.push({
                            file: file.title,
                            status: FILE_STATUS.SKIPPED,
                            message: 'No changes needed'
                        });
                        onFileComplete(file, false);
                    }
                }

            } catch (error) {
                // Back-off on rate-limit errors before counting as failed
                if (error?.code === 'ratelimited' || error?.message === 'ratelimited') {
                    console.warn('[CBM-BP] ratelimited — waiting 60 s before continuing');
                    await this.rate_limiter.wait(60000);
                    return; // file stays unprocessed; caller may retry
                }

                results.processed++;
                results.failed++;
                results.errors.push({ file: file.title, error: error.message });
                results.fileResults.push({
                    file: file.title,
                    status: FILE_STATUS.FAILED,
                    message: error.message
                });
                onError(file, error);
            }

            onProgress((results.processed / results.total) * 100, results);
        };

        // Delegate concurrent execution and inter-batch pausing to RateLimiter
        await this.rate_limiter.batch(files, this.rate_limiter.concurrency, processFile);

        if (this.shouldStop) {
            console.log('[CBM-BP] Batch processing stopped by user');
        }

        return results;
    }

}

export default BatchProcessor;
