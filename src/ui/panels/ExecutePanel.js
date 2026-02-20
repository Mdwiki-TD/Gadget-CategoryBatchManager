/**
 * Execute Panel Vue component
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @returns {Object} Vue component configuration
 */
function ExecutePanel() {
    return {
        props: {
            executeHandler: {
                type: Object,
                required: true
            },
            progressHandler: {
                type: Object,
                required: true
            },
            changesHelpers: {
                type: Object,
                required: true
            },
            sourceCategory: {
                type: String,
                default: ''
            },
            selectedFiles: {
                type: Array,
                default: () => []
            },
            addCategory: {
                type: Object,
                required: true
            },
            removeCategory: {
                type: Object,
                required: true
            }
        },
        data() {
            return {
                // Processing state
                isProcessing: false,

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
        emits: ['display-message', 'update:is-processing', 'update:progress-percent', 'update:progress-text', 'show-warning-message', 'show-success-message', 'show-error-message', 'execution-complete'],
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
        methods: {
            /**
             * Execute batch operation
             * Validates and shows confirmation dialog
             */
            executeOperation() {
                console.log('[CBM-E] Starting batch operation');
                const callbacks = {
                    onError: (msg) => {
                        this.$emit('display-message', msg, 'error', 'add');
                    },
                    onWarning: (msg) => {
                        this.$emit('display-message', msg, 'warning', 'add');
                    }
                };

                const preparation = this.changesHelpers.validateAndReturnPreparation(
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
                this.confirmMessage = this.executeHandler.generateConfirmMessage(
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
                this.$emit('update:is-processing', true);

                await this.processBatch(this.preparation);
            },

            /**
             * Process batch with progress tracking
             * @param {Object} preparation - Prepared operation data
             */
            async processBatch(preparation) {
                try {
                    const callbacks = {
                        onProgress: (percent, results) => {
                            this.$emit('update:progress-percent', Math.round(percent));
                            this.$emit('update:progress-text',
                                `Processing ${results.processed} of ${results.total}... ` +
                                `(${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed)`
                            );
                        },

                        /**
                         * File completion callback
                         * @param {Object} file - Processed file
                         * @param {boolean} success - Whether processing succeeded
                         */
                        onFileComplete: (file, success) => {
                            console.log(`[CBM-E] ${success ? '✓' : '⊘'} ${file.title}`);
                        },

                        /**
                         * Error callback
                         * @param {Object} file - File that failed
                         * @param {Error} error - Error object
                         */
                        onError: (file, error) => {
                            console.error(`[CBM-E] ✗ ${file.title}:`, error?.message || error);
                        }
                    };

                    const results = await this.executeHandler.executeBatch(
                        preparation.filesToProcess,
                        preparation.validAddCategories,
                        preparation.removeCategories,
                        callbacks
                    );

                    this.isProcessing = false;
                    this.$emit('update:is-processing', false);
                    this.$emit('update:progress-text', '');
                    this.$emit('update:progress-percent', 0);

                    // Format and show completion message
                    const completion = this.progressHandler.formatCompletionMessage(
                        results,
                        this.executeHandler.shouldStop()
                    );

                    if (completion.type === 'warning') {
                        this.$emit('show-warning-message', completion.message);
                    } else {
                        this.$emit('show-success-message', completion.message);
                    }

                    // Emit complete results for reports
                    this.$emit('execution-complete', {
                        fileResults: results.fileResults || [],
                        summary: {
                            total: results.total,
                            successful: results.successful,
                            skipped: results.skipped,
                            failed: results.failed
                        }
                    });

                } catch (error) {
                    console.error('[CBM-E] Batch processing error:', error);
                    this.isProcessing = false;
                    this.$emit('update:is-processing', false);
                    this.$emit('update:progress-text', '');
                    this.$emit('show-error-message', `Batch processing failed: ${error.message}`);
                }
            },

            /**
             * Stop ongoing batch operation
             */
            stopOperation() {
                this.executeHandler.stopBatch();
            }
        }
    };
}

export default ExecutePanel;
