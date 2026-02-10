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

        self.showSearchProgress = true;
        self.searchProgressText = 'Searching for files...';

        // TODO: searchProgressText updates via callbacks from file_service
        self.searchResults = await this.file_service.search(
            self.sourceCategory,
            self.searchPattern
        );
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
