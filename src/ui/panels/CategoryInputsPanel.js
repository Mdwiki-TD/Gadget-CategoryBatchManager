/**
 * Category inputs UI component using Codex CSS-only classes.
 * Manages the add categories, remove categories inputs with autocomplete.
 * @see https://doc.wikimedia.org/codex/latest/
 */

function CategoryInputsPanel(category_inputs_handler) {
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
                category_inputs_handler: category_inputs_handler,

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

            async onAddCategoryInput(value) {
                this.hideCategoryMessage('add');
                const data = await this.category_inputs_handler.onCategoryInput(
                    value,
                    this.addCategory.input,
                    'add'
                );
                if (data !== null) {
                    this.addCategory.menuItems = data;
                }
            },

            async onRemoveCategoryInput(value) {
                this.hideCategoryMessage('remove');
                const data = await this.category_inputs_handler.onCategoryInput(
                    value,
                    this.removeCategory.input,
                    'remove'
                );
                if (data !== null) {
                    this.removeCategory.menuItems = data;
                }
            },

            async addOnLoadMore() {
                const results = this.category_inputs_handler.onLoadMore(this.addCategory, 'add');
                if (results) {
                    this.addCategory.menuItems.push(...results);
                }
            },

            async removeOnLoadMore() {
                const results = this.category_inputs_handler.onLoadMore(this.removeCategory, 'remove');
                if (results) {
                    this.removeCategory.menuItems.push(...results);
                }
            },
        }
    }
    //
    return app;

}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputsPanel
}
