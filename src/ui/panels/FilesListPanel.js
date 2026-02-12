/**
 * File list panel — renders matched files with select/deselect controls.
 * @param {FileListHandler} file_list_handler
 * @returns {Object} Partial Vue app configuration
 */
import { FileListHandler } from "../handlers";

function FilesListPanel(file_list_handler) {
    return {
        data() {
            return {
                // TODO: workFiles is defined here and in SearchPanel — who owns and controls this state?
                workFiles: [],
            };
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
                return file_list_handler.selectAll(this.workFiles);
            },
            deselectAll: function () {
                return file_list_handler.deselectAll(this.workFiles);
            },
            removeFile: function (index) {
                return file_list_handler.removeFile(this.workFiles, index);
            }
        }
    };

}

export default FilesListPanel;
