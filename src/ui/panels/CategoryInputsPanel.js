/**
 * Category inputs UI component using Codex CSS-only classes.
 * Manages the add categories, remove categories inputs with autocomplete.
 * @see https://doc.wikimedia.org/codex/latest/
 */

import { CategoryLookup } from "../components";

function CategoryInputsPanel(category_inputs_handler) {
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
                        key: 0
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
                        key: 0
                    },
                }
            };
        },
        template: `
            <CategoryLookup
                :model="addCategory"
                label="Add Categories"
                aria-label="Add categories"
                placeholder="Type to search categories"
                type="add"
                :handler="category_inputs_handler"
            />

            <CategoryLookup
                :model="removeCategory"
                label="Remove Categories"
                aria-label="Remove categories"
                placeholder="Type to search categories"
                type="remove"
                :handler="category_inputs_handler"
            />
        `,
        methods: {
            displayCategoryMessage(text, type = 'error', msg_type = 'add') {
                console.log(`[CBM] Displaying ${msg_type} category message: ${text} (type: ${type})`);
                const target = msg_type === 'add' ? this.addCategory : this.removeCategory;

                // Hide first to trigger reactivity if it was already showing
                target.message.show = false;

                // Use nextTick to ensure the change is processed before showing again
                this.$nextTick(() => {
                    target.message.type = type;
                    target.message.text = text;
                    target.message.show = true;
                    target.message.key++; // Increment key to force component re-render
                });
            },

            hideAddCategoryMessage() {
                console.log(`[CBM] Hiding add category message`);
                this.addCategory.message.show = false;
                this.addCategory.message.text = '';
            },

            hideRemoveCategoryMessage() {
                console.log(`[CBM] Hiding remove category message`);
                this.removeCategory.message.show = false;
                this.removeCategory.message.text = '';
            },

            async onAddCategoryInput(value) {
                this.hideAddCategoryMessage();
                const data = await this.category_inputs_handler.onCategoryInput(
                    value,
                    this.addCategory.input,
                    'add'
                );
                // if (data !== null) {
                if (data) {
                    // this.addCategory.menuItems = data;
                    this.addCategory.menuItems.push(...data);
                }
            },

            async onRemoveCategoryInput(value) {
                this.hideRemoveCategoryMessage();
                const data = await this.category_inputs_handler.onCategoryInput(
                    value,
                    this.removeCategory.input,
                    'remove'
                );
                // if (data !== null) {
                if (data) {
                    // this.removeCategory.menuItems = data;
                    this.removeCategory.menuItems.push(...data);
                }
            },

            async addOnLoadMore() {
                const results = await this.category_inputs_handler.onLoadMore(this.addCategory, 'add');
                if (results && results.length > 0) {
                    this.addCategory.menuItems.push(...results);
                }
            },

            async removeOnLoadMore() {
                const results = await this.category_inputs_handler.onLoadMore(this.removeCategory, 'remove');

                if (results && results.length > 0) {
                    this.removeCategory.menuItems.push(...results);
                }
            },
        },
        components: {
            CategoryLookup: CategoryLookup()
        }

    }
    //
    return app;

}

export default CategoryInputsPanel;
