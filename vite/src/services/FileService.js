/**
 * Service for file operations
 * @class FileService
 */

/* global FileModel */

class FileService {
    /**
     * @param {APIService} apiService - API service instance
     */
    constructor(apiService) {
        this.api = apiService;
    }

    /**
     * Search files by pattern within a category
     * Uses MediaWiki search API for efficiency instead of loading all category members
     * @param {string} categoryName - Category to search in
     * @param {string} searchPattern - Pattern to match against file titles
     * @returns {Promise<Array<FileModel>>} Array of matching file models
     */
    async searchFiles(categoryName, searchPattern) {
        // Normalize category name
        const cleanCategoryName = categoryName.replace(/^Category:/i, '');

        // Use search API to find files matching the pattern in the category
        const searchResults = await this.api.searchInCategory(cleanCategoryName, searchPattern);

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
            const FileModelClass = typeof FileModel !== 'undefined' ? FileModel : function (d) {
                return d;
            };

            fileModels.push(new FileModelClass({
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileService;
}
