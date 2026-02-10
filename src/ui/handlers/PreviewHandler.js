/**
 * Preview Handler
 *
 * @description
 * Handles all preview-related functionality for BatchManager.
 * Manages preview generation, modal display, and validation.
 *
 * @requires ValidationHelper - For common validation logic
 * @requires ChangeCalculator - For calculating category changes
 */

/* global ValidationHelper, ChangeCalculator, Validator */

class PreviewHandler {
    /**
     */
    constructor(validator) {
        this.validator = validator
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */
    async handlePreview(self) {
        console.log('[CBM-P] Preview button clicked');

        const selectedCount = self.selectedCount;

        if (selectedCount === 0 || !self.selectedFiles || self.selectedFiles.length === 0) {
            self.showWarningMessage('Please select at least one file.');
            return;
        }

        if (self.addCategory.selected.length === 0 && self.removeCategory.selected.length === 0) {
            self.showWarningMessage('Please specify categories to add or remove.');
            return;
        }

        // Check for duplicate categories in both add and remove lists
        const duplicateCheck = this.validator.hasDuplicateCategories(self);
        if (!duplicateCheck.valid) {
            self.showErrorMessage(
                `❌ Cannot add and remove the same category: "${duplicateCheck.duplicates.join(', ')}". Please remove it from one of the lists.`
            );
            return;
        }

        // Filter out circular categories (returns null if ALL are circular)
        const { filteredToAdd, circularCategories } = this.validator.filterCircularCategories(self.addCategory.selected, self.sourceCategory);

        // If all categories are circular, show error
        if (circularCategories.length > 0 && filteredToAdd.length === 0) {
            self.displayCategoryMessage(
                `❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "${circularCategories.join(', ')}" to itself.`,
                'error',
                'add'
            );
            return;
        }

        // Check if there are any valid operations remaining
        if (filteredToAdd.length === 0 && self.removeCategory.selected.length === 0) {
            console.log('[CBM-V] No valid categories after filtering');
            self.displayCategoryMessage('No valid categories to add or remove.', 'warning', 'add');
            return;
        }

        // Generate preview without affecting file list - no loading indicator
        try {
            console.log('[CBM-P] Calling batchProcessor.previewChanges');
            const preview = await this.previewChanges(
                self.selectedFiles,
                filteredToAdd,
                self.removeCategory.selected
            );
            console.log('[CBM-P] Preview result:', preview.length, 'items');
            this.showPreviewModal(self, preview);

        } catch (error) {
            console.log('[CBM-P] Error in previewChanges:', error);
            // Check if error is about duplicate categories
            if (error.message.includes('already exist')) {
                self.showWarningMessage(`⚠️ ${error.message}`);
            } else {
                self.showErrorMessage(`Error generating preview: ${error.message}`);
            }
        }
    }

    /**
     * Show the preview modal with changes
     * @param {Array} preview - Array of preview items
     */
    showPreviewModal(self, preview) {

        self.previewRows = preview
            .filter(item => item.willChange)
            .map(item => ({
                file: item.file,
                currentCategories: [...item.currentCategories],
                newCategories: [...item.newCategories],
                diff: item.newCategories.length - item.currentCategories.length
            }));

        self.changesCount = preview.filter(p => p.willChange).length;

        if (self.changesCount === 0) {
            console.log('[CBM] No changes detected');
            self.displayCategoryMessage('ℹ️ No changes detected.', 'notice', 'add');
            // return;
        }
        self.openPreviewHandler = true;

    }
    /**
     * Preview changes without actually editing
     * @param {Array} files - Files to preview
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Promise<Array>} Preview of changes
     */
    async previewChanges(files, categoriesToAdd, categoriesToRemove) {
        // Use shared ChangeCalculator utility
        return ChangeCalculator.previewChanges(files, categoriesToAdd, categoriesToRemove);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewHandler;
}
