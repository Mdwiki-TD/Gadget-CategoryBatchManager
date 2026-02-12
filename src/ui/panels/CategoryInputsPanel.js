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
        components: {
            CategoryLookup: CategoryLookup()
        }

    }

}

export default CategoryInputsPanel;
