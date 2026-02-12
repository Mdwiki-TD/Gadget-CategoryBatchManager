/**
 * Category add/remove multiselect inputs panel.
 * @param {CategoryInputsHandler} category_inputs_handler
 * @returns {Object} Partial Vue app configuration
 */

import { APIService } from "../../services";
import { CategoryLookup } from "../components";
import { CategoryInputsHandler } from './../handlers';

function CategoryInputsPanel() {
    const api = new APIService();
    const category_inputs_handler = new CategoryInputsHandler(api);

    return {
        props: {
            addCategory: {
                type: Object,
                required: true
            },
            removeCategory: {
                type: Object,
                required: true
            }
        },

        data() {
            return {
                category_inputs_handler: category_inputs_handler,
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

        },
        components: {
            CategoryLookup: CategoryLookup()
        }

    }

}

export default CategoryInputsPanel;
