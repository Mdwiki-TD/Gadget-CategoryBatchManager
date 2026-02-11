/**
 * Service for file operations — data layer only.
 * Responsible for API communication and raw data parsing.
 * Has no knowledge of UI state or progress reporting.
 * @class SearchService
 */

import FileModel from './../models/FileModel.js';
import APIService from './APIService.js';

class SearchService {
    /**
     * @param {APIService} api_service - API service instance
     */
    constructor(api_service) {
        this.api = api_service;
        this.shouldStopSearch = false;
    }

    /**
     * Signal the service to abort the current search at the next checkpoint.
     * Called exclusively by SearchHandler — never directly from UI.
     */
    stopSearch() {
        this.shouldStopSearch = true;
        console.log('[CBM-FS] Search stop requested');
    }

    /**
     * Reset the stop flag before starting a new search.
     * @private
     */
    resetSearchFlag() {
        this.shouldStopSearch = false;
    }

    /**
     * Search files by pattern within a category.
     * Uses the MediaWiki search API for efficiency instead of loading all
     * category members.
     *
     * @param {string} categoryName   - Category to search in
     * @param {string} titlePattern  - Pattern to match against file titles
     * @returns {Promise<Array<FileModel>>} Matching file models
     */
    async search(categoryName, titlePattern) {
        this.resetSearchFlag();
        // Normalize category name
        const cleanCategoryName = categoryName.replace(/^Category:/i, '');
        const searchResults = await this.api.searchInCategory(cleanCategoryName, titlePattern);

        if (this.shouldStopSearch) {
            console.log('[CBM-FS] Search stopped after API call');
            return [];
        }

        return await this.getFilesDetails(searchResults);
    }

    /**
     * Search files by pattern within a category.
     * Uses the MediaWiki search API for efficiency instead of loading all
     * category members.
     *
     * @param {string} srsearch   - Search query string
     * @returns {Promise<Array<FileModel>>} Matching file models
     */
    async searchWithPattern(srsearch) {
        this.resetSearchFlag();
        const searchResults = await this.api.searchInCategoryWithPattern(srsearch);

        if (this.shouldStopSearch) {
            console.log('[CBM-FS] Search stopped after API call');
            return [];
        }

        return await this.getFilesDetails(searchResults);
    }
    /**
     * Search files by pattern within a category.
     * Uses the MediaWiki search API for efficiency instead of loading all
     * category members.
     *
     * @param {string} srsearch   - Search query string
     * @param {Object} [callbacks={}] - Callback functions (currently unused, reserved for future use)
     * @returns {Promise<Array<FileModel>>} Matching file models
     */
    async searchWithPatternCallback(srsearch, callbacks = {}) {
        this.resetSearchFlag();
        const searchResults = await this.api.searchInCategoryWithPattern(srsearch, callbacks);

        if (this.shouldStopSearch) {
            console.log('[CBM-FS] Search stopped after API call');
            return [];
        }

        return await this.getFilesDetails(searchResults);
    }

    /**
     * Fetch detailed information for a list of files.
     * Processes files in batches to respect the API limit.
     *
     * @param {Array<{title: string}>} files - Files to enrich
     * @returns {Promise<Array<FileModel>>} Enriched file models (may be partial if stopped)
     */
    async getFilesDetails(files) {
        if (files.length === 0) return [];

        const batches = this.createBatches(files, 50); // 50 = API limit
        const results = [];

        for (const batch of batches) {
            // Check if search was stopped
            if (this.shouldStopSearch) {
                console.log('[CBM-FS] Search stopped during file details fetch');
                return results; // return whatever was collected so far
            }

            const titles = batch.map(f => f.title);
            const info = await this.api.getFileInfo(titles);
            results.push(...this.parseFileInfo(info));
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
     * Map a raw API response to an array of FileModel objects.
     *
     * @param {Object} apiResponse - Raw response from getFileInfo
     * @returns {Array<FileModel>}
     */
    parseFileInfo(apiResponse) {
        const pages = apiResponse.query.pages;
        const fileModels = [];

        for (const pageId of Object.keys(pages)) {
            if (parseInt(pageId) < 0) continue; // skip missing / invalid pages

            const page = pages[pageId];
            const categories = (page.categories || []).map(cat => cat.title);
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

export default SearchService;
