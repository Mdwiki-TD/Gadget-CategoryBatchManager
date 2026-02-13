/**
 * Shared constants for the Category Batch Manager
 */

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

export { DEFAULT_EXECUTION_SUMMARY };
