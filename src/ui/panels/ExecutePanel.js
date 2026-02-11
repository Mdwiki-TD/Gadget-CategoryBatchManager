
import { ChangeCalculator } from "../../utils";
import { ExecuteHandler, ProgressHandler } from "../handlers";
import { ChangesHelper } from "../helpers";


/**
 * Execute Panel Vue app factory
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {ExecuteHandler} execute_handler - ExecuteHandler instance
 * @param {ProgressHandler} progress_handler - ProgressHandler instance
 * @param {ChangesHelper} changes_helpers
 * @returns {Object} Vue app configuration
 */

function ExecutePanel(execute_handler, progress_handler, changes_helpers) {
    const app = {
        data: function () {
            return {
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,

                // Processing state
                isProcessing: false,

                // Progress tracking
                executionProgressPercent: 0,
                executionProgressText: '',

                // Confirmation dialog
                openConfirmDialog: false,
                preparation: [],
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
                console.log('[CBM-E] Starting batch operation');
                const callbacks = {
                    onError: (msg) => {
                        this.displayCategoryMessage(msg, 'error', 'add');
                    },
                    onWarning: (msg) => {
                        this.displayCategoryMessage(msg, 'warning', 'add');
                    }
                };

                const preparation = changes_helpers.validateAndReturnPreparation(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                    callbacks
                );
                if (!preparation) {
                    console.error('[CBM] preparation failed');
                    return;
                }
                console.log('[CBM-E] Execution result:', preparation.filesToProcess.length, 'items');

                // Generate confirmation message
                this.confirmMessage = execute_handler.generateConfirmMessage(
                    preparation.filesCount,
                    preparation.validAddCategories,
                    preparation.removeCategories
                );
                this.preparation = preparation;

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

                await this.processBatch(this.preparation);
            },

            /**
             * Process batch with progress tracking
             * @param {Object} preparation - Prepared operation data
             */
            async processBatch(preparation) {
                try {
                    const callbacks = progress_handler.createCallbacks(this);

                    const results = await execute_handler.executeBatch(
                        preparation.filesToProcess, // [CBM-E] Batch processing error: TypeError: Cannot read properties of undefined (reading 'length')
                        preparation.validAddCategories,
                        preparation.removeCategories,
                        callbacks
                    );

                    this.isProcessing = false;
                    this.executionProgressText = "";

                    // Format and show completion message
                    const completion = progress_handler.formatCompletionMessage(
                        results,
                        execute_handler.shouldStop()
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
                execute_handler.stopBatch();
            }
        }
    };

    return app;
}

export default ExecutePanel;
