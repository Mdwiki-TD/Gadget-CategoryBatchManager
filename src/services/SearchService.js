/**
 * Data-layer service responsible for file search and detail enrichment.
 * Has no knowledge of UI state or progress reporting beyond the callbacks
 * it receives.
 * @class SearchService
 */

import FileModel from './../models/FileModel.js';
import APIService from './APIService.js';

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
        return this.searchWithPatternCallback(srsearch, {});
    }
    /**
     * Search files matching `srsearch` and enrich each result with full
     * category + thumbnail data.
     *
     * @param {string}   srsearch
     * @param {Object}   [callbacks={}]
     * @param {Function} [callbacks.onProgress]          - (text) => void
     * @param {Function} [callbacks.onProgressFileDetails] - (text, percent) => void
     * @returns {Promise<FileModel[]>}
     */
    async searchWithPatternCallback(srsearch, callbacks = {}) {
        this.resetSearchFlag();
        const searchResults = await this.api.searchInCategoryWithPattern(srsearch, {
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
        if (!files.length) return [];

        const batches = this.createBatches(files, 50); // 50 = API limit
        const results = [];
        for (const batch of batches) {
            // Check if search was stopped
            if (this.shouldStopSearch) {
                console.log('[CBM-FS] Search stopped during file details fetch');
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

export default SearchService;
