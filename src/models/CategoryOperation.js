/**
 * Category operation model
 * @class CategoryOperation
 */
class CategoryOperation {
    /**
     * @param {Object} data - Operation data
     * @param {string} data.sourceCategory - Source category name
     * @param {string} data.searchPattern - Search pattern used
     * @param {Array} [data.files=[]] - Files matched
     * @param {Array<string>} [data.categoriesToAdd=[]] - Categories to add
     * @param {Array<string>} [data.categoriesToRemove=[]] - Categories to remove
     * @param {string} [data.status='idle'] - Operation status
     */
    constructor(data) {
        this.sourceCategory = data.sourceCategory;
        this.searchPattern = data.searchPattern;
        this.files = data.files || [];
        this.categoriesToAdd = data.categoriesToAdd || [];
        this.categoriesToRemove = data.categoriesToRemove || [];
        this.status = data.status || 'idle';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryOperation;
}
