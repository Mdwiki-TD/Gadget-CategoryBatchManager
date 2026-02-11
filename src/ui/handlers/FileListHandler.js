/**
 * File list UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class FileListHandler
 */
class FileListHandler {
    /**
     * @param {mw.Api} apiService - API service for category search
     */
    constructor(apiService) {
        this.apiService = apiService;
    }

    // Select all files
    selectAll(workFiles) {
        workFiles.forEach(file => {
            file.selected = true;
        });
    }

    // Deselect all files
    deselectAll(workFiles) {
        workFiles.forEach(file => {
            file.selected = false;
        });
    }
    // Remove a file from the list by index
    removeFile(workFiles, index) {
        if (index >= 0 && index < workFiles.length) {
            workFiles.splice(index, 1);
        }
    }
}

export default FileListHandler;
