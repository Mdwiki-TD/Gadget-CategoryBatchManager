/**
 * Service for category operations on files
 * @class CategoryService
 */

import WikitextParser from './../utils/WikitextParser.js';
import APIService from './APIService.js';

class CategoryService {
    /**
     * @param {APIService} api_service - API service instance
     */
    constructor(api_service) {
        this.api = api_service;
        this.parser = new WikitextParser();
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
        if (!wikitext) {
            return { success: false, modified: false };
        }

        let newWikitext = wikitext;
        for (const category of categoriesToAdd) {
            if (!this.parser.hasCategory(newWikitext, category)) {
                newWikitext = this.parser.addCategory(newWikitext, category);
            }
        }
        let success = true;
        if (newWikitext !== wikitext) {
            let result = await this.api.editPage(
                fileTitle,
                newWikitext,
                `Adding categories: ${categoriesToAdd.join(', ')}`
            );
            success = result && result.edit && result.edit.result === 'Success';
        }

        return { success: success, modified: newWikitext !== wikitext };
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
        if (!wikitext) {
            return { success: false, modified: false };
        }
        let newWikitext = wikitext;
        for (const category of categoriesToRemove) {
            newWikitext = this.parser.removeCategory(newWikitext, category);
        }
        let success = true;
        if (newWikitext !== wikitext) {
            let result = await this.api.editPage(
                fileTitle,
                newWikitext,
                `Removing categories: ${categoriesToRemove.join(', ')}`
            );
            success = result && result.edit && result.edit.result === 'Success';
        }

        return { success: success, modified: newWikitext !== wikitext };
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
        if (!wikitext) {
            return { success: false, modified: false };
        }
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
        let success = true;
        if (newWikitext !== wikitext) {
            const summary = this.buildEditSummary(toAdd, toRemove);
            const result = await this.api.editPage(fileTitle, newWikitext, summary);
            success = result && result.edit && result.edit.result === 'Success';
        }

        return { success: success, modified: newWikitext !== wikitext };
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
        const buildEditSummary = this.buildEditSummary.bind(this);

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
                const summary = buildEditSummary(toAdd, toRemove);
                return {
                    text: newWikitext,
                    summary: summary,
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
    categoryLink(category) {
        const catName = category.startsWith('Category:') ? category.slice(9) : category;
        return `[[Category:${catName}]]`;
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
        if (toAdd.length) parts.push(`Adding ${toAdd.map(this.categoryLink).join(', ')}`);
        if (toRemove.length) parts.push(`Removing ${toRemove.map(this.categoryLink).join(', ')}`);
        return `${parts.join('; ')} (via Category Batch Manager)`;
    }
}

export default CategoryService;
