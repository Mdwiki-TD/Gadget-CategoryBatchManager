/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 */

function BatchManager() {
    const mwApi = new APIService();
    const file_service = new FileService(mwApi);
    const files_list = new FileListHandler(mwApi);

    const search_handler = new SearchHandler(file_service);

    const validator = new ValidationHelper();
    const preview_handler = new PreviewHandler(validator);
    const categoryService = new CategoryService(mwApi);
    const batchProcessor = new BatchProcessor(categoryService);

    // Execute panels and handlers
    const execute_operation_handler = new ExecuteOperationHandler(validator, batchProcessor);
    const progress_handler = new ProgressHandler();
    const execute_panel = new ExecutePanel(execute_operation_handler, progress_handler);

    // vue apps
    const preview_panel_app = PreviewPanel(preview_handler);    // function
    const category_inputs_app = CategoryInputs(mwApi);          // function
    const message_display_app = MessageDisplay();               // function
    const search_panel_app = SearchPanel(search_handler);       // function
    const files_list_app = FilesListPanel(files_list);          // function

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
                    ${files_list_app.template}

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

                // FilesListPanel state
                ...files_list_app.data(),
            };
            return app_data;
        },
        computed: {
            ...files_list_app.computed,
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

            // FilesListPanel methods
            ...files_list_app.methods,
        },
        template: template
    };
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchManager;
}
