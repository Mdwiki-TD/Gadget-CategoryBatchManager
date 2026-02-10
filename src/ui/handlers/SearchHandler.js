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
        self.resetMessageState();

        // TODO: searchProgressText updates via callbacks from file_service
        const searchResults = await this.file_service.search(
            self.sourceCategory,
            self.searchPattern
        );
        self.workFiles = searchResults;
        self.isSearching = false;
    }

    stopSearch(self) {
        self.isSearching = false;
        self.shouldStopSearch = true;

        // Tell the file service to stop the ongoing search
        this.file_service.stopSearch();

        self.showWarningMessage('Search stopped by user.');
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchHandler;
}
