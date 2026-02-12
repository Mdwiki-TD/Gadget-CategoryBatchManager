/**
 * Category add/remove multiselect inputs panel.
 * @returns {Object} Partial Vue app configuration
 */

import { CategoryLookup } from "../components";

function CategoryInputsPanel() {
    return {
        props: {
            addCategory: {
                type: Object,
                required: true
            },
            removeCategory: {
                type: Object,
                required: true
            },
            handler: {
                type: Object,
                required: true
            }
        },
        template: `
            <CategoryLookup
                :model="addCategory"
                label="Add categories"
                aria-label="Add categories"
                placeholder="Type to search categories"
                type="add"
                :handler="handler"
            />

            <CategoryLookup
                :model="removeCategory"
                label="Remove categories"
                aria-label="Remove categories"
                placeholder="Type to search categories"
                type="remove"
                :handler="handler"
            />
        `,
        components: {
            CategoryLookup: CategoryLookup()
        }

    }

}

export default CategoryInputsPanel;
