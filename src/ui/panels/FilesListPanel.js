/**
 * FilesListPanel
 * @param {Object} file_list_handler - FileListHandler instance
 * @returns {Object} Vue app configuration
 */

function FilesListPanel(file_list_handler) {
    const app = {
        data: function () {
            return {
                file_list_handler: file_list_handler,
                workFiles: [],
            };
        },
        template: `
            <div v-if="workFiles.length > 0" class="cbm-files-list">
                <!-- Results Header -->
                <div class="cbm-files-header">
                    <div class="cbm-count-badge">
                        <strong>{{ totalFilesCount }}</strong> files
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
                    <div v-for="(file, index) in workFiles" :key="index" class="cbm-file-row">
                        <cdx-checkbox v-model="file.selected" :input-id="'file-' + index" aria-label="{{ file.title }}" />
                        <cdx-label :for="'file-' + index">
                            {{ file.title }}
                        </cdx-label>
                        <button @click="removeFile(index)" class="cbm-file-remove-btn" title="Remove from list">
                            ×
                        </button>
                    </div>
                </div>
                <div class="cbm-selected-info">
                    Selected: <strong>{{ selectedCount }}</strong> files
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="cbm-empty-state">
                <p>No files found. Use the search to find files.</p>
            </div>
        `,
        computed: {
            selectedCount: function () {
                return this.workFiles.filter(f => f.selected).length;
            },
            selectedFiles: function () {
                return this.workFiles.filter(f => f.selected);
            },
            totalFilesCount: function () {
                return this.workFiles.length;
            }
        },
        methods: {
            selectAll: function () {
                return this.file_list_handler.selectAll(this.workFiles);
            },
            deselectAll: function () {
                return this.file_list_handler.deselectAll(this.workFiles);
            },
            removeFile: function (index) {
                return this.file_list_handler.removeFile(this.workFiles, index);
            }
        }
    };

    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilesListPanel;
}
