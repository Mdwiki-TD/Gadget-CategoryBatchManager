/**
 * Validation Helper
 *
 * @description
 * Shared validation logic for BatchManager handlers.
 * Provides common validation functions used by PreviewHandler and ExecuteHandler.
 *
 * @requires Validator - For checking circular category references
 */

/* global Validator */

class ValidationHelper {
    /**
     */
    constructor() {
    }

    /**
     * Check if any category appears in both add and remove lists
     * @param {Object} vueInstance - Vue component instance
     * @returns {Object} Validation result {valid: boolean, duplicates?: Array<string>}
     */
    hasDuplicateCategories(vueInstance) {
        const addCategories = vueInstance.addCategory.selected || [];
        const removeCategories = vueInstance.removeCategory.selected || [];

        if (addCategories.length === 0 || removeCategories.length === 0) {
            return { valid: true };
        }

        const duplicates = [];

        for (const addCat of addCategories) {
            for (const removeCat of removeCategories) {
                const normalizedAdd = Validator.normalizeCategoryName(addCat);
                const normalizedRemove = Validator.normalizeCategoryName(removeCat);

                if (normalizedAdd.toLowerCase() === normalizedRemove.toLowerCase()) {
                    duplicates.push(addCat);
                    break;
                }
            }
        }

        if (duplicates.length > 0) {
            return { valid: false, duplicates };
        }

        return { valid: true };
    }

    /**
     * Check for circular category references and filter them out silently
     * Only shows error if ALL categories are circular
     * @returns {Object} Object with validCategories and circularCategories arrays
     */
    filterCircularCategoriesNew(addCategory_selected, sourceCategory) {
        const circularCategories = [];
        const validCategories = [];
        for (const category of addCategory_selected) {
            if (Validator.isCircularCategory(sourceCategory, category)) {
                console.log('[CBM-V] Circular category detected (silently removed):', category);
                circularCategories.push(category);
            } else {
                validCategories.push(category);
            }
        }

        return { validCategories, circularCategories };
    }
    filterCircularCategories(self) {
        const circularCategories = [];
        const validCategories = [];
        for (const category of self.addCategory.selected) {
            if (Validator.isCircularCategory(self.sourceCategory, category)) {
                console.log('[CBM-V] Circular category detected (silently removed):', category);
                circularCategories.push(category);
            } else {
                validCategories.push(category);
            }
        }

        // If all categories are circular, show error
        if (circularCategories.length > 0 && validCategories.length === 0) {
            self.displayCategoryMessage(
                `❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "${circularCategories.join(', ')}" to itself.`,
                'error',
                'add'
            );
            return null;
        }

        // Silently filter circular categories if there are valid ones
        return validCategories;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationHelper;
}
