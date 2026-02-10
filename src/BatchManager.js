/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 */
/* global APIService, SearchHandler, FilesList, SearchProgressBar, FileService, ValidationHelper, CategoryService, BatchProcessor, ExecuteHandler, ExecutePanel, PreviewHandler, CategoryInputs, MessageDisplay
*/

function BatchManager() {
    const mwApi = new APIService();
    const file_service = new FileService(mwApi);
    const search_handler = new SearchHandler(file_service);
    const files_list = new FilesList(mwApi);
    const progress_section = new SearchProgressBar();

    const validator = new ValidationHelper();
    const categoryService = new CategoryService(mwApi);
    const batchProcessor = new BatchProcessor(categoryService);

    const execute_panel = ExecutePanel(validator, batchProcessor);
    const execute_handler_app = ExecuteHandler(validator, batchProcessor);
    const preview_handler = new PreviewHandler();

    const Search_SectionHtml = search_handler.createElement();
    const FilesListHtml = files_list.createElement();
    const ProgressSectionHtml = progress_section.createElement();
    const PreviewChangesHtml = preview_handler.createElement();

    const category_inputs_app = CategoryInputs(mwApi);
    const message_display_app = MessageDisplay();

    const template = `
        <div class="cbm-container">
            <h2 class="cbm-title">Category Batch Manager!</h2>

            <div class="cbm-main-layout">
                <!-- Left Panel: Search and Actions -->
                <div class="cbm-left-panel">
                    <!-- Search Section -->
                    ${Search_SectionHtml}

                    <!-- Actions Section -->
                    <div>
                        ${category_inputs_app.template}

                        <div class="margin-bottom-20">
                            <cdx-label input-id="cbm-summary" class="cbm-label">
                                Edit Summary
                            </cdx-label>
                            <cdx-text-input id="cbm-summary" v-model="editSummary" />
                        </div>

                        <div class="cbm-button-group">
                            ${PreviewChangesHtml}
                            ${execute_panel.template}
                        </div>
                    </div>
                </div>

                <!-- Right Panel: File List -->
                <div class="cbm-right-panel">
                    ${FilesListHtml}

                    <!-- Progress Section -->
                    ${ProgressSectionHtml}
                </div>
            </div>
            <!-- Message Display -->
            ${message_display_app.template}
        </div>
    `;

    const app = {
        data: function () {
            const app_data = {
                validator: validator,
                preview_handler: preview_handler,
                search_handler: search_handler,
                files_list: files_list,
                mwApi: mwApi, // Reference to API service instance

                editSummary: 'Batch category update via Category Batch Manager',

                // SearchHandler state
                sourceCategory: 'Category:Our World in Data graphs of Austria',
                searchPattern: '1990',
                searchResults: [],

                // FilesList state
                workFiles: [],

                // SearchProgressBar state
                showSearchProgress: false,
                searchProgressPercent: 0,
                searchProgressText: '',

                // SearchHandler state
                isSearching: false,
                shouldStopSearch: false,

                // PreviewHandler state
                previewRows: [],
                changesCount: '',
                openPreviewHandler: false,

                // MessageDisplay state
                ...message_display_app.data(),

                // ExecuteHandler state
                ...execute_panel.data(),

                // CategoryInputsApp state
                ...category_inputs_app.data(),
            };
            return app_data;
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
        methods: {

            // ExecuteHandler methods
            ...execute_panel.methods,

            // CategoryInputs
            ...category_inputs_app.methods,

            // Message handlers
            ...message_display_app.methods,

            /* *************************
            **      FileService
            ** *************************
            */

            searchFiles: function () {
                return this.search_handler.searchFiles(this);
            },
            stopSearch: function () {
                return this.search_handler.stopSearch(this);
            },

            /* *************************
            **      FilesList
            ** *************************
            */

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Select all files
            selectAll: function () {
                return this.files_list.selectAll(this.workFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Deselect all files
            deselectAll: function () {
                return this.files_list.deselectAll(this.workFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Remove individual file from list
            removeFile: function (index) {
                this.workFiles.splice(index, 1);
            },

            // Preview changes before executing
            handlePreview: function () {
                return this.preview_handler.handlePreview(this);
            }
        },
        template: template
    };
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchManager;
}
