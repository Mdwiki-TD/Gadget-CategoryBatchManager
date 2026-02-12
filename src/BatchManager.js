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
    const search_handler = new SearchHandler(search_service);
    const progress_handler = new ProgressHandler();
    const execute_handler = new ExecuteHandler(batchProcessor);

    // ── Panel configurations ──────────────────────────────────────────────
    const execute_panel = ExecutePanel(execute_handler, progress_handler, changes_helpers);
    const search_panel = SearchPanel(search_handler);
    const category_inputs_panel = CategoryInputsPanel();

    // ── Template ─────────────────────────────────────────────────────────
    const template = `
        <div class="cbm-main-layout">
            <!-- Left Panel: Search and Actions -->
            <div class="cbm-left-panel">
                <!-- Search Section -->
                ${search_panel.template}

                <!-- Actions Section -->
                <div>
                    <CategoryInputsPanel />

                    <div class="cbm-button-group">
                        <PreviewPanel :is-processing="isProcessing" />
                        ${execute_panel.template}
                    </div>
                </div>
                ${execute_panel.progressTemplate}
            </div>

            <!-- Right Panel: File List -->
            <div class="cbm-right-panel">
                <FilesListPanel :work-files="workFiles" />

                <!-- Progress Section -->
                ${search_panel.progressTemplate}
            </div>
        </div>
        <!-- Message Display -->
        <MessageDisplayPanel />
    `;

    // ── App definition ────────────────────────────────────────────────────
    const app = {
        data() {
            return {
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                search_handler: search_handler,

                // Merge panel states
                ...search_panel.data(),
                ...execute_panel.data(),
                ...category_inputs_panel.data(),
            };
        },

        computed: {
            selectedFiles: function() {
                return this.workFiles.filter(f => f.selected);
            },
            selectedCount: function() {
                return this.workFiles.filter(f => f.selected).length;
            }
        },

        methods: {
            ...search_panel.methods,
            ...execute_panel.methods,
            ...category_inputs_panel.methods,
        },

        components: {
            CategoryLookup: CategoryLookup(),
            PreviewTable: PreviewTable(),
            MessageDisplayPanel: MessageDisplayPanel(),
            FilesListPanel: FilesListPanel(),
            CategoryInputsPanel: CategoryInputsPanel(),
            PreviewPanel: PreviewPanel(),
        },
        template: template,
    };

    return app;
}

export default BatchManager;
