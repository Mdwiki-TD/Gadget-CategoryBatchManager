/**
 * Category inputs UI component using Codex CSS-only classes.
 * Manages the add categories, remove categories inputs with autocomplete.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class CategoryInputs
 */
class CategoryInputs {
    /**
     * @param {APIService} apiService - API service for category search
     */
    constructor(apiService) {
        this.apiService = apiService;
    }

    /**
     * Create the category inputs HTML element with Codex components.
     */
    createElement() {
        return `
            <div class="cbm-category-input-group">
                <cdx-label input-id="cbm-add-cats" class="cbm-label">
                    Add Categories
                </cdx-label>
                <span class="cbm-help-text">
                    e.g., Category:Belarus, Category:Europe
                </span>
                <cdx-multiselect-lookup
                    id="cdx-category-add"
                    v-model:input-chips="addCategoryChips"
                    v-model:selected="addCategories"
		            v-model:input-value="addInputValue"
                    :menu-items="addCategoryMenuItems"
                    :menu-config="addCategoryMenuConfig"
                    aria-label="Add categories"
                    placeholder="Type to search categories"
                    @update:input-value="onAddCategoryInput"
		            @load-more="addOnLoadMore"
                >
                    <template #no-results>
                        Type at least 2 characters to search
                    </template>
                </cdx-multiselect-lookup>
            </div>

            <!-- Category Add Message -->
            <div v-if="showAddCategoryMessage" class="margin-bottom-20">
                <cdx-message type="{{ addCategoryMessageType }}" :inline="false">
                    {{ addCategoryMessageText }}
                </cdx-message>
            </div>

            <div class="cbm-category-input-group">
                <cdx-label input-id="cbm-remove-cats" class="cbm-label">
                    Remove Categories
                </cdx-label>
                <cdx-multiselect-lookup
                    id="cdx-category-remove"
                    v-model:input-chips="removeCategoryChips"
                    v-model:selected="removeCategories"
		            v-model:input-value="removeInputValue"
                    :menu-items="removeCategoryMenuItems"
                    :menu-config="removeCategoryMenuConfig"
                    aria-label="Remove categories"
                    placeholder="Type to search categories"
                    @update:input-value="onRemoveCategoryInput"
		            @load-more="removeOnLoadMore"
                    >
                    <template #no-results>
                        Type at least 2 characters to search
                    </template>
                </cdx-multiselect-lookup>
            </div>
            <!-- Category Remove Message -->
            <div v-if="showRemoveCategoryMessage" class="margin-bottom-20">
                <cdx-message type="{{ removeCategoryMessageType }}" :inline="false">
                    {{ removeCategoryMessageText }}
                </cdx-message>
            </div>
    `;
    }
    displayCategoryMessage(self, text, type = 'error', msg_type = 'add') {
        if (msg_type === 'add') {
            self.showAddCategoryMessage = true;
            self.addCategoryMessageType = type;
            self.addCategoryMessageText = text;
        } else if (msg_type === 'remove') {
            self.showRemoveCategoryMessage = true;
            self.removeCategoryMessageType = type;
            self.removeCategoryMessageText = text;
        }
    }

    hideCategoryMessage(self, msg_type = 'add') {
        if (msg_type === 'add') {
            self.showAddCategoryMessage = false;
            self.addCategoryMessageText = '';
        } else if (msg_type === 'remove') {
            self.showRemoveCategoryMessage = false;
            self.removeCategoryMessageText = '';
        }
    }
    deduplicateResults(items1, results) {
        const seen = new Set(items1.map((result) => result.value));
        return results.filter((result) => !seen.has(result.value));
    }

    /**
     * Handle add category input with debounce.
     * @param {string} value - The input value to search for
     */
    async onAddCategoryInput(self, value) {
        this.hideCategoryMessage(self, 'add');

        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn('Add category input cleared, clearing menu items.');
            self.addCategoryMenuItems = [];
            return;
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn('Add category input too short, clearing menu items.');
            self.addCategoryMenuItems = [];
            return;
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (self.addInputValue !== value) {
            console.warn('Add category input value changed during fetch, discarding results.');
            return;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn('No results for add category input, clearing menu items.');
            self.addCategoryMenuItems = [];
            return;
        }

        // Update addCategoryMenuItems.
        self.addCategoryMenuItems = data;
    }

    /**
     * Handle remove category input with debounce.
     * @param {string} value - The input value to search for
     */
    async onRemoveCategoryInput(self, value) {
        this.hideCategoryMessage(self, 'remove');
        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn('Remove category input cleared, clearing menu items.');
            self.removeCategoryMenuItems = [];
            return;
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn('Remove category input too short, clearing menu items.');
            self.removeCategoryMenuItems = [];
            return;
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (self.removeInputValue !== value) {
            console.warn('Remove category input value changed during fetch, discarding results.');
            return;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn('No results for remove category input, clearing menu items.');
            self.removeCategoryMenuItems = [];
            return;
        }

        // Update removeCategoryMenuItems.
        self.removeCategoryMenuItems = data;
    }

    async addOnLoadMore(self) {
        if (!self.addInputValue) {
            console.warn('No input value for add categories, cannot load more.');
            return;
        }

        const data = await this.apiService.fetchCategories(self.addInputValue, { offset: self.addCategoryMenuItems.length });

        if (!data || data.length === 0) {
            console.warn('No more results to load for add categories.');
            return;
        }

        // Update self.addCategoryMenuItems.
        const deduplicatedResults = this.deduplicateResults(self.addCategoryMenuItems, data);
        self.addCategoryMenuItems.push(...deduplicatedResults);
    }

    async removeOnLoadMore(self) {
        if (!self.removeInputValue) {
            console.warn('No input value for remove categories, cannot load more.');
            return;
        }

        const data = await this.apiService.fetchCategories(self.removeInputValue, { offset: self.removeCategoryMenuItems.length });

        if (!data || data.length === 0) {
            console.warn('No more results to load for remove categories.');
            return;
        }

        // Update self.removeCategoryMenuItems.
        const deduplicatedResults = this.deduplicateResults(self.removeCategoryMenuItems, data);
        self.removeCategoryMenuItems.push(...deduplicatedResults);
    }

}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputs;
}
