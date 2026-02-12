/**
 * Thin wrapper around `mw.Api`.
 *
 * All write operations go through `mw.Api.edit()` which handles CSRF-token
 * management, automatic bad-token retry, and correct origin headers.
 *
 * @class APIService
 */

import { Validator } from './../utils';
import mw from './mw.js';
import Api from './mw.js';

class APIService {
    constructor() {
        this.debug = false;
        // if user pass ?debug= in URL, enable debug mode // https://commons.wikimedia.org?debug=1
        if (new URLSearchParams(window.location.search).has('debug')) {
            this.debug = true;
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
            console.error('No pages found in API response for title:', title);
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
     * @param {Object}   [callbacks={}]
     * @param {Function} [callbacks.onProgress]
     * @returns {Promise<Array<{ title: string, pageid: number, size: number, timestamp: string }>>}
     */
    async searchInCategoryWithPattern(srsearch, callbacks = {}) {
        const results = [];
        let sroffset = null;

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
            if (results.length >= 5000) {
                console.warn('[CBM-API] Search result limit reached (5 000 files).');
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
        if (!searchTerm || searchTerm.length < 2) {
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
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simulate a successful edit response in debug mode
        return Promise.resolve({
            edit: {
                title: title,
                content: content,
                summary: summary,
                result: 'Success',
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

export default APIService;
