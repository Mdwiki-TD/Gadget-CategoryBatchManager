/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 */
/* global APIService, SearchHandler, FilesList, FileService, ValidationHelper, CategoryService, BatchProcessor, ExecutePanel, PreviewHandler, CategoryInputs, MessageDisplay
*/

function BatchManager() {
    const mwApi = new APIService();
    const file_service = new FileService(mwApi);
    const files_list = new FilesList(mwApi);

    const search_handler = new SearchHandler(file_service);

    const validator = new ValidationHelper();
    const preview_handler = new PreviewHandler(validator);
    const categoryService = new CategoryService(mwApi);
    const batchProcessor = new BatchProcessor(categoryService);

    // Execute panels and handlers
    const execute_operation_handler = new ExecuteOperationHandler(validator, batchProcessor);
    const progress_handler = new ProgressHandler();
    const execute_panel = new ExecutePanel(execute_operation_handler, progress_handler);

    // Generate HTML for components
    const FilesListHtml = files_list.createElement();

    // vue apps
    const preview_panel_app = PreviewPanel(preview_handler);    // function
    const category_inputs_app = CategoryInputs(mwApi);          // function
    const message_display_app = MessageDisplay();               // function
    const search_panel_app = SearchPanel(search_handler);       // function

    const template = `
        <div class="cbm-container">
            <h2 class="cbm-title">Category Batch Manager!</h2>

            <div class="cbm-main-layout">
                <!-- Left Panel: Search and Actions -->
                <div class="cbm-left-panel">
                    <!-- Search Section -->
                    ${search_panel_app.template}

                    <!-- Actions Section -->
                    <div>
                        ${category_inputs_app.template}

                        <div class="margin-bottom-20 hidden">
                            <cdx-label input-id="cbm-summary" class="cbm-label">
                                Edit Summary
                            </cdx-label>
                            <cdx-text-input id="cbm-summary" v-model="editSummary" />
                        </div>

                        <div class="cbm-button-group">
                            ${preview_panel_app.template}
                            ${execute_panel.template}
                        </div>
                    </div>
                    ${execute_panel.progress_template}
                </div>

                <!-- Right Panel: File List -->
                <div class="cbm-right-panel">
                    ${FilesListHtml}

                    <!-- Progress Section -->
                    ${search_panel_app.progress_template}
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
                files_list: files_list,
                mwApi: mwApi, // Reference to API service instance

                editSummary: 'Batch category update via Category Batch Manager',

                // FilesList state
                workFiles: [],

                // SearchPanel state
                ...search_panel_app.data(),

                // MessageDisplay state
                ...message_display_app.data(),

                // ExecutePanel state
                ...execute_panel.data(),

                // CategoryInputsApp state
                ...category_inputs_app.data(),

                // PreviewPanel state
                ...preview_panel_app.data(),
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

            // SearchPanel methods
            ...search_panel_app.methods,

            // ExecutePanel methods
            ...execute_panel.methods,

            // CategoryInputs
            ...category_inputs_app.methods,

            // Message handlers
            ...message_display_app.methods,

            // PreviewPanel methods
            ...preview_panel_app.methods,

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
            }
        },
        template: template
    };
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchManager;
}
