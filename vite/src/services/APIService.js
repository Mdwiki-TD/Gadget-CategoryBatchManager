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

/* global mw */

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
        const sanitizedPattern = this.sanitizeSearchPattern(pattern);

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

    /**
     * Sanitize search pattern to prevent MediaWiki search syntax injection
     * @param {string} pattern - Raw search pattern
     * @returns {string} Sanitized pattern safe for MediaWiki search API
     */
    sanitizeSearchPattern(pattern) {
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
