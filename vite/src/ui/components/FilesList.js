/**
 * File list UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class FilesList
 */
class FilesList {
    /**
     * @param {mw.Api} apiService - API service for category search
     */
    constructor(apiService) {
        this.apiService = apiService;
    }

    /**
     * Create the files list HTML element with Codex components.
     */
    createElement() {
        return `
        <div v-if="selectedFiles.length > 0" class="cbm-files-list">
            <!-- Results Header -->
            <div class="cbm-files-header">
                <div class="cbm-count-badge">
                    Found <strong>{{ totalFilesCount }}</strong> files
                </div>
                <div class="cbm-header-buttons">
                    <cdx-button @click="selectAll" action="default" weight="quiet" size="medium">
                        Select All
                    </cdx-button>
                    <cdx-button @click="deselectAll" action="default" weight="quiet" size="medium">
                        Deselect All
                    </cdx-button>
                </div>
            </div>

            <!-- File List -->
            <div class="cbm-files-scrollable">
                <div v-for="(file, index) in selectedFiles" :key="index" class="cbm-file-row">
                    <cdx-checkbox v-model="file.selected" :input-id="'file-' + index" />
                    <label :for="'file-' + index">
                        {{ file.title }}
                    </label>
                    <button @click="removeFile(index)" class="cbm-file-remove-btn" title="Remove from list">
                        ×
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="cbm-empty-state">
            <p>No files found. Use the search to find files.</p>
        </div>
    `;
    }

    // Select all files
    selectAll(selectedFiles) {
        selectedFiles.forEach(file => {
            file.selected = true;
        });
    }

    // Deselect all files
    deselectAll(selectedFiles) {
        selectedFiles.forEach(file => {
            file.selected = false;
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilesList;
}
