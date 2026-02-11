/**
 * Rate limiter to prevent API abuse.
 *
 * Supports dynamic configuration from the live API (via APIService.fetchUserRateLimits).
 * Once configured, `batch()` automatically enforces concurrency and inter-batch delay.
 *
 * @class RateLimiter
 */

class RateLimiter {
    constructor() {
        /**
         * Maximum parallel requests allowed per batch window.
         * Derived from: floor(hits / seconds)
         * @type {number}
         */
        this.concurrency = 5;

        /**
         * Pause in milliseconds between consecutive batches.
         * Derived from: (seconds * 1000) / concurrency
         * @type {number}
         */
        this.intervalMs = 200;

        /**
         * Whether the limiter has been configured from a live API response.
         * @type {boolean}
         */
        this._configured = false;
    }

    /* ------------------------------------------------------------------ */
    /*  Configuration                                                       */
    /* ------------------------------------------------------------------ */

    /**
     * Configure the limiter from a rate-limit descriptor returned by
     * APIService.fetchUserRateLimits().
     *
     * Example for Mr. Ibrahem (900 hits / 180 s):
     *   concurrency = floor(900 / 180) = 5
     *   intervalMs  = (180 * 1000) / 900 = 200 ms
     *
     * @param {Object} rateLimit - Rate limit descriptor
     * @param {number} rateLimit.hits    - Maximum allowed hits in the window
     * @param {number} rateLimit.seconds - Window size in seconds
     * @returns {RateLimiter} this (fluent)
     */
    configure({ hits, seconds }) {
        if (!hits || !seconds || hits <= 0 || seconds <= 0) {
            console.warn('[CBM-RL] Invalid rate limit values, keeping defaults.');
            return this;
        }

        // How many requests can run in parallel within one second
        this.concurrency = Math.max(1, Math.min(Math.floor(hits / seconds), 10));

        // Minimum pause between batches so the rolling window is never exceeded
        this.intervalMs = Math.ceil((seconds * 1000) / hits);

        this._configured = true;
        console.log(
            `[CBM-RL] Configured — hits: ${hits}, seconds: ${seconds}` +
            ` → concurrency: ${this.concurrency}, intervalMs: ${this.intervalMs}`
        );
        return this;
    }

    /**
     * Returns true if configure() has been called with valid values.
     * @returns {boolean}
     */
    isConfigured() {
        return this._configured;
    }

    /* ------------------------------------------------------------------ */
    /*  Enforcement                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Verify that a requested concurrency level does not exceed the
     * configured rate limit.  Logs a warning and returns the clamped
     * safe value when the requested level is too high.
     *
     * @param {number} requested - The concurrency level the caller wants
     * @returns {number} Safe concurrency level (<= this.concurrency)
     */
    checkLimit(requested) {
        if (requested <= this.concurrency) {
            return requested;
        }
        console.warn(
            `[CBM-RL] Requested concurrency (${requested}) exceeds ` +
            `rate-limit budget (${this.concurrency}). Clamping to ${this.concurrency}.`
        );
        return this.concurrency;
    }

    /* ------------------------------------------------------------------ */
    /*  Waiting helpers                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Wait for a specified duration.
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    async wait(ms = 2000) {
        if (!ms) {
            return;
        }
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wait for the configured inter-batch interval (this.intervalMs).
     * Falls back to 200 ms when not yet configured.
     * @returns {Promise<void>}
     */
    async waitInterval() {
        return this.wait(this.intervalMs);
    }

    /* ------------------------------------------------------------------ */
    /*  Throttle helper (static, unchanged)                                */
    /* ------------------------------------------------------------------ */

    /**
     * Throttle a function call with a delay.
     * @param {Function} fn - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {Promise<*>} Result of the function
     */
    static async throttle(fn, delay) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fn();
    }

    /* ------------------------------------------------------------------ */
    /*  Batch processing (rate-limit aware)                                */
    /* ------------------------------------------------------------------ */

    /**
     * Process items in concurrent batches, pausing between each batch to
     * stay within the configured rate-limit window.
     *
     * Uses this.concurrency for batch size and this.intervalMs for the pause
     * when the instance has been configured via configure().
     * Falls back to the provided batchSize / no delay when not configured.
     *
     * @param {Array}    items     - Items to process
     * @param {number}   batchSize - Desired batch size (will be clamped by checkLimit)
     * @param {Function} processor - Async function to process each item
     * @returns {Promise<Array>} Results of processing
     */
    async batch(items, batchSize, processor) {
        const safeBatchSize = this._configured
            ? this.checkLimit(batchSize)
            : batchSize;

        const results = [];

        for (let i = 0; i < items.length; i += safeBatchSize) {
            const itemBatch = items.slice(i, i + safeBatchSize);
            const batchResults = await Promise.all(itemBatch.map(processor));
            results.push(...batchResults);

            // Pause between batches (skip after the last one)
            if (this._configured && i + safeBatchSize < items.length) {
                await this.waitInterval();
            }
        }

        return results;
    }

    /* ------------------------------------------------------------------ */
    /*  Static helpers                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Static batch processor for simple use cases without rate-limiting.
     * Processes items in concurrent batches without any delay between batches.
     *
     * @param {Array}    items     - Items to process
     * @param {number}   batchSize - Number of items to process concurrently
     * @param {Function} processor - Async function to process each item
     * @returns {Promise<Array>} Results of processing
     */
    static async batch(items, batchSize, processor) {
        const results = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const itemBatch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(itemBatch.map(processor));
            results.push(...batchResults);
        }

        return results;
    }
}

export default RateLimiter;
