/**
 * Execute Panel Vue app factory
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {Object} search_handler - SearchHandler instance
 * @returns {Object} Vue app configuration
 */

function SearchPanel(search_handler) {
    const app = {
        data: function () {
            return {
                search_handler: search_handler,

                // Processing state
                isSearching: false,
            };
        },
        template: `
            <div class="cbm-search-panel">
                <div class="cbm-input-group">
                    <cdx-label input-id="cbm-source-category" class="cbm-label">
                        Source Category
                    </cdx-label>
                    <cdx-text-input id="cbm-source-category" v-model="sourceCategory"
                        placeholder="Category:Our World in Data graphs of Austria" />
                </div>

                <div class="cbm-input-group">
                    <cdx-label input-id="cbm-pattern" class="cbm-label">
                        Search Pattern
                    </cdx-label>
                    <span class="cbm-help-text">
                        Enter a pattern to filter files (e.g., ,BLR.svg)
                    </span>
                    <div class="cbm-input-button-group">
                        <cdx-text-input id="cbm-pattern" v-model="searchPattern" placeholder="e.g., ,BLR.svg" />
                        <cdx-button v-if="!isSearching" @click="searchFiles" action="progressive" weight="primary">
                            Search
                        </cdx-button>
                        <cdx-button v-if="isSearching" @click="stopSearch" action="destructive" weight="primary">
                            Stop Search
                        </cdx-button>
                    </div>
                </div>
            </div>
        `,
        progress_template: `
            <div v-if="showSearchProgress" class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div class="cbm-progress-bar-fill"
                        :style="{ width: searchProgressPercent + '%' }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ searchProgressText }}
                </div>
            </div>
            `,
        methods: {
            /**
             * Execute batch operation
             * Validates and shows confirmation dialog
             */
            executeOperation() {
                // Validate
                const validation = execute_operation_handler.validateOperation(
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected
                );

                if (!validation.valid) {
                    this.showWarningMessage(validation.error);
                    return;
                }

                // Prepare operation
                const preparation = execute_operation_handler.prepareOperation(this);

                if (!preparation.valid) {
                    console.log('[CBM-V] No valid categories after filtering');
                    this.displayCategoryMessage(preparation.error, 'warning', 'add');
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
                this.showExecutionProgress = true;

                const preparation = execute_operation_handler.prepareOperation(this);

                if (!preparation.valid) {
                    this.isProcessing = false;
                    this.showExecutionProgress = false;
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
                        this.selectedFiles,
                        preparation.filteredToAdd,
                        preparation.removeCategories,
                        callbacks
                    );

                    this.isProcessing = false;
                    this.showExecutionProgress = false;

                    // Format and show completion message
                    const completion = progress_handler.formatCompletionMessage(
                        results,
                        execute_operation_handler.batchProcessor.shouldStop
                    );

                    if (completion.type === 'warning') {
                        this.showWarningMessage(completion.message);
                    } else {
                        this.showSuccessMessage(completion.message);
                    }

                } catch (error) {
                    console.error('[CBM-E] Batch processing error:', error);
                    this.isProcessing = false;
                    this.showExecutionProgress = false;
                    this.showErrorMessage(`Batch processing failed: ${error.message}`);
                }
            },

            /**
             * Stop ongoing batch operation
             */
            stopSearch() {
                search_handler.stopSearch();
            }
        }
    };

    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchPanel;
}
