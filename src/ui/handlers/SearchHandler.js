/**
 * Search panel UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class SearchHandler
 */
class SearchHandler {
    /**
     */
    constructor(file_service) {
        this.file_service = file_service;
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
        `;
    }

    async searchFiles(self) {
        self.isSearching = true;
        // Clear all files and messages from previous search
        self.workFiles = [];
        self.previewRows = [];
        self.searchResults = [];
        self.resetMessageState();

        if (self.sourceCategory.trim() === '') {
            self.showWarningMessage('Please enter a source category.');
            return;
        }

        const searchResults_demo = [
            { title: 'File:GDP-per-capita,BLR.svg', selected: false },
            { title: 'File:Life-expectancy,BLR.svg', selected: false }
        ];

        self.showSearchProgress = true;
        self.searchProgressText = 'Searching for files...';

        self.searchResults = await this.file_service.searchFiles(self.sourceCategory, self.searchPattern);
        // self.workFiles = [...self.searchResults];
        self.workFiles = self.searchResults;
        self.showSearchProgress = false;
        self.isSearching = false;
    }

    stopSearch(self) {
        self.isSearching = false;
        self.shouldStopSearch = true;
        self.showSearchProgress = false;

        // Tell the file service to stop the ongoing search
        this.file_service.stopSearch();

        self.showWarningMessage('Search stopped by user.');
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchHandler;
}
