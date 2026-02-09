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
    constructor() {
        this.validator = new ValidationHelper();
    }
    createElement() {
        return `
        <cdx-button @click="handlePreview" action="default" weight="normal"
            :disabled="isProcessing">
            Preview Changes
        </cdx-button>
        <cdx-dialog
            v-model:open="openPreviewHandler"
            class="cbm-preview-dialog"
            title="Preview Changes"
            subtitle="{{ changesCount }} files will be modified"
            :use-close-button="true"
            :primary-action="primaryAction"
            :default-action="defaultAction"
            @primary="onPrimaryAction"
            @default="openPreviewHandler = false"
        >
            <table v-if="previewRows.length > 0" class="cbm-preview-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Current Categories</th>
                        <th>New Categories</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="(row, index) in previewRows" :key="index">
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
                    </tr>
                </tbody>
            </table>
            <template #footer-text>
            </template>
        </cdx-dialog>
    `;
    }
    // Preview changes before executing
    previewTheChanges(self) {
        console.log('[CBM-P] Preview button clicked');

        const selectedCount = self.selectedCount;

        if (selectedCount === 0) {
            self.showWarningMessage('Please select at least one file.');
            return;
        }

        if (self.addCategories.length === 0 && self.removeCategories.length === 0) {
            self.showWarningMessage('Please specify categories to add or remove.');
            return;
        }

        const validation = this.validator.validateBatchOperation(self);
        if (!validation) return;

        const { selectedFiles, toAdd, toRemove } = validation;

        // Placeholder - implement preview logic
        let previewMessage = `Preview for ${selectedFiles.length} file(s):\n`;
        if (toAdd.length > 0) {
            previewMessage += `\nAdding: ${toAdd.join(', ')}`;
        }
        if (toRemove.length > 0) {
            previewMessage += `\nRemoving: ${toRemove.join(', ')}`;
        }

        // should be replaced by showPreviewModal
        alert(previewMessage);
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */
    async handlePreview(self) {
        console.log('[CBM-P] Preview button clicked');

        const selectedCount = self.selectedCount;

        if (selectedCount === 0) {
            self.showWarningMessage('Please select at least one file.');
            return;
        }

        if (self.addCategories.length === 0 && self.removeCategories.length === 0) {
            self.showWarningMessage('Please specify categories to add or remove.');
            return;
        }

        // Use ValidationHelper for common validation
        const validation = this.validator.validateBatchOperation(self);
        if (!validation) return;

        const { selectedFiles, toAdd, toRemove } = validation;

        // Generate preview without affecting file list - no loading indicator
        try {
            console.log('[CBM-P] Calling batchProcessor.previewChanges');
            const preview = await this.previewChanges(
                selectedFiles,
                toAdd,
                toRemove
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
                newCategories: [...item.newCategories]
            }));

        self.openPreviewHandler = true;

        /*
        let html = '';
        preview.forEach(item => {
            if (item.willChange) {
                html += `
                    <tr>
                        <td>${item.file}</td>
                        <td>${item.currentCategories.join('<br>')}</td>
                        <td>${item.newCategories.join('<br>')}</td>
                    </tr>
                `;
            }
        });*/

        self.changesCount = preview.filter(p => p.willChange).length;

        if (self.changesCount === 0) {
            console.log('[CBM] No changes detected');
            self.displayCategoryMessage('ℹ️ No changes detected. The categories you are trying to add/remove result in the same category list.', 'notice', 'add');
            return;
        }
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
                    throw new Error(`The following categories already exist and cannot be added: ${duplicateCategories.join(', ')}`);
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
