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

    async startSearch(sourceCategory, searchPattern) {
        // TODO: searchProgressText updates via callbacks from file_service
        const searchResults = await this.file_service.search(
            sourceCategory,
            searchPattern
        );
        return searchResults;
    }

    stop() {
        // Tell the file service to stop the ongoing search
        this.file_service.stopSearch();

    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchHandler;
}
