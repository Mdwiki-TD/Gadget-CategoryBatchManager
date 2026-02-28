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
     * Combined add and remove operation using mw.Api.edit() for better conflict handling.
     * Relies on mw.Api.edit internals:
     *   - callback receives { timestamp, content } (content = revision.slots.main.content)
     *   - callback must return { text, summary, minor } or a Promise resolving to one
     *   - returning $.Deferred().reject() aborts the edit chain cleanly
     *   - final resolved value is data.edit = { result: "Success", ... }
     *
     * @param {string} fileTitle - File page title
     * @param {Array<string>} toAdd - Categories to add
     * @param {Array<string>} toRemove - Categories to remove
     * @returns {Promise<{success: boolean, modified: boolean, error?: string}>}
     */
    async updateCategoriesOptimized(fileTitle, toAdd, toRemove) {
        const api = new mw.Api();
        const parser = this.parser;
        const buildEditSummary = this.buildEditSummary.bind(this);

        try {
            const editResult = await api.edit(fileTitle, function (revision) {
                // revision.content = revision.slots.main.content (mapped by mw.Api.edit)
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

                // Abort cleanly if no changes — returning false would stringify to "false"
                // and overwrite the page, so we reject the promise chain instead.
                if (newWikitext === revision.content) {
                    return Promise.reject('no-changes');
                }
                const summary = buildEditSummary(toAdd, toRemove);
                return {
                    text: newWikitext,
                    summary: summary,
                    minor: false,
                    assert: mw.config.get('wgUserName') ? 'user' : undefined,
                    nocreate: true,
                    tags: 'CategoryBatchManager'
                };
            });

            // editResult = data.edit = { result: "Success", pageid, title, ... }
            return {
                success: editResult.result === 'Success',
                modified: true
            };

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
            // Thrown by our $.Deferred().reject('no-changes') above
            if (error === 'no-changes') {
                return { success: true, modified: false };
            }
            // MediaWiki API "no changes" error (edge case from server side)
            if (error && error.message && error.message.includes('no changes')) {
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
