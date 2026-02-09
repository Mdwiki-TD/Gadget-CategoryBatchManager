/**
 * Search panel UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class ExecuteHandler
 */
class ExecuteHandler {
    /**
     */
    constructor(mwApi) {
        this.categoryService = new CategoryService(mwApi)
        this.batchProcessor = new BatchProcessor(this.categoryService)
    }

    /**
     * Create the search panel HTML element with Codex components.
     */
    createElement() {
        return `
            <cdx-button v-if="!isProcessing" @click="executeOperation" action="progressive" weight="primary">
                GO
            </cdx-button>
            <cdx-button v-if="isProcessing" @click="stopOperation" action="destructive" weight="primary">
                Stop Process
            </cdx-button>
        `;
    }

    // should be moved to class ExecuteHandler` at `src/ui/handlers/ExecuteHandler.js`
    // Execute batch operation
    executeOperation(self) {
        const selectedCount = self.selectedCount;

        if (selectedCount === 0) {
            self.showWarningMessage('Please select at least one file.');
            return;
        }

        if (self.addCategories.length === 0 && self.removeCategories.length === 0) {
            self.showWarningMessage('Please specify categories to add or remove.');
            return;
        }

        if (!confirm(`Are you sure you want to process ${selectedCount} file(s)?`)) {
            return;
        }

        self.isProcessing = true;
        self.shouldStopProgress = false;
        self.showProgress = true;

        // Placeholder - implement actual batch processing
        const selectedFilesToProcess = self.selectedFiles.filter(f => f.selected);
        self.processBatch(selectedFilesToProcess, 0);
    }

    // Process files sequentially
    processBatch(self, files, index) {
        if (self.shouldStopProgress || index >= files.length) {
            self.isProcessing = false;
            self.showProgress = false;
            if (!self.shouldStopProgress) {
                self.showSuccessMessage('Batch operation completed successfully!');
            } else {
                self.showWarningMessage('Operation stopped by user.');
            }
            return;
        }

        self.progressPercent = ((index + 1) / files.length) * 100;
        self.progressText = `Processing ${index + 1} of ${files.length}...`;

        // Placeholder - implement actual file processing
        setTimeout(() => {
            console.log('Processing:', files[index].title);
            self.processBatch(files, index + 1);
        }, 500);
    }

    // Stop ongoing operation
    stopOperation(self) {
        self.shouldStopProgress = true;
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecuteHandler;
}
