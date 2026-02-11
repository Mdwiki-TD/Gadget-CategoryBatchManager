/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 */

import { APIService, BatchProcessor, CategoryService, SearchService } from './services';
import { CategoryInputsPanel, ExecutePanel, FilesListPanel, MessageDisplayPanel, PreviewPanel, SearchPanel } from './ui/panels';
import { CategoryInputsHandler, ExecuteHandler, FileListHandler, SearchHandler, ProgressHandler } from './ui/handlers';
import CategoryLookup from './ui/components/CategoryLookup.js';
import { ChangesHelper, ValidationHelper } from './ui/helpers';

function BatchManager() {

    // services
    const api_service = new APIService();
    const search_service = new SearchService(api_service);
    const categoryService = new CategoryService(api_service);
    const batchProcessor = new BatchProcessor(categoryService);

    // helpers
    const validation_helper = new ValidationHelper();
    const changes_helpers = new ChangesHelper(validation_helper);

    // handlers
    const files_list = new FileListHandler();
    const search_handler = new SearchHandler(search_service);
    const progress_handler = new ProgressHandler();
    const execute_handler = new ExecuteHandler(batchProcessor);
    const category_inputs_handler = new CategoryInputsHandler(api_service);

    // vue apps
    const execute_panel = ExecutePanel(execute_handler, progress_handler, changes_helpers);
    const preview_panel_app = PreviewPanel(changes_helpers);
    const category_inputs_app = CategoryInputsPanel(category_inputs_handler);
    const message_display_app = MessageDisplayPanel();
    const search_panel_app = SearchPanel(search_handler);
    const files_list_app = FilesListPanel(files_list);

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
            return {
                // vue apps handlers
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                category_inputs_handler: category_inputs_handler,
                search_handler: search_handler,
                files_list: files_list,

                editSummary: 'Batch category update via Category Batch Manager',

                // SearchPanel state
                ...search_panel_app.data(),

                // MessageDisplayPanel state
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
        },
        computed: {
            ...files_list_app.computed,
        },
        methods: {

            // SearchPanel methods
            ...search_panel_app.methods,

            // ExecutePanel methods
            ...execute_panel.methods,

            // CategoryInputsPanel methods
            ...category_inputs_app.methods,

            // Message handlers
            ...message_display_app.methods,

            // PreviewPanel methods
            ...preview_panel_app.methods,

            // FilesListPanel methods
            ...files_list_app.methods,
        },
        template: template,
        components: {
            CategoryLookup: CategoryLookup(),
        }
    };
    return app;
}

export default BatchManager;
