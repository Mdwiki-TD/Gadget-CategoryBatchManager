/**
 * Shared constants for the Category Batch Manager
 */

/**
 * File processing status constants
 * Used to maintain consistency across BatchProcessor and ReportsPanel
 */
const FILE_STATUS = Object.freeze({
    SUCCESS: 'success',
    SKIPPED: 'skipped',
    FAILED: 'failed'
});

/**
 * Default shape for execution summary results
 * Used as initial state and prop default across components
 */
const DEFAULT_EXECUTION_SUMMARY = Object.freeze({
    total: 0,
    successful: 0,
    skipped: 0,
    failed: 0
});

export { FILE_STATUS, DEFAULT_EXECUTION_SUMMARY };
