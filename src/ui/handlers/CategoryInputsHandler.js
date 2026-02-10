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

    async onCategoryInput(value, CategoryInput, input_type = 'add') {
        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn(`${input_type} category input cleared, clearing menu items.`);
            return [];
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn(`${input_type} category input too short, clearing menu items.`);
            return [];
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (CategoryInput !== value) {
            console.warn(`${input_type} category input value changed during fetch, discarding results.`);
            return null;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn(`No results for ${input_type} category input, clearing menu items.`);
            return [];
        }

        return data;
    }
    async onLoadMore(Category, input_type = 'add') {
        if (!Category.input) {
            console.warn(`No input value for ${input_type} categories, cannot load more.`);
            return;
        }

        const data = await this.apiService.fetchCategories(Category.input, { offset: Category.menuItems.length });

        if (!data || data.length === 0) {
            console.warn(`No more results to load for ${input_type} categories.`);
            return;
        }

        // Update Category.menuItems.
        const deduplicatedResults = this.deduplicateResults(Category.menuItems, data);
        return deduplicatedResults;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputsHandler;
}
