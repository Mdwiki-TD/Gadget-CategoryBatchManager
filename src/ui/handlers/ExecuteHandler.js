/**
 * Search panel UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class ExecuteHandler
 */
class ExecuteHandler {
    /**
     */
    constructor(validator, batchProcessor) {

        this.validator = validator
        this.batchProcessor = batchProcessor
    }

    /**
     * Create the search panel HTML element with Codex components.
     */
    createElement() {
        return `
            <cdx-button
                v-if="!isProcessing"
                @click="executeOperation"
                action="progressive"
                weight="primary"
            >
                GO
            </cdx-button>
            <cdx-button
                v-if="isProcessing"
                @click="stopOperation"
                action="destructive"
                weight="primary"
            >
                Stop Process
            </cdx-button>
            <cdx-dialog
                v-model:open="openConfirmDialog"
                title="Confirm Batch Update"
                :use-close-button="true"
                :primary-action="confirmPrimaryAction"
                :default-action="confirmDefaultAction"
                @primary="confirmOnPrimaryAction"
                @default="openConfirmDialog = false"
            >
                <p>{{ confirmMessage }}</p>
                <template #footer-text>
                </template>
            </cdx-dialog>
            <div v-if="showExecutionProgress" class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div
                        class="cbm-progress-bar-fill"
                        :style="{ width: executionProgressPercent + '%' }"
                    >
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ executionProgressText }}
                </div>
            </div>
        `;
    }

    // Execute batch operation
    executeOperation(self) {
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
        if (filteredToAdd === null) {
            return;
        }
        // Check if there are any valid operations remaining
        if (filteredToAdd.length === 0 && self.removeCategory.selected.length === 0) {
            console.log('[CBM-V] No valid categories after filtering');
            self.displayCategoryMessage('No valid categories to add or remove.', 'warning', 'add');
            return;
        }

        // Show confirmation dialog
        self.confirmMessage =
            `You are about to update ${self.selectedFiles.length} file(s).\n\n` +
            `Categories to add: ${filteredToAdd.length > 0 ? filteredToAdd.join(', ') : 'none'}\n` +
            `Categories to remove: ${self.removeCategory.selected.length > 0 ? self.removeCategory.selected.join(', ') : 'none'}\n\n` +
            'Do you want to proceed?';

        // trigger confirm dialog
        self.openConfirmDialog = true;
    }

    confirmOnPrimaryAction(self) {
        self.openConfirmDialog = false;
        // eslint-disable-next-line no-console
        console.log('[CBM-E] User confirmed operation');

        self.isProcessing = true;
        self.shouldStopProgress = false;
        self.showExecutionProgress = true;

        // Filter out circular categories again (in case state changed)
        const filteredToAdd = this.validator.filterCircularCategories(self);

        if (filteredToAdd === null) {
            self.isProcessing = false;
            self.showExecutionProgress = false;
            return;
        }

        // Process the batch using real BatchProcessor
        this.processBatch(self, self.selectedFiles, filteredToAdd);
    }

    // Process files using BatchProcessor
    async processBatch(self, files, filteredToAdd) {
        try {
            const results = await this.batchProcessor.processBatch(
                files,
                filteredToAdd,
                self.removeCategory.selected,
                {
                    onProgress: (percent, results) => {
                        self.executionProgressPercent = percent;
                        self.executionProgressText = `Processing ${results.processed} of ${results.total}... (${results.successful} successful, ${results.failed} failed)`;
                    },
                    onFileComplete: (file, success) => {
                        console.log(`[CBM-E] ${success ? '✓' : '⊘'} ${file.title}`);
                    },
                    onError: (file, error) => {
                        console.error(`[CBM-E] ✗ ${file.title}:`, error.message);
                    }
                }
            );

            self.isProcessing = false;
            self.showExecutionProgress = false;

            if (this.batchProcessor.shouldStop) {
                self.showWarningMessage(`Operation stopped by user. Processed ${results.processed} of ${results.total} files (${results.successful} successful, ${results.failed} failed).`);
            } else {
                const message = `Batch operation completed! Processed ${results.total} files: ${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed.`;
                if (results.failed > 0) {
                    self.showWarningMessage(message);
                } else {
                    self.showSuccessMessage(message);
                }
            }

        } catch (error) {
            console.error('[CBM-E] Batch processing error:', error);
            self.isProcessing = false;
            self.showExecutionProgress = false;
            self.showErrorMessage(`Batch processing failed: ${error.message}`);
        }
    }

    // Stop ongoing operation
    stopOperation(self) {
        self.shouldStopProgress = true;
        this.batchProcessor.stop();
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecuteHandler;
}
