/**
 * Assemble the full Vue app from panels and services.
 * Returns only the inner template - use BatchManagerDialog or BatchManagerStandalone for wrappers.
 * @returns {Object} Vue component definition
 */

import { APIService, BatchProcessor, CategoryService, SearchService } from './services';
import { CategoryInputsPanel, ExecutePanel, FilesListPanel, MessageDisplayPanel, PreviewPanel, SearchPanel } from './ui/panels';
import { CategoryInputsHandler, ExecuteHandler, FileListHandler, SearchHandler, ProgressHandler } from './ui/handlers';
import CategoryLookup from './ui/components/CategoryLookup.js';
import PreviewTable from './ui/components/PreviewTable.js';
import { ChangesHelper, ValidationHelper } from './ui/helpers';

function BatchManager() {
    // ── Services ──────────────────────────────────────────────────────────
    const api = new APIService();
    const search_service = new SearchService(api);
    const categoryService = new CategoryService(api);
    const batchProcessor = new BatchProcessor(categoryService);

    // ── Helpers ───────────────────────────────────────────────────────────
    const validation_helper = new ValidationHelper();
    const changes_helpers = new ChangesHelper(validation_helper);

    // ── Handlers ──────────────────────────────────────────────────────────
    const files_list_handler = new FileListHandler();
    const search_handler = new SearchHandler(search_service);
    const progress_handler = new ProgressHandler();
    const execute_handler = new ExecuteHandler(batchProcessor);
    const category_inputs_handler = new CategoryInputsHandler(api);

    // ── Panel configurations ──────────────────────────────────────────────
    const category_inputs = CategoryInputsPanel(category_inputs_handler);
    const execute_panel = ExecutePanel(execute_handler, progress_handler, changes_helpers);
    const files_list = FilesListPanel(files_list_handler);
    const message_panel = MessageDisplayPanel();
    const preview_panel = PreviewPanel(changes_helpers);
    const search_panel = SearchPanel(search_handler);

    // ── Template ─────────────────────────────────────────────────────────
    const template = `
        <div class="cbm-main-layout">
            <!-- Left Panel: Search and Actions -->
            <div class="cbm-left-panel">
                <!-- Search Section -->
                ${search_panel.template}

                <!-- Actions Section -->
                <div>
                    ${category_inputs.template}

                    <div class="cbm-button-group">
                        ${preview_panel.template}
                        ${execute_panel.template}
                    </div>
                </div>
                ${execute_panel.progressTemplate}
            </div>

            <!-- Right Panel: File List -->
            <div class="cbm-right-panel">
                ${files_list.template}

                <!-- Progress Section -->
                ${search_panel.progressTemplate}
            </div>
        </div>
        <!-- Message Display -->
        ${message_panel.template}
    `;

    // ── App definition ────────────────────────────────────────────────────
    const app = {
        data() {
            return {
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                category_inputs_handler: category_inputs_handler,
                search_handler: search_handler,
                files_list_handler: files_list_handler,

                // Merge panel states
                ...search_panel.data(),
                ...category_inputs.data(),
                ...files_list.data(),
                ...message_panel.data(),
                ...preview_panel.data(),
                ...execute_panel.data(),
            };
        },

        computed: {
            ...files_list.computed,
        },

        methods: {
            ...search_panel.methods,
            ...category_inputs.methods,
            ...files_list.methods,
            ...message_panel.methods,
            ...preview_panel.methods,
            ...execute_panel.methods,
        },

        components: {
            CategoryLookup: CategoryLookup(),
            PreviewTable: PreviewTable(),
        },
        template: template,
    };

    return app;
}

export default BatchManager;
