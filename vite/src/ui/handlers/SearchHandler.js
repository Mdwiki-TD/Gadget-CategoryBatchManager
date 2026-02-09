/**
 * Search panel UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class SearchHandler
 */
class SearchHandler {
    /**
     */
    constructor() {
    }

    /**
     * Create the search panel HTML element with Codex components.
     */
    createElement() {
        return `
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
        <!-- Results Message -->
        <div v-if="showResultsMessage" class="margin-bottom-20">
            <cdx-message type="success" :inline="false">
                {{ resultsMessageText }}
            </cdx-message>
        </div>
        `;
    }

    async searchFiles(self) {
        self.isSearching = true;
        self.resetMessageState();

        if (self.sourceCategory.trim() === '') {
            self.showWarningMessage('Please enter a source category.');
            return;
        }

        const searchResults_demo = [
            { title: 'File:GDP-per-capita,BLR.svg', selected: false },
            { title: 'File:Life-expectancy,BLR.svg', selected: false }
        ];

        self.showProgress = true;
        self.progressText = 'Searching for files...';

        self.searchResults = await self.file_service.searchFiles(self.sourceCategory, self.searchPattern);
        self.selectedFiles = [...self.searchResults];
        self.showProgress = false;
        self.showResultsMessage = true;
        self.isSearching = false;
        self.resultsMessageText = `Found ${self.searchResults.length} files matching the pattern.`;
    }

    stopSearch(self) {
        self.isSearching = false;
        self.shouldStopSearch = true;
        // Implement logic to stop ongoing search like in `class stopOperation`
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchHandler;
}
