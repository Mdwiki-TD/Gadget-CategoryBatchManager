/**
 * Validation Helper
 *
 * @description
 * Shared validation logic for BatchManager handlers.
 * Provides common validation functions used by  ExecuteHandler.
 *
 * @requires Validator - For checking circular category references
 */

import { Validator } from './../../utils';

class ValidationHelper {
    /**
     */
    constructor() {
    }

    /**
     * Check if any category appears in both add and remove lists
     * @param {Array<string>} addCategorySelected - Categories selected to be added
     * @param {Array<string>} removeCategorySelected - Categories selected to be removed
     * @returns {Object} Validation result {valid: boolean, duplicates?: Array<string>}
     */
    hasDuplicateCategories(addCategorySelected, removeCategorySelected) {
        const addCategories = addCategorySelected || [];
        const removeCategories = removeCategorySelected || [];

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
     * @returns {Object} Object with validAddCategories and circularCategories arrays
     */
    filterCircularCategories(addCategory_selected, sourceCategory) {
        const circularCategories = [];
        const validAddCategories = [];
        for (const category of addCategory_selected) {
            if (Validator.isCircularCategory(sourceCategory, category)) {
                console.log('[CBM-V] Circular category detected (silently removed):', category);
                circularCategories.push(category);
            } else {
                validAddCategories.push(category);
            }
        }

        return { validAddCategories, circularCategories };
    }
}

export default ValidationHelper;
