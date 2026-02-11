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

import { FileModel } from '../../models';
import { SearchService } from '../../services';
import { Validator } from '../../utils';

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

    async startSearch(sourceCategory, titlePattern, searchPattern) {
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

        try {
            const results = await this.search_service.searchWithPatternCallback(pattern, {
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

export default SearchHandler;
