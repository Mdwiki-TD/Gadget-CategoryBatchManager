/**
 * Assemble the full Vue app from panels and services.
 * @param {HTMLElement|null} portletLink
 * @returns {Object} Vue app definition
 */

import { APIService, BatchProcessor, CategoryService, SearchService } from './services';
import { CategoryInputsPanel, ExecutePanel, FilesListPanel, MessageDisplayPanel, PreviewPanel, SearchPanel } from './ui/panels';
import { CategoryInputsHandler, ExecuteHandler, FileListHandler, SearchHandler, ProgressHandler } from './ui/handlers';
import CategoryLookup from './ui/components/CategoryLookup.js';
import { ChangesHelper, ValidationHelper } from './ui/helpers';

function BatchManager(portletLink = null) {
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
    const innerTemplate = `
        <div class="cbm-main-layout">
            <!-- Left Panel: Search and Actions -->
            <div class="cbm-left-panel">
                <!-- Search Section -->
                ${search_panel.template}

                <!-- Actions Section -->
                <div>
                    ${category_inputs.template}

                    <div class="margin-bottom-20 hidden">
                        <cdx-label input-id="cbm-summary" class="cbm-label">
                            Edit Summary
                        </cdx-label>
                        <cdx-text-input id="cbm-summary" v-model="editSummary" />
                    </div>

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

    const template = portletLink
        ? `<cdx-dialog
               v-model:open="showMainDialog"
               class="cbm-container"
               title="Category Batch Manager"
               :use-close-button="true"
               close-button-label="Close"
               @default="showMainDialog = false">
               ${innerTemplate}
           </cdx-dialog>`
        : `<div class="cbm-container">
               <h2 class="cbm-title">Category Batch Manager</h2>
               ${innerTemplate}
           </div>`;

    // ── App definition ────────────────────────────────────────────────────
    const app = {
        data() {
            return {
                showMainDialog: !portletLink,

                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                category_inputs_handler: category_inputs_handler,
                search_handler: search_handler,
                files_list: files_list_handler,

                editSummary: 'Batch category update via Category Batch Manager',

                // SearchPanel state
                ...search_panel.data(),

                // MessageDisplayPanel state
                ...message_panel.data(),

                // ExecutePanel state
                ...execute_panel.data(),

                // CategoryInputsApp state
                ...category_inputs.data(),

                // PreviewPanel state
                ...preview_panel.data(),

                // FilesListPanel state
                ...files_list.data(),
            };
        },

        computed: {
            ...files_list.computed,
        },

        methods: {
            openMainDialog() {
                this.showMainDialog = true;
            },

            ...search_panel.methods,
            ...category_inputs.methods,
            ...files_list.methods,
            ...message_panel.methods,
            ...preview_panel.methods,
            ...execute_panel.methods,
        },

        components: {
            CategoryLookup: CategoryLookup(),
        },
        template: template,
    };
    if (portletLink) {
        app.mounted = function () {
            portletLink.addEventListener('click', this.openMainDialog);
        };
        app.unmounted = function () {
            portletLink.removeEventListener('click', this.openMainDialog);
        };
    }
    return app;
}

export default BatchManager;
