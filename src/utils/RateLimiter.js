/**
 * Rate limiter to prevent API abuse
 * @class RateLimiter
 */
class RateLimiter {
    /**
     * Wait for a specified duration
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
     * Throttle a function call with a delay
     * @param {Function} fn - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {Promise<*>} Result of the function
     */
    static async throttle(fn, delay) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fn();
    }

    /**
     * Process items in batches with delay between each
     * @param {Array} items - Items to process
     * @param {number} batchSize - Number of items per batch
     * @param {Function} processor - Async function to process each item
     * @returns {Promise<Array>} Results of processing
     */
    static async batch(items, batchSize, processor) {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const itemBatch = items.slice(i, i + batchSize);
            // @ts-ignore
            const batchResults = await Promise.all(itemBatch.map(processor));
            results.push(...batchResults);
        }
        return results;
    }
}

export default RateLimiter;
