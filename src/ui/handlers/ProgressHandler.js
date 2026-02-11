/**
 * Progress Handler
 * Handles progress tracking and formatting for batch operations
 * @class ProgressHandler
 */
class ProgressHandler {
    /**
     * Create progress callbacks for batch processor
     * @param {Object} self - Vue component instance
     * @returns {Object} Callbacks object with onProgress, onFileComplete, onError
     */
    createCallbacks(self) {
        return {
            /**
             * Progress update callback
             * @param {number} percent - Completion percentage
             * @param {Object} results - Current results
             */
            onProgress: (percent, results) => {
                self.executionProgressPercent = percent;
                self.executionProgressText =
                    `Processing ${results.processed} of ${results.total}... ` +
                    `(${results.successful} successful, ${results.failed} failed)`;
            },

            /**
             * File completion callback
             * @param {Object} file - Processed file
             * @param {boolean} success - Whether processing succeeded
             */
            onFileComplete: (file, success) => {
                console.log(`[CBM-E] ${success ? '✓' : '⊘'} ${file.title}`);
            },

            /**
             * Error callback
             * @param {Object} file - File that failed
             * @param {Error} error - Error object
             */
            onError: (file, error) => {
                console.error(`[CBM-E] ✗ ${file.title}:`, error.message);
            }
        };
    }

    /**
     * Format completion message based on results
     * @param {Object} results - Processing results
     * @param {boolean} wasStopped - Whether operation was stopped by user
     * @returns {Object} Message object {type: string, message: string}
     */
    formatCompletionMessage(results, wasStopped) {
        if (wasStopped) {
            return {
                type: 'warning',
                message: `Operation stopped by user. Processed ${results.processed} of ${results.total} files (${results.successful} successful, ${results.failed} failed).`
            };
        }

        const message = `Batch operation completed! Processed ${results.total} files: ${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed.`;

        return {
            type: results.failed > 0 ? 'warning' : 'success',
            message
        };
    }
}

export default ProgressHandler;
