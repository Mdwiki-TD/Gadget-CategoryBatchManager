/**
 * Category inputs UI component using Codex CSS-only classes.
 * Manages the add categories, remove categories inputs with autocomplete.
 * @see https://doc.wikimedia.org/codex/latest/
 */

function CategoryInputs(apiService) {
    const addElement = `
        <!-- Category Add Message -->
        <div v-if="addCategory.message.show" class="margin-bottom-20">
            <cdx-message
            allow-user-dismiss
            :type="addCategory.message.type"
            :inline="false"
            >
                {{ addCategory.message.text }}
            </cdx-message>
        </div>
    `;
    const removeElement = `
        <!-- Category Remove Message -->
        <div v-if="removeCategory.message.show" class="margin-bottom-20">
            <cdx-message
            allow-user-dismiss
            :type="removeCategory.message.type"
            :inline="false">
                {{ removeCategory.message.text }}
            </cdx-message>
        </div>
    `;

    const app = {
        data: function () {
            return {
                apiService: apiService,

                addCategory: {
                    menuItems: [],
                    menuConfig: {
                        boldLabel: true,
                        visibleItemLimit: 10
                    },
                    chips: [],
                    selected: [],
                    input: "",
                    message: {
                        show: false,
                        type: "",
                        text: "",
                    },
                },
                removeCategory: {
                    menuItems: [],
                    menuConfig: {
                        boldLabel: true,
                        visibleItemLimit: 10
                    },
                    chips: [],
                    selected: [],
                    input: "",
                    message: {
                        show: false,
                        type: "",
                        text: "",
                    },
                }
            };
        },
        template: `
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
        `,
        methods: {
            hideCategoryMessage(msg_type = 'add') {
                console.log(`[CBM] Hiding ${msg_type} category message`);
                if (msg_type === 'add') {
                    this.addCategory.message.show = false;
                    this.addCategory.message.text = '';
                } else if (msg_type === 'remove') {
                    this.removeCategory.message.show = false;
                    this.removeCategory.message.text = '';
                }
            },

            displayCategoryMessage(text, type = 'error', msg_type = 'add') {
                console.log(`[CBM] Displaying ${msg_type} category message: ${text} (type: ${type})`);
                if (msg_type === 'add') {
                    this.addCategory.message.show = true;
                    this.addCategory.message.type = type;
                    this.addCategory.message.text = text;
                } else if (msg_type === 'remove') {
                    this.removeCategory.message.show = true;
                    this.removeCategory.message.type = type;
                    this.removeCategory.message.text = text;
                }
            },

            deduplicateResults(items1, results) {
                const seen = new Set(items1.map((result) => result.value));
                return results.filter((result) => !seen.has(result.value));
            },

            async onAddCategoryInput(value) {
                this.hideCategoryMessage('add');

                // Clear menu items if the input was cleared.
                if (!value) {
                    console.warn('Add category input cleared, clearing menu items.');
                    this.addCategory.menuItems = [];
                    return;
                }

                // If empty, clear menu items
                if (!value || value.trim().length < 2) {
                    console.warn('Add category input too short, clearing menu items.');
                    this.addCategory.menuItems = [];
                    return;
                }

                const data = await this.apiService.fetchCategories(value);

                // Make sure this data is still relevant first.
                if (this.addCategory.input !== value) {
                    console.warn('Add category input value changed during fetch, discarding results.');
                    return;
                }

                // Reset the menu items if there are no results.
                if (!data || data.length === 0) {
                    console.warn('No results for add category input, clearing menu items.');
                    this.addCategory.menuItems = [];
                    return;
                }

                // Update addCategory.menuItems.
                this.addCategory.menuItems = data;
            },

            async onRemoveCategoryInput(value) {
                this.hideCategoryMessage('remove');
                // Clear menu items if the input was cleared.
                if (!value) {
                    console.warn('Remove category input cleared, clearing menu items.');
                    this.removeCategory.menuItems = [];
                    return;
                }

                // If empty, clear menu items
                if (!value || value.trim().length < 2) {
                    console.warn('Remove category input too short, clearing menu items.');
                    this.removeCategory.menuItems = [];
                    return;
                }

                const data = await this.apiService.fetchCategories(value);

                // Make sure this data is still relevant first.
                if (this.removeCategory.input !== value) {
                    console.warn('Remove category input value changed during fetch, discarding results.');
                    return;
                }

                // Reset the menu items if there are no results.
                if (!data || data.length === 0) {
                    console.warn('No results for remove category input, clearing menu items.');
                    this.removeCategory.menuItems = [];
                    return;
                }

                // Update removeCategory.menuItems.
                this.removeCategory.menuItems = data;
            },

            async addOnLoadMore() {
                if (!this.addCategory.input) {
                    console.warn('No input value for add categories, cannot load more.');
                    return;
                }

                const data = await this.apiService.fetchCategories(this.addCategory.input, { offset: this.addCategory.menuItems.length });

                if (!data || data.length === 0) {
                    console.warn('No more results to load for add categories.');
                    return;
                }

                // Update this.addCategory.menuItems.
                const deduplicatedResults = this.deduplicateResults(this.addCategory.menuItems, data);
                this.addCategory.menuItems.push(...deduplicatedResults);
            },

            async removeOnLoadMore() {
                if (!this.removeCategory.input) {
                    console.warn('No input value for remove categories, cannot load more.');
                    return;
                }

                const data = await this.apiService.fetchCategories(this.removeCategory.input, { offset: this.removeCategory.menuItems.length });

                if (!data || data.length === 0) {
                    console.warn('No more results to load for remove categories.');
                    return;
                }

                // Update this.removeCategory.menuItems.
                const deduplicatedResults = this.deduplicateResults(this.removeCategory.menuItems, data);
                this.removeCategory.menuItems.push(...deduplicatedResults);
            },
        }
    }
    //
    return app;

}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputs
}
