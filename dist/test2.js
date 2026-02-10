/**
 * Gadget-CategoryBatchManager.js (Vue-based)
 * Category Batch Manager for Wikimedia Commons
 *
 * @version 1.0.0
 * @license MIT
 * @description A tool for batch categorization of files in Wikimedia Commons.
 *              Built with Vue.js and Wikimedia Codex.
 *
 * Built from: https://github.com/MrIbrahem/owid-cats
 */
// <nowiki>

// === src/utils/Validator.js ===
/**
 * Input validation utility
 * @class Validator
 */
class Validator {
    /**
     * TODO: use it in the workflow or remove if not needed
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
    static sanitizeSearchPattern(pattern) {
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
     * TODO: use it in the workflow or remove if not needed
     * Sanitize user input to prevent injection
     * @param {string} input - Raw user input
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        return input.trim();
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

// === src/utils/RateLimiter.js ===
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
     * TODO: use it in the workflow
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
            const batchResults = await Promise.all(itemBatch.map(processor));
            results.push(...batchResults);
        }
        return results;
    }
}

// === src/utils/WikitextParser.js ===
/**
 * Parse and modify wikitext for category operations
 * @class WikitextParser
 */
class WikitextParser {
    /**
     * TODO: use it in the workflow
     * Extract all categories from wikitext
     * @param {string} wikitext - The wikitext content
     * @returns {Array<string>} Array of category names with "Category:" prefix
     */
    extractCategories(wikitext) {
        const categoryRegex = /\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi;
        const matches = [];
        let match;

        while ((match = categoryRegex.exec(wikitext)) !== null) {
            matches.push(`Category:${this.normalize(match[1].trim())}`);
        }

        return matches;
    }
    /**
     * Normalize category name by replacing underscores with spaces and trimming
     * @param {string} categoryName - Category name to normalize
     * @returns {string} Normalized category name
     */
    normalize(categoryName) {
        return categoryName.replace(/_/g, ' ').trim();
    }

    /**
     * Check if category exists in wikitext
     * @param {string} wikitext - The wikitext content
     * @param {string} categoryName - Category name to check (with or without "Category:" prefix)
     * @returns {boolean} True if category exists
     */
    hasCategory(wikitext, categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(cleanName);

        // Create a pattern that matches both spaces and underscores
        const pattern = normalizedName.split(' ').map(part => this.escapeRegex(part)).join('[ _]+');
        const regex = new RegExp(
            `\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]`,
            'i'
        );
        return regex.test(wikitext);
    }
    /**
     * Add a category to wikitext
     * @param {string} wikitext - The wikitext content
     * @param {string} categoryName - Category name to add (with or without "Category:" prefix)
     * @returns {string} Modified wikitext
     */
    addCategory(wikitext, categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(cleanName);

        // Check if category already exists (with normalization)
        if (this.hasCategory(wikitext, normalizedName)) {
            return wikitext;
        }

        const categorySyntax = `[[Category:${normalizedName}]]`;

        // Find last category or end of file
        const lastCategoryMatch = wikitext.match(/\[\[Category:[^\]]+\]\]\s*$/);

        if (lastCategoryMatch) {
            // Add after last category
            return wikitext.replace(
                /(\[\[Category:[^\]]+\]\])\s*$/,
                `$1\n${categorySyntax}\n`
            );
        } else {
            // Add at end
            return wikitext.trim() + `\n${categorySyntax}\n`;
        }
    }
    /**
     * Remove a category from wikitext
     * @param {string} wikitext - The wikitext content
     * @param {string} categoryName - Category name to remove (with or without "Category:" prefix)
     * @returns {string} Modified wikitext
     */
    removeCategory(wikitext, categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(cleanName);

        // Create a pattern that matches both spaces and underscores
        const pattern = normalizedName.split(' ').map(part => this.escapeRegex(part)).join('[ _]+');
        const regex = new RegExp(
            `\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]\\s*\\n?`,
            'gi'
        );
        return wikitext.replace(regex, '');
    }

    /**
     * Escape special regex characters in a string
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * TODO: use it in the workflow or remove if not needed
     * Get the proper wikitext syntax for a category
     * @param {string} categoryName - Category name (with or without "Category:" prefix)
     * @returns {string} Wikitext category syntax
     */
    getCategorySyntax(categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        return `[[Category:${cleanName}]]`;
    }
}

// === src/models/FileModel.js ===
/**
 * File model representing a Wikimedia Commons file
 * @class FileModel
 */
class FileModel {
  /**
   * @param {Object} data - File data
   * @param {string} data.title - Full file title (e.g., "File:Example,BLR.svg")
   * @param {number} data.pageid - Unique page ID
   * @param {boolean} [data.selected=true] - Whether file is selected for operation
   * @param {Array<string>} [data.currentCategories=[]] - Current categories
   * @param {string} [data.thumbnail=''] - URL to thumbnail
   * @param {number} [data.size=0] - File size in bytes
   */
  constructor(data) {
    this.title = data.title;
    this.pageid = data.pageid;
    this.selected = data.selected !== undefined ? data.selected : true;
    this.currentCategories = data.currentCategories || [];
    this.thumbnail = data.thumbnail || '';
    this.size = data.size || 0;
  }
}

// === src/models/CategoryOperation.js ===
/**
 * Category operation model
 * @class CategoryOperation
 */
class CategoryOperation {
    /**
     * @param {Object} data - Operation data
     * @param {string} data.sourceCategory - Source category name
     * @param {string} data.searchPattern - Search pattern used
     * @param {Array} [data.files=[]] - Files matched
     * @param {Array<string>} [data.categoriesToAdd=[]] - Categories to add
     * @param {Array<string>} [data.categoriesToRemove=[]] - Categories to remove
     * @param {string} [data.status='idle'] - Operation status
     */
    constructor(data) {
        this.sourceCategory = data.sourceCategory;
        this.searchPattern = data.searchPattern;
        this.files = data.files || [];
        this.categoriesToAdd = data.categoriesToAdd || [];
        this.categoriesToRemove = data.categoriesToRemove || [];
        this.status = data.status || 'idle';
    }
}

// === src/services/APIService.js ===
/**
 * Service for interacting with the MediaWiki API
 *
 * All requests go through mw.Api which handles CSRF-token management,
 * automatic bad-token retry, and correct origin headers.
 *
 * For local development without MediaWiki, set `window.mw` to a shim
 * that wraps fetch() — see README or DEPLOYMENT.md for details.
 *
 * @class APIService
 */



class APIService {
    constructor() {
        /**
         * Native MediaWiki API helper
         * @type {mw.Api}
         */
        this.mwApi = new mw.Api();
    }
    /* ------------------------------------------------------------------ */
    /*  Public helpers used by other services                              */
    /* ------------------------------------------------------------------ */

    /**
     * TODO: remove it and related tests
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

            const data = await this.makeRequest(params);
            allMembers.push(...data.query.categorymembers);

            cmcontinue = data.continue ? data.continue.cmcontinue : null;
        } while (cmcontinue);

        return allMembers;
    }

    /**
     * Get file details including categories.
     * @param {Array<string>} titles - Array of file titles
     * @returns {Promise<Object>} API response with file info
     */
    async getFileInfo(titles) {
        const params = {
            action: 'query',
            titles: titles.join('|'),
            prop: 'categories|imageinfo',
            cllimit: 500,
            format: 'json'
        };

        return this.makeRequest(params);
    }
    /**
     * Get page content (wikitext).
     * @param {string} title - Page title
     * @returns {Promise<string>} Page wikitext content
     */
    async getPageContent(title) {
        const params = {
            action: 'query',
            titles: title,
            prop: 'revisions',
            rvprop: 'content',
            rvslots: 'main',
            format: 'json'
        };

        const data = await this.makeRequest(params);
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        return pages[pageId].revisions[0].slots.main['*'];
    }

    /**
     * Search for categories by prefix.
     * Uses MediaWiki's opensearch API for category suggestions.
     * @param {string} prefix - Search prefix (can include or exclude "Category:" prefix)
     * @param {Object} [options={}] - Search options
     * @param {number} [options.limit=10] - Maximum results to return
     * @returns {Promise<Array<string>>} Array of category names with "Category:" prefix
     */
    async searchCategories(prefix, options = {}) {
        const limit = options.limit || 10;

        // Remove "Category:" prefix if present for the search
        const searchPrefix = prefix.replace(/^Category:/, '');

        const params = {
            action: 'opensearch',
            search: `Category:${searchPrefix}`,
            namespace: 14, // Category namespace
            limit: limit,
            format: 'json'
        };

        try {
            const data = await this.makeRequest(params);
            // opensearch returns: [query, [titles], [descriptions], [urls]]
            // We only need the titles
            const titles = data[1] || [];

            // Ensure all results have "Category:" prefix and filter to only categories
            return titles
                .filter(title => title.startsWith('Category:'))
                .map(title => {
                    // Preserve the exact format from API (already has Category: prefix)
                    return title;
                });
        } catch (error) {
            console.error('Failed to search categories', error);
            return [];
        }
    }

    async fetchCategories(searchTerm, options = {}) {
        const limit = options.limit || 10;
        if (!searchTerm || searchTerm.length < 2) {
            return Promise.resolve([]);
        }
        const params = {
            action: 'opensearch',
            search: searchTerm,
            namespace: 14, // Category namespace
            limit: limit
        };
        if (options.offset) {
            params.continue = String(options.offset);
        }
        const data = await this.makeRequest(params);
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

    /**
     * Get categories that a page belongs to.
     * @param {string} title - Page title
     * @returns {Promise<Array<string>|false>} Array of category names (without "Category:" prefix), or false if page not found
     */
    async getCategories(title) {
        try {
            const categories = await this.mwApi.getCategories(title);
            if (categories === false) {
                return false;
            }
            // Convert mw.Title objects to strings and remove "Category:" prefix
            return categories.map(cat => {
                const catStr = cat.toString();
                return catStr.replace(/^Category:/, '');
            });
        } catch (error) {
            console.error('Failed to get categories', error);
            throw error;
        }
    }

    /**
     * Search for files in a category using MediaWiki search API
     * Much more efficient than loading all category members
     * @param {string} categoryName - Category name (without "Category:" prefix)
     * @param {string} pattern - Search pattern
     * @returns {Promise<Array>} Array of file objects
     */
    async searchInCategory(categoryName, pattern) {
        const results = [];
        let continueToken = null;

        // Sanitize the pattern to prevent search syntax injection
        // MediaWiki search uses special characters like /, ", ", etc.
        const sanitizedPattern = Validator.sanitizeSearchPattern(pattern);

        do {
            // Replace spaces with underscores in category name for search API
            const searchCategoryName = categoryName.replace(/\s+/g, '_');
            const params = {
                action: 'query',
                list: 'search',
                srsearch: `incategory:${searchCategoryName} intitle:/${sanitizedPattern}/`,
                srnamespace: 6, // File namespace
                srlimit: 'max',
                srprop: 'size|wordcount|timestamp',
                format: 'json'
            };

            if (continueToken) {
                params.sroffset = continueToken;
            }

            const response = await this.makeRequest(params);

            if (response.query && response.query.search) {
                const searchResults = response.query.search.map(file => ({
                    title: file.title,
                    pageid: file.pageid,
                    size: file.size,
                    timestamp: file.timestamp
                }));

                results.push(...searchResults);
            }

            // Check if there are more results
            continueToken = response.continue ? response.continue.sroffset : null;

            // Safety limit to prevent too many requests
            if (results.length >= 5000) {
                console.warn('Search result limit reached (5000 files)');
                break;
            }

        } while (continueToken);

        return results;
    }


    /**
     * Edit a page using mw.Api.edit() which handles revision fetching and conflicts.
     *
     * @param {string} title   - Page title
     * @param {string} content - New page content (wikitext)
     * @param {string} summary - Edit summary
     * @param {Object} [options={}] - Additional edit options (minor, bot, etc.)
     * @returns {Promise<Object>} API response
     */
    async editPage(title, content, summary, options = {}) {

        // Use mw.Api.edit() with a transform function
        return this.mwApi.edit(title, function () {
            return {
                text: content,
                summary: summary,
                ...options
            };
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Low-level request method                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Make a GET request to the MediaWiki API via mw.Api.get().
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Parsed JSON response
     */
    async makeRequest(params) {
        try {
            return await this.mwApi.get(params);
        } catch (error) {
            console.error('API request failed', error);
            throw error;
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
     * @param {CategoryService} categoryService - Category service instance
     */
    constructor(categoryService) {
        this.categoryService = categoryService;
        this.rateLimiter = new RateLimiter();
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
                await this.rateLimiter.wait();

                // Update categories
                const result = await this.categoryService.updateCategories(
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

// === src/services/CategoryService.js ===
/**
 * Service for category operations on files
 * @class CategoryService
 */



class CategoryService {
    /**
     * @param {APIService} apiService - API service instance
     */
    constructor(apiService) {
        this.api = apiService;
        this.parser = typeof WikitextParser !== 'undefined' ? new WikitextParser() : null;
    }

    /**
     * TODO: use it in the workflow
     * Add categories to a file
     * @param {string} fileTitle - File page title
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @returns {Promise<{success: boolean, modified: boolean}>}
     */
    async addCategoriesToFile(fileTitle, categoriesToAdd) {
        const wikitext = await this.api.getPageContent(fileTitle);

        let newWikitext = wikitext;
        for (const category of categoriesToAdd) {
            if (!this.parser.hasCategory(newWikitext, category)) {
                newWikitext = this.parser.addCategory(newWikitext, category);
            }
        }

        if (newWikitext !== wikitext) {
            await this.api.editPage(
                fileTitle,
                newWikitext,
                `Adding categories: ${categoriesToAdd.join(', ')}`
            );
        }

        return { success: true, modified: newWikitext !== wikitext };
    }

    /**
     * TODO: use it in the workflow
     * Remove categories from a file
     * @param {string} fileTitle - File page title
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Promise<{success: boolean, modified: boolean}>}
     */
    async removeCategoriesFromFile(fileTitle, categoriesToRemove) {
        const wikitext = await this.api.getPageContent(fileTitle);

        let newWikitext = wikitext;
        for (const category of categoriesToRemove) {
            newWikitext = this.parser.removeCategory(newWikitext, category);
        }

        if (newWikitext !== wikitext) {
            await this.api.editPage(
                fileTitle,
                newWikitext,
                `Removing categories: ${categoriesToRemove.join(', ')}`
            );
        }

        return { success: true, modified: newWikitext !== wikitext };
    }

    /**
     * Combined add and remove operation
     * @param {string} fileTitle - File page title
     * @param {Array<string>} toAdd - Categories to add
     * @param {Array<string>} toRemove - Categories to remove
     * @returns {Promise<{success: boolean, modified: boolean}>}
     */
    async updateCategories(fileTitle, toAdd, toRemove) {
        const wikitext = await this.api.getPageContent(fileTitle);
        let newWikitext = wikitext;

        // Remove first
        for (const category of toRemove) {
            newWikitext = this.parser.removeCategory(newWikitext, category);
        }

        // Then add
        for (const category of toAdd) {
            if (!this.parser.hasCategory(newWikitext, category)) {
                newWikitext = this.parser.addCategory(newWikitext, category);
            }
        }

        if (newWikitext !== wikitext) {
            const summary = this.buildEditSummary(toAdd, toRemove);
            await this.api.editPage(fileTitle, newWikitext, summary);
        }

        return { success: true, modified: newWikitext !== wikitext };
    }

    /**
     * TODO: use it in the workflow
     * Combined add and remove operation using mw.Api.edit() for better conflict handling
     * @param {string} fileTitle - File page title
     * @param {Array<string>} toAdd - Categories to add
     * @param {Array<string>} toRemove - Categories to remove
     * @returns {Promise<{success: boolean, modified: boolean}>}
     */
    async updateCategoriesOptimized(fileTitle, toAdd, toRemove) {
        const api = new mw.Api();
        const parser = this.parser;

        try {
            await api.edit(fileTitle, function (revision) {
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

                // Only save if changed
                if (newWikitext === revision.content) {
                    return false; // No changes needed
                }

                const parts = [];
                if (toAdd.length) parts.push(`+${toAdd.join(', ')}`);
                if (toRemove.length) parts.push(`-${toRemove.join(', ')}`);

                return {
                    text: newWikitext,
                    summary: `Batch category update: ${parts.join('; ')} (via Category Batch Manager)`,
                    minor: false
                };
            });

            return { success: true, modified: true };
        } catch (error) {
            if (error.message && error.message.includes('no changes')) {
                return { success: true, modified: false };
            }
            throw error;
        }
    }

    /**
     * TODO: use it in the workflow
     * Get current categories for a file using the optimized API method
     * @param {string} fileTitle - File page title
     * @returns {Promise<Array<string>>} Array of category names
     */
    async getCurrentCategories(fileTitle) {
        const categories = await this.api.getCategories(fileTitle);
        if (categories === false) {
            return [];
        }
        return categories;
    }

    /**
     * TODO: use it in the workflow or move it to a utility module
     * Build an edit summary from add/remove lists
     * @param {Array<string>} toAdd - Categories added
     * @param {Array<string>} toRemove - Categories removed
     * @returns {string} Edit summary
     */
    buildEditSummary(toAdd, toRemove) {
        const parts = [];
        if (toAdd.length) parts.push(`+${toAdd.join(', ')}`);
        if (toRemove.length) parts.push(`-${toRemove.join(', ')}`);
        return `Batch category update: ${parts.join('; ')} (via Category Batch Manager)`;
    }
}

// === src/services/FileService.js ===
/**
 * Service for file operations
 * @class FileService
 */



class FileService {
    /**
     * @param {APIService} apiService - API service instance
     */
    constructor(apiService) {
        this.api = apiService;
        this.shouldStopSearch = false;
    }

    /**
     * Stop the current search operation
     */
    stopSearch() {
        this.shouldStopSearch = true;
        console.log('[CBM-FS] Search stop requested');
    }

    /**
     * Reset the search stop flag
     */
    resetSearchFlag() {
        this.shouldStopSearch = false;
    }

    /**
     * Search files by pattern within a category
     * Uses MediaWiki search API for efficiency instead of loading all category members
     * @param {string} categoryName - Category to search in
     * @param {string} searchPattern - Pattern to match against file titles
     * @returns {Promise<Array<FileModel>>} Array of matching file models
     */
    async search(categoryName, searchPattern) {
        this.resetSearchFlag();

        // Normalize category name
        const cleanCategoryName = categoryName.replace(/^Category:/i, '');

        // Use search API to find files matching the pattern in the category
        const searchResults = await this.api.searchInCategory(cleanCategoryName, searchPattern);

        // Check if search was stopped
        if (this.shouldStopSearch) {
            console.log('[CBM-FS] Search stopped after API call');
            return [];
        }

        // Get detailed info for matching files
        const filesWithInfo = await this.getFilesDetails(searchResults);

        return filesWithInfo;
    }

    /**
     * Get detailed information for a batch of files
     * @param {Array} files - Array of file objects with title property
     * @returns {Promise<Array<FileModel>>} Array of file models with details
     */
    async getFilesDetails(files) {
        if (files.length === 0) return [];

        const batchSize = 50; // API limit
        const batches = this.createBatches(files, batchSize);

        const results = [];
        for (const batch of batches) {
            // Check if search was stopped
            if (this.shouldStopSearch) {
                console.log('[CBM-FS] Search stopped during file details fetch');
                return results; // Return partial results
            }

            const titles = batch.map(f => f.title);
            const info = await this.api.getFileInfo(titles);
            results.push(...this.parseFileInfo(info));
        }

        return results;
    }

    /**
     * Split an array into batches
     * @param {Array} array - Array to split
     * @param {number} size - Batch size
     * @returns {Array<Array>} Array of batches
     */
    createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }

    /**
     * Parse API response into FileModel objects
     * @param {Object} apiResponse - Raw API response
     * @returns {Array<FileModel>} Array of file models
     */
    parseFileInfo(apiResponse) {
        const pages = apiResponse.query.pages;
        const fileModels = [];

        for (const pageId of Object.keys(pages)) {
            const page = pages[pageId];
            if (parseInt(pageId) < 0) continue; // Skip missing pages

            const categories = (page.categories || []).map(cat => cat.title);

            fileModels.push(new FileModel({
                title: page.title,
                pageid: page.pageid,
                selected: true,
                currentCategories: categories,
                thumbnail: page.imageinfo && page.imageinfo[0] ? page.imageinfo[0].url : '',
                size: page.imageinfo && page.imageinfo[0] ? page.imageinfo[0].size : 0
            }));
        }

        return fileModels;
    }
}

// === src/ui/panels/ExecutePanel.js ===
/**
 * Execute Panel Vue app factory
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {Object} execute_operation_handler - ExecuteOperationHandler instance
 * @param {Object} progress_handler - ProgressHandler instance
 * @returns {Object} Vue app configuration
 */

function ExecutePanel(execute_operation_handler, progress_handler) {
    const app = {
        data: function () {
            return {
                execute_operation_handler: execute_operation_handler,
                progress_handler: progress_handler,

                // Processing state
                isProcessing: false,

                // Progress tracking
                executionProgressPercent: 0,
                executionProgressText: '',

                // Confirmation dialog
                openConfirmDialog: false,
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
        progress_template: `
            <div
                v-if="isProcessing || executionProgressText !== ''"
                class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div
                        class="cbm-progress-bar-fill"
                        :style="{
                            width: executionProgressPercent + '%',
                        }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ executionProgressText }}
                </div>
            </div>`,
        methods: {
            /**
             * Execute batch operation
             * Validates and shows confirmation dialog
             */
            executeOperation() {
                // Validate
                const validation = execute_operation_handler.validateOperation(
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected
                );

                if (!validation.valid) {
                    this.showWarningMessage(validation.error);
                    return;
                }

                // Prepare operation
                const preparation = execute_operation_handler.prepareOperation(this);

                if (!preparation.valid) {
                    console.log('[CBM-V] No valid categories after filtering');
                    this.displayCategoryMessage(preparation.error, 'warning', 'add');
                    return;
                }

                // Generate confirmation message
                this.confirmMessage = execute_operation_handler.generateConfirmMessage(
                    preparation.filesCount,
                    preparation.filteredToAdd,
                    preparation.removeCategories
                );

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

                const preparation = execute_operation_handler.prepareOperation(this);

                if (!preparation.valid) {
                    this.isProcessing = false;
                    this.executionProgressText = "";
                    return;
                }

                await this.processBatch(preparation);
            },

            /**
             * Process batch with progress tracking
             * @param {Object} preparation - Prepared operation data
             */
            async processBatch(preparation) {
                try {
                    const callbacks = progress_handler.createCallbacks(this);

                    const results = await execute_operation_handler.executeBatch(
                        this.selectedFiles,
                        preparation.filteredToAdd,
                        preparation.removeCategories,
                        callbacks
                    );

                    this.isProcessing = false;
                    this.executionProgressText = "";

                    // Format and show completion message
                    const completion = progress_handler.formatCompletionMessage(
                        results,
                        execute_operation_handler.batchProcessor.shouldStop
                    );

                    if (completion.type === 'warning') {
                        this.showWarningMessage(completion.message);
                    } else {
                        this.showSuccessMessage(completion.message);
                    }

                } catch (error) {
                    console.error('[CBM-E] Batch processing error:', error);
                    this.isProcessing = false;
                    this.executionProgressText = "";
                    this.showErrorMessage(`Batch processing failed: ${error.message}`);
                }
            },

            /**
             * Stop ongoing batch operation
             */
            stopOperation() {
                execute_operation_handler.stopBatch();
            }
        }
    };

    return app;
}

// === src/ui/panels/SearchPanel.js ===
/**
 * Execute Panel Vue app factory
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {Object} search_handler - SearchHandler instance
 * @returns {Object} Vue app configuration
 */

function SearchPanel(search_handler) {
    const app = {
        data: function () {
            return {
                search_handler: search_handler,

                sourceCategory: 'Category:Our World in Data graphs of Austria',
                searchPattern: '1990',

                // Processing state
                isSearching: false,
                searchProgressText: '',
                searchProgressPercent: 0,
            };
        },
        template: `
            <div class="cbm-search-panel">
                <div class="cbm-input-group">
                    <cdx-label input-id="cbm-source-category" class="cbm-label">
                        Source Category
                    </cdx-label>
                    <cdx-text-input id="cbm-source-category" v-model="sourceCategory"
                        placeholder="Category:Our World in Data graphs of Austria" />
                </div>

                <div class="cbm-input-group">
                    <cdx-label input-id="cbm-pattern" class="cbm-label">
                        Search Pattern
                    </cdx-label>
                    <span class="cbm-help-text">
                        Enter a pattern to filter files (e.g., ,BLR.svg)
                    </span>
                    <div class="cbm-input-button-group">
                        <cdx-text-input id="cbm-pattern" v-model="searchPattern" placeholder="e.g., ,BLR.svg" />
                        <cdx-button v-if="!isSearching" @click="searchFiles" action="progressive" weight="primary">
                            Search
                        </cdx-button>
                        <cdx-button v-if="isSearching" @click="stopSearch" action="destructive" weight="primary">
                            Stop Search
                        </cdx-button>
                    </div>
                </div>
            </div>
        `,
        progress_template: `
            <div v-if="searchProgressPercent > 0 || searchProgressText !== ''" class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div class="cbm-progress-bar-fill"
                        :style="{ width: searchProgressPercent + '%' }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ searchProgressText }}
                </div>
            </div>
            `,
        methods: {
            /**
             * Start file search operation
             */
            searchFiles() {
                if (this.sourceCategory.trim() === '') {
                    this.showWarningMessage('Please enter a source category.');
                    return;
                }

                this.isSearching = true;
                this.searchProgressText = 'Searching for files...';
                this.searchProgressPercent = 0;

                // Clear all files and messages from previous search
                this.workFiles = [];
                this.previewRows = [];
                this.resetMessageState();

                const searchResults = this.search_handler.startSearch(this.sourceCategory, this.searchPattern);
                this.workFiles = searchResults;
                this.isSearching = false;
            },

            /**
             * Stop ongoing batch operation
             */
            stopSearch() {
                this.isSearching = false;
                this.shouldStopSearch = true;

                this.search_handler.stop();

                this.showWarningMessage('Search stopped by user.');
            }
        }
    };

    return app;
}

// === src/ui/components/CategoryInputs.js ===
/**
 * Category inputs UI component using Codex CSS-only classes.
 * Manages the add categories, remove categories inputs with autocomplete.
 * @see https://doc.wikimedia.org/codex/latest/
 */

function CategoryInputs(apiService) {
    const addElement = `
        <!-- Category Add Message -->
        <div v-if="addCategory.message.show" class="margin-bottom-20">
            <cdx-message
            allow-user-dismiss
            :type="addCategory.message.type"
            :inline="false"
            >
                {{ addCategory.message.text }}
            </cdx-message>
        </div>
    `;
    const removeElement = `
        <!-- Category Remove Message -->
        <div v-if="removeCategory.message.show" class="margin-bottom-20">
            <cdx-message
            allow-user-dismiss
            :type="removeCategory.message.type"
            :inline="false">
                {{ removeCategory.message.text }}
            </cdx-message>
        </div>
    `;

    const app = {
        data: function () {
            return {
                apiService: apiService,

                addCategory: {
                    menuItems: [],
                    menuConfig: {
                        boldLabel: true,
                        visibleItemLimit: 10
                    },
                    chips: [],
                    selected: [],
                    input: "",
                    message: {
                        show: false,
                        type: "",
                        text: "",
                    },
                },
                removeCategory: {
                    menuItems: [],
                    menuConfig: {
                        boldLabel: true,
                        visibleItemLimit: 10
                    },
                    chips: [],
                    selected: [],
                    input: "",
                    message: {
                        show: false,
                        type: "",
                        text: "",
                    },
                }
            };
        },
        template: `
            <div class="cbm-category-input-group">
                <cdx-label input-id="cbm-add-cats" class="cbm-label">
                    Add Categories
                </cdx-label>
                <span class="cbm-help-text">
                    e.g., Category:Belarus, Category:Europe
                </span>
                <cdx-multiselect-lookup
                    id="cdx-category-add"
                    v-model:input-chips="addCategory.chips"
                    v-model:selected="addCategory.selected"
		            v-model:input-value="addCategory.input"
                    :menu-items="addCategory.menuItems"
                    :menu-config="addCategory.menuConfig"
                    aria-label="Add categories"
                    placeholder="Type to search categories"
                    @update:input-value="onAddCategoryInput"
		            @load-more="addOnLoadMore"
                >
                    <template #no-results>
                        Type at least 2 characters to search
                    </template>
                </cdx-multiselect-lookup>
            </div>

            <!-- Category Add Message -->
            ${addElement}

            <div class="cbm-category-input-group">
                <cdx-label input-id="cbm-remove-cats" class="cbm-label">
                    Remove Categories
                </cdx-label>
                <cdx-multiselect-lookup
                    id="cdx-category-remove"
                    v-model:input-chips="removeCategory.chips"
                    v-model:selected="removeCategory.selected"
		            v-model:input-value="removeCategory.input"
                    :menu-items="removeCategory.menuItems"
                    :menu-config="removeCategory.menuConfig"
                    aria-label="Remove categories"
                    placeholder="Type to search categories"
                    @update:input-value="onRemoveCategoryInput"
		            @load-more="removeOnLoadMore"
                    >
                    <template #no-results>
                        Type at least 2 characters to search
                    </template>
                </cdx-multiselect-lookup>
            </div>

            <!-- Category Remove Message -->
            ${removeElement}
        `,
        methods: {
            hideCategoryMessage(msg_type = 'add') {
                console.log(`[CBM] Hiding ${msg_type} category message`);
                if (msg_type === 'add') {
                    this.addCategory.message.show = false;
                    this.addCategory.message.text = '';
                } else if (msg_type === 'remove') {
                    this.removeCategory.message.show = false;
                    this.removeCategory.message.text = '';
                }
            },

            displayCategoryMessage(text, type = 'error', msg_type = 'add') {
                console.log(`[CBM] Displaying ${msg_type} category message: ${text} (type: ${type})`);
                if (msg_type === 'add') {
                    this.addCategory.message.show = true;
                    this.addCategory.message.type = type;
                    this.addCategory.message.text = text;
                } else if (msg_type === 'remove') {
                    this.removeCategory.message.show = true;
                    this.removeCategory.message.type = type;
                    this.removeCategory.message.text = text;
                }
            },

            deduplicateResults(items1, results) {
                const seen = new Set(items1.map((result) => result.value));
                return results.filter((result) => !seen.has(result.value));
            },

            async onAddCategoryInput(value) {
                this.hideCategoryMessage('add');

                // Clear menu items if the input was cleared.
                if (!value) {
                    console.warn('Add category input cleared, clearing menu items.');
                    this.addCategory.menuItems = [];
                    return;
                }

                // If empty, clear menu items
                if (!value || value.trim().length < 2) {
                    console.warn('Add category input too short, clearing menu items.');
                    this.addCategory.menuItems = [];
                    return;
                }

                const data = await this.apiService.fetchCategories(value);

                // Make sure this data is still relevant first.
                if (this.addCategory.input !== value) {
                    console.warn('Add category input value changed during fetch, discarding results.');
                    return;
                }

                // Reset the menu items if there are no results.
                if (!data || data.length === 0) {
                    console.warn('No results for add category input, clearing menu items.');
                    this.addCategory.menuItems = [];
                    return;
                }

                // Update addCategory.menuItems.
                this.addCategory.menuItems = data;
            },

            async onRemoveCategoryInput(value) {
                this.hideCategoryMessage('remove');
                // Clear menu items if the input was cleared.
                if (!value) {
                    console.warn('Remove category input cleared, clearing menu items.');
                    this.removeCategory.menuItems = [];
                    return;
                }

                // If empty, clear menu items
                if (!value || value.trim().length < 2) {
                    console.warn('Remove category input too short, clearing menu items.');
                    this.removeCategory.menuItems = [];
                    return;
                }

                const data = await this.apiService.fetchCategories(value);

                // Make sure this data is still relevant first.
                if (this.removeCategory.input !== value) {
                    console.warn('Remove category input value changed during fetch, discarding results.');
                    return;
                }

                // Reset the menu items if there are no results.
                if (!data || data.length === 0) {
                    console.warn('No results for remove category input, clearing menu items.');
                    this.removeCategory.menuItems = [];
                    return;
                }

                // Update removeCategory.menuItems.
                this.removeCategory.menuItems = data;
            },

            async addOnLoadMore() {
                if (!this.addCategory.input) {
                    console.warn('No input value for add categories, cannot load more.');
                    return;
                }

                const data = await this.apiService.fetchCategories(this.addCategory.input, { offset: this.addCategory.menuItems.length });

                if (!data || data.length === 0) {
                    console.warn('No more results to load for add categories.');
                    return;
                }

                // Update this.addCategory.menuItems.
                const deduplicatedResults = this.deduplicateResults(this.addCategory.menuItems, data);
                this.addCategory.menuItems.push(...deduplicatedResults);
            },

            async removeOnLoadMore() {
                if (!this.removeCategory.input) {
                    console.warn('No input value for remove categories, cannot load more.');
                    return;
                }

                const data = await this.apiService.fetchCategories(this.removeCategory.input, { offset: this.removeCategory.menuItems.length });

                if (!data || data.length === 0) {
                    console.warn('No more results to load for remove categories.');
                    return;
                }

                // Update this.removeCategory.menuItems.
                const deduplicatedResults = this.deduplicateResults(this.removeCategory.menuItems, data);
                this.removeCategory.menuItems.push(...deduplicatedResults);
            },
        }
    }
    //
    return app;

}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputs
}

// === src/ui/components/FilesList.js ===
/**
 * File list UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class FilesList
 */
class FilesList {
    /**
     * @param {mw.Api} apiService - API service for category search
     */
    constructor(apiService) {
        this.apiService = apiService;
    }

    /**
     * Create the files list HTML element with Codex components.
     */
    createElement() {
        return `
        <div v-if="workFiles.length > 0" class="cbm-files-list">
            <!-- Results Header -->
            <div class="cbm-files-header">
                <div class="cbm-count-badge">
                    Found <strong>{{ totalFilesCount }}</strong> files
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
                <div v-for="(file, index) in workFiles" :key="index" class="cbm-file-row">
                    <cdx-checkbox v-model="file.selected" :input-id="'file-' + index" aria-label="{{ file.title }}" />
                    <cdx-label :for="'file-' + index">
                        {{ file.title }}
                    </cdx-label>
                    <button @click="removeFile(index)" class="cbm-file-remove-btn" title="Remove from list">
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
    `;
    }

    // Select all files
    selectAll(workFiles) {
        workFiles.forEach(file => {
            file.selected = true;
        });
    }

    // Deselect all files
    deselectAll(workFiles) {
        workFiles.forEach(file => {
            file.selected = false;
        });
    }
}

// === src/ui/components/MessageDisplay.js ===
/**
 * Progress bar UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 */

function MessageDisplay() {
    const app = {
        data: function () {
            return {
                showMessage: false,
                messageType: '',
                messageContent: '',
            };
        },
        template: `
            <!-- Message Display -->
            <div v-if="showMessage" class="cbm-fixed-message">
                <cdx-message
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
            // Message handlers
            resetMessageState: function () {
                this.showMessage = false;
                this.messageType = '';
                this.messageContent = '';
            },

            renderMessage: function (message, type = 'info') {
                console.warn(`'[CBM] ${type}:`, message);
                this.messageType = type;
                this.messageContent = message;
                this.showMessage = true;
            },

            showWarningMessage: function (message) {
                this.renderMessage(message, 'warning');
            },

            showErrorMessage: function (message) {
                this.renderMessage(message, 'error');
            },

            showSuccessMessage: function (message) {
                this.renderMessage(message, 'success');
            },

            handleMessageDismiss: function () {
                this.showMessage = false;
            }
        }
    }
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageDisplay
}

// === src/ui/handlers/PreviewHandler.js ===
/**
 * Preview Handler
 *
 * @description
 * Handles all preview-related functionality for BatchManager.
 * Manages preview generation, modal display, and validation.
 *
 * @requires ValidationHelper - For common validation logic
 */



class PreviewHandler {
    /**
     */
    constructor(validator) {
        this.validator = validator
    }
    createElement() {
        // @primary="onPrimaryAction"
        // :primary-action="primaryAction"
        // :default-action="defaultAction"
        return `
        <cdx-button @click="handlePreview" action="default" weight="normal"
            :disabled="isProcessing">
            Preview Changes
        </cdx-button>
        <cdx-dialog
            v-model:open="openPreviewHandler"
            class="cbm-preview-dialog"
            title="Preview Changes"
            :use-close-button="true"
            @default="openPreviewHandler = false"
        >
            <p v-if="changesCount > 0">
                {{ changesCount }} file(s) will be updated. Review the changes below before saving.
            </p>
            <p v-else>
                No changes detected. Please adjust your categories to add/remove and preview again.
            </p>
            <table class="cbm-preview-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Current Categories</th>
                        <th>New Categories</th>
                        <th>Diff</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-if="previewRows.length > 0" v-for="(row, index) in previewRows" :key="index">
                        <td>{{ row.file }}</td>

                        <td>
                            <div v-for="(cat, i) in row.currentCategories" :key="i">
                                {{ cat }}
                            </div>
                        </td>

                        <td>
                            <div v-for="(cat, i) in row.newCategories" :key="i">
                                {{ cat }}
                            </div>
                        </td>
                        <td>
                            {{ row.diff }}
                        </td>
                    </tr>
                </tbody>
            </table>
            <template #footer-text>
            </template>
        </cdx-dialog>
    `;
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */
    async handlePreview(self) {
        console.log('[CBM-P] Preview button clicked');

        const selectedCount = self.selectedCount;

        if (selectedCount === 0 || !self.selectedFiles || self.selectedFiles.length === 0) {
            self.showWarningMessage('Please select at least one file.');
            return;
        }

        if (self.addCategory.selected.length === 0 && self.removeCategory.selected.length === 0) {
            self.showWarningMessage('Please specify categories to add or remove.');
            return;
        }

        // Filter out circular categories (returns null if ALL are circular)
        const filteredToAdd = this.validator.filterCircularCategories(self);

        if (filteredToAdd === null) return null; // All categories were circular

        // Check if there are any valid operations remaining
        if (filteredToAdd.length === 0 && self.removeCategory.selected.length === 0) {
            console.log('[CBM-V] No valid categories after filtering');
            self.displayCategoryMessage('No valid categories to add or remove.', 'warning', 'add');
            return;
        }

        // Generate preview without affecting file list - no loading indicator
        try {
            console.log('[CBM-P] Calling batchProcessor.previewChanges');
            const preview = await this.previewChanges(
                self.selectedFiles,
                filteredToAdd,
                self.removeCategory.selected
            );
            console.log('[CBM-P] Preview result:', preview.length, 'items');
            this.showPreviewModal(self, preview);

        } catch (error) {
            console.log('[CBM-P] Error in previewChanges:', error);
            // Check if error is about duplicate categories
            if (error.message.includes('already exist')) {
                self.showWarningMessage(`⚠️ ${error.message}`);
            } else {
                self.showErrorMessage(`Error generating preview: ${error.message}`);
            }
        }
    }

    /**
     * Show the preview modal with changes
     * @param {Array} preview - Array of preview items
     */
    showPreviewModal(self, preview) {

        self.previewRows = preview
            .filter(item => item.willChange)
            .map(item => ({
                file: item.file,
                currentCategories: [...item.currentCategories],
                newCategories: [...item.newCategories],
                diff: item.newCategories.length - item.currentCategories.length
            }));

        self.changesCount = preview.filter(p => p.willChange).length;

        if (self.changesCount === 0) {
            console.log('[CBM] No changes detected');
            self.displayCategoryMessage('ℹ️ No changes detected.', 'notice', 'add');
            // return;
        }
        self.openPreviewHandler = true;

    }
    /**
     * Check if a category exists in a list (with normalization)
     * @param {string} category - Category to find
     * @param {Array<string>} categoryList - List to search in
     * @returns {number} Index of the category in the list, or -1 if not found
     */
    findCategoryIndex(category, categoryList) {
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
    categoryExists(category, categoryList) {
        return this.findCategoryIndex(category, categoryList) !== -1;
    }

    /**
     * Preview changes without actually editing
     * @param {Array} files - Files to preview
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Promise<Array>} Preview of changes
     */
    async previewChanges(files, categoriesToAdd, categoriesToRemove) {
        const previews = [];

        for (const file of files) {
            const current = file.currentCategories || [];

            // Check if trying to add categories that already exist (with normalization)
            if (categoriesToAdd.length > 0) {
                const duplicateCategories = categoriesToAdd.filter(cat => this.categoryExists(cat, current));
                if (duplicateCategories.length > 0) {
                    //throwing an error here isn't true because other files may not have the duplicate categories, so we will just ignore the duplicates for the preview and show a warning in the UI instead
                    console.warn(`[CBM-P] Warning: The following categories already exist for file "${file.title}" and will be ignored in the preview: ${duplicateCategories.join(', ')}`);
                    // throw new Error(`The following categories already exist and cannot be added: ${duplicateCategories.join(', ')}`);
                }
            }

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

            previews.push({
                file: file.title,
                currentCategories: current,
                newCategories: after,
                willChange: JSON.stringify(current) !== JSON.stringify(after)
            });
        }

        return previews;
    }
}

// === src/ui/handlers/SearchHandler.js ===
/**
 * Search panel UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class SearchHandler
 */
class SearchHandler {
    /**
     */
    constructor(file_service) {
        this.file_service = file_service;
    }

    async startSearch(sourceCategory, searchPattern) {
        // TODO: searchProgressText updates via callbacks from file_service
        const searchResults = await this.file_service.search(
            sourceCategory,
            searchPattern
        );
        return searchResults;
    }

    stop() {
        // Tell the file service to stop the ongoing search
        this.file_service.stopSearch();

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
     * @param {Object} vueInstance - Vue component instance
     * @returns {Object} Callbacks object with onProgress, onFileComplete, onError
     */
    createCallbacks(vueInstance) {
        return {
            /**
             * Progress update callback
             * @param {number} percent - Completion percentage
             * @param {Object} results - Current results
             */
            onProgress: (percent, results) => {
                vueInstance.executionProgressPercent = percent;
                vueInstance.executionProgressText =
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

// === src/ui/handlers/ExecuteOperationHandler.js ===
/**
 * Execute Operation Handler
 * Handles business logic for batch operations
 * @class ExecuteOperationHandler
 */
class ExecuteOperationHandler {
    /**
     * @param {Object} validator - ValidationHelper instance
     * @param {Object} batchProcessor - BatchProcessor instance
     */
    constructor(validator, batchProcessor) {
        this.validator = validator;
        this.batchProcessor = batchProcessor;
    }

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
     * @param {Object} vueInstance - Vue component instance
     * @returns {Object} Preparation result
     */
    prepareOperation(vueInstance) {
        const filteredToAdd = this.validator.filterCircularCategories(vueInstance);

        if (filteredToAdd === null) {
            return { valid: false, error: 'Circular categories detected.' };
        }

        // Check if there are any valid operations remaining
        if (filteredToAdd.length === 0 && vueInstance.removeCategory.selected.length === 0) {
            return { valid: false, error: 'No valid categories to add or remove.' };
        }

        return {
            valid: true,
            filteredToAdd,
            removeCategories: vueInstance.removeCategory.selected,
            filesCount: vueInstance.selectedFiles.length
        };
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
        return await this.batchProcessor.processBatch(
            files,
            addCategories,
            removeCategories,
            callbacks
        );
    }

    /**
     * Stop batch processing
     */
    stopBatch() {
        this.batchProcessor.stop();
    }
}

// === src/ui/helpers/ValidationHelper.js ===
/**
 * Validation Helper
 *
 * @description
 * Shared validation logic for BatchManager handlers.
 * Provides common validation functions used by PreviewHandler and ExecuteHandler.
 *
 * @requires Validator - For checking circular category references
 */



class ValidationHelper {
    /**
     */
    constructor() {
    }

    /**
     * Check for circular category references and filter them out silently
     * Only shows error if ALL categories are circular
     * @returns {Array<string>|null} Filtered categories, or null if all are circular
     */
    filterCircularCategories(self) {
        const circularCategories = [];
        const validCategories = [];
        for (const category of self.addCategory.selected) {
            if (Validator.isCircularCategory(self.sourceCategory, category)) {
                console.log('[CBM-V] Circular category detected (silently removed):', category);
                circularCategories.push(category);
            } else {
                validCategories.push(category);
            }
        }

        // If all categories are circular, show error
        if (circularCategories.length > 0 && validCategories.length === 0) {
            self.displayCategoryMessage(
                `❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "${circularCategories.join(', ')}" to itself.`,
                'error',
                'add'
            );
            return null;
        }

        // Silently filter circular categories if there are valid ones
        return validCategories;
    }
}

// === src/BatchManager.js ===
/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 *
 * TODO: fix the diff between Preview Changes and Execute Batch, Execute should filter before acting.
 * messages:
 * - Preview Changes: 520 file(s) will be updated. Review the changes below before saving.
 * - Confirm Batch Update: You are about to update 1033 file(s)
 */


function BatchManager() {
    const mwApi = new APIService();
    const file_service = new FileService(mwApi);
    const files_list = new FilesList(mwApi);

    const search_handler = new SearchHandler(file_service);

    const validator = new ValidationHelper();
    const preview_handler = new PreviewHandler(validator);
    const categoryService = new CategoryService(mwApi);
    const batchProcessor = new BatchProcessor(categoryService);

    // Execute panels and handlers
    const execute_operation_handler = new ExecuteOperationHandler(validator, batchProcessor);
    const progress_handler = new ProgressHandler();
    const execute_panel = new ExecutePanel(execute_operation_handler, progress_handler);

    // Generate HTML for components
    const FilesListHtml = files_list.createElement();
    const PreviewChangesHtml = preview_handler.createElement();

    // vue apps
    const category_inputs_app = CategoryInputs(mwApi);      // function
    const message_display_app = MessageDisplay();           // function
    const search_panel_app = SearchPanel(search_handler);   // function

    const template = `
        <div class="cbm-container">
            <h2 class="cbm-title">Category Batch Manager!</h2>

            <div class="cbm-main-layout">
                <!-- Left Panel: Search and Actions -->
                <div class="cbm-left-panel">
                    <!-- Search Section -->
                    ${search_panel_app.template}

                    <!-- Actions Section -->
                    <div>
                        ${category_inputs_app.template}

                        <div class="margin-bottom-20 hidden">
                            <cdx-label input-id="cbm-summary" class="cbm-label">
                                Edit Summary
                            </cdx-label>
                            <cdx-text-input id="cbm-summary" v-model="editSummary" />
                        </div>

                        <div class="cbm-button-group">
                            ${PreviewChangesHtml}
                            ${execute_panel.template}
                        </div>
                    </div>
                    ${execute_panel.progress_template}
                </div>

                <!-- Right Panel: File List -->
                <div class="cbm-right-panel">
                    ${FilesListHtml}

                    <!-- Progress Section -->
                    ${search_panel_app.progress_template}
                </div>
            </div>
            <!-- Message Display -->
            ${message_display_app.template}
        </div>
    `;

    const app = {
        data: function () {
            const app_data = {
                validator: validator,
                preview_handler: preview_handler,
                files_list: files_list,
                mwApi: mwApi, // Reference to API service instance

                editSummary: 'Batch category update via Category Batch Manager',

                // FilesList state
                workFiles: [],

                // PreviewHandler state
                previewRows: [],
                changesCount: '',
                openPreviewHandler: false,

                // SearchPanel state
                ...search_panel_app.data(),

                // MessageDisplay state
                ...message_display_app.data(),

                // ExecutePanel state
                ...execute_panel.data(),

                // CategoryInputsApp state
                ...category_inputs_app.data(),
            };
            return app_data;
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
        methods: {

            // SearchPanel methods
            ...search_panel_app.methods,

            // ExecutePanel methods
            ...execute_panel.methods,

            // CategoryInputs
            ...category_inputs_app.methods,

            // Message handlers
            ...message_display_app.methods,

            /* *************************
            **      FilesList
            ** *************************
            */

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Select all files
            selectAll: function () {
                return this.files_list.selectAll(this.workFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Deselect all files
            deselectAll: function () {
                return this.files_list.deselectAll(this.workFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Remove individual file from list
            removeFile: function (index) {
                this.workFiles.splice(index, 1);
            },

            // Preview changes before executing
            handlePreview: function () {
                return this.preview_handler.handlePreview(this);
            }
        },
        template: template
    };
    return app;
}

// === src/gadget-entry.js ===
// <nowiki>

function createVueBatchManager(Vue, Codex) {
    const app = BatchManager();

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
        .mount('#category-batch-manager2');
}

function createOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'batch-manager-overlay';
    overlay.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        overflow: auto;
    `;

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: relative;
        background: white;
        margin: 50px auto;
        max-width: 90%;
        width: 1200px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        padding: 20px;
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #666;
        line-height: 1;
        padding: 0;
        width: 30px;
        height: 30px;
    `;
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.onclick = () => {
        overlay.style.display = 'none';
    };

    // Create mount point for Vue app
    const mountPoint = document.createElement('div');
    mountPoint.id = 'category-batch-manager2';

    // Assemble structure
    dialog.appendChild(closeButton);
    dialog.appendChild(mountPoint);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Close on overlay background click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display === 'block') {
            overlay.style.display = 'none';
        }
    });

    return overlay;
}

async function initApp(require) {
    const target = document.getElementById('category-batch-manager2');
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    if (target) {
        // In special pages - mount directly without overlay
        await createVueBatchManager(Vue, Codex);
    } else {
        // In category pages - mount with overlay
        var isCategoryPage = mw.config.get('wgCanonicalNamespace') === 'Category';
        if (!isCategoryPage) return;

        // Create overlay structure
        const overlay = createOverlay();

        // Add button to trigger overlay
        var portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );

        portletLink.addEventListener('click', (e) => {
            e.preventDefault();
            overlay.style.display = 'block';
        });

        // Mount Vue app inside overlay
        await createVueBatchManager(Vue, Codex);
    }
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(
    initApp
);
// </nowiki>
