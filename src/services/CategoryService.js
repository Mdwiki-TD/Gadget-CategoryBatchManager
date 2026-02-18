/**
 * Service for category operations on files
 * @class CategoryService
 */

import WikitextParser from './../utils/WikitextParser.js';
import APIService from './APIService.js';
import mw from './mw.js';


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
     * @returns {Promise<{success: boolean, modified: boolean, error?: string}>}
     */
    async updateCategoriesOptimized(fileTitle, toAdd, toRemove) {
        const api = new mw.Api();
        const parser = this.parser;
        const buildEditSummary = this.buildEditSummary.bind(this);

        let hasChanges = false;

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

                hasChanges = true;
                const summary = buildEditSummary(toAdd, toRemove);
                return {
                    text: newWikitext,
                    summary: summary,
                    minor: false,
                    assert: mw.config.get('wgUserName') ? 'user' : undefined,
                    nocreate: true
                };
            });

            return { success: true, modified: hasChanges };
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
            if (error.message && error.message.includes('no changes')) {
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

export default CategoryService;
