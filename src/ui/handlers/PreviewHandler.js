/**
 * Preview Handler
 *
 * @description
 * Handles all preview-related functionality for BatchManager.
 * Manages preview generation, modal display, and validation.
 *
 * @requires ValidationHelper - For common validation logic
 */

/* global ValidationHelper */

class PreviewHandler {
    /**
     */
    constructor(validator) {
        this.validator = validator
    }
    createElement() {
        // @primary="onPrimaryAction"
        // :primary-action="primaryAction"
        // :default-action="defaultAction"
        return `
        <cdx-button @click="handlePreview" action="default" weight="normal"
            :disabled="isProcessing">
            Preview Changes
        </cdx-button>
        <cdx-dialog
            v-model:open="openPreviewHandler"
            class="cbm-preview-dialog"
            title="Preview Changes"
            :use-close-button="true"
            @default="openPreviewHandler = false"
        >
            <p v-if="changesCount > 0">
                {{ changesCount }} file(s) will be updated. Review the changes below before saving.
            </p>
            <p v-else>
                No changes detected. Please adjust your categories to add/remove and preview again.
            </p>
            <table class="cbm-preview-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Current Categories</th>
                        <th>New Categories</th>
                        <th>Diff</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-if="previewRows.length > 0" v-for="(row, index) in previewRows" :key="index">
                        <td>{{ row.file }}</td>

                        <td>
                            <div v-for="(cat, i) in row.currentCategories" :key="i">
                                {{ cat }}
                            </div>
                        </td>

                        <td>
                            <div v-for="(cat, i) in row.newCategories" :key="i">
                                {{ cat }}
                            </div>
                        </td>
                        <td>
                            {{ row.diff }}
                        </td>
                    </tr>
                </tbody>
            </table>
            <template #footer-text>
            </template>
        </cdx-dialog>
    `;
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

        // Filter out circular categories (returns null if ALL are circular)
        const filteredToAdd = this.validator.filterCircularCategories(self);

        if (filteredToAdd === null) return null; // All categories were circular

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
            console.log('[CBM-P] Preview result:', preview);
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
     * Check if a category exists in a list (with normalization)
     * @param {string} category - Category to find
     * @param {Array<string>} categoryList - List to search in
     * @returns {number} Index of the category in the list, or -1 if not found
     */
    findCategoryIndex(category, categoryList) {
        const normalized = Validator.normalizeCategoryName(category);
        return categoryList.findIndex(cat => {
            return Validator.normalizeCategoryName(cat).toLowerCase() === normalized.toLowerCase();
        });
    }
    /**
     * Check if category exists in a list (with normalization)
     * @param {string} category - Category to check
     * @param {Array<string>} categoryList - List to search in
     * @returns {boolean} True if category exists in the list
     */
    categoryExists(category, categoryList) {
        return this.findCategoryIndex(category, categoryList) !== -1;
    }

    /**
     * Preview changes without actually editing
     * @param {Array} files - Files to preview
     * @param {Array<string>} categoriesToAdd - Categories to add
     * @param {Array<string>} categoriesToRemove - Categories to remove
     * @returns {Promise<Array>} Preview of changes
     */
    async previewChanges(files, categoriesToAdd, categoriesToRemove) {
        const previews = [];

        for (const file of files) {
            const current = file.currentCategories || [];

            // Check if trying to add categories that already exist (with normalization)
            if (categoriesToAdd.length > 0) {
                const duplicateCategories = categoriesToAdd.filter(cat => this.categoryExists(cat, current));
                if (duplicateCategories.length > 0) {
                    //throwing an error here isn't true because other files may not have the duplicate categories, so we will just ignore the duplicates for the preview and show a warning in the UI instead
                    console.warn(`[CBM-P] Warning: The following categories already exist for file "${file.title}" and will be ignored in the preview: ${duplicateCategories.join(', ')}`);
                    // throw new Error(`The following categories already exist and cannot be added: ${duplicateCategories.join(', ')}`);
                }
            }

            const after = [...current];

            // Simulate removal (with normalization for matching)
            categoriesToRemove.forEach(cat => {
                const index = this.findCategoryIndex(cat, after);
                if (index > -1) after.splice(index, 1);
            });

            // Simulate addition (with normalization for checking duplicates)
            categoriesToAdd.forEach(cat => {
                if (!this.categoryExists(cat, after)) after.push(cat);
            });

            previews.push({
                file: file.title,
                currentCategories: current,
                newCategories: after,
                willChange: JSON.stringify(current) !== JSON.stringify(after)
            });
        }

        return previews;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewHandler;
}
