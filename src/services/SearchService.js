/**
 * Service for file operations — data layer only.
 * Responsible for API communication and raw data parsing.
 * Has no knowledge of UI state or progress reporting.
 * @class SearchService
 */

/* global FileModel */

class SearchService {
    /**
     * @param {APIService} apiService - API service instance
     */
    constructor(apiService) {
        this.api = apiService;
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
     * @param {string} searchPattern  - Pattern to match against file titles
     * @returns {Promise<Array<FileModel>>} Matching file models
     */
    async search(categoryName, searchPattern) {
        this.resetSearchFlag();
        // Normalize category name
        const cleanCategoryName = categoryName.replace(/^Category:/i, '');
        const searchResults = await this.api.searchInCategory(cleanCategoryName, searchPattern);

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchService;
}
