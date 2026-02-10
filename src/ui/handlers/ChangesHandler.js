/**
 * Changes Handler
 *
 */

class ChangesHandler {
    /**
     */
    constructor(validator) {
        this.validator = validator
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */
    /**
     * Validate operation before execution
     * @param {Array} selectedFiles - Array of selected files
     * @param {Array} addCategories - Categories to add
     * @param {Array} removeCategories - Categories to remove
     * @returns {Object} Validation result {valid: boolean, error?: string}
     */
    validateOperation(selectedFiles, addCategories, removeCategories) {
        // selectedCount === 0 ||
        if (!selectedFiles || selectedFiles.length === 0) {
            return { valid: false, error: 'Please select at least one file.' };
        }

        if (addCategories.length === 0 && removeCategories.length === 0) {
            return { valid: false, error: 'Please specify categories to add or remove.' };
        }

        return { valid: true };
    }

    /**
     * Prepare batch operation data
     * @param {String} sourceCategory - The source category
     * @param {Array} selectedFiles - Array of selected files
     * @param {Array} addCategorySelected - Categories to add
     * @param {Array} removeCategorySelected - Categories to remove
     * @returns {Object} Preparation result
     */
    prepareOperation(sourceCategory, selectedFiles, addCategorySelected, removeCategorySelected) {
        // Check for duplicate categories in both add and remove lists
        const duplicateCheck = this.validator.hasDuplicateCategories(addCategorySelected, removeCategorySelected);
        if (!duplicateCheck.valid) {
            return {
                valid: false,
                error: `Cannot add and remove the same category: "${duplicateCheck.duplicates.join(', ')}". Please remove it from one of the lists.`
            };
        }

        // Filter out circular categories (returns null if ALL are circular)
        const { filteredToAdd, circularCategories } = this.validator.filterCircularCategories(addCategorySelected, sourceCategory);

        // If all categories are circular, show error
        if (circularCategories.length > 0 && filteredToAdd.length === 0) {
            const message = `❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "${circularCategories.join(', ')}" to itself.`;
            return { valid: false, error: 'Circular categories detected.', message: message };
        }
        // Check if there are any valid operations remaining
        if (filteredToAdd.length === 0 && removeCategorySelected.length === 0) {
            return { valid: false, error: 'No valid categories to add or remove.' };
        }

        // Filter files to only those that will actually change
        // This ensures the confirmation message shows the correct count
        const filesThatWillChange = ChangeCalculator.filterFilesThatWillChange(
            selectedFiles,
            filteredToAdd,
            removeCategorySelected
        );

        return {
            valid: true,
            filteredToAdd,
            removeCategories: removeCategorySelected,
            filesCount: filesThatWillChange.length,
            filesToProcess: filesThatWillChange
        };
    }

    async valid_work(sourceCategory, selectedFiles, addCategorySelected, removeCategorySelected, callbacks = {}) {
        console.log('[CBM-P] Preview button clicked');

        const {
            showWarningMessage = () => { },
            displayCategoryMessage = () => { }
        } = callbacks;

        // Validate
        const validation = this.validateOperation(
            selectedFiles,
            addCategorySelected,
            removeCategorySelected
        );

        if (!validation.valid) {
            showWarningMessage(validation.error);
            return;
        }

        const preparation = this.prepareOperation(
            sourceCategory,
            selectedFiles,
            addCategorySelected,
            removeCategorySelected
        );

        if (!preparation.valid) {
            if (preparation?.message) {
                displayCategoryMessage(
                    preparation.message,
                    'error',
                    'add'
                );
            }
            console.log('[CBM-V] No valid categories after filtering');
            displayCategoryMessage(preparation.error, 'warning', 'add');
            return;
        }
        return preparation;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChangesHandler;
}
