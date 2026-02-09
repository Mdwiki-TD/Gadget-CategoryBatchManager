/**
 * Category inputs UI component using Codex CSS-only classes.
 * Manages the add categories, remove categories inputs with autocomplete.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class CategoryInputs
 */
class CategoryInputs {
    /**
     * @param {APIService} apiService - API service for category search
     * @param {CategoryInputsMessages} messagesComponent - Component for managing category input messages
     */
    constructor(apiService, messagesComponent) {
        this.apiService = apiService;
        this.messages_component = messagesComponent;
    }

    /**
     * Create the category inputs HTML element with Codex components.
     */
    createElement() {
        const addElement = this.messages_component.createAddElement();
        const removeElement = this.messages_component.createRemoveElement();

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
                    v-model:input-chips="addCategory.chips"
                    v-model:selected="addCategory.selected"
		            v-model:input-value="addCategory.input"
                    :menu-items="addCategory.menuItems"
                    :menu-config="addCategory.menuConfig"
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
            ${addElement}

            <div class="cbm-category-input-group">
                <cdx-label input-id="cbm-remove-cats" class="cbm-label">
                    Remove Categories
                </cdx-label>
                <cdx-multiselect-lookup
                    id="cdx-category-remove"
                    v-model:input-chips="removeCategory.chips"
                    v-model:selected="removeCategory.selected"
		            v-model:input-value="removeCategory.input"
                    :menu-items="removeCategory.menuItems"
                    :menu-config="removeCategory.menuConfig"
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
            ${removeElement}
    `;
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
        self.hideCategoryMessage('add');

        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn('Add category input cleared, clearing menu items.');
            self.addCategory.menuItems = [];
            return;
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn('Add category input too short, clearing menu items.');
            self.addCategory.menuItems = [];
            return;
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (self.addCategory.input !== value) {
            console.warn('Add category input value changed during fetch, discarding results.');
            return;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn('No results for add category input, clearing menu items.');
            self.addCategory.menuItems = [];
            return;
        }

        // Update addCategory.menuItems.
        self.addCategory.menuItems = data;
    }

    /**
     * Handle remove category input with debounce.
     * @param {string} value - The input value to search for
     */
    async onRemoveCategoryInput(self, value) {
        self.hideCategoryMessage('remove');
        // Clear menu items if the input was cleared.
        if (!value) {
            console.warn('Remove category input cleared, clearing menu items.');
            self.removeCategory.menuItems = [];
            return;
        }

        // If empty, clear menu items
        if (!value || value.trim().length < 2) {
            console.warn('Remove category input too short, clearing menu items.');
            self.removeCategory.menuItems = [];
            return;
        }

        const data = await this.apiService.fetchCategories(value);

        // Make sure this data is still relevant first.
        if (self.removeCategory.input !== value) {
            console.warn('Remove category input value changed during fetch, discarding results.');
            return;
        }

        // Reset the menu items if there are no results.
        if (!data || data.length === 0) {
            console.warn('No results for remove category input, clearing menu items.');
            self.removeCategory.menuItems = [];
            return;
        }

        // Update removeCategory.menuItems.
        self.removeCategory.menuItems = data;
    }

    async addOnLoadMore(self) {
        if (!self.addCategory.input) {
            console.warn('No input value for add categories, cannot load more.');
            return;
        }

        const data = await this.apiService.fetchCategories(self.addCategory.input, { offset: self.addCategory.menuItems.length });

        if (!data || data.length === 0) {
            console.warn('No more results to load for add categories.');
            return;
        }

        // Update self.addCategory.menuItems.
        const deduplicatedResults = this.deduplicateResults(self.addCategory.menuItems, data);
        self.addCategory.menuItems.push(...deduplicatedResults);
    }

    async removeOnLoadMore(self) {
        if (!self.removeCategory.input) {
            console.warn('No input value for remove categories, cannot load more.');
            return;
        }

        const data = await this.apiService.fetchCategories(self.removeCategory.input, { offset: self.removeCategory.menuItems.length });

        if (!data || data.length === 0) {
            console.warn('No more results to load for remove categories.');
            return;
        }

        // Update self.removeCategory.menuItems.
        const deduplicatedResults = this.deduplicateResults(self.removeCategory.menuItems, data);
        self.removeCategory.menuItems.push(...deduplicatedResults);
    }

}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputs;
}
