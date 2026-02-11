/**
 * Category add/remove multiselect inputs panel.
 * @param {CategoryInputsHandler} handler
 * @returns {Object} Partial Vue app configuration
 */

import { CategoryLookup } from "../components";
import { CategoryInputsHandler } from './../handlers';

function CategoryInputsPanel(category_inputs_handler) {
    /** Default shape for a lookup model object */
    const newLookupModel = () => ({
        menuItems: [],
        menuConfig: { boldLabel: true, visibleItemLimit: 10 },
        chips: [],
        selected: [],
        input: '',
        message: { show: false, type: '', text: '', key: 0 },
    });

    const app = {
        data: function () {
            return {
                category_inputs_handler: category_inputs_handler,

                addCategory: newLookupModel(),
                removeCategory: newLookupModel(),
            };
        },
        template: `
            <CategoryLookup
                :model="addCategory"
                label="Add categories"
                aria-label="Add categories"
                placeholder="Type to search categories"
                type="add"
                :handler="category_inputs_handler"
            />

            <CategoryLookup
                :model="removeCategory"
                label="Remove categories"
                aria-label="Remove categories"
                placeholder="Type to search categories"
                type="remove"
                :handler="category_inputs_handler"
            />
        `,
        methods: {
            /**
             * Display a message beneath one of the lookup inputs.
             * @param {string}  text
             * @param {'error'|'warning'|'success'|'notice'} type
             * @param {'add'|'remove'} target
             */
            displayCategoryMessage(text, type = 'error', target = 'add') {
                console.log(`[CBM] Displaying ${target} category message: ${text} (type: ${type})`);
                const model = target === 'add' ? this.addCategory : this.removeCategory;

                // Hide first to trigger reactivity if it was already showing
                model.message.show = false;

                // Use nextTick to ensure the change is processed before showing again
                this.$nextTick(() => {
                    model.message.type = type;
                    model.message.text = text;
                    model.message.show = true;
                    model.message.key++; // Increment key to force component re-render
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
