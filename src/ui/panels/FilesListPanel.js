/**
 * File list panel — renders matched files with select/deselect controls.
 * @returns {Object} Partial Vue app configuration
 */
function FilesListPanel() {
    return {
        props: {
            workFiles: {
                type: Array,
                default: () => []
            }
        },
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
                    <div
                        v-for="(file, index) in workFiles"
                        :key="file.pageid"
                        class="cbm-file-row">
                        <cdx-checkbox
                            v-model="file.selected"
                            :input-id="'file-' + file.pageid"
                            :aria-label="file.title" />
                        <cdx-label :for="'file-' + file.pageid">
                            {{ file.title }}
                        </cdx-label>
                        <button
                            class="cbm-file-remove-btn"
                            title="Remove from list"
                            @click="removeFile(index)">
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
        methods: {
            selectAll: function () {
                this.workFiles.forEach(f => f.selected = true);
            },
            deselectAll: function () {
                this.workFiles.forEach(f => f.selected = false);
            },
            removeFile: function (index) {
                if (index >= 0 && index < this.workFiles.length) {
                    this.workFiles.splice(index, 1);
                }
            }
        }
    };

}

export default FilesListPanel;
