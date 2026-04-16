/**
 * Gadget-CategoryBatchManager.js (Vue-based)
 * Category Batch Manager for Wikimedia Commons
 *
 * @version 1.0.0
 * @license MIT
 * @description A tool for batch categorization of files in Wikimedia Commons.
 *              Built with Vue.js and Wikimedia Codex.
 *
 * Built from: https://github.com/Mdwiki-TD/Gadget-CategoryBatchManager
 */
// <nowiki>

// === src/utils/Constants.js ===
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

// === src/utils/ChangeCalculator.js ===
/**
 * Change Calculator Utility
 *
 * @description
 * Calculates category changes for files. Used by ExecuteHandler
 * to ensure consistent behavior between preview and actual execution.
 *
 * @requires Validator - For category name normalization and comparison
 */



class ChangeCalculator {
    /**
     * Find a category in a list (with normalization)
     * @param {string} category - Category to find
     * @param {Array<string>} categoryList - List to search in
     * @returns {number} Index of the category in the list, or -1 if not found
     */
    static findCategoryIndex(category, categoryList) {
        const normalized = Validator.normalizeCategoryName(category);
        return categoryList.findIndex(cat => {
            return Validator.normalizeCategoryName(cat).toLowerCase() === normalized.toLowerCase();
        });
    }

    /**
     * Check if category exists in a list (with normalization)
     * @param {string} category - Category to check
     * @param {Array<string>} categoryList - List to search in
     * @returns {boolean} True if category exists in the list
     */
    static categoryExists(category, categoryList) {
        return this.findCategoryIndex(category, categoryList) !== -1;
    }

    /**
     * Calculate changes for a file without actually editing
     * @param {Object} file - File object with title and currentCategories
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Object} Change result { currentCategories, newCategories, willChange }
     */
    static calculateFileChanges(file, categoriesToAdd, categoriesToRemove) {
        const current = file.currentCategories || [];
        const after = [...current];

        // Simulate removal (with normalization for matching)
        categoriesToRemove.forEach(cat => {
            const index = this.findCategoryIndex(cat, after);
            if (index > -1) after.splice(index, 1);
        });

        // Simulate addition (with normalization for checking duplicates)
        categoriesToAdd.forEach(cat => {
            if (!this.categoryExists(cat, after)) after.push(cat);
        });

        return {
            title: file.title,
            file: file.title,
            currentCategories: current,
            newCategories: after,
            wouldAdd: categoriesToAdd.filter((cat) => !this.categoryExists(cat, current)),
            wouldRemove: categoriesToRemove.filter((cat) => this.categoryExists(cat, current)),
            willChange: JSON.stringify(current) !== JSON.stringify(after)
        };
    }

    /**
     * Calculate preview changes for multiple files
     * @param {Array} files - Files to preview
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Array<Object>} Preview of changes for each file
     */
    static previewChanges(files, categoriesToAdd, categoriesToRemove) {
        const previews = [];

        for (const file of files) {
            const change = this.calculateFileChanges(file, categoriesToAdd, categoriesToRemove);
            previews.push(change);
        }

        return previews;
    }

    /**
     * Filter files to only those that will actually change
     * @param {Array} files - Files to filter
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Array<Object>} Preview objects for files that will be modified
     */
    static filterFilesThatWillChange(files, categoriesToAdd, categoriesToRemove) {
        const previews = this.previewChanges(files, categoriesToAdd, categoriesToRemove);
        // Return preview objects (with newCategories) for files that will change
        return previews.filter(p => p.willChange);
    }

    /**
     * Get count of files that will actually change
     * @param {Array} files - Files to count
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {number} Count of files that will be modified
     */
    static countFilesThatWillChange(files, categoriesToAdd, categoriesToRemove) {
        const previews = this.previewChanges(files, categoriesToAdd, categoriesToRemove);
        return previews.filter(p => p.willChange).length;
    }
}

// === src/utils/RateLimiter.js ===
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

// === src/utils/Validator.js ===
/**
 * Input validation utility
 * @class Validator
 */
class Validator {
    /**
     * TODO: use it in the workflow
     * Check if a category name is valid
     * @param {string} name - Category name to validate
     * @returns {boolean} True if valid
     */
    static isValidCategoryName(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (trimmed.length === 0) return false;
        // Category names must not contain certain characters
        const invalidChars = /[#<>\[\]{|}]/;
        const cleanName = trimmed.replace(/^Category:/i, '');
        return cleanName.length > 0 && !invalidChars.test(cleanName);
    }

    /**
     * Check if a search pattern is valid
     * @param {string} pattern - Search pattern to validate
     * @returns {boolean} True if valid
     */
    static isValidSearchPattern(pattern) {
        if (!pattern || typeof pattern !== 'string') return false;
        const trimmed = pattern.trim();
        // Check length limits
        if (trimmed.length === 0 || trimmed.length > 200) return false;
        return true;
    }

    /**
     * Sanitize search pattern to prevent injection attacks
     * @param {string} pattern - Raw search pattern
     * @returns {string} Sanitized pattern
     */
    static sanitizeTitlePattern(pattern) {
        if (!pattern || typeof pattern !== 'string') {
            return '';
        }

        // Limit input length to prevent abuse
        const maxLength = 200;
        const trimmed = pattern.trim().slice(0, maxLength);

        // Escape quotes and backslashes to prevent search syntax injection
        // MediaWiki search uses quotes for exact phrases and backslashes for escapes
        return trimmed
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/"/g, '\\"')     // Escape double quotes
            .replace(/'/g, "\\'");    // Escape single quotes
    }
    /**
     * Normalize category name for comparison (remove prefix, convert underscores to spaces)
     * @param {string} categoryName - Category name to normalize
     * @returns {string} Normalized category name
     */
    static normalizeCategoryName(categoryName) {
        if (!categoryName || typeof categoryName !== 'string') return '';
        return categoryName
            .replace(/^Category:/i, '')
            .replace(/_/g, ' ')
            .trim();
    }

    /**
     * Check if a category is trying to add itself (circular reference)
     * @param {string} currentCategory - The category being edited
     * @param {string} categoryToAdd - The category to be added
     * @returns {boolean} True if circular reference detected
     */
    static isCircularCategory(currentCategory, categoryToAdd) {
        if (!currentCategory || !categoryToAdd) return false;

        const normalizedCurrent = this.normalizeCategoryName(currentCategory);
        const normalizedToAdd = this.normalizeCategoryName(categoryToAdd);

        return normalizedCurrent.toLowerCase() === normalizedToAdd.toLowerCase();
    }
}

// === src/utils/WikitextParser.js ===
/**
 * Parses and transforms wikitext for category add/remove operations.
 * Handles spaces/underscores interchangeably when matching existing categories.
 * @class WikitextParser
 */
class WikitextParser {
    /**
     * Normalise a raw category name: replace underscores with spaces and trim.
     * @param {string} name
     * @returns {string}
     */
    normalize(name) {
        return name.replace(/_/g, ' ').trim();
    }

    /**
     * Escape all RegExp special characters in a string.
     * @param {string} str
     * @returns {string}
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Build a RegExp that matches a category link regardless of whether
     * the name uses spaces or underscores.
     * @param {string} normalizedName - Name already normalized (spaces, no prefix)
     * @returns {RegExp}
     */
    _buildCategoryRegex(normalizedName) {
        const pattern = normalizedName
            .split(' ')
            .map(part => this.escapeRegex(part))
            .join('[ _]+');
        return new RegExp(`\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]`, 'gi');
    }
    /**
     * Return true if `wikitext` already contains a link to `categoryName`.
     * @param {string} wikitext
     * @param {string} categoryName - With or without "Category:" prefix
     * @returns {boolean}
     */
    hasCategory(wikitext, categoryName) {
        const normalized = this.normalize(categoryName.replace(/^Category:/i, ''));
        return this._buildCategoryRegex(normalized).test(wikitext);
    }

    /**
     * Append `categoryName` to `wikitext` after the last existing category,
     * or at the end of the file when no categories exist yet.
     * Does nothing if the category is already present.
     * @param {string} wikitext
     * @param {string} categoryName
     * @returns {string}
     */
    addCategory(wikitext, categoryName) {
        const clean = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(clean);

        // Check if category already exists (with normalization)
        if (this.hasCategory(wikitext, normalizedName)) {
            return wikitext;
        }

        const syntax = `[[Category:${normalizedName}]]`;

        // Find last category or end of file
        const lastCategoryMatch = wikitext.match(/\[\[Category:[^\]]+\]\]\s*$/);

        if (lastCategoryMatch) {
            // Add after last category
            return wikitext.replace(
                /(\[\[Category:[^\]]+\]\])\s*$/,
                `$1\n${syntax}\n`
            );
        } else {
            // Add at end
            return wikitext.trim() + `\n${syntax}\n`;
        }
    }
    /**
     * Remove all occurrences of `categoryName` from `wikitext`.
     * @param {string} wikitext
     * @param {string} categoryName
     * @returns {string}
     */
    removeCategory(wikitext, categoryName) {
        const cleanName = this.normalize(categoryName.replace(/^Category:/i, ''));

        // Create a pattern that matches both spaces and underscores
        const pattern = cleanName.split(' ').map(part => this.escapeRegex(part)).join('[ _]+');

        const regex = new RegExp(
            `\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]\\s*\\n?`,
            'gi'
        );
        return wikitext.replace(regex, '');
    }

}

// === src/models/FileModel.js ===
/**
 * Immutable-ish value object representing one Wikimedia Commons file.
 * `selected` is the only field expected to mutate (driven by checkboxes).
 * @class FileModel
 */
class FileModel {
    /**
     * @param {Object}   data
     * @param {string}   data.title
     * @param {number}   data.pageid
     * @param {boolean}  [data.selected=true]
     * @param {string[]} [data.currentCategories=[]]
     * @param {string}   [data.thumbnail='']
     * @param {number}   [data.size=0]
     */
    constructor({ title, pageid, selected = true, currentCategories = [], thumbnail = '', size = 0 }) {
        this.title = title;
        this.pageid = pageid;
        this.selected = selected;
        this.currentCategories = currentCategories;
        this.thumbnail = thumbnail;
        this.size = size;
    }
}

// === src/services/APIService.js ===
/**
 * Thin wrapper around `mw.Api`.
 *
 * All write operations go through `mw.Api.edit()` which handles CSRF-token
 * management, automatic bad-token retry, and correct origin headers.
 *
 * @class APIService
 */





class APIService {
    constructor() {
        this.debug = false;
        // if user pass ?debug= in URL, enable debug mode // https://commons.wikimedia.org?debug=1
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')) {
            this.debug = true;
            console.log('[APIService] Debug mode enabled');
        }
        /**
         * Native MediaWiki API helper
         */
        try {
            this.mwApi = new mw.Api();
        } catch {

            this.mwApi = new Api(); // local-dev shim
        }
    }

    // ── File & category queries ────────────────────────────────────────────

    /**
     * Fetch files from a category with pagination support.
     * @param {string} categoryName - Full category name including "Category:" prefix
     * @param {Object} [options={}] - Query options
     * @param {number} [options.limit=500] - Maximum files to retrieve per request
     * @returns {Promise<Array>} Array of file objects
     */
    async getCategoryMembers(categoryName, options = {}) {
        const allMembers = [];
        let cmcontinue = null;

        do {
            const params = {
                action: 'query',
                list: 'categorymembers',
                cmtitle: categoryName,
                cmtype: 'file',
                cmlimit: options.limit || 500,
                format: 'json'
            };

            if (cmcontinue) {
                params.cmcontinue = cmcontinue;
            }

            const data = await this._get(params);
            allMembers.push(...data.query.categorymembers);

            cmcontinue = data.continue ? data.continue.cmcontinue : null;
        } while (cmcontinue);

        return allMembers;
    }
    /**
     * Fetch detailed info (categories + imageinfo) for up to 50 titles.
     * @param {string[]} titles
     * @returns {Promise<Object>}
     */
    getFileInfo(titles) {
        return this._get({
            action: 'query',
            titles: titles.join('|'),
            prop: 'categories|imageinfo',
            cllimit: 500,
            format: 'json'
        });
    }
    /**
     * Fetch the raw wikitext of a page.
     * @param {string} title
     * @returns {Promise<string>} Empty string when the page is missing.
     */
    async getPageContent(title) {
        if (!title) {
            console.error('[CBM-API] getPageContent called with empty title');
            return '';
        }
        const data = await this._get({
            action: 'query',
            titles: title,
            prop: 'revisions',
            rvprop: 'content',
            rvslots: 'main',
            format: 'json'
        });

        const pages = data?.query?.pages;
        if (!pages) {
            console.error('[CBM-API] No pages found in API response for title:', title);
            return '';
        }
        const page = Object.values(pages)[0];
        return page?.revisions?.[0]?.slots?.main?.['*'] ?? '';
    }

    /**
     * Return the category names a page belongs to via `mw.Api.getCategories()`.
     * @param {string} title
     * @returns {Promise<string[]|false>}
     */
    async getCategories(title) {
        try {
            const cats = await this.mwApi.getCategories(title);
            if (cats === false) return false;
            return cats.map(c => c.toString().replace(/^Category:/, ''));
        } catch (err) {
            console.error('[CBM-API] getCategories failed', err);
            throw err;
        }
    }

    // ── Search ─────────────────────────────────────────────────────────────

    /**
     * Run a MediaWiki `list=search` query until exhausted (or 5 000 results).
     * @param {string}   srsearch
     * @param {number}   [limit=5000]
     * @param {Object}   [callbacks={}]
     * @param {Function} [callbacks.onProgress]
     * @returns {Promise<Array<{ title: string, pageid: number, size: number, timestamp: string }>>}
     */
    async searchInCategoryWithPattern(srsearch, limit = null, callbacks = {}) {
        const results = [];
        let sroffset = null;
        limit = (limit && limit > 0) ? limit : 5000;

        do {
            const params = {
                action: 'query',
                list: 'search',
                srsearch: srsearch,
                srnamespace: 6,
                srlimit: 'max',
                srprop: 'size|wordcount|timestamp',
            };

            if (sroffset) {
                params.sroffset = sroffset;
            }

            const res = await this._get(params);

            if (res.query && res.query.search) {
                const searchResults = res.query.search.map(file => ({
                    title: file.title,
                    pageid: file.pageid,
                    size: file.size,
                    timestamp: file.timestamp
                }));

                results.push(...searchResults);

                // Call progress callback with the number of results found so far
                callbacks.onProgress?.(`Searching for files… (${results.length} found so far)`);
            }

            // Check if there are more results
            sroffset = res?.continue?.sroffset ?? null;

            // Safety limit to prevent too many requests
            if (results.length >= limit) {
                // make sure to slice the results to the limit before returning
                results.splice(limit);

                console.warn(`[CBM-API] Search result limit reached (${limit} files).`);
                break;
            }
        } while (sroffset);
        // Call progress callback with the number of results found so far
        callbacks.onProgress?.(`Searching for files… (${results.length} found)`);
        return results;
    }

    /**
     * Convenience method: build a `incategory + intitle` search query
     * and delegate to `searchInCategoryWithPattern`.
     * @param {string} categoryName  - Without the "Category:" prefix
     * @param {string} titlePattern
     * @returns {Promise<Array>}
     */
    async searchInCategory(categoryName, titlePattern) {

        // Sanitize the pattern to prevent search syntax injection
        // MediaWiki search uses special characters like /, ", ", etc.
        const sanitizedPattern = Validator.sanitizeTitlePattern(titlePattern);
        // Replace spaces with underscores in category name for search API
        const searchCategoryName = categoryName.replace(/\s+/g, '_');
        const srsearch = sanitizedPattern.trim()
            ? `incategory:${searchCategoryName} intitle:/${sanitizedPattern}/`
            : `incategory:${searchCategoryName}`;
        return await this.searchInCategoryWithPattern(srsearch);
    }

    // ── Category autocomplete ──────────────────────────────────────────────

    /**
     * Fetch category suggestions via `action=opensearch`.
     * @param {string}  searchTerm
     * @param {Object}  [options={}]
     * @param {number}  [options.limit=10]
     * @param {number}  [options.offset]
     * @returns {Promise<Array<{ value: string, label: string }>>}
     */
    async fetchCategories(searchTerm, options = {}) {
        const limit = options.limit || 10;
        if (!searchTerm || searchTerm.length < 1) {
            return Promise.resolve([]);
        }
        const params = {
            action: 'opensearch',
            search: searchTerm,
            namespace: 14,
            limit: limit
        };
        if (options.offset) {
            params.continue = String(options.offset);
        }
        const data = await this._get(params);
        // data[1] contains the category titles
        if (data && data[1]) {
            return data[1].map(function (title) {
                return {
                    value: title,
                    label: title
                };
            });
        } else {
            return [];
        }
    }

    // ── Edit ───────────────────────────────────────────────────────────────
    /**
     * Debug the edit process by logging the parameters and simulating a response.
     * This allows testing the UI and workflow without making real API calls.
     * @param {string}   title
     * @param {string}   content
     * @param {string}   summary
     * @param {Object}   options
     * @returns {Promise<Object>}
     */
    async debugEditProcess(title, content, summary, options) {
        console.log(`[APIService] Editing page: ${title}`);
        console.log(`[APIService] New content: ${content}`);
        console.log(`[APIService] Summary: ${summary}`);
        console.log(`[APIService] Options:`, options);
        // Simulate network delay in debug mode
        await new Promise(resolve => setTimeout(resolve, 200));

        let result = 'Success';
        // Simulate a random failure 10% of the time in debug mode
        if (Math.random() < 0.1) {
            result = 'Failure (simulated)';
        }
        // Simulate a successful edit response in debug mode
        return Promise.resolve({
            edit: {
                title: title,
                content: content,
                summary: summary,
                result: result,
            }
        });
    }

    /**
     * Edit a page through `mw.Api.edit()` (handles CSRF + conflict retry).
     * @param {string}   title
     * @param {string}   content  - New wikitext
     * @param {string}   summary
     * @param {Object}   [options={}]
     * @returns {Promise<Object>}
     */
    async editPage(title, content, summary, options = {}) {
        if (this.debug) {
            return await this.debugEditProcess(title, content, summary, options);
        }
        // Use mw.Api.edit() with a transform function
        return this.mwApi.edit(title, function () {
            return {
                text: content,
                summary: summary,
                ...options
            };
        });
    }

    // ── Rate-limit discovery ───────────────────────────────────────────────

    /**
     * Fetch the current user's edit rate limits.
     * Falls back to `{ hits: 5, seconds: 1 }` when no data is available.
     * @returns {Promise<{ hits: number, seconds: number }>}
     */
    async fetchUserRateLimits() {
        const DEFAULT = { hits: 5, seconds: 1 };
        try {
            const data = await this._get({
                action: 'query',
                meta: 'userinfo',
                uiprop: 'ratelimits',
            });
            const editBuckets = data?.query?.userinfo?.ratelimits?.edit;
            const bucket = editBuckets?.user ?? null;
            if (bucket?.hits && bucket?.seconds) {
                console.log(`[CBM-API] Rate limit: ${bucket.hits}/${bucket.seconds}s`);
                return { hits: bucket.hits, seconds: bucket.seconds };
            }

            // Sysops / bots may have no enforced limit — treat as unlimited,
            // but cap at a safe high value to avoid hammering the server.
            console.warn('[CBM-API] No edit rate limit found — using default.');
            return DEFAULT;
        } catch (err) {
            console.error('[CBM-API] fetchUserRateLimits failed — using default.', err);
            return DEFAULT;
        }
    }

    // ── Private ────────────────────────────────────────────────────────────

    /**
     * Perform a GET request via `mw.Api.get()`.
     * Always injects `format: 'json'`.
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async _get(params) {
        try {
            return await this.mwApi.get({ ...params, format: 'json' });
        } catch (err) {
            console.error('[CBM-API] Request failed', params, err);
            throw err;
        }
    }
}

// === src/services/BatchProcessor.js ===
/**
 * Batch processor for handling multiple file operations
 * @class BatchProcessor
 */





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
                const result = await this.category_service.updateCategoriesOptimized(
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
                    // Record as failed so reports are complete
                    results.processed++;
                    results.failed++;
                    results.errors.push({ file: file.title, error: 'Rate limited' });
                    results.fileResults.push({
                        file: file.title,
                        status: FILE_STATUS.FAILED,
                        message: 'Rate limited — skipped after backoff'
                    });
                    onError(file, error);
                    return;
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

// === src/services/CategoryService.js ===
/**
 * Service for category operations on files
 * @class CategoryService
 */






class CategoryService {
    /**
     * @param {APIService} api_service - API service instance
     */
    constructor(api_service) {
        this.api = api_service;
        this.parser = new WikitextParser();
    }

    /**
     * Build an edit summary from add/remove lists
     * @param {Array<string>} toAdd - Categories added
     * @param {Array<string>} toRemove - Categories removed
     * @returns {string} Edit summary
     */
    buildEditSummary(toAdd, toRemove) {
        const parts = [];
        if (toAdd.length) parts.push(`Adding ${toAdd.map(this.categoryLink).join(', ')}`);
        if (toRemove.length) parts.push(`Removing ${toRemove.map(this.categoryLink).join(', ')}`);
        return `${parts.join('; ')} (via Category Batch Manager)`;
    }
    /**
     * Combined add and remove operation using mw.Api.edit() for better conflict handling.
     * Relies on mw.Api.edit internals:
     *   - callback receives { timestamp, content } (content = revision.slots.main.content)
     *   - callback must return { text, summary, minor } or a Promise resolving to one
     *   - returning $.Deferred().reject() aborts the edit chain cleanly
     *   - final resolved value is data.edit = { result: "Success", ... }
     *
     * @param {string} fileTitle - File page title
     * @param {Array<string>} toAdd - Categories to add
     * @param {Array<string>} toRemove - Categories to remove
     * @returns {Promise<{success: boolean, modified: boolean, error?: string}>}
     */
    async updateCategoriesOptimized(fileTitle, toAdd, toRemove) {
        const api = new mw.Api();
        const parser = this.parser;
        const buildEditSummary = this.buildEditSummary.bind(this);

        try {
            const editResult = await api.edit(fileTitle, function (revision) {
                // revision.content = revision.slots.main.content (mapped by mw.Api.edit)
                let newWikitext = revision.content;

                // Remove categories first
                for (const category of toRemove) {
                    newWikitext = parser.removeCategory(newWikitext, category);
                }

                // Then add new categories
                for (const category of toAdd) {
                    if (!parser.hasCategory(newWikitext, category)) {
                        newWikitext = parser.addCategory(newWikitext, category);
                    }
                }

                // Abort cleanly if no changes — returning false would stringify to "false"
                // and overwrite the page, so we reject the promise chain instead.
                if (newWikitext === revision.content) {
                    return Promise.reject('no-changes');
                }
                const summary = buildEditSummary(toAdd, toRemove);
                return {
                    text: newWikitext,
                    summary: summary,
                    minor: false,
                    assert: mw.config.get('wgUserName') ? 'user' : undefined,
                    nocreate: true,
                    tags: 'CategoryBatchManager'
                };
            });

            // editResult = data.edit = { result: "Success", pageid, title, ... }
            return {
                success: editResult.result === 'Success',
                modified: true
            };

        } catch (error) {

            // Handle specific error codes from mw.Api
            if (error === 'nocreate-missing') {
                return { success: false, modified: false, error: 'Page does not exist' };
            }
            if (error === 'invalidtitle') {
                return { success: false, modified: false, error: 'Invalid title' };
            }
            if (error === 'unknown') {
                return { success: false, modified: false, error: 'Unknown API error' };
            }
            // Thrown by our $.Deferred().reject('no-changes') above
            if (error === 'no-changes') {
                return { success: true, modified: false };
            }
            // MediaWiki API "no changes" error (edge case from server side)
            if (error && error.message && error.message.includes('no changes')) {
                return { success: true, modified: false };
            }
            throw error;
        }
    }
    categoryLink(category) {
        const catName = category.startsWith('Category:') ? category.slice(9) : category;
        return `[[Category:${catName}]]`;
    }
}

// === src/services/SearchService.js ===
/**
 * Data-layer service responsible for file search and detail enrichment.
 * Has no knowledge of UI state or progress reporting beyond the callbacks
 * it receives.
 * @class SearchService
 */




class SearchService {
    /**
     * @param {APIService} api - API service instance
     */
    constructor(api) {
        this.api = api;
        this.shouldStopSearch = false;
    }

    /**
     * Signal the service to abort the current search at the next checkpoint.
     * Called exclusively by SearchHandler — never directly from UI.
     */
    stopSearch() {
        this.shouldStopSearch = true;
        console.log('[CBM-FS] Stop requested');
    }

    /**
     * Reset the stop flag before starting a new search.
     * @private
     */
    resetSearchFlag() {
        this.shouldStopSearch = false;
    }

    async searchWithPattern(srsearch) {
        return this.searchWithPatternCallback(srsearch, undefined, {});
    }
    /**
     * Search files matching `srsearch` and enrich each result with full
     * category + thumbnail data.
     *
     * @param {string}   srsearch
     * @param {number}   limit - Maximum number of search results to process (passed to API)
     * @param {Object}   [callbacks={}]
     * @param {Function} [callbacks.onProgress]          - (text) => void
     * @param {Function} [callbacks.onProgressFileDetails] - (text, percent) => void
     * @returns {Promise<FileModel[]>}
     */
    async searchWithPatternCallback(srsearch, limit = 5000, callbacks = {}) {
        this.resetSearchFlag();
        const searchResults = await this.api.searchInCategoryWithPattern(srsearch, limit, {
            onProgress: text => callbacks.onProgress?.(text),
        });

        if (this.shouldStopSearch) {
            console.log('[CBM-FS] Search stopped after API call');
            return [];
        }
        const totalResults = searchResults.length;
        return this._getFilesDetails(searchResults, {
            onProgress: (totalFetched) => {
                const percent = totalResults > 0 ? Math.round((totalFetched / totalResults) * 100) : 100;
                callbacks.onProgressFileDetails?.(
                    `Fetching details for ${totalFetched} of ${totalResults} files…`,
                    percent
                );
            },
        });
    }

    /**
     * Fetch and parse detailed info for a list of raw file objects.
     * Processes in batches of 50 (the API limit for `prop=categories|imageinfo`).
     * @param {Array<{ title: string }>} files
     * @param {Object} [callbacks={}]
     * @returns {Promise<FileModel[]>}
     */
    async _getFilesDetails(files, callbacks = {}) {
        if (!files?.length) return [];

        const batches = this.createBatches(files, 50); // 50 = API limit
        const results = [];
        for (const batch of batches) {
            // Check if search was stopped
            if (this.shouldStopSearch) {
                console.log('[CBM-FS] Search stopped during file details fetch');
                // NOTE: should we return partial results here, or just an empty array? For now, let's return what we have so far.
                break;
            }

            const titles = batch.map(f => f.title);
            const info = await this.api.getFileInfo(titles);
            results.push(...this._parseFileInfo(info));
            callbacks.onProgress?.(results.length);
        }
        return results;
    }

    /**
     * Split an array into fixed-size batches.
     *
     * @param {Array}  array - Source array
     * @param {number} size  - Maximum items per batch
     * @returns {Array<Array>}
     */
    createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }

    /**
     * Map a raw `query.pages` API response to `FileModel` instances.
     * Skips pages with a negative ID (missing / invalid).
     * @param {Object} apiResponse
     * @returns {FileModel[]}
     */
    _parseFileInfo(apiResponse) {
        const pages = apiResponse?.query?.pages ?? {};
        const fileModels = [];

        for (const pageId of Object.keys(pages)) {
            if (parseInt(pageId) < 0) continue; // skip missing / invalid pages

            const page = pages[pageId];
            const categories = (page.categories ?? []).map(cat => cat.title);
            const imageinfo = page.imageinfo && page.imageinfo[0];

            fileModels.push(new FileModel({
                title: page.title,
                pageid: page.pageid,
                selected: true,
                currentCategories: categories,
                thumbnail: imageinfo ? imageinfo.url : '',
                size: imageinfo ? imageinfo.size : 0,
            }));
        }

        return fileModels;
    }
}

// === src/ui/components/CategoryLookup.js ===
/**
 * Multiselect-lookup wrapper for category autocomplete fields.
 * Emits no events of its own — all logic is delegated to the injected handler.
 * @returns {Object} Vue component configuration
 */

function CategoryLookup() {
    return {
        name: "CategoryLookup",
        props: {
            /** Reactive data object (chips, selected, input, menuItems, menuConfig, message) */
            model: { type: Object, required: true },
            label: { type: String, required: true },
            ariaLabel: { type: String, required: true },
            placeholder: { type: String, default: 'Type to search categories' },
            /** 'add' | 'remove' — passed through to the handler */
            type: { type: String, required: true },
            /** CategoryInputsHandler instance */
            handler: { type: Object, required: true },
        },

        template: `
            <div class="cbm-category-lookup">
                <!-- Input Group -->
                <div class="cbm-category-input-group">
                    <cdx-label class="cbm-label">
                        {{ label }}
                    </cdx-label>

                    <cdx-multiselect-lookup
                        v-model:input-chips="model.chips"
                        v-model:selected="model.selected"
                        v-model:input-value="model.input"
                        :menu-items="model.menuItems"
                        :menu-config="model.menuConfig"
                        :aria-label="ariaLabel"
                        :placeholder="placeholder"
                        @update:input-value="onInput"
                        @load-more="onLoadMore">
                        <template #no-results>
                            No results found
                        </template>
                    </cdx-multiselect-lookup>
                </div>

                <!-- Message -->
                <div
                    v-if="model.message?.show"
                    class="margin-bottom-20">
                    <cdx-message
                        :key="model.message.key"
                        allow-user-dismiss
                        :type="model.message.type"
                        :inline="false"
                        @dismiss="hideMessage">
                        {{ model.message.text }}
                    </cdx-message>
                </div>
            </div>
        `,

        methods: {
            async onInput(value) {
                this.hideMessage();

                const data = await this.handler.onCategoryInput(
                    value,
                    this.model.input,
                    this.type
                );

                if (data !== null) {
                    this.model.menuItems = data;
                }
            },

            async onLoadMore() {
                const results = await this.handler.onLoadMore(
                    this.model,
                    this.type
                );

                if (results && results.length > 0) {
                    this.model.menuItems.push(...results);
                }
            },

            hideMessage() {
                if (this.model.message) {
                    this.model.message.show = false;
                    this.model.message.text = "";
                }
            },
        },
    }
}

// === src/ui/components/PreviewTable.js ===
/**
 * PreviewTable Component
 * Uses Codex CdxTable to display preview changes
 * @returns {Object} Vue component definition
 */

function PreviewTable() {
    return {
        name: 'PreviewTable',
        props: {
            rows: {
                type: Array,
                required: true,
                default: () => []
            }
        },
        data() {
            return {
                sort: { file: 'asc' }
            };
        },
        template: `
            <cdx-table
                v-model:sort="sort"
                class="cdx-docs-table-with-sort cbm-preview-table"
                caption="Preview of changes"
                :hideCaption="true"
                :columns="columns"
                :showVerticalBorders="true"
                :data="sortedData"
                @update:sort="onSort"
            >
                <template #item-file="{ item }">
                    <a
                        :href="'https://commons.wikimedia.org/wiki/' + encodeURIComponent(item)"
                        target="_blank"
                        class="cbm-file-link"
                    >{{ item }}</a>
                </template>

                <template #item-wouldAdd="{ item }">
                    <div v-if="item.length > 0" class="cbm-category-list cbm-add">
                        <span v-for="(cat, index) in item" :key="index" class="cbm-category-tag cbm-tag-add">
                            + {{ cat }}
                        </span>
                    </div>
                    <span v-else class="cbm-empty-cell">-</span>
                </template>

                <template #item-wouldRemove="{ item }">
                    <div v-if="item.length > 0" class="cbm-category-list cbm-remove">
                        <span v-for="(cat, index) in item" :key="index" class="cbm-category-tag cbm-tag-remove">
                            - {{ cat }}
                        </span>
                    </div>
                    <span v-else class="cbm-empty-cell">-</span>
                </template>
            </cdx-table>
        `,
        computed: {
            columns() {
                return [
                    { id: 'file', label: 'File', allowSort: true },
                    { id: 'wouldAdd', label: 'Will Add' },
                    { id: 'wouldRemove', label: 'Will Remove' }
                ];
            },
            tableData() {
                return this.rows.map(row => ({
                    file: row.file,
                    wouldAdd: row.wouldAdd || [],
                    wouldRemove: row.wouldRemove || []
                }));
            },
            sortedData() {
                const sortKey = Object.keys(this.sort)[0];
                const sortOrder = this.sort[sortKey];

                if (sortOrder === 'none') {
                    return this.tableData;
                }

                // Use local variable with JSDoc to fix TS error about tableData being a function
                /** @type {any[]} */
                const data = (/** @type {any} */ (this)).tableData;
                const sorted = [...data].sort((a, b) => {
                    let comparison = 0;

                    if (sortKey === 'file') {
                        comparison = a.file.localeCompare(b.file);
                    }

                    return sortOrder === 'asc' ? comparison : -comparison;
                });

                return sorted;
            }
        },
        methods: {
            onSort(newSort) {
                this.sort = newSort;
            }
        }
    };
}

// === src/ui/components/ProgressBar.js ===
/**
 * Progress Bar Component
 * Displays a progress bar with percentage and status text
 * @returns {Object} Vue component configuration
 */
function ProgressBar() {
    return {
        props: {
            visible: {
                type: Boolean,
                default: false
            },
            percent: {
                type: Number,
                default: 0
            },
            text: {
                type: String,
                default: ''
            }
        },
        template: `
            <div v-if="visible || text !== ''"
                    class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div class="cbm-progress-bar-fill"
                            :style="{ width: percent + '%' }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ text }}
                </div>
            </div>
        `
    };
}

// === src/ui/components/Tab.js ===
/**
 * Tab component wrapper for Wikimedia Codex CdxTab
 * Individual tab item within Tabs container
 * @returns {Object} Vue component configuration
 */

function Tab() {
    return {
        name: "Tab",
        props: {
            /** Unique identifier for the tab (required) */
            name: { type: String, required: true },
            /** Display label for the tab header */
            label: { type: String, required: true },
        },

        template: `
            <cdx-tab
                :name="name"
                :label="label">
                <slot></slot>
            </cdx-tab>
        `,
    };
}

// === src/ui/components/Tabs.js ===
/**
 * Tabs component wrapper for Wikimedia Codex CdxTabs
 * Container for Tab components - handles active tab state and navigation
 * @returns {Object} Vue component configuration
 */

function Tabs() {
    return {
        name: "Tabs",
        props: {
            /** The name of the currently active tab (for v-model:active binding) */
            active: { type: String, default: null },
            /** Whether to display tabs in framed visual style */
            framed: { type: Boolean, default: false },
        },

        template: `
            <cdx-tabs
                :active="active"
                :framed="framed"
                @update:active="onUpdateActive">
                <slot></slot>
            </cdx-tabs>
        `,

        methods: {
            onUpdateActive(tabName) {
                this.$emit('update:active', tabName);
            },
        },
    };
}

// === src/ui/panels/CategoryInputsPanel.js ===
/**
 * Category add/remove multiselect inputs panel.
 * @returns {Object} Partial Vue app configuration
 */



function CategoryInputsPanel() {
    return {
        props: {
            addCategory: {
                type: Object,
                required: true
            },
            removeCategory: {
                type: Object,
                required: true
            },
            handler: {
                type: Object,
                required: true
            }
        },
        template: `
            <CategoryLookup
                :model="addCategory"
                label="Add categories"
                aria-label="Add categories"
                placeholder="Type to search categories"
                type="add"
                :handler="handler"
            />

            <CategoryLookup
                :model="removeCategory"
                label="Remove categories"
                aria-label="Remove categories"
                placeholder="Type to search categories"
                type="remove"
                :handler="handler"
            />
        `,
        components: {
            CategoryLookup: CategoryLookup()
        }

    }

}

// === src/ui/panels/ExecutePanel.js ===
/**
 * Execute Panel Vue component
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @returns {Object} Vue component configuration
 */
function ExecutePanel() {
    return {
        props: {
            executeHandler: {
                type: Object,
                required: true
            },
            progressHandler: {
                type: Object,
                required: true
            },
            changesHelpers: {
                type: Object,
                required: true
            },
            sourceCategory: {
                type: String,
                default: ''
            },
            selectedFiles: {
                type: Array,
                default: () => []
            },
            addCategory: {
                type: Object,
                required: true
            },
            removeCategory: {
                type: Object,
                required: true
            }
        },
        data() {
            return {
                // Processing state
                isProcessing: false,

                // Confirmation dialog
                openConfirmDialog: false,
                preparation: [],
                confirmMessage: '',
                confirmPrimaryAction: {
                    label: 'Confirm',
                    actionType: 'progressive'
                },
                confirmDefaultAction: {
                    label: 'Cancel'
                }
            };
        },
        emits: ['display-message', 'update:is-processing', 'update:progress-percent', 'update:progress-text', 'show-warning-message', 'show-success-message', 'show-error-message', 'execution-complete'],
        template: `
                <cdx-button
                    v-if="!isProcessing"
                    @click="executeOperation"
                    action="progressive"
                    weight="primary">
                    GO
                </cdx-button>
                <cdx-button
                    v-if="isProcessing"
                    @click="stopOperation"
                    action="destructive"
                    weight="primary">
                    Stop Process
                </cdx-button>
                <cdx-dialog
                    v-model:open="openConfirmDialog"
                    title="Confirm Batch Update"
                    :use-close-button="true"
                    :primary-action="confirmPrimaryAction"
                    :default-action="confirmDefaultAction"
                    @primary="confirmOnPrimaryAction"
                    @default="openConfirmDialog = false">
                    <p>{{ confirmMessage }}</p>
                </cdx-dialog>
        `,
        methods: {
            /**
             * Execute batch operation
             * Validates and shows confirmation dialog
             */
            executeOperation() {
                console.log('[CBM-E] Starting batch operation');
                const callbacks = {
                    onError: (msg) => {
                        this.$emit('display-message', msg, 'error', 'add');
                    },
                    onWarning: (msg) => {
                        this.$emit('display-message', msg, 'warning', 'add');
                    }
                };

                const preparation = this.changesHelpers.validateAndReturnPreparation(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                    callbacks
                );
                if (!preparation) {
                    console.error('[CBM] preparation failed');
                    return;
                }
                console.log('[CBM-E] Execution result:', preparation.filesToProcess.length, 'items');

                // Generate confirmation message
                this.confirmMessage = this.executeHandler.generateConfirmMessage(
                    preparation.filesCount,
                    preparation.validAddCategories,
                    preparation.removeCategories
                );
                this.preparation = preparation;

                // Show dialog
                this.openConfirmDialog = true;
            },

            /**
             * Handle confirmation dialog primary action
             */
            async confirmOnPrimaryAction() {
                this.openConfirmDialog = false;
                console.log('[CBM-E] User confirmed operation');

                this.isProcessing = true;
                this.$emit('update:is-processing', true);

                await this.processBatch(this.preparation);
            },

            /**
             * Process batch with progress tracking
             * @param {Object} preparation - Prepared operation data
             */
            async processBatch(preparation) {
                try {
                    const callbacks = {
                        onProgress: (percent, results) => {
                            this.$emit('update:progress-percent', Math.round(percent));
                            this.$emit('update:progress-text',
                                `Processing ${results.processed} of ${results.total}... ` +
                                `(${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed)`
                            );
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
                            console.error(`[CBM-E] ✗ ${file.title}:`, error?.message || error);
                        }
                    };

                    const results = await this.executeHandler.executeBatch(
                        preparation.filesToProcess,
                        preparation.validAddCategories,
                        preparation.removeCategories,
                        callbacks
                    );

                    this.isProcessing = false;
                    this.$emit('update:is-processing', false);
                    this.$emit('update:progress-text', '');
                    this.$emit('update:progress-percent', 0);

                    // Format and show completion message
                    const completion = this.progressHandler.formatCompletionMessage(
                        results,
                        this.executeHandler.shouldStop()
                    );

                    if (completion.type === 'warning') {
                        this.$emit('show-warning-message', completion.message);
                    } else {
                        this.$emit('show-success-message', completion.message);
                    }

                    // Emit complete results for reports
                    this.$emit('execution-complete', {
                        fileResults: results.fileResults || [],
                        summary: {
                            total: results.total,
                            successful: results.successful,
                            skipped: results.skipped,
                            failed: results.failed
                        }
                    });

                } catch (error) {
                    console.error('[CBM-E] Batch processing error:', error);
                    this.isProcessing = false;
                    this.$emit('update:is-processing', false);
                    this.$emit('update:progress-text', '');
                    this.$emit('show-error-message', `Batch processing failed: ${error.message}`);
                }
            },

            /**
             * Stop ongoing batch operation
             */
            stopOperation() {
                this.executeHandler.stopBatch();
            }
        }
    };
}

// === src/ui/panels/FilesListPanel.js ===
/**
 * File list panel — renders matched files with select/deselect controls.
 * @returns {Object} Partial Vue app configuration
 */
function FilesListPanel() {
    return {
        props: {
            workFiles: {
                type: Array,
                default: () => []
            }
        },
        computed: {
            selectedCount: function () {
                return this.workFiles.filter(f => f.selected).length;
            },
            selectedFiles: function () {
                return this.workFiles.filter(f => f.selected);
            },
            totalFilesCount: function () {
                return this.workFiles.length;
            }
        },
        template: `
            <div v-if="workFiles.length > 0" class="cbm-files-list">
                <!-- Results Header -->
                <div class="cbm-files-header">
                    <div class="cbm-count-badge">
                        <strong>{{ totalFilesCount }}</strong> files
                    </div>
                    <div class="cbm-header-buttons">
                        <cdx-button @click="selectAll" action="default" weight="quiet" size="medium">
                            Select All
                        </cdx-button>
                        <cdx-button @click="deselectAll" action="default" weight="quiet" size="medium">
                            Deselect All
                        </cdx-button>
                    </div>
                </div>

                <!-- File List -->
                <div class="cbm-files-scrollable">
                    <div
                        v-for="(file, index) in workFiles"
                        :key="file.pageid"
                        class="cbm-file-row">
                        <cdx-checkbox
                            v-model="file.selected"
                            :input-id="'file-' + file.pageid"
                            :aria-label="file.title" />
                        <cdx-label :for="'file-' + file.pageid">
                            <a :href="'https://commons.wikimedia.org/wiki/' + encodeURIComponent(file.title)" target="_blank" @click.stop>
                                {{ file.title }}
                            </a>
                        </cdx-label>
                        <button
                            class="cbm-file-remove-btn"
                            title="Remove from list"
                            @click="removeFile(index)">
                            ×
                        </button>
                    </div>
                </div>
                <div class="cbm-selected-info">
                    Selected: <strong>{{ selectedCount }}</strong> files
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="cbm-empty-state">
                <p>No files found. Use the search to find files.</p>
            </div>
        `,
        methods: {
            selectAll: function () {
                this.workFiles.forEach(f => f.selected = true);
            },
            deselectAll: function () {
                this.workFiles.forEach(f => f.selected = false);
            },
            removeFile: function (index) {
                if (index >= 0 && index < this.workFiles.length) {
                    this.workFiles.splice(index, 1);
                }
            }
        }
    };

}

// === src/ui/panels/MessageDisplayPanel.js ===
/**
 * Fixed-position message banner.
 * Mixin-style: exposes `showSuccessMessage`, `showWarningMessage`,
 * `showErrorMessage` to the parent component.
 * @returns {Object} Partial Vue app configuration
 */
function MessageDisplayPanel() {
    const app = {
        data() {
            return {
                showMessage: false,
                messageType: '',
                messageContent: '',
                messageKey: 0,
            };
        },

        template: `
        <!-- Message Display -->
        <div v-if="showMessage" class="cbm-fixed-message">
            <cdx-message
                :key="messageKey"
                allow-user-dismiss
                :type="messageType"
                :fade-in="true"
                :auto-dismiss="true"
                :display-time="3000"
                dismiss-button-label="Close"
                @dismissed="handleMessageDismiss"
            >
                {{ messageContent }}
            </cdx-message>
        </div>
        `,

        methods: {
            handleMessageDismiss() {
                this.showMessage = false;
                this.messageContent = '';
            },
            _renderMessage(message, type = 'info') {
                console.warn(`[CBM] ${type}:`, message);

                // Hide first to trigger reactivity if it was already showing
                this.showMessage = false;
                this.$nextTick(() => {
                    this.messageType = type;
                    this.messageContent = message;
                    this.messageKey++; // Increment key to force component re-render
                    this.showMessage = true;
                });
            },

            showWarningMessage(message) {
                this._renderMessage(message, 'warning');
            },

            showErrorMessage(message) {
                this._renderMessage(message, 'error');
            },

            showSuccessMessage(message) {
                this._renderMessage(message, 'success');
            }
        }
    }
    return app;
}

// === src/ui/panels/PreviewPanel.js ===
/**
 * PreviewPanel
 * @returns {Object} Vue app configuration
 */



function PreviewPanel() {
    return {
        props: {
            isProcessing: {
                type: Boolean,
                default: false
            },
            sourceCategory: {
                type: String,
                default: ''
            },
            selectedFiles: {
                type: Array,
                default: () => []
            },
            addCategorySelected: {
                type: Array,
                default: () => []
            },
            removeCategorySelected: {
                type: Array,
                default: () => []
            },
            changesHelpers: {
                type: Object,
                required: true
            }
        },
        data() {
            return {
                previewRows: [],
                changesCount: 0,
                openPreviewDialog: false,
            };
        },

        template: `
            <cdx-button
                action="default"
                weight="normal"
                :disabled="isProcessing"
                @click="handlePreview">
                Preview Changes
            </cdx-button>
            <cdx-dialog
                v-model:open="openPreviewDialog"
                class="cbm-preview-dialog"
                title="Preview Changes"
                :use-close-button="true"
                @default="openPreviewDialog = false"
            >
                <p v-if="changesCount > 0">
                    {{ changesCount }} file(s) will be updated.
                </p>
                <p v-else>
                    No changes detected. Adjust categories and preview again.
                </p>

                <PreviewTable :rows="previewRows" />

                <template #footer-text>
                </template>
            </cdx-dialog>
        `,

        emits: ['display-message'],

        components: {
            PreviewTable: PreviewTable(),
        },
        methods: {
            handlePreview: function () {
                console.log('[CBM-P] Preview button clicked');
                const callbacks = {
                    onError: (msg) => {
                        this.$emit('display-message', msg, 'error', 'add');
                    },
                    onWarning: (msg) => {
                        this.$emit('display-message', msg, 'warning', 'add');
                    }
                };

                const prep = this.changesHelpers.validateAndReturnPreparation(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategorySelected,
                    this.removeCategorySelected,
                    callbacks
                );
                if (!prep) {
                    console.error('[CBM] preparation failed');
                    return;
                }
                console.log('[CBM-P] Preview result:', prep.filesToProcess.length, 'items');

                this.previewRows = prep.filesToProcess;
                this.changesCount = prep.filesToProcess.length;

                if (!this.changesCount) {
                    console.log('[CBM] No changes detected');
                    this.$emit('display-message', 'ℹ️ No changes detected.', 'notice', 'add');
                }
                console.log('[CBM-P] Opening preview dialog');
                this.openPreviewDialog = true;
            },
        },
    };
}

// === src/ui/panels/ReportsPanel.js ===
/**
 * Reports Panel Vue component
 * Displays detailed results of batch operations in a table
 * @returns {Object} Vue component configuration
 */
function ReportsPanel() {
    return {
        name: "ReportsPanel",
        props: {
            fileResults: {
                type: Array,
                default: () => []
            },
            summary: {
                type: Object,
                default: () => ({ ...DEFAULT_EXECUTION_SUMMARY })
            }
        },

        data() {
            return {
                filter: 'all' // 'all', 'success', 'skipped', 'failed'
            };
        },

        computed: {
            filteredResults: function () {
                if (this.filter === 'all') {
                    return this.fileResults;
                }
                return this.fileResults.filter(r => r.status === this.filter);
            },

            hasResults: function () {
                return this.fileResults.length > 0;
            },

            tableData: function () {

                return this.filteredResults.map((r, index) => ({
                    index: index + 1,
                    file: r.file,
                    status: r.status,
                    statusLabel: this.getStatusLabel(r.status),
                    message: r.message
                }));
            },

            tableColumns: function () {
                return [
                    { id: 'index', label: '#', width: '50px' },
                    { id: 'file', label: 'File' },
                    { id: 'status', label: 'Status', width: '120px' },
                    { id: 'message', label: 'Message' }
                ];
            }
        },

        template: `
            <div class="cbm-reports-panel">
                <!-- Summary Cards -->
                <div v-if="hasResults" class="cbm-reports-summary">
                    <div class="cbm-summary-card cbm-summary-total">
                        <span class="cbm-summary-number">{{ summary.total }}</span>
                        <span class="cbm-summary-label">Total</span>
                    </div>
                    <div class="cbm-summary-card cbm-summary-success">
                        <span class="cbm-summary-number">{{ summary.successful }}</span>
                        <span class="cbm-summary-label">Successful</span>
                    </div>
                    <div class="cbm-summary-card cbm-summary-skipped">
                        <span class="cbm-summary-number">{{ summary.skipped }}</span>
                        <span class="cbm-summary-label">No Change</span>
                    </div>
                    <div class="cbm-summary-card cbm-summary-failed">
                        <span class="cbm-summary-number">{{ summary.failed }}</span>
                        <span class="cbm-summary-label">Failed</span>
                    </div>
                </div>

                <!-- Filter Buttons -->
                <div v-if="hasResults" class="cbm-reports-filters">
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'all' }]"
                        @click="filter = 'all'"
                        weight="quiet">
                        All ({{ fileResults.length }})
                    </cdx-button>
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'success' }]"
                        @click="filter = 'success'"
                        weight="quiet">
                        Successful ({{ summary.successful }})
                    </cdx-button>
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'skipped' }]"
                        @click="filter = 'skipped'"
                        weight="quiet">
                        No Change ({{ summary.skipped }})
                    </cdx-button>
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'failed' }]"
                        @click="filter = 'failed'"
                        weight="quiet">
                        Failed ({{ summary.failed }})
                    </cdx-button>
                </div>

                <!-- Results Table -->
                <div v-if="hasResults" class="cbm-reports-table-container">
                    <cdx-table
                        :data="tableData"
                        :columns="tableColumns"
                        :use-row-headers="false"
                        class="cbm-reports-table"
                        caption="Detailed Results"
                        :hideCaption="true"
                    >
                        <template #item-file="{ row }">
                            <a :href="'https://commons.wikimedia.org/wiki/' + encodeURIComponent(row.file)" target="_blank">
                                {{ row.file }}
                            </a>
                        </template>
                        <template #item-status="{ row }">
                            <span :class="['cbm-status-badge', 'cbm-badge-' + row.status]">
                                {{ row.statusLabel }}
                            </span>
                        </template>
                    </cdx-table>
                </div>

                <!-- Empty State -->
                <div v-else class="cbm-reports-empty">
                    <p>No reports available yet.</p>
                    <p class="cbm-reports-hint">Run a batch operation to see detailed results here.</p>
                </div>
            </div>
        `,

        methods: {
            getStatusLabel(status) {
                const labels = {
                    [FILE_STATUS.SUCCESS]: 'Success',
                    [FILE_STATUS.SKIPPED]: 'No Change',
                    [FILE_STATUS.FAILED]: 'Failed'
                };
                return labels[status] || status;
            }
        }
    };
}

// === src/ui/panels/SearchPanel.js ===
/**
 * Search panel — UI layer only.
 * All business logic is delegated to SearchHandler.
 * @returns {Object} Partial Vue app configuration (data + template + methods)
 */

function SearchPanel() {
    return {
        props: {
            searchHandler: {
                type: Object,
                required: true
            },
            defaultCategory: {
                type: String,
                default: ''
            },
            api: {
                type: Object,
                required: true
            }
        },
        data() {
            return {

                // ── User inputs ──────────────────────────────────────────
                sourceCategory: this.defaultCategory,
                titlePattern: '',
                searchPattern: '',
                searchLimit: 50,

                workFiles: [],
                // ── UI state (mirrors handler state via callbacks) ────────
                isSearching: false,
                searchProgressText: '',
                searchProgressPercent: 0,

                // ── Category lookup state ───────────────────────────────
                categoryMenuItems: [],
                categoryMenuConfig: { boldLabel: true, visibleItemLimit: 10 },
                selectedCategory: '',
            };
        },
        emits: ['show-warning-message', 'update:work-files', 'update:source-category', 'update:search-progress-percent', 'update:search-progress-text'],

        template: `
    <div class="cbm-search-panel">
        <div class="cdx-fields-3by4">
            <!-- :status="weightStatus"
                :messages="weightMessages" -->
            <cdx-field
                class="cdx-field-3by4-3"
                >
                <template #label>
                    Source Category
                </template>
                <template #description></template>
                <cdx-lookup
                    v-model:input-value="sourceCategory"
                    v-model:selected="selectedCategory"
                    :menu-items="categoryMenuItems"
                    :menu-config="categoryMenuConfig"
                    :disabled="searchPattern.trim() !== ''"
                    placeholder=""
                    aria-label="Source Category"
                    @input="onCategoryInput">
                    <template #default="{ menuItem }">
                        {{ menuItem.label }}
                    </template>
                    <template #no-results> No results found </template>
                </cdx-lookup>
            </cdx-field>
            <cdx-field
                class="cdx-field-3by4-1"
            >
                <template #label> In-title pattern </template>
                <template #description></template>
                <template #help-text> </template>
                <cdx-text-input
                    v-model="titlePattern"
                    :disabled="searchPattern.trim() !== ''"
                    placeholder="e.g. ,BLR.svg" />
            </cdx-field>
        </div>

        <div class="cdx-fields cdx-fields-second-set">
            <cdx-field
                class="cbm-column-two-thirds"
                >
                <template #label> Or search pattern </template>
                <template #description></template>
                <cdx-text-input
                    id="cbm-search-pattern"
                    v-model="searchPattern"
                    placeholder="" />
                <template #help-text>
                (e.g., <code> incategory:"CC-BY-4.0" intitle:/Fair/</code >)
                </template>
            </cdx-field>
            <cdx-field
                class="cbm-column-one-third"
            >
                <template #label> Limit </template>
                <template #description> </template>
                <template #help-text></template>

                <cdx-text-input
                    id="cbm-search-limit"
                    v-model.number="searchLimit"
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="Limit default: max" />
            </cdx-field>
        </div>
        <div class="cbm-search-btn">
            <div class="cbm-search-btn-wrap">
                <cdx-button
                    v-if="!isSearching"
                    action="progressive"
                    weight="primary"
                    @click="searchFiles">
                    Search
                </cdx-button>
                <cdx-button
                    v-if="isSearching"
                    action="destructive"
                    weight="primary"
                    @click="stopSearch">
                    Stop
                </cdx-button>
            </div>
        </div>
    </div>
        `,

        methods: {
            /**
             * Handle category input for autocomplete.
             */
            async onCategoryInput(value) {
                if (!value || value.length < 1) {
                    this.categoryMenuItems = [];
                    return;
                }

                try {
                    const categories = await this.api.fetchCategories(value, { limit: 10 });
                    this.categoryMenuItems = categories;
                } catch (error) {
                    this.categoryMenuItems = [];
                }
            },

            /**
             * Initiate a file search.
             * Registers callbacks on the handler then delegates the work.
             */
            async searchFiles() {
                const hasCategory = this.selectedCategory || this.sourceCategory?.trim();
                if (!hasCategory && !this.searchPattern?.trim()) {
                    this.$emit('show-warning-message', 'Please enter a source category or search pattern.');
                    return;
                }

                // Wire up handler callbacks before starting
                this.searchHandler.onProgress = (text, percent) => {
                    this.searchProgressText = text;
                    this.searchProgressPercent = percent;
                    this.$emit('update:search-progress-text', text);
                    this.$emit('update:search-progress-percent', percent);
                };

                this.searchHandler.onComplete = (results) => {
                    this._clearSearchStatus();
                    this.workFiles = results ?? [];
                    // Bubble results up to the parent component
                    this.$emit('update:work-files', this.workFiles);
                };

                this.searchHandler.onError = (error) => {
                    this._clearSearchStatus();
                    this.$emit('show-warning-message', `Search failed: ${error.message}`);
                };

                this.isSearching = true;
                this.searchProgressText = '';
                this.searchProgressPercent = 0;
                if (!this.searchPattern) {
                    this.$emit('update:source-category', this.selectedCategory || this.sourceCategory);
                }
                this.$emit('update:search-progress-text', '');
                this.$emit('update:search-progress-percent', 0);

                // Clear all files and messages from previous search
                this.workFiles = [];
                this.$emit('update:work-files', this.workFiles);

                await this.searchHandler.startSearch(
                    this.selectedCategory || this.sourceCategory,
                    this.titlePattern,
                    this.searchPattern,
                    this.searchLimit
                );
            },

            /**
             * Ask the handler to abort the current search.
             * UI state is reset once the handler fires onComplete/onError.
             */
            stopSearch() {
                this._clearSearchStatus();
                this.searchHandler.stop();
                this.$emit('show-warning-message', 'Search stopped by user.');
            },

            _clearSearchStatus() {
                this.isSearching = false;
                this.searchProgressText = '';
                this.searchProgressPercent = 0;
                this.$emit('update:search-progress-text', '');
                this.$emit('update:search-progress-percent', 0);
            },
        },
    };
}

// === src/ui/handlers/CategoryInputsHandler.js ===
/**
 *
 * @see https://doc.wikimedia.org/codex/latest/
 */



class CategoryInputsHandler {
    /**
     * @param {APIService} api_service - API service instance
     */
    constructor(api_service) {
        this.api_service = api_service;
    }

    deduplicateResults(items1, results) {
        const seen = new Set(items1.map((result) => result.value));
        return results.filter((result) => !seen.has(result.value));
    }

    async onCategoryInput(value, CategoryInput, input_type = 'add') {
        // Clear menu items if the input was cleared.
        if (!value) {
            // console.warn(`${input_type} category input cleared, clearing menu items.`);
            return [];
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 1) {
            // console.warn(`${input_type} category input too short, clearing menu items.`);
            return [];
        }

        const data = await this.api_service.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (CategoryInput !== value) {
            console.warn(`${input_type} category input value changed during fetch, discarding results.`);
            return null;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn(`No results for ${input_type} category input, clearing menu items.`);
            return [];
        }

        return data;
    }
    async onLoadMore(Category, input_type = 'add') {
        if (!Category.input) {
            console.warn(`No input value for ${input_type} categories, cannot load more.`);
            return [];
        }

        const data = await this.api_service.fetchCategories(Category.input, { offset: Category.menuItems.length });

        if (!data || data.length === 0) {
            console.warn(`No more results to load for ${input_type} categories.`);
            return [];
        }

        // Update Category.menuItems.
        const deduplicatedResults = this.deduplicateResults(Category.menuItems, data);
        return deduplicatedResults;
    }
}

// === src/ui/handlers/ExecuteHandler.js ===
/**
 * Execute Operation Handler
 * Handles business logic for batch operations
 * @class ExecuteHandler
 * @requires ChangeCalculator - For calculating which files will actually change
 */



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

// === src/ui/handlers/ProgressHandler.js ===
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
                    `(${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed)`;
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

// === src/ui/handlers/SearchHandler.js ===
/**
 * Orchestrates the search operation.
 * Owns all operation state (isSearching, progress) and acts as the single
 * bridge between the UI layer (SearchPanel) and the data layer (SearchService).
 *
 * Lifecycle of a search:
 *   1. Panel calls startSearch()
 *   2. Handler updates state and fires onProgress callbacks
 *   3. Handler delegates actual work to SearchService
 *   4. Handler fires onComplete or onError when done
 *   5. Panel reflects the new state through the callbacks it registered
 *
 * @class SearchHandler
 */





class SearchHandler {
    /**
     * @param {SearchService} search_service
     */
    constructor(search_service) {
        this.search_service = search_service;

        /** @type {boolean} True while a search is running */
        this.isSearching = false;

        // ── Callback hooks (set by SearchPanel before calling startSearch) ──

        /** @type {function(string, number): void} */
        this.onProgress = null;

        /** @type {function(Array<FileModel>): void} */
        this.onComplete = null;

        /** @type {function(Error): void} */
        this.onError = null;
    }

    /**
     * Start a new search operation.
     * Guards against concurrent searches and manages the full lifecycle.
     *
     * @param {string} categoryName - Category to search in
     * @param {string} titlePattern  - Pattern to match against file titles
     * @return {string} - The constructed search pattern
     */
    createPattern(categoryName, titlePattern) {
        if (!categoryName) {
            return '';
        }
        // Normalize category name
        // Replace spaces with underscores in category name for search API
        const searchCategoryName = categoryName.replace(/^Category:/i, '').replace(/\s+/g, '_');
        if (searchCategoryName.trim() === '') {
            return '';
        }
        let srsearch = `incategory:${searchCategoryName}`;
        // MediaWiki search uses special characters like /, ", ", etc.
        const sanitizedPattern = Validator.sanitizeTitlePattern(titlePattern);

        if (sanitizedPattern.trim() !== '') {
            srsearch += ` intitle:/${sanitizedPattern}/`;
        }
        return srsearch;
    }

    async startSearch(sourceCategory, titlePattern, searchPattern, searchLimit) {
        if (this.isSearching) {
            console.warn('[CBM-SH] Search already in progress — ignoring duplicate call');
            return;
        }
        const pattern = this.createPattern(sourceCategory, titlePattern) || searchPattern;
        if (pattern.trim() === '') {
            const error = new Error('Please provide a valid category name or search pattern.');
            console.error('[CBM-SH] Search failed:', error);
            this.onError?.(error);
            return;
        }
        this.isSearching = true;
        this._fireProgress('Searching for files…', 0);
        searchLimit = (searchLimit && searchLimit > 0) ? searchLimit : 5000; // Default limit if not provided
        try {
            const results = await this.search_service.searchWithPatternCallback(pattern, searchLimit, {
                onProgress: (text) => {
                    this._fireProgress(text, 0);
                },
                onProgressFileDetails: (text, percent) => {
                    this._fireProgress(text, percent);
                }
            });

            this._fireProgress('Search complete', 100);
            this.onComplete?.(results);
        } catch (error) {
            console.error('[CBM-SH] Search failed:', error);
            this.onError?.(error);
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Request the current search to stop at the next safe checkpoint.
     * Safe to call even when no search is running.
     */
    stop() {
        if (!this.isSearching) return;

        console.log('[CBM-SH] Stop requested by user');
        this.search_service.stopSearch();

        // isSearching will be reset to false in the finally block of startSearch
        // once SearchService returns the partial results.
    }

    // ─────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────

    /**
     * Fire the onProgress callback if one is registered.
     * @param {string} text    - Human-readable status message
     * @param {number} percent - Completion percentage (0–100)
     * @private
     */
    _fireProgress(text, percent) {
        this.onProgress?.(text, percent);
    }
}

// === src/ui/helpers/ChangesHelper.js ===
/**
 * Changes Handler
 *
 */




class ChangesHelper {
    /**
     * @param {ValidationHelper} validation_helper - Validation helper instance for validating operations
     */
    constructor(validation_helper) {
        this.validation_helper = validation_helper;
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */
    /**
     * Validate operation before execution
     * @param {Array} selectedFiles - Array of selected files
     * @param {Array} addCategories - Categories to add
     * @param {Array} removeCategories - Categories to remove
     * @returns {Object} Validation result {valid: boolean, error?: string}
     */
    validateOperation(selectedFiles, addCategories, removeCategories) {
        // selectedCount === 0 ||
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
     * @param {String} sourceCategory - The source category
     * @param {Array} addCategorySelected - Categories to add
     * @param {Array} removeCategorySelected - Categories to remove
     * @returns {Object} Preparation result
     */
    prepareOperation(sourceCategory, addCategorySelected, removeCategorySelected) {
        // Check for duplicate categories in both add and remove lists
        const duplicateCheck = this.validation_helper.hasDuplicateCategories(addCategorySelected, removeCategorySelected);
        if (!duplicateCheck.valid) {
            return {
                valid: false,
                error: `Cannot add and remove the same category: "${duplicateCheck.duplicates.join(', ')}". Please remove it from one of the lists.`
            };
        }

        // Filter out circular categories (returns null if ALL are circular)
        const { validAddCategories, circularCategories } = this.validation_helper.filterCircularCategories(addCategorySelected, sourceCategory);

        // If all categories are circular, show error
        if (circularCategories.length > 0 && validAddCategories.length === 0) {
            const message = `❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "${circularCategories.join(', ')}" to itself.`;
            return { valid: false, error: 'Circular categories detected.', message: message };
        }

        // Check if there are no valid categories to add or remove
        if (validAddCategories.length === 0 && removeCategorySelected.length === 0) {
            return { valid: false, error: 'No valid categories to add or remove.' };
        }

        return {
            valid: true,
            validAddCategories: validAddCategories,
            removeCategories: removeCategorySelected
        };
    }

    validateAndPrepare(sourceCategory, addCategorySelected, removeCategorySelected, callbacks = {}) {
        console.log('validateAndPrepare start');

        const {
            onWarning = () => { },
            onError = () => { }
        } = callbacks;

        const preparation = this.prepareOperation(
            sourceCategory,
            addCategorySelected,
            removeCategorySelected
        );

        if (!preparation.valid) {
            if (preparation?.message) {
                onError(preparation.message);
            }
            console.log('[CBM-V] No valid categories after filtering');
            onWarning(preparation.error);
            return;
        }
        return preparation;
    }

    validateAndReturnPreparation(sourceCategory, selectedFiles, addCategorySelected, removeCategorySelected, callbacks = {}) {

        // Validate
        const validation = this.validateOperation(
            selectedFiles,
            addCategorySelected,
            removeCategorySelected,
        );

        if (!validation.valid) {
            console.log('[CBM-P] Validation failed:', validation.error);
            callbacks?.onWarning(validation.error);
            return;
        }

        const preparationCheck = this.validateAndPrepare(
            sourceCategory,
            addCategorySelected,
            removeCategorySelected,
            callbacks
        );
        if (!preparationCheck) {
            console.error('[CBM] preparationCheck failed');
            return;
        }

        // Filter files to only those that will actually change
        // This ensures the confirmation message shows the correct count
        const filesThatWillChange = ChangeCalculator.filterFilesThatWillChange(
            selectedFiles,
            preparationCheck.validAddCategories,
            removeCategorySelected
        );

        const preparation = {
            validAddCategories: preparationCheck.validAddCategories,
            removeCategories: removeCategorySelected,
            filesCount: filesThatWillChange.length,
            filesToProcess: filesThatWillChange
        };
        return preparation;
    }
}

// === src/ui/helpers/ValidationHelper.js ===
/**
 * Validation Helper
 *
 * @description
 * Shared validation logic for BatchManager handlers.
 * Provides common validation functions used by  ExecuteHandler.
 *
 * @requires Validator - For checking circular category references
 */



class ValidationHelper {
    /**
     */
    constructor() {
    }

    /**
     * Check if any category appears in both add and remove lists
     * @param {Array<string>} addCategorySelected - Categories selected to be added
     * @param {Array<string>} removeCategorySelected - Categories selected to be removed
     * @returns {Object} Validation result {valid: boolean, duplicates?: Array<string>}
     */
    hasDuplicateCategories(addCategorySelected, removeCategorySelected) {
        const addCategories = addCategorySelected || [];
        const removeCategories = removeCategorySelected || [];

        if (addCategories.length === 0 || removeCategories.length === 0) {
            return { valid: true };
        }

        const duplicates = [];

        for (const addCat of addCategories) {
            for (const removeCat of removeCategories) {
                const normalizedAdd = Validator.normalizeCategoryName(addCat);
                const normalizedRemove = Validator.normalizeCategoryName(removeCat);

                if (normalizedAdd.toLowerCase() === normalizedRemove.toLowerCase()) {
                    duplicates.push(addCat);
                    break;
                }
            }
        }

        if (duplicates.length > 0) {
            return { valid: false, duplicates };
        }

        return { valid: true };
    }

    /**
     * Check for circular category references and filter them out silently
     * Only shows error if ALL categories are circular
     * @returns {Object} Object with validAddCategories and circularCategories arrays
     */
    filterCircularCategories(addCategory_selected, sourceCategory) {
        const circularCategories = [];
        const validAddCategories = [];
        for (const category of addCategory_selected) {
            if (Validator.isCircularCategory(sourceCategory, category)) {
                console.log('[CBM-V] Circular category detected (silently removed):', category);
                circularCategories.push(category);
            } else {
                validAddCategories.push(category);
            }
        }

        return { validAddCategories, circularCategories };
    }
}

// === src/BatchManagerWrappers.js ===
/**
 * Wrapper components for BatchManager
 * Provides both Dialog and Standalone versions
 */






/**
 * Dialog wrapper for BatchManager
 * Handles showMainDialog state and wraps BatchManager in a CdxDialog
 * @param {HTMLElement} portletLink - The portlet link element that triggers the dialog
 * @returns {Object} Vue app definition
 */

function BatchManagerDialog(portletLink) {

    const innerTemplate = `
        <div class="cbm-tabs-header">
            <cdx-tabs v-model:active="activeTab" :framed="true">
                <cdx-tab name="manager" label="Batch Manager">
                    <BatchManager
                        @execution-complete="handleExecutionComplete"
                        @update:work-files="workFiles = $event"
                        :filesIsCollapsed="filesIsCollapsed"
                    />
                </cdx-tab>
            <cdx-tab name="files" label="Files" v-if="filesIsCollapsed">
                <FilesListPanel
                    :work-files="workFiles"
                />
            </cdx-tab>
            <cdx-tab name="reports" label="Reports">
                <ReportsPanel
                    :file-results="fileResults"
                    :summary="executionSummary"
                />
            </cdx-tab>
        </cdx-tabs>
        <cdx-button
            class="cbm-layout-toggle-btn"
            @click="filesIsCollapsed = !filesIsCollapsed"
            action="default"
            weight="quiet"
            size="small">
            {{ filesIsCollapsed ? '▦' : '☰' }}
        </cdx-button>
        </div>
        `;
    const template = portletLink
        ? `<cdx-dialog
               v-model:open="showMainDialog"
               class="cbm-container"
               title="Category Batch Manager"
               :use-close-button="true"
               close-button-label="Close"
               @default="showMainDialog = false">
               ${innerTemplate}
           </cdx-dialog>`
        : `<div class="cbm-container cbm-container2">
               <h2 class="cbm-title">Category Batch Manager</h2>
               ${innerTemplate}
           </div>
        `;
    const app = {
        name: "BatchManagerDialog",
        data() {
            return {
                showMainDialog: false,
                activeTab: 'manager',
                fileResults: [],
                workFiles: [],
                filesIsCollapsed: true,
                executionSummary: { ...DEFAULT_EXECUTION_SUMMARY }
            };
        },
        methods: {
            openMainDialog() {
                this.showMainDialog = true;
            },
            handleExecutionComplete(results) {
                this.fileResults = results.fileResults;
                this.executionSummary = results.summary;
            }
        },
        template: template,
        mounted() {
            if (portletLink) {
                portletLink.addEventListener('click', this.openMainDialog);
            }
        },
        unmounted() {
            if (portletLink) {
                portletLink.removeEventListener('click', this.openMainDialog);
            }
        },
        components: {
            BatchManager: BatchManager(),
            ReportsPanel: ReportsPanel(),
            FilesListPanel: FilesListPanel(),
        },
    };

    return app;
}

// === src/BatchManager.js ===
/**
 * Assemble the full Vue app from panels and services.
 * Returns only the inner template - use BatchManagerDialog or BatchManagerStandalone for wrappers.
 * @returns {Object} Vue component definition
 */










function BatchManager() {
    // ── Services ──────────────────────────────────────────────────────────
    const api = new APIService();
    const search_service = new SearchService(api);
    const categoryService = new CategoryService(api);
    const batchProcessor = new BatchProcessor(categoryService);

    // ── Helpers ───────────────────────────────────────────────────────────
    const validation_helper = new ValidationHelper();
    const changes_helpers = new ChangesHelper(validation_helper);

    // ── Handlers ──────────────────────────────────────────────────────────
    const search_handler = new SearchHandler(search_service);
    const progress_handler = new ProgressHandler();
    const execute_handler = new ExecuteHandler(batchProcessor);
    const category_inputs_handler = new CategoryInputsHandler(api);

    // ── Panel configurations ──────────────────────────────────────────────
    const defaultCategory =
        mw.config.get('wgCanonicalNamespace') === 'Category'
            ? mw.config.get('wgPageName')
            : "";
    const message_display_panel = MessageDisplayPanel();

    // ── Template ─────────────────────────────────────────────────────────
    const template = `
        <div :class="filesIsCollapsed ? 'cbm-main-layout-expandable' : 'cbm-main-layout-grid'">
            <!-- Left Panel: Search and Actions -->
            <div class="cbm-left-panel-grid">
                <!-- Search Section -->
                <SearchPanel
                    :search-handler="search_handler"
                    :default-category="defaultCategory"
                    :api="api"
                    @show-warning-message="showWarningMessage"
                    @update:work-files="onWorkFilesUpdate"
                    @update:source-category="sourceCategory = $event"
                    @update:search-progress-percent="searchProgressPercent = $event"
                    @update:search-progress-text="searchProgressText = $event" />

                <!-- Search Progress Section -->
                <ProgressBar v-if="filesIsCollapsed"
                    :visible="searchProgressPercent > 0"
                    :percent="searchProgressPercent"
                    :text="searchProgressText" />

                <!-- Actions Section -->
                <div>
                    <CategoryInputsPanel
                        :add-category="addCategory"
                        :remove-category="removeCategory"
                        :handler="category_inputs_handler" />

                    <div class="cbm-button-group">
                        <PreviewPanel
                            :is-processing="isProcessing"
                            :source-category="sourceCategory"
                            :selected-files="selectedFiles"
                            :add-category-selected="addCategory.selected"
                            :remove-category-selected="removeCategory.selected"
                            :changes-helpers="changes_helpers"
                            @display-message="displayCategoryMessage" />
                        <ExecutePanel
                            :execute-handler="execute_handler"
                            :progress-handler="progress_handler"
                            :changes-helpers="changes_helpers"
                            :source-category="sourceCategory"
                            :selected-files="selectedFiles"
                            :add-category="addCategory"
                            :remove-category="removeCategory"
                            @display-message="displayCategoryMessage"
                            @show-warning-message="showWarningMessage"
                            @show-success-message="showSuccessMessage"
                            @show-error-message="showErrorMessage"
                            @update:is-processing="isProcessing = $event"
                            @update:progress-percent="
                                executionProgressPercent = $event
                            "
                            @update:progress-text="executionProgressText = $event"
                            @execution-complete="handleExecutionComplete" />
                    </div>
                </div>
                <!-- Execute Progress Section -->
                <ProgressBar
                    :visible="isProcessing"
                    :percent="executionProgressPercent"
                    :text="executionProgressText" />
            </div>

            <!-- Right Panel: File List -->
            <div class="cbm-right-panel-grid" v-if="!filesIsCollapsed">
                <FilesListPanel
                    :work-files="workFiles"
                />

                <!-- Search Progress Section -->
                <ProgressBar
                    :visible="searchProgressPercent > 0"
                    :percent="searchProgressPercent"
                    :text="searchProgressText" />
            </div>
        </div>
        <!-- Message Display -->
        <div
            v-if="showMessage"
            class="cbm-fixed-message">
            <cdx-message
                :key="messageKey"
                allow-user-dismiss
                :type="messageType"
                :fade-in="true"
                :auto-dismiss="true"
                :display-time="3000"
                dismiss-button-label="Close"
                @dismissed="handleMessageDismiss">
                {{ messageContent }}
            </cdx-message>
        </div>
    `;
    // ── Helper to create lookup model ─────────────────────────────────────
    const createLookupModel = () => ({
        menuItems: [],
        menuConfig: { boldLabel: true, visibleItemLimit: 10 },
        chips: [],
        selected: [],
        input: "",
        message: { show: false, type: "", text: "", key: 0 },
    });

    // ── App definition ────────────────────────────────────────────────────
    const app = {
        props: {
            filesIsCollapsed: {
                type: Boolean,
                default: false
            }
        },
        data() {
            return {
                api: api,
                category_inputs_handler: category_inputs_handler,
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                search_handler: search_handler,

                // Category state (owned by parent)
                addCategory: createLookupModel(),
                removeCategory: createLookupModel(),
                workFiles: [],

                // Execution progress state (for ProgressBar)
                isProcessing: false,
                executionProgressPercent: 0,
                executionProgressText: "",

                // Search progress state (synced from SearchPanel)
                sourceCategory: defaultCategory,
                defaultCategory: defaultCategory,
                searchProgressPercent: 0,
                searchProgressText: "",

                // Merge message display state
                ...message_display_panel.data(),
            };
        },

        computed: {
            selectedFiles: function () {
                return this.workFiles.filter(f => f.selected);
            },
            selectedCount: function () {
                return this.workFiles.filter(f => f.selected).length;
            }
        },

        emits: ['execution-complete', 'update:work-files'],

        methods: {
            ...message_display_panel.methods,

            // Handle work files update - emit to parent
            onWorkFilesUpdate(files) {
                this.workFiles = files;
                this.$emit('update:work-files', files);
            },

            // Helper for CategoryInputsPanel
            displayCategoryMessage(text, type = 'error', target = 'add') {
                const model = target === 'add' ? this.addCategory : this.removeCategory;
                model.message.show = false;
                this.$nextTick(() => {
                    model.message.type = type;
                    model.message.text = text;
                    model.message.show = true;
                    model.message.key++;
                });
            },

            // Handle execution completion - pass through to parent
            handleExecutionComplete(results) {
                this.$emit('execution-complete', results);
            },
        },

        components: {
            SearchPanel: SearchPanel(),
            CategoryLookup: CategoryLookup(),
            PreviewTable: PreviewTable(),
            ProgressBar: ProgressBar(),
            FilesListPanel: FilesListPanel(),
            CategoryInputsPanel: CategoryInputsPanel(),
            PreviewPanel: PreviewPanel(),
            ExecutePanel: ExecutePanel(),
        },
        template: template,
    };

    return app;
}

// === src/gadget-entry.js ===
// <nowiki>




async function initApp(require) {
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    let portletLink = null;
    let mountPoint = document.getElementById('category-batch-manager2');

    if (!mountPoint) {
        if (mw.config.get('wgCanonicalNamespace') !== 'Category') return;

        // work only in Desktop view
        if (!document.getElementById('p-cactions') || document.getElementById('footer-places-desktop-toggle')) return;

        portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );

        mountPoint = document.createElement('div');
        mountPoint.id = 'category-batch-manager2';
        document.body.appendChild(mountPoint);
    }

    const app = BatchManagerDialog(portletLink);


    Vue.createMwApp(app)
        .component('cdx-text-input', Codex.CdxTextInput)
        .component('cdx-textarea', Codex.CdxTextArea)
        .component('cdx-select', Codex.CdxSelect)
        .component('cdx-checkbox', Codex.CdxCheckbox)
        .component('cdx-button', Codex.CdxButton)
        .component('cdx-progress-bar', Codex.CdxProgressBar)
        .component('cdx-message', Codex.CdxMessage)
        .component('cdx-dialog', Codex.CdxDialog)
        .component('cdx-label', Codex.CdxLabel)
        .component('cdx-multiselect-lookup', Codex.CdxMultiselectLookup)
        .component('cdx-table', Codex.CdxTable)
        .component('cdx-lookup', Codex.CdxLookup)
        .component('cdx-tab', Codex.CdxTab)
        .component('cdx-tabs', Codex.CdxTabs)
        .component('cdx-field', Codex.CdxField)
        .component('cdx-toggle-switch', Codex.CdxToggleSwitch)
        .mount('#category-batch-manager2');
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(initApp);
// </nowiki>
