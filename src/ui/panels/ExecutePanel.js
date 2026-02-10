/**
 * Execute Panel Vue app factory
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {Object} execute_operation_handler - ExecuteHandler instance
 * @param {Object} progress_handler - ProgressHandler instance
 * @returns {Object} Vue app configuration
 */

function ExecutePanel(execute_operation_handler, progress_handler, changes_handler) {
    const app = {
        data: function () {
            return {
                execute_operation_handler: execute_operation_handler,
                progress_handler: progress_handler,
                changes_handler: changes_handler,

                // Processing state
                isProcessing: false,

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
                weight="primary">
                GO
            </cdx-button>
            <cdx-button
                v-if="isProcessing"
                @click="stopOperation"
                action="destructive"
                weight="primary">
                Stop Process
            </cdx-button>
            <cdx-dialog
                v-model:open="openConfirmDialog"
                title="Confirm Batch Update"
                :use-close-button="true"
                :primary-action="confirmPrimaryAction"
                :default-action="confirmDefaultAction"
                @primary="confirmOnPrimaryAction"
                @default="openConfirmDialog = false">
                <p>{{ confirmMessage }}</p>
            </cdx-dialog>
        `,
        progress_template: `
            <div
                v-if="isProcessing || executionProgressText !== ''"
                class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div
                        class="cbm-progress-bar-fill"
                        :style="{
                            width: executionProgressPercent + '%',
                        }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ executionProgressText }}
                </div>
            </div>`,
        methods: {
            /**
             * Execute batch operation
             * Validates and shows confirmation dialog
             */
            executeOperation() {
                // Validate
                const preparation = changes_handler.valid_work(this);
                if (!preparation) {
                    return;
                }

                // Generate confirmation message
                this.confirmMessage = execute_operation_handler.generateConfirmMessage(
                    preparation.filesCount,
                    preparation.filteredToAdd,
                    preparation.removeCategories
                );

                // Show dialog
                this.openConfirmDialog = true;
            },

            /**
             * Handle confirmation dialog primary action
             */
            async confirmOnPrimaryAction() {
                this.openConfirmDialog = false;
                console.log('[CBM-E] User confirmed operation');

                this.isProcessing = true;

                const preparation = changes_handler.prepareOperation(this);

                if (!preparation.valid) {
                    if (preparation?.message) {
                        this.displayCategoryMessage(
                            preparation.message,
                            'error',
                            'add'
                        );
                    }
                    this.isProcessing = false;
                    this.executionProgressText = "";
                    return;
                }

                await this.processBatch(preparation);
            },

            /**
             * Process batch with progress tracking
             * @param {Object} preparation - Prepared operation data
             */
            async processBatch(preparation) {
                try {
                    const callbacks = progress_handler.createCallbacks(this);

                    const results = await execute_operation_handler.executeBatch(
                        preparation.filesToProcess, // [CBM-E] Batch processing error: TypeError: Cannot read properties of undefined (reading 'length')
                        preparation.filteredToAdd,
                        preparation.removeCategories,
                        callbacks
                    );

                    this.isProcessing = false;
                    this.executionProgressText = "";

                    // Format and show completion message
                    const completion = progress_handler.formatCompletionMessage(
                        results,
                        execute_operation_handler.batchProcessor.shouldStop
                    );

                    if (completion.type === 'warning') {
                        // NOTE: this didn't show up
                        this.showWarningMessage(completion.message);
                    } else {
                        // NOTE: this didn't show up
                        this.showSuccessMessage(completion.message);
                    }

                } catch (error) {
                    console.error('[CBM-E] Batch processing error:', error);
                    this.isProcessing = false;
                    this.executionProgressText = "";
                    this.showErrorMessage(`Batch processing failed: ${error.message}`);
                }
            },

            /**
             * Stop ongoing batch operation
             */
            stopOperation() {
                execute_operation_handler.stopBatch();
            }
        }
    };

    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecutePanel;
}
