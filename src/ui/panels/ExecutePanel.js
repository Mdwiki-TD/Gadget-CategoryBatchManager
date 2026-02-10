/**
 * Execute Panel Vue app factory
 * Handles batch operations for category updates
 * @param {Object} validator - ValidationHelper instance
 * @param {Object} batchProcessor - BatchProcessor instance
 * @returns {Object} Vue app configuration
 */

function ExecutePanel(validator, batchProcessor) {
    const app = {
        data: function () {
            return {
                validator: validator,
                batchProcessor: batchProcessor,
                // Processing state
                isProcessing: false,
                shouldStopProgress: false,
                showExecutionProgress: false,

                // Progress tracking
                executionProgressPercent: 0,
                executionProgressText: '',

                // Confirmation dialog
                openConfirmDialog: false,
                confirmMessage: '',
                confirmPrimaryAction: {
                    label: 'Confirm',
                    actionType: 'progressive'
                },
                confirmDefaultAction: {
                    label: 'Cancel'
                }
            };
        },
        template: `
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
        `,
        methods: {
            /**
             * Execute batch operation
             * Validates selection and shows confirmation dialog
             */
            executeOperation() {
                const selectedCount = this.selectedCount;

                if (selectedCount === 0 || !this.selectedFiles || this.selectedFiles.length === 0) {
                    this.showWarningMessage('Please select at least one file.');
                    return;
                }

                if (this.addCategory.selected.length === 0 && this.removeCategory.selected.length === 0) {
                    this.showWarningMessage('Please specify categories to add or remove.');
                    return;
                }

                // Filter out circular categories (returns null if ALL are circular)
                const filteredToAdd = this.validator.filterCircularCategories(this); // TODO: `this` changed from `self` check if issues arise

                if (filteredToAdd === null) {
                    return;
                }
                // Check if there are any valid operations remaining
                if (filteredToAdd.length === 0 && this.removeCategory.selected.length === 0) {
                    console.log('[CBM-V] No valid categories after filtering');
                    this.displayCategoryMessage('No valid categories to add or remove.', 'warning', 'add');
                    return;
                }

                // Show confirmation dialog

                this.confirmMessage =
                    `You are about to update ${this.selectedFiles.length} file(s).\n\n` +
                    `Categories to add: ${filteredToAdd.length > 0 ? filteredToAdd.join(', ') : 'none'}\n` +
                    `Categories to remove: ${this.removeCategory.selected.length > 0 ? this.removeCategory.selected.join(', ') : 'none'}\n\n` +
                    'Do you want to proceed?';

                // trigger confirm dialog
                this.openConfirmDialog = true;
            },

            /**
             * Handle confirmation dialog primary action
             */
            async confirmOnPrimaryAction() {
                this.openConfirmDialog = false;
                console.log('[CBM-E] User confirmed operation');

                this.isProcessing = true;
                this.shouldStopProgress = false;
                this.showExecutionProgress = true;

                // Filter out circular categories again
                const filteredToAdd = this.validator.filterCircularCategories(this);// TODO: `this` changed from `self` check if issues arise

                if (filteredToAdd === null) {
                    this.isProcessing = false;
                    this.showExecutionProgress = false;
                    return;
                }

                // Process the batch
                this.processBatch(filteredToAdd);
            },

            /**
             * Process files using this.batchProcessor
             * @param {Array} filteredToAdd - Categories to add
             */
            async processBatch(filteredToAdd) {
                try {
                    const results = await this.batchProcessor.processBatch(
                        this.selectedFiles,
                        filteredToAdd,
                        this.removeCategory.selected,
                        {
                            onProgress: (percent, results) => {
                                this.executionProgressPercent = percent;
                                this.executionProgressText = `Processing ${results.processed} of ${results.total}... (${results.successful} successful, ${results.failed} failed)`;
                            },
                            onFileComplete: (file, success) => {
                                console.log(`[CBM-E] ${success ? '✓' : '⊘'} ${file.title}`);
                            },
                            onError: (file, error) => {
                                console.error(`[CBM-E] ✗ ${file.title}:`, error.message);
                            }
                        }
                    );

                    this.isProcessing = false;
                    this.showExecutionProgress = false;

                    if (this.batchProcessor.shouldStop) {
                        this.showWarningMessage(`Operation stopped by user. Processed ${results.processed} of ${results.total} files (${results.successful} successful, ${results.failed} failed).`);
                    } else {
                        const message = `Batch operation completed! Processed ${results.total} files: ${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed.`;
                        if (results.failed > 0) {
                            this.showWarningMessage(message);
                        } else {
                            this.showSuccessMessage(message);
                        }
                    }

                } catch (error) {
                    console.error('[CBM-E] Batch processing error:', error);
                    this.isProcessing = false;
                    this.showExecutionProgress = false;
                    this.showErrorMessage(`Batch processing failed: ${error.message}`);
                }
            },

            /**
             * Stop ongoing operation
             */
            stopOperation() {
                this.shouldStopProgress = true;
                this.batchProcessor.stop();
            }
        }
    };

    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecutePanel;
}
