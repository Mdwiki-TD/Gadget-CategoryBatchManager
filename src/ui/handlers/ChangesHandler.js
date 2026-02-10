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
     * @param {Object} self - Vue component instance
     * @returns {Object} Preparation result
     */
    prepareOperation(self) {
        // Check for duplicate categories in both add and remove lists
        const duplicateCheck = this.validator.hasDuplicateCategories(self);
        if (!duplicateCheck.valid) {
            return {
                valid: false,
                error: `Cannot add and remove the same category: "${duplicateCheck.duplicates.join(', ')}". Please remove it from one of the lists.`
            };
        }

        // Filter out circular categories (returns null if ALL are circular)
        const { filteredToAdd, circularCategories } = this.validator.filterCircularCategories(self.addCategory.selected, self.sourceCategory);

        // If all categories are circular, show error
        if (circularCategories.length > 0 && filteredToAdd.length === 0) {
            const message = `❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "${circularCategories.join(', ')}" to itself.`;
            return { valid: false, error: 'Circular categories detected.', message: message };
        }
        // Check if there are any valid operations remaining
        if (filteredToAdd.length === 0 && self.removeCategory.selected.length === 0) {
            return { valid: false, error: 'No valid categories to add or remove.' };
        }

        // Filter files to only those that will actually change
        // This ensures the confirmation message shows the correct count
        const filesThatWillChange = ChangeCalculator.filterFilesThatWillChange(
            self.selectedFiles,
            filteredToAdd,
            self.removeCategory.selected
        );

        return {
            valid: true,
            filteredToAdd,
            removeCategories: self.removeCategory.selected,
            filesCount: filesThatWillChange.length,
            filesToProcess: filesThatWillChange
        };
    }

    async valid_work(self) {
        console.log('[CBM-P] Preview button clicked');

        // Validate
        const validation = this.validateOperation(
            self.selectedFiles,
            self.addCategory.selected,
            self.removeCategory.selected
        );

        if (!validation.valid) {
            self.showWarningMessage(validation.error);
            return;
        }

        const preparation = this.prepareOperation(self);

        if (!preparation.valid) {
            if (preparation?.message) {
                self.displayCategoryMessage(
                    preparation.message,
                    'error',
                    'add'
                );
            }
            console.log('[CBM-V] No valid categories after filtering');
            self.displayCategoryMessage(preparation.error, 'warning', 'add');
            return;
        }
        return preparation;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChangesHandler;
}
