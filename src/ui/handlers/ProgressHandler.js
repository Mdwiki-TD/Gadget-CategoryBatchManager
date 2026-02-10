/**
 * Progress Handler
 * Handles progress tracking and formatting for batch operations
 */
class ProgressHandler {
    /**
     * Create progress callbacks for batch processor
     */
    createCallbacks(vueInstance) {
        return {
            onProgress: (percent, results) => {
                vueInstance.executionProgressPercent = percent;
                vueInstance.executionProgressText =
                    `Processing ${results.processed} of ${results.total}... ` +
                    `(${results.successful} successful, ${results.failed} failed)`;
            },
            onFileComplete: (file, success) => {
                console.log(`[CBM-E] ${success ? '✓' : '⊘'} ${file.title}`);
            },
            onError: (file, error) => {
                console.error(`[CBM-E] ✗ ${file.title}:`, error.message);
            }
        };
    }

    /**
     * Format completion message
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressHandler;
}
