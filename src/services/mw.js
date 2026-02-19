/**
 * Development shim for mw.Api that uses fetch to call the MediaWiki API.
 * This allows testing outside of MediaWiki environments.
 */
class Api {
    constructor() {
        // Detect if we're running on a Wikimedia site
        const host = typeof window !== 'undefined' ? window.location.host : '';
        this.baseUrl = host.includes('wikimedia.org') || host.includes('wikipedia.org')
            ? ''
            : 'https://commons.wikimedia.org';
        this.apiUrl = `${this.baseUrl}/w/api.php`;
    }

    /**
     * Build a complete URL with query parameters for GET requests.
     * @param {Object} params
     * @returns {string}
     */
    _buildUrl(params) {
        const queryParams = new URLSearchParams({
            format: 'json',
            origin: '*',
            ...params
        });
        return `${this.apiUrl}?${queryParams.toString()}`;
    }

    /**
     * Perform a GET request to the MediaWiki API.
     * Wraps mw.Api() calls using fetch for development/testing.
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async get(params) {
        const url = this._buildUrl(params);
        const headers = {
            'Accept': 'application/json',
            "User-Agent": "CategoryBatchManager/1.0 (https://github.com/Mdwiki-TD/Gadget-CategoryBatchManager)"
        };
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get categories for a title.
     * @param {string} title
     * @returns {Promise<string[]|false>}
     */
    async getCategories(title) {
        if (!title) return false;
        const data = await this.get({
            action: 'query',
            titles: title,
            prop: 'categories',
            cllimit: 500,
            format: 'json'
        });
        const pages = data?.query?.pages;
        if (!pages) return false;
        const page = Object.values(pages)[0];
        if (page?.missing) return false;
        return page?.categories?.map(cat => cat.title) || [];
    }

    /**
     * Search for files in a category with optional title pattern.
     * @param {string} categoryName
     * @param {string} [titlePattern]
     * @returns {Promise<Array>}
     */
    async searchInCategory(categoryName, titlePattern = '') {
        const searchCategoryName = categoryName.replace(/\s+/g, '_');
        const srsearch = titlePattern.trim()
            ? `incategory:${searchCategoryName} intitle:/${titlePattern}/`
            : `incategory:${searchCategoryName}`;

        const data = await this.get({
            action: 'query',
            list: 'search',
            srsearch: srsearch,
            srnamespace: 6,
            srlimit: 500,
            srprop: 'size|wordcount|timestamp',
            format: 'json'
        });

        return data?.query?.search || [];
    }

    /**
     * Edit a page via the MediaWiki API.
     * Requires authentication - in dev mode this returns a simulated response.
     * https://doc.wikimedia.org/mediawiki-core/master/js/mw.Api.html#edit
     * @param {string} title
     * @param {Function} transformFn - Returns edit parameters
     * @returns {Promise<Object>}
     */
    async edit(title, transformFn) {
        console.warn('[mw.Api shim] Edit operation not available in development mode.');
        console.log('[mw.Api shim] Would edit:', title);

        // Return simulated successful response for dev testing
        return {
            edit: {
                result: 'Success',
                title: title,
                oldrevid: 12345,
                newrevid: 12346,
                _simulated: true
            }
        };
    }
}
const config = {
    get: (key) => {
        const configData = {
            wgPageName: '',
            wgUserName: 'ExampleUser',
            wgCanonicalNamespace: 'Category',
            wgUserGroups: ['*'],
        };
        return configData[key] || null;
    }
};

export default { Api, config };
