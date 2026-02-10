/**
 *
 * @see https://doc.wikimedia.org/codex/latest/
 */
class CategoryInputsHandler {
    /**
     * @param {Object} apiService - API service instance
     */
    constructor(apiService) {
        this.apiService = apiService;
    }

    deduplicateResults(items1, results) {
        const seen = new Set(items1.map((result) => result.value));
        return results.filter((result) => !seen.has(result.value));
    }

    async onAddCategoryInput(value, addCategoryInput) {

        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn('Add category input cleared, clearing menu items.');
            return [];
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn('Add category input too short, clearing menu items.');
            return [];
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (addCategoryInput !== value) {
            console.warn('Add category input value changed during fetch, discarding results.');
            return null;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn('No results for add category input, clearing menu items.');
            return [];
        }

        // Update addCategory.menuItems.
        return data;
    }

    async onRemoveCategoryInput(value, removeCategoryInput) {
        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn('Remove category input cleared, clearing menu items.');
            return [];
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn('Remove category input too short, clearing menu items.');
            return [];
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (removeCategoryInput !== value) {
            console.warn('Remove category input value changed during fetch, discarding results.');
            return null;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn('No results for remove category input, clearing menu items.');
            return [];
        }

        // Update removeCategory.menuItems.
        return data;
    }

    async addOnLoadMore(addCategory) {
        if (!addCategory.input) {
            console.warn('No input value for add categories, cannot load more.');
            return;
        }

        const data = await this.apiService.fetchCategories(addCategory.input, { offset: addCategory.menuItems.length });

        if (!data || data.length === 0) {
            console.warn('No more results to load for add categories.');
            return;
        }

        // Update addCategory.menuItems.
        const deduplicatedResults = this.deduplicateResults(addCategory.menuItems, data);
        return deduplicatedResults;
    }

    async removeOnLoadMore(removeCategory) {
        if (!removeCategory.input) {
            console.warn('No input value for remove categories, cannot load more.');
            return;
        }

        const data = await this.apiService.fetchCategories(removeCategory.input, { offset: removeCategory.menuItems.length });

        if (!data || data.length === 0) {
            console.warn('No more results to load for remove categories.');
            return;
        }

        // Update removeCategory.menuItems.
        const deduplicatedResults = this.deduplicateResults(removeCategory.menuItems, data);
        return deduplicatedResults;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputsHandler;
}
